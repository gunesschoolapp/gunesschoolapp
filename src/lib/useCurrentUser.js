import { useAuth } from './AuthContext';

// Role-based default page access (fallback when no custom permissions set)
const ROLE_DEFAULTS = {
  admin:        null, // admin always gets everything — handled by hasPerm logic
  team_admin:   null,
  teacher:      ['Dashboard', 'Courses', 'Schedule', 'Classrooms', 'Classroom', 'Tasks', 'TeacherLessonTools', 'TeacherDashboard', 'Resources', 'NotificationCenter'],
  receptionist: ['Dashboard', 'Students', 'Courses', 'Schedule', 'Tasks', 'InvoiceManagement', 'NotificationCenter', 'Emails', 'StaffDashboard'],
  reception:    ['Dashboard', 'Students', 'Courses', 'Schedule', 'Tasks', 'InvoiceManagement', 'NotificationCenter', 'Emails', 'StaffDashboard'],
  marketing:    ['Dashboard', 'Students', 'Courses', 'Tasks', 'Emails', 'StaffDashboard', 'NotificationCenter'],
  accounting:   ['Dashboard', 'Finance', 'Accounting', 'Payroll', 'InvoiceManagement', 'Reports', 'StaffDashboard', 'NotificationCenter'],
  staff:        ['Dashboard', 'Students', 'Tasks', 'StaffDashboard', 'NotificationCenter'],
  user:         ['Dashboard', 'Tasks', 'StaffDashboard', 'NotificationCenter'],
  student:      ['Dashboard', 'StudentSelfPortal', 'Packages', 'Resources', 'NotificationCenter'],
};

export function useCurrentUser() {
  const { user, isLoadingAuth } = useAuth();
  const staffRecord = user?.staff_record || null;
  const loading = isLoadingAuth;

  const effectiveRole = user?.matched_role || user?.role;

  // Permissions source priority:
  // 1. user.permissions array (set from Settings > Permissions tab) — "PageKey:action" format
  // 2. staffRecord.permissions array (set from PersonnelManagement) — same format
  // 3. Role-based defaults (page-level only, no action granularity)
  const userPermissions = user?.permissions || null;
  const staffPermissions = staffRecord?.permissions || null;

  // Active permissions: user.permissions takes priority over staff.permissions
  const activePermissions = (userPermissions && userPermissions.length > 0)
    ? userPermissions
    : (staffPermissions && staffPermissions.length > 0)
      ? staffPermissions
      : null;

  const hasPerm = (pageKey, action = 'view') => {
    if (!effectiveRole) return false;
    // Admins and team_admins always have full access
    if (['admin', 'team_admin'].includes(effectiveRole)) return true;

    // If granular permissions exist, use them
    if (activePermissions && activePermissions.length > 0) {
      // Support both "PageKey:action" and legacy "PageKey" formats
      const granular = activePermissions.find(p => p.includes(':'));
      if (granular) {
        return activePermissions.includes(pageKey + ':' + action);
      }
      // Legacy flat format — only view access
      if (action === 'view') return activePermissions.includes(pageKey);
      return false;
    }

    // Fallback to role defaults (view-only check)
    const defaults = ROLE_DEFAULTS[effectiveRole];
    if (!defaults) return false;
    if (action === 'view') return defaults.includes(pageKey);
    // For non-view actions on default roles, allow edit for common roles
    const editableRoles = ['receptionist', 'reception', 'marketing', 'accounting', 'staff'];
    if (editableRoles.includes(effectiveRole) && ['create', 'edit'].includes(action)) {
      return defaults.includes(pageKey);
    }
    return false;
  };

  return { user, staffRecord, staffPermissions: activePermissions, hasPerm, loading };
}