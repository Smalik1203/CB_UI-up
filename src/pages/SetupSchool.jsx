import React from 'react';
import { Card, Typography, Row, Col, Button, Space } from 'antd';
import { 
  UserAddOutlined, 
  CalendarOutlined, 
  BookOutlined, 
  UnorderedListOutlined, 
  TeamOutlined,
  SettingOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useAuth } from '../AuthProvider';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;


const SetupSchool = () => {
  const { user } = useAuth();
  console.log('SuperAdmin : ', user);


  const setupSteps = [
    {
      title: 'Manage Admin',
      description: 'Create administrator accounts for your school',
      icon: <UserAddOutlined />,
      link: '/add-school-admin',
      color: '#1890ff'
    },
    {
      title: 'Manage Class',
      description: 'Connect classes with academic years and teachers',
      icon: <UnorderedListOutlined />,
      link: '/add-specific-class',
      color: '#fa8c16'
    },
    {
      title: 'Manage Students',
      description: 'Enroll students into your classes',
      icon: <TeamOutlined />,
      link: '/add-student',
      color: '#13c2c2'
    },,
    {
      title: 'Manage Subjects',
      description: 'Create Subjects fro your school',
      icon: <TeamOutlined />,
      link: '/add-subjects',
      color: '#13c2c2'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '24px', background: '#f8fafc' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card style={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          background: '#ffffff',
          marginBottom: '24px'
        }}>

          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <BankOutlined style={{ fontSize: '48px', color: '#6366f1', marginBottom: '16px' }} />
            <Title level={2} style={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>
              School Setup Dashboard
            </Title>
            <Text style={{ fontSize: '16px', color: '#64748b' }}>
              Configure your school system step by step
            </Text>
            {user?.user_metadata?.school_name && (
              <div style={{ marginTop: '16px' }}>
                <Text strong style={{ fontSize: '18px', color: '#6366f1' }}>
                  {user.user_metadata.school_name.toUpperCase()}
                </Text>
              </div>
            )}
          </div>
        </Card>

        {/* Setup Steps */}
        <Row gutter={[24, 24]}>
          {setupSteps.map((step, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                hoverable
                style={{ 
                  borderTop: `4px solid ${step.color}`,
                  height: '100%',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  background: '#ffffff',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ 
                    fontSize: '48px', 
                    color: step.color, 
                    marginBottom: '16px' 
                  }}>
                    {step.icon}
                  </div>
                  <Title level={4} style={{ margin: '0 0 12px 0', color: '#1e293b', fontWeight: 600 }}>
                    {step.title}
                  </Title>
                  <Text style={{ 
                    display: 'block', 
                    marginBottom: '24px',
                    minHeight: '40px',
                    color: '#64748b'
                  }}>
                    {step.description}
                  </Text>
                  <Link to={step.link}>
                    <Button 
                      type="primary" 
                      size="large"
                      style={{ 
                        backgroundColor: step.color,
                        borderColor: step.color,
                        width: '100%',
                        borderRadius: '8px',
                        fontWeight: 500
                      }}
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              </Card>
            </Col>
          ))}
        </Row>


      </div>
    </div>
  );
};

export default SetupSchool;