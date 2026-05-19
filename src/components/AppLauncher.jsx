import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Calendar, GraduationCap,
  CheckSquare, Award, Settings, Mail, CreditCard,
  BarChart3, DollarSign, Receipt, Bell, UserCog,
  Building2, Globe, Monitor, ClipboardList, UserCircle
} from 'lucide-react';
import { canAccess } from '@/lib/roles';

// All possible app tiles — labels: { tr, en }
const ALL_TILES = [
  {
    id: 'dashboard',
    label: { tr: 'Dashboard', en: 'Dashboard' },
    icon: LayoutDashboard,
    path: '/Dashboard',
    color: 'from-blue-600 to-blue-700',
    permission: '/Dashboard',
    roles: ['admin'],
  },
  {
    id: 'teacher_dashboard',
    label: { tr: 'Dashboard', en: 'Dashboard' },
    icon: LayoutDashboard,
    path: '/TeacherDashboard',
    color: 'from-blue-600 to-blue-700',
    permission: '/TeacherDashboard',
    roles: ['teacher'],
  },
  {
    id: 'staff_dashboard',
    label: { tr: 'Dashboard', en: 'Dashboard' },
    icon: LayoutDashboard,
    path: '/StaffDashboard',
    color: 'from-blue-600 to-blue-700',
    permission: '/StaffDashboard',
    roles: ['reception', 'marketing', 'accounting', 'user'],
  },
  {
    id: 'students',
    label: { tr: 'Öğrenciler', en: 'Students' },
    icon: Users,
    path: '/Students',
    color: 'from-indigo-500 to-indigo-700',
    permission: '/Students',
    skipRoles: ['student'],
  },
  {
    id: 'courses',
    label: { tr: 'Kurslar', en: 'Courses' },
    icon: BookOpen,
    path: '/Courses',
    color: 'from-emerald-500 to-emerald-700',
    permission: '/Courses',
  },
  {
    id: 'schedule',
    label: { tr: 'Program', en: 'Schedule' },
    icon: Calendar,
    path: '/Schedule',
    color: 'from-teal-500 to-teal-700',
    permission: '/Schedule',
  },
  {
    id: 'teachers',
    label: { tr: 'Öğretmenler', en: 'Teachers' },
    icon: GraduationCap,
    path: '/Teachers',
    color: 'from-violet-500 to-violet-700',
    permission: '/Teachers',
  },
  {
    id: 'tasks',
    label: { tr: 'Görevler', en: 'Tasks' },
    icon: CheckSquare,
    path: '/Tasks',
    color: 'from-amber-500 to-amber-600',
    permission: '/Tasks',
  },
  {
    id: 'certifications',
    label: { tr: 'Sertifikalar', en: 'Certificates' },
    icon: Award,
    path: '/Certifications',
    color: 'from-orange-500 to-orange-600',
    permission: '/Certifications',
  },
  {
    id: 'invoices',
    label: { tr: 'Faturalar', en: 'Invoices' },
    icon: Receipt,
    path: '/InvoiceManagement',
    color: 'from-cyan-500 to-cyan-700',
    permission: '/InvoiceManagement',
  },
  {
    id: 'finance',
    label: { tr: 'Finans', en: 'Finance' },
    icon: DollarSign,
    path: '/Finance',
    color: 'from-green-600 to-green-800',
    permission: '/Finance',
  },
  {
    id: 'payroll',
    label: { tr: 'Bordro', en: 'Payroll' },
    icon: CreditCard,
    path: '/Payroll',
    color: 'from-lime-600 to-green-700',
    permission: '/Payroll',
  },
  {
    id: 'reports',
    label: { tr: 'Raporlar', en: 'Reports' },
    icon: BarChart3,
    path: '/Reports',
    color: 'from-blue-700 to-indigo-800',
    permission: '/Reports',
  },
  {
    id: 'emails',
    label: { tr: 'E-postalar', en: 'Emails' },
    icon: Mail,
    path: '/Emails',
    color: 'from-sky-500 to-blue-600',
    permission: '/Emails',
  },
  {
    id: 'notifications',
    label: { tr: 'Bildirimler', en: 'Notifications' },
    icon: Bell,
    path: '/NotificationCenter',
    color: 'from-yellow-500 to-amber-600',
    permission: '/Tasks',
  },
  {
    id: 'personnel',
    label: { tr: 'Personel', en: 'Personnel' },
    icon: UserCog,
    path: '/Personnel',
    color: 'from-rose-500 to-rose-700',
    permission: '/Personnel',
  },
  {
    id: 'classrooms',
    label: { tr: 'Sınıflar', en: 'Classrooms' },
    icon: Building2,
    path: '/Classrooms',
    color: 'from-stone-500 to-stone-700',
    permission: '/Courses',
  },
  {
    id: 'classroom',
    label: { tr: 'Sanal Sınıf', en: 'Virtual Class' },
    icon: Monitor,
    path: '/Classroom',
    color: 'from-sky-500 to-cyan-600',
    permission: '/Courses',
  },
  {
    id: 'teacher_lesson_tools',
    label: { tr: 'Ders Araçları', en: 'Lesson Tools' },
    icon: ClipboardList,
    path: '/TeacherLessonTools',
    color: 'from-teal-600 to-teal-800',
    permission: '/TeacherLessonTools',
    roles: ['teacher', 'admin'],
  },
  {
    id: 'student_portal',
    label: { tr: 'Öğrenci Portalı', en: 'Student Portal' },
    icon: UserCircle,
    path: '/StudentSelfPortal',
    color: 'from-pink-500 to-rose-600',
    permission: '/StudentSelfPortal',
  },
  {
    id: 'settings',
    label: { tr: 'Ayarlar', en: 'Settings' },
    icon: Settings,
    path: '/Settings',
    color: 'from-gray-600 to-gray-800',
    permission: '/Settings',
  },
  {
    id: 'website',
    label: { tr: 'Web Entegrasyon', en: 'Web Integration' },
    icon: Globe,
    path: '/WebsiteIntegrations',
    color: 'from-purple-600 to-purple-800',
    permission: '/Settings',
  },
];

