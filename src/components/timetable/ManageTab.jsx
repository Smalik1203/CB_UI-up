import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Table, Tag, Typography, Space, Button, Popconfirm, Tooltip,
  message, Drawer, Form, Select, Input, TimePicker, InputNumber, Empty, Modal, DatePicker, Checkbox, Radio
} from 'antd';
import {
  ClockCircleOutlined, BookOutlined, TeamOutlined, EditOutlined,
  PlusCircleOutlined, DeleteOutlined, CopyOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../config/supabaseClient';

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_COLOR = { pending: '#9CA3AF', in_progress: '#F59E0B', completed: '#16A34A' };
const DURATION_OPTIONS = [30, 35, 40, 45, 50, 60];

function toMin(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm).split(':').map(n => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}
function fromMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}:00`;
}
function overlap(a1, a2, b1, b2) { return Math.max(a1, b1) < Math.min(a2, b2); }

export default function ManageTab({
  classId,
  date,                    // dayjs
  subjects = [],
  teachers = [],
  daySlots = [],           // timetable_slots of that date
  chaptersById = new Map(),
  refreshDay,              // () => void
}) {
  const [msg, ctx] = message.useMessage();
  const dateStr = useMemo(() => date.format('YYYY-MM-DD'), [date]);

  // me (for created_by)
  const [me, setMe] = useState(null);
  useEffect(() => { (async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    const { data } = await supabase.from('users').select('id, school_code').eq('id', auth.user.id).single();
    if (data) setMe(data);
  })(); }, []);

  const subjectName = (id) => subjects.find(s => s.id === id)?.subject_name || '—';
  const teacherName = (id) => teachers.find(t => t.id === id)?.full_name || '—';

  const rows = useMemo(() => {
    const safe = Array.isArray(daySlots) ? daySlots : [];
    return [...safe].sort((a, b) => {
      const as = a?.start_time || '';
      const bs = b?.start_time || '';
      return as > bs ? 1 : as < bs ? -1 : 0;
    }).map(r => ({ key: r.id, ...r }));
  }, [daySlots]);

  /** ---------- Compact Drawer for Add/Edit ---------- **/
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [duration, setDuration] = useState(40); // minutes

  // compute a good "next gap" start/end suggestion
  const suggestNextTime = () => {
    const sorted = [...(daySlots || [])].sort((a,b) => (a.start_time > b.start_time ? 1 : -1));
    const last = sorted.filter(s => s.end_time).slice(-1)[0];
    const nowStart = last ? toMin(last.end_time) : toMin('09:00:00');
    const nowEnd = nowStart + duration;
    return { start: fromMin(nowStart), end: fromMin(nowEnd) };
    // note: UI will still validate overlap if user changes duration
  };

  const openAdd = (type) => {
    setEditing(null);
    form.resetFields();
    const nextNo = (daySlots.reduce((m, it) => Math.max(m, it.period_number || 0), 0) || 0) + 1;
    const s = suggestNextTime();
    form.setFieldsValue({
      slot_type: type,
      period_number: nextNo,
      name: type === 'break' ? 'Break' : undefined,
      start: dayjs(s.start, 'HH:mm:ss'),
      end: dayjs(s.end, 'HH:mm:ss'),
      subject_id: undefined,
      teacher_id: undefined,
      syllabus_item_id: undefined,
      plan_text: '',
    });
    setDrawerOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      slot_type: row.slot_type || 'period',
      period_number: row.period_number,
      name: row.name || undefined,
      start: row.start_time ? dayjs(row.start_time, 'HH:mm:ss') : undefined,
      end: row.end_time ? dayjs(row.end_time, 'HH:mm:ss') : undefined,
      subject_id: row.subject_id || undefined,
      teacher_id: row.teacher_id || undefined,
      syllabus_item_id: row.syllabus_item_id || undefined,
      plan_text: row.plan_text || '',
    });
    setDrawerOpen(true);
  };

  // chapters options – lazy load when subject changes
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chapterOptions, setChapterOptions] = useState([]);
  const loadChapterOptions = async (subject_id) => {
    try {
      setChaptersLoading(true);
      const { data: syl } = await supabase
        .from('syllabi').select('id').eq('class_instance_id', classId).eq('subject_id', subject_id).maybeSingle();
      if (!syl) { setChapterOptions([]); return; }
      const { data: items } = await supabase
        .from('syllabus_items').select('id, unit_no, title, status')
        .eq('syllabus_id', syl.id).order('unit_no').order('title');
      setChapterOptions((items || []).map(ch => ({
        value: ch.id, label: `Chapter ${ch.unit_no}: ${ch.title}`, status: ch.status
      })));
    } finally { setChaptersLoading(false); }
  };

  // auto-update end when duration changes
  const withAutoEnd = () => {
    const start = form.getFieldValue('start');
    if (start && dayjs.isDayjs(start)) {
      const sMin = toMin(start.format('HH:mm:ss'));
      const e = fromMin(sMin + Number(duration || 0));
      form.setFieldValue('end', dayjs(e, 'HH:mm:ss'));
    }
  };

  const saveSlot = async () => {
    try {
      const v = await form.validateFields();
      const start = v.start; const end = v.end;
      if (!start || !end || !dayjs.isDayjs(start) || !dayjs.isDayjs(end)) {
        msg.error('Start and End time required'); return;
      }
      if (end.isSameOrBefore(start)) {
        msg.error('End time must be after Start time'); return;
      }

      // overlap check (simple, same date/class)
      const ns = start.format('HH:mm:ss'), ne = end.format('HH:mm:ss');
      const sMin = toMin(ns), eMin = toMin(ne);
      const currentId = editing?.id;
      for (const r of daySlots) {
        if (currentId && r.id === currentId) continue;
        if (overlap(sMin, eMin, toMin(r.start_time), toMin(r.end_time))) {
          msg.error('Time overlaps an existing slot'); return;
        }
      }

      const payload = {
        class_instance_id: classId,
        class_date: dateStr,
        period_number: Number(v.period_number),
        slot_type: v.slot_type,
        name: v.slot_type === 'break' ? (v.name || 'Break') : null,
        start_time: ns,
        end_time: ne,
        subject_id: v.slot_type === 'period' ? v.subject_id : null,
        teacher_id: v.slot_type === 'period' ? v.teacher_id : null,
        syllabus_item_id: v.slot_type === 'period' ? (v.syllabus_item_id || null) : null,
        plan_text: v.slot_type === 'period' ? (v.plan_text || null) : null,
        status: 'planned',
        created_by: me?.id || null,
      };

      setDrawerBusy(true);
      if (editing?.id) {
        const { error } = await supabase.from('timetable_slots').update(payload).eq('id', editing.id);
        if (error) throw error;
        msg.success('Updated');
      } else {
        const { error } = await supabase
          .from('timetable_slots')
          .upsert(payload, { onConflict: 'class_instance_id,class_date,period_number' });
        if (error) throw error;
        msg.success('Added');
      }
      setDrawerOpen(false);
      refreshDay?.();
    } catch (e) {
      if (e?.errorFields) return;
      msg.error(e?.message || 'Save failed');
    } finally { setDrawerBusy(false); }
  };

  const removeSlot = async (row) => {
    try {
      const { error } = await supabase.from('timetable_slots').delete().eq('id', row.id);
      if (error) throw error;
      message.success('Deleted');
      refreshDay?.();
    } catch (e) { message.error(e?.message || 'Delete failed'); }
  };

  /** ---------- Copy From Date ---------- **/
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyForm] = Form.useForm();

  const openCopy = () => {
    copyForm.resetFields();
    copyForm.setFieldsValue({
      source_date: date.clone().subtract(1, 'day'),
      include_breaks: true,
      include_lessons: true,
      mode: 'replace',
    });
    setCopyOpen(true);
  };

  const doCopy = async () => {
    try {
      const v = await copyForm.validateFields();
      const src = v.source_date?.format('YYYY-MM-DD');
      if (!src) { msg.error('Pick a source date'); return; }

      setCopyBusy(true);
      // 1) fetch source
      const { data: srcRows, error: sErr } = await supabase
        .from('timetable_slots')
        .select(`
          id, class_instance_id, class_date, period_number,
          slot_type, name, start_time, end_time,
          subject_id, teacher_id, syllabus_item_id, plan_text, status
        `)
        .eq('class_instance_id', classId)
        .eq('class_date', src)
        .order('start_time', { ascending: true });
      if (sErr) throw sErr;

      const rows = (srcRows || []).filter(r => {
        if (r.slot_type === 'break') return !!v.include_breaks;
        return !!v.include_lessons;
      });

      if (!rows.length) { msg.info('Nothing to copy from source date'); setCopyOpen(false); return; }

      if (v.mode === 'replace') {
        const { error: delErr } = await supabase
          .from('timetable_slots').delete()
          .eq('class_instance_id', classId).eq('class_date', dateStr);
        if (delErr) throw delErr;
      }

      // 2) upsert rows for target date
      const payloads = rows.map(r => ({
        class_instance_id: classId,
        class_date: dateStr,
        period_number: r.period_number,
        slot_type: r.slot_type,
        name: r.slot_type === 'break' ? (r.name || 'Break') : null,
        start_time: r.start_time,
        end_time: r.end_time,
        subject_id: r.slot_type === 'period' ? r.subject_id : null,
        teacher_id: r.slot_type === 'period' ? r.teacher_id : null,
        syllabus_item_id: r.slot_type === 'period' ? r.syllabus_item_id : null,
        plan_text: r.slot_type === 'period' ? r.plan_text : null,
        status: r.status || 'planned',
        created_by: me?.id || null,
      }));

      // Merge: we let onConflict update existing with source
      const { error: upErr } = await supabase
        .from('timetable_slots')
        .upsert(payloads, { onConflict: 'class_instance_id,class_date,period_number' });
      if (upErr) throw upErr;

      msg.success(`Copied ${payloads.length} slot(s)`);
      setCopyOpen(false);
      refreshDay?.();
    } catch (e) {
      if (e?.errorFields) return;
      msg.error(e?.message || 'Copy failed');
    } finally { setCopyBusy(false); }
  };

  /** ---------- Columns ---------- **/
  const columns = [
    {
      title: 'Slot', key: 'slot', width: 180,
      render: (_, r) => {
        if (r.slot_type === 'break') {
          return <Tag color="gold">{r.name || 'Break'}</Tag>;
        }
        return <Text strong>Period #{r.period_number}</Text>;
      }
    },
    {
      title: 'Time', key: 'time', width: 140,
      render: (_, r) => (<Space size={6}><ClockCircleOutlined /><span>{String(r.start_time).slice(0,5)}–{String(r.end_time).slice(0,5)}</span></Space>)
    },
    {
      title: 'Subject', key: 'subject', width: 220,
      render: (_, r) => r.slot_type === 'period'
        ? (r.subject_id ? <Space size={6}><BookOutlined /><span>{subjectName(r.subject_id)}</span></Space> : <Tag>Unassigned</Tag>)
        : <Text type="secondary">—</Text>
    },
    {
      title: 'Teacher', key: 'teacher', width: 220,
      render: (_, r) => r.slot_type === 'period'
        ? (r.teacher_id ? <Space size={6}><TeamOutlined /><span>{teacherName(r.teacher_id)}</span></Space> : <Text type="secondary">—</Text>)
        : <Text type="secondary">—</Text>
    },
    {
      title: 'Chapter', key: 'chapter', width: 360,
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const chId = r.syllabus_item_id;
        if (!chId) return <Text type="secondary">—</Text>;
        const ch = chaptersById.get(chId);
        if (!ch) return <Text type="secondary">Chapter selected</Text>;
        const color = STATUS_COLOR[ch.status || 'pending'];
        return (
          <Space>
            <span style={{ width:8, height:8, borderRadius:'50%', background: color }} />
            <span>Chapter {ch.unit_no}: {ch.title}</span>
          </Space>
        );
      }
    },
    {
      title: 'Description', key: 'desc', width: 360,
      render: (_, r) => r.slot_type === 'period'
        ? (r.plan_text ? r.plan_text : <Text type="secondary">—</Text>)
        : <Text type="secondary">—</Text>
    },
    {
      title: 'Actions', key: 'actions', width: 140,
      render: (_, r) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete slot?" onConfirm={() => removeSlot(r)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return classId ? (
    <>
      {ctx}
      <Card
        title="Manage (Date-Based)"
        extra={
          <Space wrap>
            <Button icon={<CopyOutlined />} onClick={openCopy}>Copy From…</Button>
            <Button icon={<ThunderboltOutlined />} onClick={() => openAdd('period')}>Quick Add Period</Button>
            <Button icon={<PlusCircleOutlined />} onClick={() => openAdd('break')}>Add Break</Button>
          </Space>
        }
        style={{ marginTop: 8 }}
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
          bordered
          scroll={{ x: 1200 }}
          locale={{ emptyText: <Empty description="No slots yet for this date" /> }}
        />
      </Card>

      {/* Compact Drawer for Add/Edit */}
      <Drawer
        title={editing
          ? (editing.slot_type === 'break'
              ? `Edit Break • ${String(editing.start_time).slice(0,5)}–${String(editing.end_time).slice(0,5)}`
              : `Edit Period #${editing.period_number}`)
          : 'Add Slot'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={Math.min(480, Math.floor(window.innerWidth * 0.96))}
        destroyOnClose
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" loading={drawerBusy} onClick={saveSlot}>Save</Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ slot_type: 'period', period_number: 1 }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Form.Item label="Type" name="slot_type" rules={[{ required: true }]} style={{ minWidth: 180 }}>
                <Select
                  options={[{ value: 'period', label: 'Period' }, { value: 'break', label: 'Break' }]}
                  onChange={() => {
                    // clear fields when switching types
                    form.setFieldsValue({ subject_id: undefined, teacher_id: undefined, syllabus_item_id: undefined, plan_text: '' });
                  }}
                />
              </Form.Item>
              <Form.Item label="Period #" name="period_number" rules={[{ required: true, message: 'Enter period number' }]} style={{ minWidth: 180 }}>
                <InputNumber min={1} style={{ width: 140 }} />
              </Form.Item>
            </Space>

            {/* Time row: Start | Duration | End + Quick Next */}
            <Space wrap align="end">
              <Form.Item label="Start" name="start" rules={[{ required: true }]} style={{ minWidth: 180 }}>
                <TimePicker format="HH:mm" style={{ width: 140 }} onChange={withAutoEnd} />
              </Form.Item>
              <Form.Item label="Duration (min)" style={{ minWidth: 160 }}>
                <Select
                  style={{ width: 140 }}
                  value={duration}
                  onChange={(v) => { setDuration(v); withAutoEnd(); }}
                  options={DURATION_OPTIONS.map(x => ({ value: x, label: `${x}` }))}
                />
              </Form.Item>
              <Form.Item label="End" name="end" rules={[{ required: true }]} style={{ minWidth: 180 }}>
                <TimePicker format="HH:mm" style={{ width: 140 }} />
              </Form.Item>
              <Button onClick={() => {
                const s = suggestNextTime();
                form.setFieldsValue({ start: dayjs(s.start, 'HH:mm:ss'), end: dayjs(s.end, 'HH:mm:ss') });
              }}>Use next gap</Button>
            </Space>

            {/* Break-only */}
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) =>
                getFieldValue('slot_type') === 'break' ? (
                  <Form.Item label="Break Name" name="name" rules={[{ required: true, message: 'Enter break name' }]}>
                    <Input placeholder="e.g., Lunch" />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            {/* Period-only */}
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) =>
                getFieldValue('slot_type') === 'period' ? (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Form.Item label="Subject" name="subject_id" rules={[{ required: true, message: 'Select a subject' }]}>
                      <Select
                        showSearch placeholder="Select subject"
                        options={(subjects || []).map(s => ({ label: s.subject_name, value: s.id }))}
                        optionFilterProp="label"
                        onChange={async (sid) => {
                          form.setFieldValue('syllabus_item_id', undefined);
                          await loadChapterOptions(sid);
                        }}
                      />
                    </Form.Item>
                    <Form.Item label="Teacher" name="teacher_id" rules={[{ required: true, message: 'Select a teacher' }]}>
                      <Select
                        showSearch placeholder="Select teacher"
                        options={(teachers || []).map(t => ({ label: t.full_name, value: t.id }))}
                        optionFilterProp="label"
                      />
                    </Form.Item>
                    <Form.Item label="Chapter (optional)" name="syllabus_item_id">
                      <Select
                        showSearch placeholder="Select chapter"
                        options={chapterOptions}
                        loading={chaptersLoading}
                        optionFilterProp="label"
                        notFoundContent="No chapters. Create in Syllabus."
                      />
                    </Form.Item>
                    <Form.Item label="Description" name="plan_text">
                      <TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Notes for this period" />
                    </Form.Item>
                  </Space>
                ) : null
              }
            </Form.Item>
          </Space>
        </Form>
      </Drawer>

      {/* Copy From Date modal */}
      <Modal
        title="Copy Timetable From Date"
        open={copyOpen}
        onCancel={() => setCopyOpen(false)}
        onOk={doCopy}
        okText="Copy"
        confirmLoading={copyBusy}
      >
        <Form
          form={copyForm}
          layout="vertical"
          initialValues={{ include_breaks: true, include_lessons: true, mode: 'replace' }}
        >
          <Form.Item label="Source date" name="source_date" rules={[{ required: true, message: 'Pick a date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="What to copy">
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical">
                <Form.Item name="include_lessons" valuePropName="checked" noStyle>
                  <Checkbox>Lessons (subject/teacher/chapter/description)</Checkbox>
                </Form.Item>
                <Form.Item name="include_breaks" valuePropName="checked" noStyle>
                  <Checkbox>Breaks</Checkbox>
                </Form.Item>
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item label="Conflict handling" name="mode">
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="replace">Replace current day (clear then copy)</Radio>
                <Radio value="merge">Merge (update/insert by period number)</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to manage this date.</Text></Card>
  );
}
