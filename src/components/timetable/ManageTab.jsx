import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Typography, Space, Button, Popconfirm, Tooltip, message, Modal, Form, Select, Input, Empty
} from 'antd';
import {
  ClockCircleOutlined, BookOutlined, TeamOutlined, StopOutlined,
  EditOutlined, PlusCircleOutlined, DeleteOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { toMin, overlap } from '../../utils/time';
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
  onOpenAssign,            // (slot_number) => void  // not used now; we use internal modal
  onDeleteSlot             // (slot) => Promise<void>
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const dateStr = useMemo(() => date.format('YYYY-MM-DD'), [date]);

  // ---------- Local overlay for instant UI after updates ----------
  // key: timetable_slot.id -> { syllabus_item_id?, plan_text?, subject_id?, teacher_id? }
  const [assignOverrides, setAssignOverrides] = useState(() => new Map());

  // ---------- Syllabi & chapters for this class ----------
  // subject_id -> syllabus_id
  const [syllabiBySubject, setSyllabiBySubject] = useState(() => new Map());
  // syllabus_id -> subject_id (reverse)
  const [subjectBySyllabus, setSubjectBySyllabus] = useState(() => new Map());
  // syllabus_id -> [{id, unit_no, title, status}]
  const [chaptersBySyllabus, setChaptersBySyllabus] = useState(() => new Map());
  // chapter_id -> syllabus_id (for inference)
  const [syllabusByChapter, setSyllabusByChapter] = useState(() => new Map());

  // ---------- Edit modal ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editSlot, setEditSlot] = useState(null); // period row
  const [form] = Form.useForm();

  // ---------- helpers (snake/camel tolerant & inference) ----------
  const resolvePeriodNumber = (a) => a?.period_number ?? a?.periodNumber ?? null;
  const resolveSubjectId = (a) => {
    const fromRow = a?.subject_id ?? a?.subjectId ?? (a?.id ? assignOverrides.get(a.id)?.subject_id : null);
    if (fromRow) return fromRow;
    const chId = a?.syllabus_item_id ?? a?.syllabusItemId;
    if (!chId) return null;
    const sylId = syllabusByChapter.get(chId);
    if (!sylId) return null;
    return subjectBySyllabus.get(sylId) ?? null;
  };

  const assignmentBySlot = useMemo(() => {
    const m = new Map();
    assignments.forEach(a => {
      const patch = a?.id ? assignOverrides.get(a.id) : null;
      const merged = patch ? { ...a, ...patch } : a;
      const pn = resolvePeriodNumber(merged);
      if (pn != null) m.set(pn, merged);
    });
    return m;
  }, [assignments, assignOverrides]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setSubjectBySyllabus(new Map());
      setChaptersBySyllabus(new Map());
      setSyllabusByChapter(new Map());
      return;
    }
    (async () => {
      try {
        // All syllabi for this class
        const { data: syll, error: syErr } = await supabase
          .from('syllabi')
          .select('id, subject_id')
          .eq('class_instance_id', classId);
        if (syErr) throw syErr;

        const fwd = new Map();   // subject_id -> syllabus_id
        const rev = new Map();   // syllabus_id -> subject_id
        const ids = [];
        (syll || []).forEach(sy => { fwd.set(sy.subject_id, sy.id); rev.set(sy.id, sy.subject_id); ids.push(sy.id); });
        setSyllabiBySubject(fwd);
        setSubjectBySyllabus(rev);

        if (ids.length) {
          const { data: items, error: itErr } = await supabase
            .from('syllabus_items')
            .select('id, syllabus_id, unit_no, title, status')
            .in('syllabus_id', ids)
            .order('unit_no', { ascending: true })
            .order('title', { ascending: true });
          if (itErr) throw itErr;

          const group = new Map();
          const ch2sy = new Map();
          (items || []).forEach(it => {
            const arr = group.get(it.syllabus_id) || [];
            arr.push(it);
            group.set(it.syllabus_id, arr);
            ch2sy.set(it.id, it.syllabus_id);
          });
          setChaptersBySyllabus(group);
          setSyllabusByChapter(ch2sy);
        } else {
          setChaptersBySyllabus(new Map());
          setSyllabusByChapter(new Map());
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
    const channel = supabase.channel(`rt-manage-${classId}-${dateStr}`);

    // timetable_slots (reflect changes)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'timetable_slots', filter: `class_instance_id=eq.${classId}` },
      payload => {
        const row = payload.new || payload.old;
        if (!row || row.class_date !== dateStr) return;
        setAssignOverrides(prev => {
          const next = new Map(prev);
          if (payload.eventType === 'DELETE') {
            next.delete(row.id);
          } else {
            next.set(row.id, {
              syllabus_item_id: row.syllabus_item_id ?? null,
              plan_text: row.plan_text ?? null,
              subject_id: row.subject_id ?? (prev.get(row.id)?.subject_id ?? null),
              teacher_id: row.teacher_id ?? (prev.get(row.id)?.teacher_id ?? null),
            });
          }
          return next;
        });
      }
    );

    // syllabus_items (status updates from Syllabus page)
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
          next.set(
            row.syllabus_id,
            Array.from(arr.values()).sort((a, b) => (a.unit_no - b.unit_no) || a.title.localeCompare(b.title))
          );
          return next;
        });
      }
    );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [classId, dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Names ----------
  const subjectName = (id) => subjects.find(s => s.id === id)?.subject_name || '—';
  const teacherName = (id) => teachers.find(t => t.id === id)?.full_name || '—';

  // ---------- Chapters helpers ----------
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

  // ---------- Open edit modal ----------
  const openEdit = (row) => {
    const a = assignmentBySlot.get(row.slot_number);
    const subjId = a ? resolveSubjectId(a) : null;
    form.setFieldsValue({
      subject_id: subjId || undefined,
      teacher_id: (a?.teacher_id ?? a?.teacherId) || undefined,
      syllabus_item_id: (a?.syllabus_item_id ?? a?.syllabusItemId) || undefined,
      plan_text: (a?.plan_text ?? a?.planText) || '',
    });
    setEditSlot(row);
    setEditOpen(true);
  };

  // ---------- Save edit (update by id or composite key) ----------
  const saveEdit = async () => {
    try {
      const values = await form.validateFields();
      const slotNumber = editSlot.slot_number;
      const a = assignmentBySlot.get(slotNumber);
      const patch = {
        subject_id: values.subject_id || null,
        teacher_id: values.teacher_id || null,
        syllabus_item_id: values.syllabus_item_id || null,
        plan_text: values.plan_text || null,
      };
      if (!patch.subject_id || !patch.teacher_id) {
        messageApi.warning('Subject and Teacher are required.');
        return;
      }

      setEditBusy(true);
      if (a?.id) {
        const { error, data } = await supabase
          .from('timetable_slots')
          .update(patch)
          .eq('id', a.id)
          .select('id, subject_id, teacher_id, syllabus_item_id, plan_text')
          .single();
        if (error) throw error;
        setAssignOverrides(prev => {
          const next = new Map(prev);
          next.set(data.id, data);
          return next;
        });
      } else {
        const { error, data } = await supabase
          .from('timetable_slots')
          .update(patch)
          .eq('class_instance_id', classId)
          .eq('class_date', dateStr)
          .eq('period_number', slotNumber)
          .select('id, subject_id, teacher_id, syllabus_item_id, plan_text')
          .maybeSingle();
        if (error) throw error;
        if (data?.id) {
          setAssignOverrides(prev => {
            const next = new Map(prev);
            next.set(data.id, data);
            return next;
          });
        }
      }
      messageApi.success('Assignment saved');
      setEditOpen(false);
    } catch (e) {
      if (e?.errorFields) {
        // antd form validation
        return;
      }
      messageApi.error(e?.message || 'Failed to save');
    } finally {
      setEditBusy(false);
    }
  };

  // ---------- Create syllabus from modal ----------
  const createSyllabus = async (subject_id) => {
    try {
      if (!subject_id) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Not signed in');
      const { data: meRow, error: meErr } = await supabase
        .from('users')
        .select('id, school_code')
        .eq('id', auth.user.id)
        .single();
      if (meErr || !meRow) throw meErr ?? new Error('User profile not found');

      const { data, error } = await supabase
        .from('syllabi')
        .insert({
          school_code: meRow.school_code,
          class_instance_id: classId,
          subject_id,
          created_by: meRow.id,
        })
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') {
          messageApi.info('Syllabus already exists');
        } else {
          throw error;
        }
      } else {
        messageApi.success('Syllabus created');
      }

      // refresh local cache
      const { data: syll, error: syErr } = await supabase
        .from('syllabi')
        .select('id, subject_id')
        .eq('class_instance_id', classId);
      if (syErr) throw syErr;

      const fwd = new Map(syll.map(sy => [sy.subject_id, sy.id]));
      setSyllabiBySubject(fwd);

      // if this subject now has a syllabus, load chapters
      const sid = fwd.get(subject_id);
      if (sid) {
        const { data: items, error: itErr } = await supabase
          .from('syllabus_items')
          .select('id, syllabus_id, unit_no, title, status')
          .eq('syllabus_id', sid)
          .order('unit_no', { ascending: true })
          .order('title', { ascending: true });
        if (itErr) throw itErr;
        setChaptersBySyllabus(prev => new Map(prev).set(sid, items || []));
      }
    } catch (e) {
      messageApi.error(e?.message || 'Failed to create syllabus');
    }
  };

  // ---------- Columns (aligned with ViewTab) ----------
  const columns = [
    {
      title: 'Slot',
      key: 'slot',
      width: 120,
      render: (_, r) =>
        r.slot_type === 'period'
          ? <Text strong>Period #{r.slot_number}</Text>
          : <Tag color="gold">{r.name}</Tag>
    },
    {
      title: 'Time',
      key: 'time',
      width: 120,
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
      width: 220,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const { clash, b } = clashWithBreakToday(r.start_time, r.end_time);
        if (clash) return <Tag icon={<StopOutlined />} color="warning">During Break: {b.name}</Tag>;
        const subjId = a ? resolveSubjectId(a) : null;
        const name = subjId ? subjectName(subjId) : null;
        return name ? <Space size={6}><BookOutlined /><span>{name}</span></Space> : <Tag>Unassigned</Tag>;
      }
    },
    {
      title: 'Teacher',
      key: 'teacher',
      width: 200,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const { clash } = clashWithBreakToday(r.start_time, r.end_time);
        if (clash) return <Text type="secondary">—</Text>;
        const tid = a?.teacher_id ?? a?.teacherId;
        const name = tid ? teacherName(tid) : null;
        return name ? <Space size={6}><TeamOutlined /><span>{name}</span></Space> : <Text type="secondary">—</Text>;
      }
    },
    {
      title: 'Chapter',
      key: 'chapter',
      width: 320,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const subjId = a ? resolveSubjectId(a) : null;
        const chId = a?.syllabus_item_id ?? a?.syllabusItemId;
        if (!subjId || !chId) return <Text type="secondary">—</Text>;
        const ch = chapterById(subjId, chId);
        if (!ch) return <Text type="secondary">—</Text>;
        return (
          <Space>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: STATUS_COLOR[ch.status || 'pending']
            }} />
            <span>Chapter {ch.unit_no}: {ch.title}</span>
          </Space>
        );
      }
    },
    {
      title: 'Description',
      key: 'desc',
      width: 360,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const value = a?.plan_text ?? a?.planText ?? '';
        return value ? value : <Text type="secondary">—</Text>;
      }
    },
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
        const hasAssign = !!(a?.teacher_id || a?.teacherId || a?.subject_id || a?.subjectId);
        const btn = (
          <Button
            type="text"
            onClick={() => openEdit(r)}
            icon={hasAssign ? <EditOutlined /> : <PlusCircleOutlined />}
            aria-label={hasAssign ? 'Edit' : 'Assign'}
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
        scroll={{ x: 1260 }}
        locale={{ emptyText: <Empty description="No periods/breaks configured" /> }}
      />

      {/* Edit Assignment Modal */}
      <Modal
        title={editSlot ? `Period #${editSlot.slot_number} • ${editSlot.start_time.slice(0,5)}–${editSlot.end_time.slice(0,5)}` : 'Edit Assignment'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={saveEdit}
        confirmLoading={editBusy}
        okText="Save"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form
            layout="vertical"
            form={form}
            initialValues={{ subject_id: undefined, teacher_id: undefined, syllabus_item_id: undefined, plan_text: '' }}
          >
            <Form.Item label="Subject" name="subject_id" rules={[{ required: true, message: 'Select a subject' }]}>
              <Select
                showSearch
                options={(subjects || []).map(s => ({ label: s.subject_name, value: s.id }))}
                placeholder="Select subject"
                optionFilterProp="label"
                onChange={() => {
                  // Reset chapter when subject changes
                  form.setFieldValue('syllabus_item_id', undefined);
                }}
              />
            </Form.Item>

            <Form.Item label="Teacher" name="teacher_id" rules={[{ required: true, message: 'Select a teacher' }]}>
              <Select
                showSearch
                options={(teachers || []).map(t => ({ label: t.full_name, value: t.id }))}
                placeholder="Select teacher"
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.Item label="Chapter" name="syllabus_item_id">
              <Select
                showSearch
                placeholder="Select chapter (optional)"
                options={(() => {
                  const subjId = form.getFieldValue('subject_id');
                  return subjId ? chapterOptionsForSubject(subjId) : [];
                })()}
                optionFilterProp="label"
                notFoundContent={(() => {
                  const subjId = form.getFieldValue('subject_id');
                  if (!subjId) return null;
                  const hasSyl = syllabiBySubject.has(subjId);
                  return hasSyl ? null : (
                    <Space>
                      <ExclamationCircleOutlined />
                      <span>No syllabus. </span>
                      <Button size="small" type="link" onClick={() => createSyllabus(subjId)}>Create</Button>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => window.open(`/syllabus?subjectId=${subjId}&classInstanceId=${classId}`, '_blank')}
                      >
                        Open Syllabus
                      </Button>
                    </Space>
                  );
                })()}
              />
            </Form.Item>

            <Form.Item label="Description" name="plan_text">
              <TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Notes for this period" />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </>
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to manage its day.</Text></Card>
  );
}
