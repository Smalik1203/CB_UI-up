import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Typography, Space, Button, Popconfirm, Tooltip, Select, Input, Dropdown, message
} from 'antd';
import {
  ClockCircleOutlined, BookOutlined, TeamOutlined, StopOutlined,
  EditOutlined, PlusCircleOutlined, DeleteOutlined, MoreOutlined
} from '@ant-design/icons';
import { toMin, overlap } from '../../utils/time';
// ⚠️ Adjust this path to your project
import { supabase } from '../../config/supabaseClient';

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_COLOR = { pending: '#9CA3AF', in_progress: '#F59E0B', completed: '#16A34A' };

export default function ManageTab({
  classId,
  date,                    // dayjs
  isHoliday,
  slots = [],              // unified class_slots
  subjects = [],
  teachers = [],
  assignments = [],        // timetable_slots for that date
  onOpenAssign,            // (slot_number) => void
  onDeleteSlot             // (slot) => Promise<void>
}) {
  const [messageApi, contextHolder] = message.useMessage();

  // ---------- Local overlay for instant UI after updates ----------
  // key: timetable_slot.id -> { syllabus_item_id?, plan_text? }
  const [assignOverrides, setAssignOverrides] = useState(() => new Map());

  // ---------- Syllabi & chapters for this class ----------
  // subject_id -> syllabus_id
  const [syllabiBySubject, setSyllabiBySubject] = useState(() => new Map());
  // syllabus_id -> [{id, unit_no, title, status}]
  const [chaptersBySyllabus, setChaptersBySyllabus] = useState(() => new Map());

  // derive easy lookups
  const assignmentBySlot = useMemo(() => {
    const m = new Map();
    assignments.forEach(a => {
      const patch = a?.id ? assignOverrides.get(a.id) : null;
      m.set(a.period_number, patch ? { ...a, ...patch } : a);
    });
    return m;
  }, [assignments, assignOverrides]);

  const weekdayIdx = date.day();
  const dayBreaks = useMemo(
    () => slots.filter(s => s.slot_type === 'break' && Array.isArray(s.weekdays) && s.weekdays.includes(weekdayIdx)),
    [slots, weekdayIdx]
  );

  const clashWithBreakToday = (startHH, endHH) => {
    const ps = toMin(startHH), pe = toMin(endHH);
    for (const b of dayBreaks) {
      const bs = toMin(b.start_time), be = toMin(b.end_time);
      if (overlap(ps, pe, bs, be)) return { clash: true, b };
    }
    return { clash: false };
  };

  const periodRows = slots.filter(s => s.slot_type === 'period');
  const combinedRows = [
    ...periodRows.map(p => ({ type: 'period', key: `p-${p.slot_number}`, ...p })),
    ...dayBreaks.map(b => ({ type: 'break', key: `b-${b.id}`, ...b }))
  ].sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

  // ---------- Load syllabi + chapters for this class ----------
  useEffect(() => {
    if (!classId) {
      setSyllabiBySubject(new Map());
      setChaptersBySyllabus(new Map());
      return;
    }
    (async () => {
      try {
        // Get all syllabi for this class
        const { data: syll, error: syErr } = await supabase
          .from('syllabi')
          .select('id, subject_id')
          .eq('class_instance_id', classId);
        if (syErr) throw syErr;

        const map = new Map();
        const ids = [];
        (syll || []).forEach(sy => { map.set(sy.subject_id, sy.id); ids.push(sy.id); });
        setSyllabiBySubject(map);

        if (ids.length) {
          const { data: items, error: itErr } = await supabase
            .from('syllabus_items')
            .select('id, syllabus_id, unit_no, title, status')
            .in('syllabus_id', ids)
            .order('unit_no', { ascending: true })
            .order('title', { ascending: true });
          if (itErr) throw itErr;

          const group = new Map();
          (items || []).forEach(it => {
            const arr = group.get(it.syllabus_id) || [];
            arr.push(it);
            group.set(it.syllabus_id, arr);
          });
          setChaptersBySyllabus(group);
        } else {
          setChaptersBySyllabus(new Map());
        }
      } catch (e) {
        messageApi.error(e?.message || 'Failed loading chapters');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  // ---------- Realtime sync ----------
  useEffect(() => {
    if (!classId) return;
    const dateStr = date.format('YYYY-MM-DD');
    const channel = supabase.channel(`rt-manage-${classId}-${dateStr}`);

    // timetable_slots: reflect plan_text/syllabus_item_id changes happening elsewhere
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'timetable_slots', filter: `class_instance_id=eq.${classId}` },
      payload => {
        const row = payload.new || payload.old;
        if (!row || row.class_date !== dateStr) return;
        // overlay to reflect immediately
        setAssignOverrides(prev => {
          const next = new Map(prev);
          if (payload.eventType === 'DELETE') {
            next.delete(row.id);
          } else {
            next.set(row.id, {
              syllabus_item_id: row.syllabus_item_id ?? null,
              plan_text: row.plan_text ?? null,
            });
          }
          return next;
        });
      }
    );

    // syllabus_items: reflect chapter status changes from Syllabus page
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'syllabus_items' },
      payload => {
        const row = payload.new;
        if (!row) return;
        setChaptersBySyllabus(prev => {
          const next = new Map(prev);
          const arr = new Map((next.get(row.syllabus_id) || []).map(x => [x.id, x]));
          arr.set(row.id, { ...arr.get(row.id), ...row });
          next.set(row.syllabus_id, Array.from(arr.values()).sort((a, b) => (a.unit_no - b.unit_no) || a.title.localeCompare(b.title)));
          return next;
        });
      }
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [classId, date, messageApi]);

  // ---------- Helpers ----------
  const subjectName = (id) => subjects.find(s => s.id === id)?.subject_name || '—';
  const teacherName = (id) => teachers.find(t => t.id === id)?.full_name || '—';

  const chapterOptionsForSubject = (subject_id) => {
    const sid = syllabiBySubject.get(subject_id);
    if (!sid) return [];
    const arr = chaptersBySyllabus.get(sid) || [];
    return arr.map(ch => ({
      value: ch.id,
      label: `Chapter ${ch.unit_no}: ${ch.title}`,
      status: ch.status,
    }));
  };

  const chapterById = (subject_id, item_id) => {
    const sid = syllabiBySubject.get(subject_id);
    if (!sid || !item_id) return null;
    const arr = chaptersBySyllabus.get(sid) || [];
    return arr.find(x => x.id === item_id) || null;
  };

  async function upsertPlanText(assignRow, newText) {
    if (!assignRow?.id) return;
    // optimistic overlay
    setAssignOverrides(prev => {
      const next = new Map(prev);
      next.set(assignRow.id, { ...(next.get(assignRow.id) || {}), plan_text: newText });
      return next;
    });
    const { error } = await supabase
      .from('timetable_slots')
      .update({ plan_text: newText })
      .eq('id', assignRow.id);
    if (error) messageApi.error(error.message || 'Failed to save description');
  }

  async function setChapter(assignRow, subject_id, syllabus_item_id) {
    if (!assignRow?.id) {
      messageApi.info('Assign subject/teacher first.');
      return;
    }
    // optimistic overlay
    setAssignOverrides(prev => {
      const next = new Map(prev);
      next.set(assignRow.id, { ...(next.get(assignRow.id) || {}), syllabus_item_id });
      return next;
    });
    const { error } = await supabase
      .from('timetable_slots')
      .update({ syllabus_item_id })
      .eq('id', assignRow.id);
    if (error) {
      messageApi.error(error.message || 'Failed to assign chapter');
    } else {
      messageApi.success('Chapter assigned');
    }
  }

  async function changeChapterStatus(subject_id, syllabus_item_id, newStatus) {
    if (!syllabus_item_id) return;
    // optimistic in chaptersBySyllabus
    const sid = syllabiBySubject.get(subject_id);
    setChaptersBySyllabus(prev => {
      const next = new Map(prev);
      const arr = (next.get(sid) || []).map(ch => ch.id === syllabus_item_id ? { ...ch, status: newStatus } : ch);
      next.set(sid, arr);
      return next;
    });
    const { error } = await supabase
      .from('syllabus_items')
      .update({ status: newStatus })
      .eq('id', syllabus_item_id);
    if (error) messageApi.error(error.message || 'Failed to update status');
    else messageApi.success(`Marked ${STATUS_LABEL[newStatus]}`);
  }

  // ---------- Columns ----------
  const columns = [
    {
      title: 'Slot',
      key: 'slot',
      width: 160,
      render: (_, r) =>
        r.slot_type === 'period'
          ? <Text strong>#{r.slot_number}</Text>
          : <Tag color="gold">{r.name}</Tag>
    },
    {
      title: 'Time',
      key: 'time',
      render: (_, r) => (
        <Space size={6}>
          <ClockCircleOutlined />
          <span>{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</span>
        </Space>
      )
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const { clash, b } = clashWithBreakToday(r.start_time, r.end_time);
        if (clash) return <Tag icon={<StopOutlined />} color="warning">During Break: {b.name}</Tag>;
        const name = a?.subject_id ? subjectName(a.subject_id) : null;
        return name
          ? <Space size={6}><BookOutlined /><span>{name}</span></Space>
          : <Tag>Unassigned</Tag>;
      }
    },
    {
      title: 'Teacher',
      key: 'teacher',
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const { clash } = clashWithBreakToday(r.start_time, r.end_time);
        if (clash) return <Text type="secondary">—</Text>;
        const name = a?.teacher_id ? teacherName(a.teacher_id) : null;
        return name ? <Space size={6}><TeamOutlined /><span>{name}</span></Space> : <Text type="secondary">—</Text>;
      }
    },
    // NEW: Chapter assignment
    {
      title: 'Chapter',
      key: 'chapter',
      width: 320,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        if (!a?.subject_id) {
          return <Text type="secondary">Assign subject to select chapter</Text>;
        }
        const sid = syllabiBySubject.get(a.subject_id);
        if (!sid) {
          return (
            <Space>
              <Text type="secondary">No syllabus</Text>
              <Tooltip title="Create syllabus in Syllabus page">
                <Button size="small" type="link" onClick={() => window.open(`/syllabus?subjectId=${a.subject_id}&classInstanceId=${classId}`, '_blank')}>Open</Button>
              </Tooltip>
            </Space>
          );
        }
        const options = chapterOptionsForSubject(a.subject_id);
        const value = a.syllabus_item_id || null;
        const ch = chapterById(a.subject_id, value);
        return (
          <Space align="center" wrap>
            <Select
              style={{ minWidth: 220 }}
              placeholder="Select chapter"
              options={options}
              value={value || undefined}
              onChange={(v) => setChapter(a, a.subject_id, v)}
              showSearch
              optionFilterProp="label"
            />
            {value ? (
              <Tooltip title={STATUS_LABEL[ch?.status || 'pending']}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10, height: 10, borderRadius: '50%',
                    background: STATUS_COLOR[ch?.status || 'pending']
                  }}
                />
              </Tooltip>
            ) : null}
          </Space>
        );
      }
    },
    // NEW: Chapter status (admin can change)
    {
      title: 'Chapter Status',
      key: 'chapter_status',
      width: 160,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        if (!a?.subject_id || !a?.syllabus_item_id) return <Text type="secondary">—</Text>;
        const ch = chapterById(a.subject_id, a.syllabus_item_id);
        const status = ch?.status || 'pending';
        const menuItems = [
          { key: 'pending', label: 'Mark Pending' },
          { key: 'in_progress', label: 'Mark In Progress' },
          { key: 'completed', label: 'Mark Completed' },
        ];
        return (
          <Dropdown
            trigger={['click']}
            menu={{ items: menuItems, onClick: ({ key }) => changeChapterStatus(a.subject_id, a.syllabus_item_id, key) }}
          >
            <Button size="small" icon={<MoreOutlined />}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10, height: 10, borderRadius: '50%',
                  background: STATUS_COLOR[status],
                  marginRight: 8
                }}
              />
              {STATUS_LABEL[status]}
            </Button>
          </Dropdown>
        );
      }
    },
    // NEW: Plan / description
    {
      title: 'Description',
      key: 'desc',
      width: 340,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        if (!a?.id) return <Text type="secondary">—</Text>;
        const value = a.plan_text || '';
        return (
          <TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="Notes for this period"
            defaultValue={value}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== value) upsertPlanText(a, v);
            }}
          />
        );
      }
    },
    // Existing Actions
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, r) => {
        if (r.slot_type === 'break') {
          return (
            <Popconfirm title={`Delete break "${r.name}"?`} onConfirm={() => onDeleteSlot(r)}>
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete break" />
            </Popconfirm>
          );
        }
        const a = assignmentBySlot.get(r.slot_number);
        const { clash, b } = clashWithBreakToday(r.start_time, r.end_time);
        const btn = (
          <Button
            type="text"
            onClick={() => onOpenAssign(r.slot_number)}
            icon={a?.teacher_id ? <EditOutlined /> : <PlusCircleOutlined />}
            aria-label={a?.teacher_id ? 'Edit' : 'Assign'}
            disabled={isHoliday || clash}
          />
        );
        return (
          <Space>
            {clash
              ? <Tooltip title={`Blocked by break: ${b.name} (${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)})`}><span>{btn}</span></Tooltip>
              : btn}
            <Popconfirm title={`Delete period #${r.slot_number}?`} onConfirm={() => onDeleteSlot(r)}>
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete period" />
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return classId ? (
    <>
      {contextHolder}
      {isHoliday && (
        <Card style={{ marginTop: 8, background: '#fff1f0', borderColor: '#ffa39e' }}>
          <Text>This date is a holiday. Use the toggle or clear the holiday to schedule classes.</Text>
        </Card>
      )}
      <Table
        rowKey="key"
        columns={columns}
        dataSource={combinedRows}
        pagination={false}
        bordered
        style={{ marginTop: 8 }}
        scroll={{ x: 1100 }}
      />
    </>
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to manage its day.</Text></Card>
  );
}
