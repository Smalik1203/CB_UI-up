import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Typography, Select, DatePicker, Tabs, Tag, Divider, Space, Button, Modal, Form, message, Switch
} from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../AuthProvider';
import ManageTab from '../components/timetable/ManageTab';
import CreateTab from '../components/timetable/CreateTab';
import ViewTab from '../components/timetable/ViewTab';
import { parseFlexibleTime } from '../utils/time';

const { Title } = Typography;
const { Option } = Select;

export default function Timetable() {
  const { user } = useAuth();
  const schoolCode = user?.user_metadata?.school_code;
  const createdBy = user?.user_metadata?.super_admin_code;

  const [msg, holder] = message.useMessage();
  const ok = (t, key = 'ok') => msg.open({ type: 'success', content: t, key, duration: 2 });
  const err = (t, key = 'err') => msg.open({ type: 'error', content: t, key, duration: 2.5 });

  // lookups
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [templates, setTemplates] = useState([]);

  // selections
  const [classId, setClassId] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [tab, setTab] = useState('manage');

  // class timeline + assignments
  const [slots, setSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // calendar overrides
  const [calendar, setCalendar] = useState(null);
  const isSunday = date.day() === 0;
  const isCustomHoliday = calendar?.status === 'holiday';
  const isSundayOpen = isSunday && calendar?.status === 'open';
  const isHoliday = (isSunday && !isSundayOpen) || isCustomHoliday;

  // assign modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingSlotNumber, setEditingSlotNumber] = useState(null);
  const [form] = Form.useForm();

  // fetchers
  useEffect(() => { fetchClasses(); fetchSubjects(); fetchTeachers(); fetchTemplates(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (classId) fetchSlots(); }, [classId]);
  useEffect(() => { if (classId && date) fetchAssignments(); }, [classId, date]);
  useEffect(() => { if (schoolCode && date) fetchCalendar(); }, [schoolCode, date]);

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('class_instances').select('id, grade, section')
      .eq('school_code', schoolCode)
      .order('grade', { ascending: true }).order('section', { ascending: true });
    if (error) return err(error.message);
    setClasses(data || []);
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects').select('id, subject_name')
      .eq('school_code', schoolCode)
      .order('subject_name', { ascending: true });
    if (error) return err(error.message);
    setSubjects(data || []);
  };

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('admin').select('id, full_name')
      .eq('school_code', schoolCode)
      .order('full_name', { ascending: true });
    if (error) return err(error.message);
    setTeachers(data || []);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('break_templates').select('id, name, default_duration_mins')
      .eq('school_code', schoolCode)
      .order('name', { ascending: true });
    if (error) return err(error.message);
    setTemplates(data || []);
  };

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from('class_slots')
      .select('id, slot_number, slot_type, name, start_time, end_time, weekdays')
      .eq('class_instance_id', classId)
      .order('start_time', { ascending: true });
    if (error) return err(error.message);
    setSlots(data || []);
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('timetable_slots')
      .select('period_number, subject_id, teacher_id')
      .eq('class_instance_id', classId)
      .eq('class_date', date.format('YYYY-MM-DD'));
    if (error) return err(error.message);
    setAssignments(data || []);
  };

  const fetchCalendar = async () => {
    const { data, error } = await supabase
      .from('school_calendar')
      .select('id, cal_date, status, label')
      .eq('school_code', schoolCode)
      .eq('cal_date', date.format('YYYY-MM-DD'));
    if (error) return err(error.message);
    setCalendar((data && data[0]) || null);
  };

  // helpers
  const nextSlotNumber = useMemo(() => {
    const maxNum = slots.reduce((acc, s) => Math.max(acc, s.slot_number), 0);
    return maxNum + 1;
  }, [slots]);

  const assignedCount = useMemo(() => {
    const map = new Map(assignments.map(a => [a.period_number, true]));
    return slots.filter(s => s.slot_type === 'period' && map.has(s.slot_number)).length;
  }, [assignments, slots]);

  // mutations
  const addSlot = async ({ slotType, startText, duration, breakName, breakWeekdays }) => {
    const start = parseFlexibleTime(startText);
    if (!classId) return err('Select a class.');
    if (!start) return err('Invalid start time.');
    if (duration <= 0) return err('Duration must be > 0.');

    const end = dayjs(start).add(duration, 'minute');
    const payload = {
      school_code: schoolCode,
      class_instance_id: classId,
      slot_number: nextSlotNumber,
      slot_type: slotType,
      name: slotType === 'break' ? (breakName || '').trim() : null,
      start_time: start.format('HH:mm:ss'),
      end_time: end.format('HH:mm:ss'),
      weekdays: slotType === 'break' ? breakWeekdays : null,
      created_by: createdBy
    };
    const { error } = await supabase.from('class_slots').insert([payload]);
    if (error) return err(error.message);
    ok(slotType === 'period' ? `Added period #${nextSlotNumber}` : `Added break "${payload.name}"`);
    await fetchSlots();
  };

  const deleteSlot = async (slot) => {
    const id = slot.id ?? slot;
    const { error } = await supabase.from('class_slots').delete().eq('id', id);
    if (error) return err(error.message);
    ok('Deleted.');
    await Promise.all([fetchSlots(), fetchAssignments()]);
  };

  const openAssign = (slot_number) => {
    setEditingSlotNumber(slot_number);
    const a = assignments.find(x => x.period_number === slot_number);
    form.setFieldsValue({ subject_id: a?.subject_id, teacher_id: a?.teacher_id });
    setEditOpen(true);
  };

  const saveAssign = async () => {
    if (isHoliday) { err('This date is a holiday. Override it to schedule classes.'); return; }
    const vals = await form.validateFields();
    const rec = {
      school_code: schoolCode,
      class_instance_id: classId,
      class_date: date.format('YYYY-MM-DD'),
      period_number: editingSlotNumber,
      subject_id: vals.subject_id,
      teacher_id: vals.teacher_id,
      created_by: createdBy
    };
    const { error } = await supabase.from('timetable_slots').upsert(rec, {
      onConflict: 'class_instance_id,class_date,period_number'
    });
    if (error) {
      if (error.code === '23505') {
        // teacher double-book unique
        return msg.open({
          type: 'error',
          content: 'Teacher already booked for this date & period.',
          key: 'teacher-clash',                      // <- dedupe the toast
          duration: 2.5
        });
      }
      return err(error.message);
    }
    ok('Saved.', 'save-ok');
    setEditOpen(false); setEditingSlotNumber(null); form.resetFields(); fetchAssignments();
  };

  // holiday actions
  const setSundayOpenOverride = async (open) => {
    const d = date.format('YYYY-MM-DD');
    if (open) {
      const { error } = await supabase.from('school_calendar').upsert({
        school_code: schoolCode, cal_date: d, status: 'open', label: 'Sunday class override', created_by: createdBy
      }, { onConflict: 'school_code,cal_date' });
      if (error) return err(error.message);
    } else {
      const { error } = await supabase.from('school_calendar')
        .delete().eq('school_code', schoolCode).eq('cal_date', d).eq('status', 'open');
      if (error) return err(error.message);
    }
    ok('Updated.'); fetchCalendar();
  };

  const declareHoliday = async (label = 'Holiday') => {
    const { error } = await supabase.from('school_calendar').upsert({
      school_code: schoolCode, cal_date: date.format('YYYY-MM-DD'), status: 'holiday', label, created_by: createdBy
    }, { onConflict: 'school_code,cal_date' });
    if (error) return err(error.message);
    ok('Holiday saved.'); fetchCalendar();
  };

  const clearHoliday = async () => {
    const { error } = await supabase.from('school_calendar')
      .delete().eq('school_code', schoolCode).eq('cal_date', date.format('YYYY-MM-DD')).eq('status', 'holiday');
    if (error) return err(error.message);
    ok('Holiday removed.'); fetchCalendar();
  };

  const Toolbar = (
    <Space wrap>
      <Select style={{ width: 260 }} placeholder="Select Class"
              value={classId || undefined} onChange={setClassId}>
        {classes.map(c => <Option key={c.id} value={c.id}>Grade {c.grade} - {c.section}</Option>)}
      </Select>

      {tab !== 'view' ? (
        <DatePicker value={date} onChange={setDate} allowClear={false} disabled={tab !== 'manage'} />
      ) : (
        <DatePicker value={date} onChange={setDate} allowClear={false} />
      )}

      <Tag icon={<CalendarOutlined />} color="processing">{date.format('ddd, DD MMM YYYY')}</Tag>

      {classId && tab === 'manage' && (
        <>
          <Divider type="vertical" />
          <Tag color="default">
            {(() => {
              const totalPeriods = slots.filter(s => s.slot_type === 'period').length;
              const assigned = Math.min(assignedCount, totalPeriods);
              return `${assigned}/${totalPeriods} assigned`;
            })()}
          </Tag>
        </>
      )}

      {tab === 'manage' && (
        <>
          {isSunday && !isCustomHoliday && (
            <Space>
              <Switch
                checked={isSundayOpen}
                onChange={setSundayOpenOverride}
                checkedChildren="Open this Sunday"
                unCheckedChildren="Sunday Holiday"
              />
            </Space>
          )}
          {isCustomHoliday && (
            <Space>
              <Tag color="red">Holiday{calendar?.label ? `: ${calendar.label}` : ''}</Tag>
              <Button size="small" onClick={clearHoliday}>Clear Holiday</Button>
            </Space>
          )}
          {!isSunday && !isCustomHoliday && (
            <Button size="small" onClick={() => declareHoliday('Custom holiday')}>Mark as Holiday</Button>
          )}
        </>
      )}
    </Space>
  );

  return (
    <Card>
      {holder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>Timetable</Title>
        {Toolbar}
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'manage',
            label: 'Manage',
            children: (
              <ManageTab
                classId={classId}
                date={date}
                isHoliday={isHoliday}
                slots={slots}
                subjects={subjects}
                teachers={teachers}
                assignments={assignments}
                onOpenAssign={(slotNo) => openAssign(slotNo)}
                onDeleteSlot={(slot) => deleteSlot(slot)}
              />
            )
          },
          {
            key: 'create',
            label: 'Create',
            children: (
              <CreateTab
                classId={classId}
                schoolCode={schoolCode}
                createdBy={createdBy}
                templates={templates}
                slots={slots}
                nextSlotNumber={nextSlotNumber}
                onAddSlot={addSlot}
                onDeleteSlot={(slot) => deleteSlot(slot)}
                onReloadTemplates={fetchTemplates}
              />
            )
          },
          {
            key: 'view',
            label: 'View',
            children: (
              <ViewTab
                classId={classId}
                schoolCode={schoolCode}
                date={date}
                slots={slots}
                subjects={subjects}
                teachers={teachers}
                assignments={assignments}
              />
            )
          }
        ]}
      />

      <Modal
        open={editOpen}
        title={`Assign — Period #${editingSlotNumber} (${date.format('YYYY-MM-DD')})`}
        onCancel={() => { setEditOpen(false); setEditingSlotNumber(null); form.resetFields(); }}
        onOk={saveAssign}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select subject" optionFilterProp="children">
              {subjects.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="teacher_id" label="Teacher" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select teacher" optionFilterProp="children">
              {teachers.map(t => <Option key={t.id} value={t.id}>{t.full_name}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
