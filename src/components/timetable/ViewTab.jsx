import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Calendar, Segmented, Badge, message } from 'antd';
import { ClockCircleOutlined, BookOutlined, TeamOutlined, StopOutlined } from '@ant-design/icons';
import { supabase } from '../../config/supabaseClient';
import { toMin, overlap } from '../../utils/time';

const { Text } = Typography;

export default function ViewTab({
  classId,
  schoolCode,
  date,                   // dayjs
  slots = [],
  subjects = [],
  teachers = [],
  assignments = []        // for the selected date
}) {
  const [mode, setMode] = useState('day'); // 'day' | 'month'
  const [monthSummary, setMonthSummary] = useState({});
  const [m, holder] = message.useMessage();

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

  const assignmentBySlot = useMemo(() => {
    const m2 = new Map(); assignments.forEach(a => m2.set(a.period_number, a)); return m2;
  }, [assignments]);

  const periodRows = slots.filter(s => s.slot_type === 'period');
  const combinedRows = [
    ...periodRows.map(p => ({ type: 'period', key: `p-${p.slot_number}`, ...p })),
    ...dayBreaks.map(b => ({ type: 'break', key: `b-${b.id}`, ...b }))
  ].sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

  const columnsView = [
    { title: 'Slot', key: 'slot', width: 180,
      render: (_, r) => r.slot_type === 'period' ? <Text strong>Period #{r.slot_number}</Text> : <Tag color="gold">{r.name}</Tag>
    },
    { title: 'Time', key: 'time',
      render: (_, r) => <Space size={6}><ClockCircleOutlined /><span>{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}</span></Space>
    },
    { title: 'Subject', key: 'subject',
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const { clash, b } = clashWithBreakToday(r.start_time, r.end_time);
        if (clash) return <Tag icon={<StopOutlined />} color="warning">During Break: {b.name}</Tag>;
        const name = a?.subject_id ? subjects.find(s => s.id === a.subject_id)?.subject_name : null;
        return name ? <Space size={6}><BookOutlined /><span>{name}</span></Space> : <Tag>Unassigned</Tag>;
      }
    },
    { title: 'Teacher', key: 'teacher',
      render: (_, r) => {
        if (r.slot_type === 'break') return <Text type="secondary">—</Text>;
        const a = assignmentBySlot.get(r.slot_number);
        const { clash } = clashWithBreakToday(r.start_time, r.end_time);
        if (clash) return <Text type="secondary">—</Text>;
        const name = a?.teacher_id ? teachers.find(t => t.id === a.teacher_id)?.full_name : null;
        return name ? <Space size={6}><TeamOutlined /><span>{name}</span></Space> : <Text type="secondary">—</Text>;
      }
    }
  ];

  // Month summary — count assigned vs available periods for each date
  const availablePeriodCountForDow = (dow) => {
    const todaysBreaks = slots.filter(s => s.slot_type === 'break' && Array.isArray(s.weekdays) && s.weekdays.includes(dow));
    const isBlocked = (p) => todaysBreaks.some(b => overlap(toMin(p.start_time), toMin(p.end_time), toMin(b.start_time), toMin(b.end_time)));
    return slots.filter(s => s.slot_type === 'period' && !isBlocked(s)).length;
  };

  const fetchMonthSummary = async (monthMoment) => {
    if (!classId) return setMonthSummary({});
    const start = monthMoment.startOf('month').format('YYYY-MM-DD');
    const end   = monthMoment.endOf('month').format('YYYY-MM-DD');

    const { data: slotsData, error: slotsErr } = await supabase
      .from('timetable_slots')
      .select('class_date, period_number')
      .eq('class_instance_id', classId)
      .gte('class_date', start)
      .lte('class_date', end);
    if (slotsErr) return m.error(slotsErr.message);

    const { data: calData, error: calErr } = await supabase
      .from('school_calendar')
      .select('cal_date, status, label')
      .eq('school_code', schoolCode)
      .gte('cal_date', start)
      .lte('cal_date', end);
    if (calErr) return m.error(calErr.message);

    const byDate = {};
    for (const r of slotsData || []) {
      byDate[r.class_date] = byDate[r.class_date] || { assigned: 0 };
      byDate[r.class_date].assigned += 1;
    }

    const calByDate = {};
    for (const c of calData || []) calByDate[c.cal_date] = { status: c.status, label: c.label };

    const out = {};
    const days = monthMoment.daysInMonth();
    for (let i = 1; i <= days; i++) {
      const d = monthMoment.date(i);
      const key = d.format('YYYY-MM-DD');
      const dow = d.day();
      const assigned = byDate[key]?.assigned || 0;
      const available = availablePeriodCountForDow(dow);
      const override = calByDate[key]?.status;
      const label = calByDate[key]?.label || null;
      const sunday = dow === 0;
      const holiday = (override === 'holiday') || (sunday && override !== 'open');
      out[key] = { assigned, available, holiday, label, sunday };
    }
    setMonthSummary(out);
  };

  useEffect(() => {
    if (mode === 'month' && classId) fetchMonthSummary(date.clone());
  }, [mode, classId, date, slots]);

  if (!classId) {
    return (
      <>
        {holder}
        <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to view.</Text></Card>
      </>
    );
  }

  return mode === 'day' ? (
    <>
      {holder}
      <Table rowKey="key" columns={columnsView} dataSource={combinedRows} pagination={false} bordered style={{ marginTop: 8 }} />
    </>
  ) : (
    <>
      {holder}
      <Card style={{ marginTop: 8 }}>
        <Space style={{ marginBottom: 8 }}>
          <Segmented value={mode} onChange={setMode} options={[{ label: 'Day', value: 'day' }, { label: 'Month', value: 'month' }]} />
        </Space>
        <Calendar
          fullscreen
          value={date}
          onChange={() => {}}
          dateFullCellRender={(d) => {
            const key = d.format('YYYY-MM-DD');
            const s = monthSummary[key];
            const outOfMonth = d.month() !== date.month();
            const base = { color: outOfMonth ? '#999' : undefined };

            if (!s) return <div style={{ padding: 6 }}><Text style={base}>{d.date()}</Text></div>;

            return (
              <div style={{ padding: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={base}>{d.date()}</Text>
                  {s.holiday && <Tag color="red" style={{ marginLeft: 4, padding: '0 6px' }}>Holiday</Tag>}
                </div>
                {!s.holiday && (
                  <div style={{ marginTop: 6 }}>
                    <Badge status={s.assigned >= s.available && s.available ? 'success' : 'processing'} />
                    <Text style={{ marginLeft: 6, ...base }}>
                      {s.assigned}/{s.available} assigned
                    </Text>
                  </div>
                )}
                {s.holiday && s.label && (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
                  </div>
                )}
              </div>
            );
          }}
        />
      </Card>
    </>
  );
}
