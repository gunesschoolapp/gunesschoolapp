// Role-based access control
export const rolePermissions = {
  admin: {
    canViewDashboard: true,
    canManageStudents: true,
    canManageCourses: true,
    canManageTeachers: true,
    canManagePayments: true,
    canManageExpenses: true,
    canViewReports: true,
    canViewFinance: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewEmails: true,
  },
  teacher: {
    canViewDashboard: true,
    canManageStudents: false,
    canManageCourses: true,
    canManageTeachers: false,
    canManagePayments: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEmails: false,
  },
  reception: {
    canViewDashboard: true,
    canManageStudents: true,
    canManageCourses: false,
    canManageTeachers: false,
    canManagePayments: true,
    canManageExpenses: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEmails: true,
  },
  marketing: {
    canViewDashboard: true,
    canManageStudents: true,
    canManageCourses: true,
    canManageTeachers: false,
    canManagePayments: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEmails: true,
  },
  accounting: {
    canViewDashboard: true,
    canManageStudents: false,
    canManageCourses: false,
    canManageTeachers: false,
    canManagePayments: true,
    canManageExpenses: true,
    canViewReports: true,
    canViewFinance: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewEmails: false,
  },
  team_admin: {
    canViewDashboard: true,
    canManageStudents: true,
    canManageCourses: true,
    canManageTeachers: true,
    canManagePayments: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: true,  // Personnel & permissions management
    canManageSettings: false,
    canViewEmails: true,
  },
  user: {
    canViewDashboard: true,
    canManageStudents: false,
    canManageCourses: false,
    canManageTeachers: false,
    canManagePayments: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEmails: false,
  },
  student: {
    canViewDashboard: true,
    canManageStudents: false,
    canManageCourses: false,
    canManageTeachers: false,
    canManagePayments: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewFinance: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEmails: false,
    canViewOwnLessons: true,
  },
};

export const hasPermission = (userRole, permission) => {
  const permissions = rolePermissions[userRole] || rolePermissions.user;
  return permissions[permission] || false;
};

export const canAccess = (userRole, pathOrPermission) => {
  // Map paths to permissions
  const pathPermissionMap = {
    '/Dashboard': 'canViewDashboard',
    '/TeacherDashboard': 'canViewDashboard',
    '/StaffDashboard': 'canViewDashboard',
    '/Students': 'canManageStudents',
    '/Courses': 'canManageCourses',
    '/Schedule': 'canManageCourses',
    '/Teachers': 'canManageTeachers',
    '/Finance': 'canViewFinance',
    '/InvoiceManagement': 'canManagePayments',
    '/Accounting': 'canViewFinance',
    '/Payroll': 'canManagePayments',
    '/Expenses': 'canManageExpenses',
    '/Reports': 'canViewReports',
    '/Tasks': 'canViewDashboard',
    '/Certifications': 'canManageCourses',
    '/Settings': 'canManageSettings',
    '/Personnel': 'canManageUsers',
    '/Emails': 'canViewEmails',
    '/TeacherLessonTools': 'canManageCourses',
    '/StudentSelfPortal': 'canViewDashboard',
  };
  
  const permission = pathPermissionMap[pathOrPermission] || pathOrPermission;
  return hasPermission(userRole, permission);
};

export const getRoleLabel = (role) => {
  const labels = {
    admin: 'Administrator',
    team_admin: 'Team Manager',
    teacher: 'Teacher',
    reception: 'Reception',
    marketing: 'Marketing',
    accounting: 'Accounting',
    user: 'Custom Access',
  };
  return labels[role] || role;
};

export const getRoleBadgeColor = (role) => {
  const colors = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    team_admin: 'bg-orange-100 text-orange-700 border-orange-200',
    teacher: 'bg-blue-100 text-blue-700 border-blue-200',
    reception: 'bg-green-100 text-green-700 border-green-200',
    marketing: 'bg-purple-100 text-purple-700 border-purple-200',
    accounting: 'bg-amber-100 text-amber-700 border-amber-200',
    user: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
};