// Map tile path to permission page key
const tilePageKey = (tile) => tile.path.replace('/', '');

const dashboardIds = ['dashboard', 'teacher_dashboard', 'staff_dashboard'];
const dashboardPaths = ['/Dashboard', '/TeacherDashboard', '/StaffDashboard'];

export default function AppLauncher({ userRole, hasPerm }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Filter tiles by role access
  const availableTiles = ALL_TILES.filter(tile => {
    // Hide all dashboard tiles when already on any dashboard page
    if (dashboardIds.includes(tile.id) && dashboardPaths.includes(location.pathname)) return false;
    // If tile has skipRoles, hide for those roles
    if (tile.skipRoles && tile.skipRoles.includes(userRole)) return false;
    // If tile has a specific roles array, only those roles can see it
    if (tile.roles && tile.roles.length > 0) {
      if (!tile.roles.includes(userRole)) return false;
    }
    // Use granular hasPerm if provided, otherwise fall back to canAccess
    if (hasPerm) {
      return hasPerm(tilePageKey(tile), 'view');
    }
    return canAccess(userRole, tile.permission);
  });

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
      {availableTiles.map(tile => {
        const Icon = tile.icon;
        return (
          <button
            key={tile.id}
            onClick={() => navigate(tile.path)}
            className="flex flex-col items-center gap-2 group"
          >
            <div
              className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${tile.color} flex items-center justify-center shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-200`}
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={1.8} />
            </div>
            <span className="text-xs font-medium text-foreground/80 text-center leading-tight line-clamp-2 w-full">
              {tile.label.en}
            </span>
          </button>
        );
      })}
    </div>
  );
}