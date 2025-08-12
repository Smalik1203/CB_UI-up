import React, { useEffect, useState } from 'react';
import { Table, Space, Input, Select, Button, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../../config/supabaseClient';

const { Option } = Select;

export default function TemplateManager({ schoolCode, createdBy, onChange }) {
  const [name, setName] = useState('');
  const [mins, setMins] = useState(15);
  const [list, setList] = useState([]);
  const [m, holder] = message.useMessage();

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from('break_templates').select('id, name, default_duration_mins')
      .eq('school_code', schoolCode).order('name', { ascending: true });
    if (error) return m.error(error.message);
    setList(data || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const add = async () => {
    if (!name.trim()) return m.error('Name required.');
    const { error } = await supabase.from('break_templates').upsert({
      school_code: schoolCode, name: name.trim(), default_duration_mins: mins, created_by: createdBy
    }, { onConflict: 'school_code,name' });
    if (error) return m.error(error.message);
    m.success('Saved template.');
    setName(''); setMins(15);
    fetchAll(); onChange?.();
  };

  const del = async (id) => {
    const { error } = await supabase.from('break_templates').delete().eq('id', id);
    if (error) return m.error(error.message);
    m.success('Deleted template.');
    fetchAll(); onChange?.();
  };

  return (
    <div>
      {holder}
      <Space wrap style={{ marginBottom: 12 }}>
        <Input placeholder="Template name (e.g., Lunch)" value={name} onChange={e => setName(e.target.value)} style={{ width: 220 }} />
        <Select value={mins} style={{ width: 140 }} onChange={setMins}>
          {[10, 15, 20, 25, 30, 40, 45, 60].map(x => <Option key={x} value={x}>{x} min</Option>)}
        </Select>
        <Button type="primary" onClick={add}>Save Template</Button>
      </Space>
      <Table
        rowKey="id"
        pagination={false}
        bordered
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Default Duration', dataIndex: 'default_duration_mins', render: (m) => `${m} min` },
          {
            title: 'Delete', key: 'x', width: 90, render: (_, r) => (
              <Popconfirm title="Delete template?" onConfirm={() => del(r.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )
          }
        ]}
        dataSource={list}
      />
    </div>
  );
}
