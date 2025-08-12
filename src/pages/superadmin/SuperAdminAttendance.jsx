import React, { useEffect, useState } from 'react';
import {
  Card, Tabs, Select, DatePicker, Button, Typography, Table, Space, message, Row, Col
} from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { supabase } from '../../config/supabaseClient';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const SuperAdminAttendance = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [activeTab, setActiveTab] = useState('mark');

  const [classInstances, setClassInstances] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const [loading, setLoading] = useState(false);
  const [historyDate, setHistoryDate] = useState(null);
  const [reportDate, setReportDate] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [reportStats, setReportStats] = useState({ rate: 0, present: 0, absent: 0, total: 0 });

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (u) {
        setUser(u);
        setRole(u.user_metadata?.role || '');
        setSchoolCode(u.user_metadata?.school_code || '');
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user || !schoolCode) return;
    async function fetchClasses() {
      const { data } = await supabase
        .from('class_instances')
        .select('id, grade, section')
        .eq('school_code', schoolCode);
      setClassInstances(data || []);
    }
    fetchClasses();
  }, [user, schoolCode]);

  useEffect(() => {
    if (!selectedClassId || !schoolCode) return;
    async function fetchStudents() {
      const { data } = await supabase
        .from('student')
        .select('id, full_name')
        .eq('class_instance_id', selectedClassId)
        .eq('school_code', schoolCode);
      setStudents(data || []);
      const defaultStatus = {};
      (data || []).forEach(s => { defaultStatus[s.id] = 'present'; });
      setAttendance(defaultStatus);
    }
    fetchStudents();
  }, [selectedClassId, schoolCode]);

  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => { updated[s.id] = status; });
    setAttendance(updated);
  };


  const handleSubmit = async () => {
    if (!schoolCode || !selectedClassId || students.length === 0) return;
    setLoading(true);
    const marked_by = user?.id;
    const marked_by_role_code = user.user_metadata?.super_admin_code || '';
    const records = students.map(s => ({
      student_id: s.id,
      class_instance_id: selectedClassId,
      date,
      status: attendance[s.id],
      marked_by,
      marked_by_role_code,
      school_code: schoolCode
    }));

    const { error } = await supabase.from('attendance').insert(records);
    if (error) {
      message.error(error.message);
    } else {
      message.success('Attendance submitted!');
    }
    setLoading(false);
  };
  const userName = user?.user_metadata?.full_name;
  const fetchAttendanceHistory = async () => {
    if (!historyDate) return;
    let query = supabase
      .from('attendance')
      .select('id, date, student_id, status, marked_by, marked_by_role_code')
      .eq('school_code', schoolCode);
    if (selectedClassId) query = query.eq('class_instance_id', selectedClassId);
    if (historyDate) query = query.eq('date', historyDate.format('YYYY-MM-DD'));
    const { data } = await query.order('date', { ascending: false });
    setAttendanceHistory(data || []);
  };

  useEffect(() => {
    if (activeTab === 'view') fetchAttendanceHistory();
  }, [historyDate, selectedClassId, activeTab]);

  const fetchReportStats = async () => {
    if (!reportDate) return;
    let query = supabase.from('attendance').select('status').eq('school_code', schoolCode);
    if (selectedClassId) query = query.eq('class_instance_id', selectedClassId);
    if (reportDate) query = query.eq('date', reportDate.format('YYYY-MM-DD'));
    const { data } = await query;
    const total = data?.length || 0;
    const present = data?.filter(d => d.status === 'present').length || 0;
    const absent = data?.filter(d => d.status === 'absent').length || 0;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    setReportStats({ rate, present, absent, total });
  };

  useEffect(() => {
    if (activeTab === 'reports') fetchReportStats();
  }, [reportDate, selectedClassId, activeTab]);

  const historyColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    {
      title: 'Student',
      dataIndex: 'student_id',
      key: 'student_id',
      render: (id) => {
        const student = students.find(s => s.id === id);
        return student ? student.full_name : id;
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Marked by', dataIndex: 'marked_by_role_code', key: 'marked_by_role_code' },
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <Space align="center" style={{ marginBottom: 20 }}>
          <BookOutlined style={{ fontSize: 24 }} />
          <Title level={3} style={{ margin: 0 }}>School Attendance</Title>
        </Space>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Mark Attendance" key="mark">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <label>Class</label>
                <Select
                  placeholder="Select Class"
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  style={{ width: '100%' }}
                >
                  {classInstances.map(cls => (
                    <Option key={cls.id} value={cls.id}>
                      Grade {cls.grade} - Section {cls.section}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <label>Date</label>
                <DatePicker
                  value={date ? dayjs(date) : null}
                  onChange={d => setDate(d.format('YYYY-MM-DD'))}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={8}>
                <label>Quick Actions</label>
                <Space>
                  <Button onClick={() => markAll('present')}>All Present</Button>
                  <Button onClick={() => markAll('absent')}>All Absent</Button>
                  <Button onClick={() => markAll('late')}>All Late</Button>
                </Space>
              </Col>
            </Row>
            <Table
              dataSource={students.map(s => ({
                key: s.id,
                name: s.full_name,
                status: (
                  <Select
                    value={attendance[s.id] || 'present'}
                    onChange={(val) => setAttendance(a => ({ ...a, [s.id]: val }))}
                    style={{ width: 120 }}
                  >
                    <Option value="present">Present</Option>
                    <Option value="absent">Absent</Option>
                    <Option value="late">Late</Option>
                  </Select>
                )
              }))}
              columns={[{ title: 'Student', dataIndex: 'name' }, { title: 'Status', dataIndex: 'status' }]}
              pagination={false}
              style={{ marginTop: 16 }}
            />
            <Button type="primary" loading={loading} onClick={handleSubmit} style={{ marginTop: 16 }}>
              Submit Attendance
            </Button>
          </Tabs.TabPane>

          <Tabs.TabPane tab="View History" key="view">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <label>Date</label>
                <DatePicker
                  value={historyDate}
                  onChange={setHistoryDate}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={8}>
                <label>Class</label>
                <Select
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  style={{ width: '100%' }}
                  placeholder="Select Class"
                >
                  {classInstances.map(cls => (
                    <Option key={cls.id} value={cls.id}>
                      Grade {cls.grade} - Section {cls.section}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
            <Table
              columns={historyColumns}
              dataSource={attendanceHistory.map((r, i) => ({ key: i, ...r }))}
              style={{ marginTop: 16 }}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Reports" key="reports">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <label>Class</label>
                <Select
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  style={{ width: '100%' }}
                  placeholder="Select Class"
                >
                  {classInstances.map(cls => (
                    <Option key={cls.id} value={cls.id}>
                      Grade {cls.grade} - Section {cls.section}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <label>Date</label>
                <DatePicker
                  value={reportDate}
                  onChange={setReportDate}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <p><b>Total Records:</b> {reportStats.total}</p>
              <p><b>Present:</b> {reportStats.present}</p>
              <p><b>Absent:</b> {reportStats.absent}</p>
              <p><b>Attendance Rate:</b> {reportStats.rate}%</p>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Analytics" key="analytics">
            <p>Advanced analytics coming soon...</p>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default SuperAdminAttendance;
