import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import { antdTheme } from './ui/theme';
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
import AddSpecificClass from './components/AddSpecificClass';
import AddSuperAdmin from './components/AddSuperAdmin';
import AddSubjects from './components/AddSubjects';
import FeeComponents from './components/FeeComponents';
import FeeManage from './components/FeeManage';



// ⬇️ NEW: use the refactored page version
import Timetable from './pages/Timetable';
import SyllabusPage from './components/Syllabus';

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
    <ConfigProvider theme={antdTheme}>
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
                </>
              )}

              {/* New timetable page — allow both Admin & SuperAdmin */}
              {(isSuperAdmin || isAdmin) && (
                <>
                  <Route path="/add-timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
                  <Route path="/timetable" element={<PrivateRoute><Timetable /></PrivateRoute>} />
                  <Route path="/add-subjects" element={<PrivateRoute><AddSubjects /></PrivateRoute>} />
                  <Route path="/syllabus" element={<PrivateRoute><SyllabusPage /></PrivateRoute>} />
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
