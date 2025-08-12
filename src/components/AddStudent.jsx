import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, message, Typography, Space, Row, Col } from 'antd';
import { UserAddOutlined, MailOutlined, LockOutlined, PhoneOutlined, UserOutlined, IdcardOutlined, BookOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthProvider';
import { supabase } from '../config/supabaseClient';

const { Title } = Typography;
const { Option } = Select;
const AddStudent = () => {
  const { user } = useAuth();
    const { school_code, super_admin_code } = user.user_metadata || {};

  const [form] = Form.useForm();
  const [classInstances, setClassInstances] = useState([]);
  const [loading, setLoading] = useState(false);

   useEffect(() => {
    const fetchClassInstances = async () => {
      // BACKEND INTEGRATION: Replace with comprehensive query above
      const { data, error } = await supabase
        .from('class_instances')
        .select(`
          id,
          class:classes (grade, section),
          academic_years:academic_years (year_start, year_end)
        `)
        .eq('school_code', school_code)
        .eq('created_by', super_admin_code);

      if (error) {
        message.error('Failed to load class instances: ' + error.message);
      } else {
        setClassInstances(data || []);
      }
    };

    if (school_code && super_admin_code) fetchClassInstances();
  }, [school_code, super_admin_code]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // AUTHENTICATION: Validate current user session
      const sessionResult = await supabase.auth.getSession();
      const token = sessionResult.data.session?.access_token;

      if (!token) {
        message.error('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

  
      const response = await fetch('https://mvvzqouqxrtyzuzqbeud.supabase.co/functions/v1/create-student', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
          password: values.password,
          phone: values.phone,
          student_code: values.student_code,
          class_instance_id: values.class_instance_id,
        
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // ERROR HANDLING: Display specific error messages
        message.error(result.error || `Failed to create student. Status: ${response.status}`);
      } else {
        // SUCCESS HANDLING: User feedback and form reset
        message.success('Student created successfully!');
        form.resetFields();
   
      }
    } catch (err) {
      // GENERAL ERROR HANDLING: Network and unexpected errors
      message.error('Unexpected error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px', background: '#f8fafc' }}>
      <div className="max-w-3xl mx-auto">
        <Card
          title={
            <Space>
              <UserAddOutlined />
              <Title level={3} style={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>Add New Student</Title>
            </Space>
          }
          style={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            background: '#ffffff'
          }}
          headStyle={{ borderBottom: '1px solid #e2e8f0' }}
        >

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
            initialValues={{
              student_code: 'S'
            }}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="full_name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter full name' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Enter student's full name"
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Enter email address"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Enter password"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="Phone Number"
                  rules={[
                    { required: true, message: 'Please enter phone number' },
                    { pattern: /^[0-9+\-\s()]+$/, message: 'Please enter a valid phone number' }
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Enter phone number"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="student_code"
                  label="Student Code"
                  rules={[{ required: true, message: 'Please enter student code' }]}
                >
                  <Input
                    prefix={<IdcardOutlined />}
                    placeholder="Enter student code"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>

                <Form.Item
                  name="class_instance_id"
                  label="Class"
                  rules={[{ required: true, message: 'Please select a class' }]}
                >
                  <Select
                    placeholder="Select class"
                    showSearch
                    optionFilterProp="children"
                    suffixIcon={<BookOutlined />}
                  >
                    {classInstances.map((instance) => (
                      <Option key={instance.id} value={instance.id}>
                        Grade {instance.class.grade} - {instance.class.section} | 
                        AY {instance.academic_years.year_start} - {instance.academic_years.year_end}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: '#6366f1',
                    borderColor: '#6366f1',
                    borderRadius: '8px',
                    fontWeight: 500
                  }}
                >
                  {loading ? 'Adding Student...' : 'Add Student'}
                </Button>
                <Button
                  size="large"
                  onClick={() => form.resetFields()}
                >
                  Reset Form
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default AddStudent;