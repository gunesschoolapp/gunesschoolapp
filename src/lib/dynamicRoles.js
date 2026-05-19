import { base44 } from '@/api/base44Client';

let cachedRoles = null;

export const fetchRoles = async () => {
  if (cachedRoles) return cachedRoles;
  try {
    const roles = await base44.entities.Role.list();
    cachedRoles = roles;
    return roles;
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
};

export const getRolePermissions = async (roleId) => {
  const roles = await fetchRoles();
  const role = roles.find((r) => r.role_name === roleId);
  return role?.permissions || [];
};

export const hasPermission = async (userRole, permission) => {
  const roles = await fetchRoles();
  const role = roles.find((r) => r.role_name === userRole);
  return role?.permissions?.includes(permission) || false;
};

export const getRoleLabel = (roleId) => {
  // Fallback labels if dynamic roles not loaded
  const labels = {
    admin: 'Administrator',
    super_admin: 'Super Administrator',
    teacher: 'Teacher',
    staff: 'Staff',
    user: 'User',
  };
  return labels[roleId] || roleId;
};

export const getRoleBadgeColor = (role) => {
  const colors = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin: 'bg-red-100 text-red-700',
    teacher: 'bg-blue-100 text-blue-700',
    staff: 'bg-amber-100 text-amber-700',
    user: 'bg-gray-100 text-gray-700',
  };
  return colors[role] || 'bg-gray-100 text-gray-700';
};

export const invalidateRolesCache = () => {
  cachedRoles = null;
};