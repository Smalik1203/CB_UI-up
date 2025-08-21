// Role-based route access matrix and helpers

export type AppRole = 'cb_admin' | 'superadmin' | 'admin' | 'student';

export type RouteKey =
  | 'root'
  | 'login'
  | 'dashboard'
  | 'addSchools'
  | 'addSuperAdmin'
  | 'schoolSetup'
  | 'addSchoolAdmin'
  | 'addStudent'
  | 'addSpecificClass'
  | 'timetable'
  | 'addTimetable'
  | 'addSubjects'
  | 'syllabus'
  | 'assessments'
  | 'attendance'
  | 'fees'
  | 'feeManage'
  | 'feeCollections'
  | 'results'
  | 'signup'
  | 'unauthorized';

type RouteAccess = Record<RouteKey, AppRole[]>;

// Central access matrix
export const routeAccess: RouteAccess = {
  root: ['cb_admin', 'superadmin', 'admin', 'student'],
  login: ['cb_admin', 'superadmin', 'admin', 'student'],
  dashboard: ['cb_admin', 'superadmin', 'admin', 'student'],

  // Platform-level
  addSchools: ['cb_admin'],
  addSuperAdmin: ['cb_admin'],

  // School owner
  schoolSetup: ['superadmin'],
  addSchoolAdmin: ['superadmin'],
  addStudent: ['superadmin', 'admin'],
  addSpecificClass: ['superadmin'],

  // Timetable and syllabus operations within school
  timetable: ['superadmin', 'admin', 'student'],
  addTimetable: ['superadmin', 'admin'],
  addSubjects: ['superadmin', 'admin'],
  syllabus: ['superadmin', 'admin', 'student'],

  // Daily operations
  assessments: ['superadmin', 'admin', 'student'],
  attendance: ['superadmin', 'admin', 'student'],
  fees: ['superadmin', 'admin', 'student'],
  feeManage: ['superadmin', 'admin'],
  feeCollections: ['superadmin', 'admin'],
  results: ['superadmin', 'admin', 'student'],

  signup: ['cb_admin', 'superadmin', 'admin', 'student'],
  unauthorized: ['cb_admin', 'superadmin', 'admin', 'student'],
};

export function isRoleAllowed(routeKey: RouteKey, role?: AppRole | null): boolean {
  if (!role) return false;
  return routeAccess[routeKey]?.includes(role) ?? false;
}

export function getUserRole(user: any): AppRole | null {
  const role = user?.app_metadata?.role as AppRole | undefined;
  return role ?? null;
}


