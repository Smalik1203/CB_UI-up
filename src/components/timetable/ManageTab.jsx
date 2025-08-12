import React, { useMemo } from 'react';
import { Card, Table, Tag, Typography, Space, Button, Popconfirm, Tooltip } from 'antd';
import {
  ClockCircleOutlined, BookOutlined, TeamOutlined, StopOutlined,
  EditOutlined, PlusCircleOutlined, DeleteOutlined
} from '@ant-design/icons';
import { toMin, overlap } from '../../utils/time';

const { Text } = Typography;

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
  const assignmentBySlot = useMemo(() => {
    const m = new Map();
    assignments.forEach(a => m.set(a.period_number, a));
    return m;
  }, [assignments]);

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
      width: 180,
      render: (_, r) =>
        r.slot_type === 'period'
          ? <Text strong>Period #{r.slot_number}</Text>
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
        const name = a?.subject_id ? subjects.find(s => s.id === a.subject_id)?.subject_name : null;
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
        const name = a?.teacher_id ? teachers.find(t => t.id === a.teacher_id)?.full_name : null;
        return name
          ? <Space size={6}><TeamOutlined /><span>{name}</span></Space>
          : <Text type="secondary">—</Text>;
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
      />
    </>
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to manage its day.</Text></Card>
  );
}
