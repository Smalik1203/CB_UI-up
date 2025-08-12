import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import { useAuth } from './AuthProvider';
import Login from './pages/Login';
import SignUpUser from './components/SignUpUser';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import AddSchools from './pages/AddSchools';
import Assessments from './insidepages/Assessments';
import Attendance from './pages/Attendance';
import Fees from './insidepages/Fees';
import Results from './insidepages/results';
import SetupSchool from './pages/SetupSchool';
import AddAdmin from './components/AddAdmin';
import AddStudent from './components/AddStudent';
import AppSidebar from './components/Sidebar';
import AdminDashboard from './pages/admin/AdminDashboard';
import AddSpecificClass from './components/AddSpecificClass';
import AddSuperAdmin from './components/AddSuperAdmin';
import AddSubjects from './components/AddSubjects';

// ⬇️ NEW: use the refactored page version
import Timetable from './pages/Timetable';

const { Content } = Layout;

// Global layout with sidebar
function AppLayout({ children, isCbAdmin, isSuperAdmin, isAdmin, isStudent }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSidebar />
      <Layout style={{ marginLeft: 280 }}>
        <Content>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const isCbAdmin = user?.app_metadata?.role === 'cb_admin';
  const isSuperAdmin = user?.app_metadata?.role === 'superadmin';
  const isAdmin = user?.app_metadata?.role === 'admin';
  const isStudent = user?.app_metadata?.role === 'student';

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f6',
          borderRadius: 8,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorText: '#1e293b',
          colorTextSecondary: '#64748b',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      }}
    >
      <Router>
        {user && (
          <AppLayout
            isCbAdmin={isCbAdmin}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
            isStudent={isStudent}
          >
            <Routes>
              {/* Logged-in routes */}
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" />} />

              {isCbAdmin && (
                <>
                  <Route path="/add-schools" element={<PrivateRoute><AddSchools /></PrivateRoute>} />
                  <Route path="/add-super-admin" element={<PrivateRoute><AddSuperAdmin /></PrivateRoute>} />
                </>
              )}

              {isSuperAdmin && (
                <>
                  <Route path="/school-setup" element={<PrivateRoute><SetupSchool /></PrivateRoute>} />
                  <Route path="/add-school-admin" element={<PrivateRoute><AddAdmin /></PrivateRoute>} />
                  <Route path="/add-student" element={<PrivateRoute><AddStudent /></PrivateRoute>} />
                  <Route path="/add-specific-class" element={<PrivateRoute><AddSpecificClass /></PrivateRoute>} />
                  <Route path="/add-subjects" element={<PrivateRoute><AddSubjects /></PrivateRoute>} />
                </>
              )}

              {/* New timetable page — allow both Admin & SuperAdmin */}
              {(isSuperAdmin || isAdmin) && (
                <>
                  <Route path="/add-timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
                  {/* Optional cleaner alias */}
                  <Route path="/timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
                </>
              )}

              <Route path="/signup" element={<PrivateRoute><SignUpUser /></PrivateRoute>} />
              <Route path="/assessments" element={<PrivateRoute><Assessments /></PrivateRoute>} />
              <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
              <Route path="/fees" element={<PrivateRoute><Fees /></PrivateRoute>} />
              <Route path="/results" element={<PrivateRoute><Results /></PrivateRoute>} />
              <Route path="/school-setup" element={<PrivateRoute><SetupSchool /></PrivateRoute>} />
            </Routes>
          </AppLayout>
        )}

        {!user && (
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<SignUpUser />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </Router>
    </ConfigProvider>
  );
}

export default App;
