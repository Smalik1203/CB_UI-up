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
import FeeCollections from './components/FeeCollections';
// Assignment feature removed



// ⬇️ NEW: use the refactored page version
import Timetable from './pages/Timetable';
import SyllabusPage from './components/Syllabus';
import Unauthorized from './pages/Unauthorized';
import { routeAccess } from './routeAccess';

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
              <Route path="/dashboard" element={<PrivateRoute allowedRoles={routeAccess.dashboard}><Dashboard /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" />} />

              <Route path="/add-schools" element={<PrivateRoute allowedRoles={routeAccess.addSchools}><AddSchools /></PrivateRoute>} />
              <Route path="/add-super-admin" element={<PrivateRoute allowedRoles={routeAccess.addSuperAdmin}><AddSuperAdmin /></PrivateRoute>} />

              <Route path="/school-setup" element={<PrivateRoute allowedRoles={routeAccess.schoolSetup}><SetupSchool /></PrivateRoute>} />
              <Route path="/add-school-admin" element={<PrivateRoute allowedRoles={routeAccess.addSchoolAdmin}><AddAdmin /></PrivateRoute>} />
              <Route path="/add-student" element={<PrivateRoute allowedRoles={routeAccess.addStudent}><AddStudent /></PrivateRoute>} />
              <Route path="/add-specific-class" element={<PrivateRoute allowedRoles={routeAccess.addSpecificClass}><AddSpecificClass /></PrivateRoute>} />

              {/* Timetable & syllabus */}
              <Route path="/add-timetable" element={<PrivateRoute allowedRoles={routeAccess.addTimetable}><Timetable /></PrivateRoute>} />
              <Route path="/timetable" element={<PrivateRoute allowedRoles={routeAccess.timetable}><Timetable /></PrivateRoute>} />
              <Route path="/add-subjects" element={<PrivateRoute allowedRoles={routeAccess.addSubjects}><AddSubjects /></PrivateRoute>} />
              <Route path="/syllabus" element={<PrivateRoute allowedRoles={routeAccess.syllabus}><SyllabusPage /></PrivateRoute>} />

              <Route path="/signup" element={<PrivateRoute allowedRoles={routeAccess.signup}><SignUpUser /></PrivateRoute>} />
              <Route path="/assessments" element={<PrivateRoute allowedRoles={routeAccess.assessments}><Assessments /></PrivateRoute>} />
              <Route path="/attendance" element={<PrivateRoute allowedRoles={routeAccess.attendance}><Attendance /></PrivateRoute>} />
              <Route path="/fees" element={<PrivateRoute allowedRoles={routeAccess.fees}><Fees /></PrivateRoute>} />
              <Route path="/fee-manage" element={<PrivateRoute allowedRoles={routeAccess.feeManage}><FeeManage /></PrivateRoute>} />
              <Route path="/fee-collections" element={<PrivateRoute allowedRoles={routeAccess.feeCollections}><FeeCollections /></PrivateRoute>} />
              {/* /assignments route removed */}
              <Route path="/results" element={<PrivateRoute allowedRoles={routeAccess.results}><Results /></PrivateRoute>} />
              <Route path="/unauthorized" element={<Unauthorized />} />
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
