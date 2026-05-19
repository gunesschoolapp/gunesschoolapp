// ─── Modül tanımları ────────────────────────────────────────────────────────────
export const MODULES = [
  { id: 'dashboard',     label: 'Dashboard',        actions: ['view'] },
  { id: 'leads',         label: 'Leads / CRM',       actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'students',      label: 'Öğrenciler',        actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'courses',       label: 'Kurslar',           actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'schedule',      label: 'Program',           actions: ['view', 'create', 'edit'] },
  { id: 'teachers',      label: 'Öğretmenler',       actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'tasks',         label: 'Görevler',          actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'invoices',      label: 'Faturalar',         actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'finance',       label: 'Finans',            actions: ['view', 'create', 'edit'] },
  { id: 'payroll',       label: 'Bordro',            actions: ['view', 'create', 'edit'] },
  { id: 'expenses',      label: 'Giderler',          actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'reports',       label: 'Raporlar',          actions: ['view'] },
  { id: 'emails',        label: 'E-postalar',        actions: ['view', 'create'] },
  { id: 'settings',      label: 'Ayarlar',           actions: ['view', 'edit'] },
  { id: 'personnel',     label: 'Personel',          actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'classrooms',    label: 'Sınıflar',          actions: ['view', 'create', 'edit'] },
  { id: 'notifications', label: 'Bildirimler',       actions: ['view', 'create'] },
];

export const ACTION_LABELS = {
  view:   'Görüntüle',
  create: 'Oluştur',
  edit:   'Düzenle',
  delete: 'Sil',
};

export const ACTION_COLORS = {
  view:   'text-blue-600',
  create: 'text-emerald-600',
  edit:   'text-amber-600',
  delete: 'text-red-500',
};

// ─── Hazır izin şablonları ──────────────────────────────────────────────────────
export const DEFAULT_PERMISSION_SETS = [
  {
    id: 'admin',
    name: 'Administrator',
    color: 'red',
    is_system: true,
    permissions: buildFull(), // tüm izinler açık
  },
  {
    id: 'teacher',
    name: 'Öğretmen',
    color: 'blue',
    is_system: true,
    permissions: {
      dashboard:  { view: true },
      courses:    { view: true, edit: true },
      schedule:   { view: true },
      students:   { view: true },
      tasks:      { view: true, create: true, edit: true },
      classrooms: { view: true, edit: true },
    },
  },
  {
    id: 'reception',
    name: 'Resepsiyon',
    color: 'green',
    is_system: true,
    permissions: {
      dashboard:     { view: true },
      leads:         { view: true, create: true, edit: true },
      students:      { view: true, create: true, edit: true },
      courses:       { view: true },
      schedule:      { view: true },
      invoices:      { view: true, create: true, edit: true },
      tasks:         { view: true, create: true, edit: true },
      emails:        { view: true, create: true },
      notifications: { view: true, create: true },
    },
  },
  {
    id: 'marketing',
    name: 'Pazarlama',
    color: 'purple',
    is_system: true,
    permissions: {
      dashboard: { view: true },
      leads:     { view: true, create: true, edit: true },
      students:  { view: true },
      courses:   { view: true },
      emails:    { view: true, create: true },
      tasks:     { view: true, create: true, edit: true },
    },
  },
  {
    id: 'accounting',
    name: 'Muhasebe',
    color: 'amber',
    is_system: true,
    permissions: {
      dashboard: { view: true },
      invoices:  { view: true, create: true, edit: true },
      finance:   { view: true, create: true, edit: true },
      payroll:   { view: true, create: true, edit: true },
      expenses:  { view: true, create: true, edit: true, delete: true },
      reports:   { view: true },
    },
  },
];

function buildFull() {
  const all = {};
  MODULES.forEach(m => {
    all[m.id] = {};
    m.actions.forEach(a => { all[m.id][a] = true; });
  });
  return all;
}

export const SET_COLORS = {
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
  green:  { bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200' },
};

// ─── Kullanıcı iznini kontrol et ────────────────────────────────────────────────
// user: { role, permission_set_id, custom_permissions }
// permissionSet: PermissionSet entity verisi
export function checkPermission(user, permissionSet, module, action) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  // custom_permissions override varsa önce bak
  const custom = user.custom_permissions?.[module]?.[action];
  if (custom === true) return true;
  if (custom === false) return false;

  // Sonra permission set'e bak
  return permissionSet?.permissions?.[module]?.[action] === true;
}

// Sayfa/route'u modüle map et
export const ROUTE_MODULE_MAP = {
  '/Dashboard': ['dashboard', 'view'],
  '/TeacherDashboard': ['dashboard', 'view'],
  '/StaffDashboard': ['dashboard', 'view'],
  '/Leads': ['leads', 'view'],
  '/LeadsKanban': ['leads', 'view'],
  '/Students': ['students', 'view'],
  '/StudentProfile': ['students', 'view'],
  '/Courses': ['courses', 'view'],
  '/Schedule': ['schedule', 'view'],
  '/Teachers': ['teachers', 'view'],
  '/Tasks': ['tasks', 'view'],
  '/Invoices': ['invoices', 'view'],
  '/InvoiceManagement': ['invoices', 'view'],
  '/Finance': ['finance', 'view'],
  '/Accounting': ['finance', 'view'],
  '/Payroll': ['payroll', 'view'],
  '/Expenses': ['expenses', 'view'],
  '/Reports': ['reports', 'view'],
  '/Emails': ['emails', 'view'],
  '/EmailAccounts': ['settings', 'view'],
  '/Settings': ['settings', 'view'],
  '/Personnel': ['personnel', 'view'],
  '/PersonnelManagement': ['personnel', 'edit'],
  '/Classrooms': ['classrooms', 'view'],
  '/NotificationCenter': ['notifications', 'view'],
};