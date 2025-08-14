// src/pages/Timetable.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, DatePicker, Select, Space, Typography, Tabs, message } from 'antd';
import dayjs from 'dayjs';
import { supabase } from '../config/supabaseClient';
import ManageTab from '../components/timetable/ManageTab.jsx';
import ViewTab from '../components/timetable/ViewTab.jsx';

const { Text } = Typography;

export default function Timetable() {
  const [msg, ctx] = message.useMessage();

  // auth context
  const [me, setMe] = useState(null);

  // filters
  const [classId, setClassId] = useState(null);
  const [date, setDate] = useState(dayjs());
  const dateStr = useMemo(() => date.format('YYYY-MM-DD'), [date]);

  // lists
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // date-based timetable slots (periods & breaks)
  const [daySlots, setDaySlots] = useState([]);
  // chapter index: Map<syllabus_item_id, { unit_no, title, status, subject_id }>
  const [chaptersById, setChaptersById] = useState(new Map());

  // bootstrap
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) throw new Error('Not signed in');
        const { data: meRow, error: meErr } = await supabase
          .from('users').select('id, role, school_code').eq('id', auth.user.id).single();
        if (meErr) throw meErr;
        setMe(meRow);

        const [{ data: ci }, { data: subs }, { data: staff }] = await Promise.all([
          supabase.from('class_instances')
            .select('id, grade, section').eq('school_code', meRow.school_code)
            .order('grade').order('section'),
          supabase.from('subjects')
            .select('id, subject_name').eq('school_code', meRow.school_code)
            .order('subject_name'),
          supabase.from('admin')
            .select('id, full_name').eq('school_code', meRow.school_code)
            .order('full_name'),
        ]);

        setClasses(ci ?? []);
        setSubjects(subs ?? []);
        setTeachers(staff ?? []);
        if ((ci ?? []).length && !classId) setClassId(ci[0].id);
      } catch (e) {
        msg.error(e?.message || 'Failed to initialize');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch day slots (periods + breaks) for classId/dateStr
  async function fetchDaySlots() {
    if (!classId) return setDaySlots([]);
    const { data, error } = await supabase
      .from('timetable_slots')
      .select(`
        id, class_instance_id, class_date, period_number,
        slot_type, name, start_time, end_time,
        subject_id, teacher_id, syllabus_item_id, plan_text, status
      `)
      .eq('class_instance_id', classId)
      .eq('class_date', dateStr)
      .order('start_time', { ascending: true })
      .order('period_number', { ascending: true });
    if (error) { msg.error(error.message); return; }
    setDaySlots(data ?? []);
  }

  // build chapters index for class (so we can resolve chapter name in tables)
  async function fetchChaptersIndex() {
    if (!classId) return setChaptersById(new Map());
    const { data: syllabi, error: sylErr } = await supabase
      .from('syllabi').select('id, subject_id').eq('class_instance_id', classId);
    if (sylErr) { msg.error(sylErr.message); return; }
    const ids = (syllabi ?? []).map(s => s.id);
    if (!ids.length) return setChaptersById(new Map());

    const { data: items, error: itErr } = await supabase
      .from('syllabus_items')
      .select('id, syllabus_id, unit_no, title, status')
      .in('syllabus_id', ids);
    if (itErr) { msg.error(itErr.message); return; }

    const byId = new Map();
    const subjBySyl = new Map((syllabi ?? []).map(s => [s.id, s.subject_id]));
    for (const ch of (items ?? [])) {
      byId.set(ch.id, {
        unit_no: ch.unit_no,
        title: ch.title,
        status: ch.status,
        subject_id: subjBySyl.get(ch.syllabus_id) || null,
      });
    }
    setChaptersById(byId);
  }

  // refresh on class/date change
  useEffect(() => {
    if (!classId) return;
    fetchDaySlots();
    fetchChaptersIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, dateStr]);

  // realtime for the selected day
  useEffect(() => {
    if (!classId) return;
    const ch = supabase.channel(`tt-day-${classId}-${dateStr}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'timetable_slots', filter: `class_instance_id=eq.${classId}` },
        (payload) => {
          const row = payload.new || payload.old;
          if (!row || row.class_date !== dateStr) return;
          fetchDaySlots();
        }
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, [classId, dateStr]);

  const classOptions = useMemo(
    () => (classes ?? []).map(c => ({
      label: `Grade ${c.grade ?? ''}${c.section ? '-' + c.section : ''}`,
      value: c.id
    })), [classes]
  );

  const tabs = [
    {
      key: 'manage',
      label: 'Manage',
      children: (
        <ManageTab
          classId={classId}
          date={date}
          subjects={subjects}
          teachers={teachers}
          daySlots={daySlots}
          chaptersById={chaptersById}
          refreshDay={fetchDaySlots}
        />
      ),
    },
    {
      key: 'view',
      label: 'View',
      children: (
        <ViewTab
          classId={classId}
          date={date}
          subjects={subjects}
          teachers={teachers}
          daySlots={daySlots}
          chaptersById={chaptersById}
        />
      ),
    },
  ];

  return (
    <Card
      title="Timetable (Date-Based)"
      extra={
        <Space wrap>
          {ctx}
          <Space>
            <Text strong>Class</Text>
            <Select
              style={{ width: 320 }}
              showSearch
              placeholder="Select class"
              value={classId || undefined}
              options={classOptions}
              onChange={setClassId}
              optionFilterProp="label"
            />
          </Space>
          <Space>
            <Text strong>Date</Text>
            <DatePicker value={date} onChange={(d) => setDate(d || dayjs())} />
          </Space>
        </Space>
      }
    >
      <Tabs defaultActiveKey="manage" items={tabs} />
    </Card>
  );
}
