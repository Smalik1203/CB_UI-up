import React from 'react';
import { useAuth } from '../AuthProvider';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Button, 
  List, 
  Avatar, 
  Badge, 
  Space,
  Progress,
  Timeline
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  TrophyOutlined,
  RiseOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

const Dashboard = () => {
  const { user } = useAuth();
  
  const role = user?.app_metadata?.role;
  const userName = user?.user_metadata?.full_name || 'User';
  const schoolName = user?.user_metadata?.school_name || 'Demo School';
  const schoolCode = user?.user_metadata?.school_code;

  const getStatsForRole = (role) => {
    const statsMap = {
      'cb_admin': [
        { title: 'Total Schools', value: 12, icon: <BankOutlined />, color: '#1890ff', trend: 8.2 },
        { title: 'Super Admins', value: 24, icon: <UserOutlined />, color: '#52c41a', trend: 12.5 },
        { title: 'Active Users', value: 1250, icon: <TeamOutlined />, color: '#722ed1', trend: -2.1 },
      ],
      'superadmin': [
        { title: 'Total Classes', value: 8, icon: <BookOutlined />, color: '#1890ff', trend: 15.2 },
        { title: 'Students', value: 245, icon: <TeamOutlined />, color: '#52c41a', trend: 8.7 },
        { title: 'Teachers', value: 28, icon: <UserOutlined />, color: '#722ed1', trend: 5.3 },
        { title: 'Attendance Rate', value: 94, suffix: '%', icon: <CalendarOutlined />, color: '#fa8c16', trend: 2.1 }
      ],
      'admin': [
        { title: 'My Classes', value: 6, icon: <BookOutlined />, color: '#1890ff', trend: 0 },
        { title: 'Students', value: 180, icon: <TeamOutlined />, color: '#52c41a', trend: 5.2 },
        { title: 'Attendance Rate', value: 92, suffix: '%', icon: <CalendarOutlined />, color: '#722ed1', trend: 1.8 },
        { title: 'Assessments', value: 24, icon: <TrophyOutlined />, color: '#fa8c16', trend: -3.2 }
      ],
      'student': [
        { title: 'Subjects', value: 8, icon: <BookOutlined />, color: '#1890ff', trend: 0 },
        { title: 'Attendance', value: 92, suffix: '%', icon: <CalendarOutlined />, color: '#52c41a', trend: 2.5 },
        { title: 'Average Grade', value: 85, suffix: '%', icon: <TrophyOutlined />, color: '#722ed1', trend: 5.1 },
        { title: 'Assessments', value: 12, icon: <BookOutlined />, color: '#fa8c16', trend: -1.2 }
      ],
      'parent': [
        { title: 'Children', value: 2, icon: <TeamOutlined />, color: '#1890ff', trend: 0 },
        { title: 'Avg Attendance', value: 95, suffix: '%', icon: <CalendarOutlined />, color: '#52c41a', trend: 1.5 },
        { title: 'Avg Performance', value: 88, suffix: '%', icon: <TrophyOutlined />, color: '#722ed1', trend: 3.2 },
        { title: 'Notifications', value: 3, icon: <ExclamationCircleOutlined />, color: '#fa8c16', trend: 0 }
      ]
    };
    return statsMap[role] || statsMap['admin'];
  };

  const getQuickActions = (role) => {
    const actionsMap = {
      'superadmin': [
        { title: 'Add Classes', description: 'Create new class sections', color: '#1890ff' },
        { title: 'Manage Students', description: 'Student enrollment and management', color: '#52c41a' },
        { title: 'View Reports', description: 'School performance analytics', color: '#722ed1' },
        { title: 'School Settings', description: 'Configure school parameters', color: '#fa8c16' }
      ],
      'admin': [
        { title: 'Mark Attendance', description: 'Daily attendance management', color: '#1890ff' },
        { title: 'Grade Assignments', description: 'Review and grade submissions', color: '#52c41a' },
        { title: 'View Students', description: 'Student information and progress', color: '#722ed1' },
        { title: 'Generate Reports', description: 'Class performance reports', color: '#fa8c16' }
      ],
      'student': [
        { title: 'View Grades', description: 'Check your academic scores', color: '#1890ff' },
        { title: 'Attendance', description: 'Track your attendance record', color: '#52c41a' },
        { title: 'Assignments', description: 'View pending assignments', color: '#722ed1' },
        { title: 'Schedule', description: 'Class timetable and events', color: '#fa8c16' }
      ],
      'parent': [
        { title: 'Child Progress', description: 'Academic performance tracking', color: '#1890ff' },
        { title: 'Attendance Records', description: 'View attendance history', color: '#52c41a' },
        { title: 'Communications', description: 'Messages from school', color: '#722ed1' },
        { title: 'Meetings', description: 'Parent-teacher appointments', color: '#fa8c16' }
      ]
    };
    return actionsMap[role] || actionsMap['admin'];
  };

  const stats = getStatsForRole(role);
  const quickActions = getQuickActions(role);

  const getRoleDisplay = (role) => {
    const roleMap = {
      'cb_admin': 'CB Administrator',
      'superadmin': 'Super Administrator',
      'admin': 'Administrator',
      'teacher': 'Teacher',
      'student': 'Student',
      'parent': 'Parent'
    };
    return roleMap[role] || 'User';
  };

  const getWelcomeMessage = (role) => {
    const messages = {
      'cb_admin': 'Manage schools and administrators across the platform',
      'superadmin': 'Set up and manage your school system',
      'admin': 'Manage classes, students, and daily operations',
      'student': 'Track your progress and stay updated with your classes',
      'parent': 'Monitor your children\'s academic progress'
    };
    return messages[role] || 'Welcome to ClassBridge';
  };

  return (
    <Content style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>
              Welcome back, {userName}!
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              {getWelcomeMessage(role)}
            </Text>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                style={{ 
                  background: '#6366f1', 
                  borderColor: '#6366f1',
                  borderRadius: '8px',
                  fontWeight: 500
                }}
              >
                {getRoleDisplay(role)}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card 
              style={{ 
                borderRadius: '12px',
                height: '100%',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                background: '#ffffff',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ 
                  fontSize: '48px', 
                  color: stat.color, 
                  marginBottom: '16px' 
                }}>
                  {stat.icon}
                </div>
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  suffix={stat.suffix}
                  valueStyle={{ color: stat.color }}
                  titleStyle={{ color: '#64748b', fontWeight: 500 }}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '12px', color: '#64748b' }}>
                    {stat.trend > 0 ? (
                      <Space>
                        <ArrowUpOutlined style={{ color: '#10b981' }} />
                        <span style={{ color: '#10b981' }}>+{stat.trend}%</span>
                      </Space>
                    ) : stat.trend < 0 ? (
                      <Space>
                        <ArrowDownOutlined style={{ color: '#ef4444' }} />
                        <span style={{ color: '#ef4444' }}>{stat.trend}%</span>
                      </Space>
                    ) : (
                      <span>No change</span>
                    )}
                    <span style={{ marginLeft: '8px' }}>from last month</span>
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>


 
    </Content>
  );
};

export default Dashboard;