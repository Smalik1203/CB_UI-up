import React, { useMemo } from 'react';
import { Card, Table, Tag, Typography, Space, Empty } from 'antd';
import { ClockCircleOutlined, BookOutlined, TeamOutlined, StopOutlined } from '@ant-design/icons';
import { toMin, overlap } from '../../utils/time';

const { Text } = Typography;

const STATUS_COLOR = { pending: '#9CA3AF', in_progress: '#F59E0B', completed: '#16A34A' };

export default function ViewTab({
  classId,
  date,            // dayjs
  slots = [],      // unified class_slots
  subjects = [],
  teachers = [],
  assignments = [],         // timetable_slots for that date
  chaptersIndex = null,     // optional: Map(subject_id => Map(chapter_id => {unit_no,title,status}))
}) {
  const assignmentBySlot = useMemo(() => {
    const m = new Map();
    assignments.forEach(a => m.set(a.period_number ?? a.periodNumber, a));
    return m;
  }, [assignments]);

  const subjectName = (id) => subjects.find(s => s.id === id)?.subject_name || '—';
  const teacherName = (id) => teachers.find(t => t.id === id)?.full_name || '—';

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
        const subjId = a?.subject_id ?? a?.subjectId;
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
        const subjId = a?.subject_id ?? a?.subjectId;
        const chId = a?.syllabus_item_id ?? a?.syllabusItemId;
        if (!subjId || !chId) return <Text type="secondary">—</Text>;

        // If a chaptersIndex is supplied, use it for display (prebuilt for speed)
        if (chaptersIndex) {
          const m = chaptersIndex.get(subjId);
          const ch = m ? m.get(chId) : null;
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

        // Fallback: show only label without status color if not provided
        return <Text type="secondary">Chapter assigned</Text>;
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
    }
  ];

  return classId ? (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={combinedRows}
      pagination={false}
      bordered
      style={{ marginTop: 8 }}
      scroll={{ x: 1140 }}
      locale={{ emptyText: <Empty description="No periods/breaks configured" /> }}
    />
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to view its day.</Text></Card>
  );
}
