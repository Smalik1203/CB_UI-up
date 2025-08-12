import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { supabase } from '../config/supabaseClient';
import { Layout, Menu, Avatar, Typography, Button, Dropdown, Space, Tooltip } from 'antd';
import {
  HomeOutlined,
  ReadOutlined,
  TeamOutlined,
  CalendarOutlined,
  BookOutlined,
  TrophyOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserAddOutlined,
  BankOutlined,
  UnorderedListOutlined,
  UserOutlined
} from '@ant-design/icons';

const { Sider } = Layout;
const { Text } = Typography;

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userName = user?.user_metadata?.full_name || 'User';
  const userRole = user?.app_metadata?.role || 'user';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getMenuItems = () => {
    const allItems = [
      {
        key: '/home',
        icon: <HomeOutlined />,
        label: 'Home',
        roles: ['cb_admin', 'superadmin', 'admin', 'teacher', 'student', 'parent']
      },
      {
        key: '/add-schools',
        icon: <BankOutlined />,
        label: 'Manage Schools',
        roles: ['cb_admin']
      },
      {
        key: '/add-super-admin',
        icon: <BankOutlined />,
        label: 'Super Admin',
        roles: ['cb_admin']
      },
      {
        key: '/school-setup',
        icon: <SettingOutlined />,
        label: 'School Setup',
        roles: ['superadmin']
      },
      {
        key: '/attendance',
        icon: <CalendarOutlined />,
        label: 'Attendance',
        roles: ['superadmin', 'admin', 'teacher', 'student', 'parent']
      },
      {
        key: '/results',
        icon: <TrophyOutlined />,
        label: 'Results',
        roles: ['superadmin', 'admin', 'teacher', 'student', 'parent']
      },
      {
        key: '/fees',
        icon: <DollarOutlined />,
        label: 'Fees',
        roles: ['superadmin', 'admin', 'student', 'parent']
      },
      {
        key: '/add-subjects',
        icon: <DollarOutlined />,
        label: 'Subjects',
        roles: ['superadmin']
      },
      {
        key: '/add-timetable',
        icon: <DollarOutlined />,
        label: 'Timetable',
        roles: ['superadmin', 'admin']
      }
      
    ];

    return allItems
      .filter(item => item.roles.includes(userRole))
      .map(item => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
        onClick: () => navigate(item.key)
      }));
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout
    }
  ];

  return (
    <Sider
      width={280}
      style={{
        overflow: 'hidden',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        boxShadow: '2px 0 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* Logo Section */}
      <div style={{ 
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: '#ffffff'
      }}>
        <div>
          <Text strong style={{ fontSize: '20px', color: '#6366f1', fontWeight: 700 }}>
            ClassBridge
          </Text>
          <br />
          <Text style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            Education Management
          </Text>
        </div>
      </div>

      {/* User Profile Section */}
      <div style={{ 
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff'
      }}>
        <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
          <div style={{ cursor: 'pointer' }}>
            <Space align="center">
              <Avatar 
                size={44} 
                style={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
              >
                {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Avatar>
              <div>
                <Text strong style={{ display: 'block', fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>
                  {userName}
                </Text>
              </div>
            </Space>
          </div>
        </Dropdown>
      </div>

      {/* Navigation Menu */}
      <div style={{ flex: 1, background: '#ffffff' }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          style={{ 
            border: 'none',
            background: '#ffffff',
            padding: '8px 0'
          }}
        />
      </div>

      {/* Bottom Section with Logout */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff'
      }}>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ 
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            color: '#ef4444',
            fontWeight: 500
          }}
        >
          Sign Out
        </Button>
      </div>
    </Sider>
  );
};

export default AppSidebar;