// src/components/timetable/ViewTab.jsx
import React, { useMemo } from 'react';
import { Card, Table, Tag, Typography, Space, Empty } from 'antd';
import { ClockCircleOutlined, BookOutlined } from '@ant-design/icons';

const { Text } = Typography;
const STATUS_COLOR = { pending: '#9CA3AF', in_progress: '#F59E0B', completed: '#16A34A' };

export default function ViewTab({
  classId,
  date,            // dayjs (not used in render)
  subjects = [],
  teachers = [],
  daySlots = [],   // timetable_slots of that date
  chaptersById = new Map(),
}) {
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

  const columns = [
    {
      title: 'Slot', key: 'slot', width: 180,
      render: (_, r) => r.slot_type === 'break'
        ? <Tag color="gold">{r.name || 'Break'}</Tag>
        : <Text strong>Period #{r.period_number}</Text>
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
        ? (r.teacher_id ? <span>{teacherName(r.teacher_id)}</span> : <Text type="secondary">—</Text>)
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
  ];

  return classId ? (
    <Card style={{ marginTop: 8 }}>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={rows}
        pagination={false}
        bordered
        scroll={{ x: 1140 }}
        rowClassName={(r) => r.slot_type === 'break' ? 'row-break' : ''}
        locale={{ emptyText: <Empty description="No slots yet for this date" /> }}
      />
      <style>{`
        .row-break td { background: #fffbe6 !important; } /* soft yellow */
      `}</style>
    </Card>
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to view this date.</Text></Card>
  );
}
