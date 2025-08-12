import React, { useMemo, useState } from 'react';
import { Card, Typography, Space, Radio, Select, Input, Button, Divider, Table, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TemplateManager from './TemplateManager';
import { parseFlexibleTime, nice } from '../../utils/time';

const { Title, Text } = Typography;
const { Option } = Select;

export default function CreateTab({
  classId,
  schoolCode,
  createdBy,
  templates = [],
  slots = [],
  nextSlotNumber,
  onAddSlot,        // ({ slotType, startText, duration, breakName, breakWeekdays }) => Promise<void>
  onDeleteSlot,     // (slot) => Promise<void>
  onReloadTemplates // () => void
}) {
  const [slotKind, setSlotKind] = useState('period'); // 'period'|'break'
  const [startText, setStartText] = useState('');
  const [duration, setDuration] = useState(45);
  const [breakName, setBreakName] = useState('');
  const [breakTemplateId, setBreakTemplateId] = useState(null);
  const [breakWeekdays, setBreakWeekdays] = useState([1, 2, 3, 4, 5, 6]); // default Mon–Sat

  const endPreview = useMemo(() => {
    const start = parseFlexibleTime(startText);
    return start ? dayjs(start).add(duration, 'minute') : null;
  }, [startText, duration]);

  const add = async () => {
    if (!classId) return message.error('Select a class.');
    await onAddSlot({ slotType: slotKind, startText, duration, breakName, breakWeekdays });
    // reset
    setStartText('');
    if (slotKind === 'break') { setBreakName(''); setBreakTemplateId(null); setDuration(15); }
  };

  return classId ? (
    <>
      <Card type="inner" title="Create Slot" style={{ marginTop: 8 }}>
        <Space style={{ marginBottom: 12 }} wrap align="center">
          <Radio.Group value={slotKind} onChange={(e) => setSlotKind(e.target.value)}>
            <Radio.Button value="period">Period</Radio.Button>
            <Radio.Button value="break">Break</Radio.Button>
          </Radio.Group>

          {slotKind === 'break' && (
            <Select
              placeholder="Break template"
              style={{ minWidth: 220 }}
              allowClear
              value={breakTemplateId || undefined}
              onChange={(id) => {
                setBreakTemplateId(id || null);
                const t = templates.find(x => x.id === id);
                if (t) { setBreakName(t.name); setDuration(t.default_duration_mins); }
              }}
            >
              {templates.map(t => (
                <Option key={t.id} value={t.id}>{t.name} • {t.default_duration_mins}m</Option>
              ))}
            </Select>
          )}

          {slotKind === 'break' && (
            <Input
              placeholder="Break name (e.g., Recess, Lunch)"
              value={breakName}
              onChange={e => setBreakName(e.target.value)}
              style={{ width: 220 }}
            />
          )}

          <Input
            placeholder={slotKind === 'period' ? 'Start (e.g. 7:30a)' : 'Start (e.g. 10:30a)'}
            value={startText}
            onChange={e => setStartText(e.target.value)}
            style={{ width: 160 }}
          />

          <Select value={duration} style={{ width: 140 }} onChange={setDuration}>
            {[10, 15, 20, 25, 30, 35, 40, 45, 50, 60].map(m => <Option key={m} value={m}>{m} min</Option>)}
          </Select>

          <Input
            readOnly
            value={nice(endPreview, true)}
            placeholder="End (auto)"
            style={{ width: 140, background: '#fafafa' }}
          />

          {slotKind === 'break' && (
            <Select
              mode="multiple"
              value={breakWeekdays}
              onChange={setBreakWeekdays}
              placeholder="Weekdays"
              style={{ minWidth: 280 }}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <Option key={i} value={i}>{d}</Option>
              ))}
            </Select>
          )}

          <Button type="primary" onClick={add}>
            {slotKind === 'period' ? `Add Period #${nextSlotNumber}` : 'Add Break'}
          </Button>
        </Space>

        <Divider />

        <Title level={5} style={{ marginTop: 0 }}>Existing Slots</Title>
        <Table
          rowKey="id"
          pagination={false}
          bordered
          columns={[
            { title: 'Slot', key: 's', render: (_, r) => r.slot_type === 'period' ? <Text strong>Period #{r.slot_number}</Text> : <Text>{r.name}</Text> },
            { title: 'Start', dataIndex: 'start_time', render: (t) => (t || '').slice(0, 5) },
            { title: 'End', dataIndex: 'end_time', render: (t) => (t || '').slice(0, 5) },
            { title: 'Type', dataIndex: 'slot_type', render: (v) => v === 'period' ? 'Period' : 'Break' },
            {
              title: 'Weekdays',
              dataIndex: 'weekdays',
              render: (arr) =>
                Array.isArray(arr)
                  ? arr.map(x => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x]).join(', ')
                  : '—'
            },
            {
              title: 'Delete',
              key: 'del',
              width: 90,
              render: (_, r) => (
                <Popconfirm title="Delete this slot?" onConfirm={() => onDeleteSlot(r)}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )
            }
          ]}
          dataSource={slots}
        />
      </Card>

      <Card type="inner" title="Break Templates" style={{ marginTop: 16 }}>
        <TemplateManager schoolCode={schoolCode} createdBy={createdBy} onChange={onReloadTemplates} />
      </Card>
    </>
  ) : (
    <Card style={{ marginTop: 12 }}><Text type="secondary">Select a class to create slots.</Text></Card>
  );
}
