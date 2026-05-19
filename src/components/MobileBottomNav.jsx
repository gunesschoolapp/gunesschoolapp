import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Menu, X, LayoutDashboard, BookOpen, GraduationCap, CheckSquare, Receipt, BarChart3, Settings, Bell, Building2, Mail, Award } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

const BOTTOM_ITEMS = [
  { path: '/Students',        icon: Users,       label: 'Students',      skipRoles: ['student', 'teacher'] },
  { path: '/Schedule',        icon: Calendar,    label: 'Schedule',      skipRoles: [] },
  { path: '/NotificationCenter', icon: Bell,     label: 'Notifications', skipRoles: [] },
  { path: '/Tasks',           icon: CheckSquare, label: 'Tasks',         skipRoles: [] },
];

// All menu items for the drawer
const MENU_ITEMS = [
  { path: '/Dashboard',          icon: LayoutDashboard, label: 'Dashboard',        roles: ['admin'] },
  { path: '/TeacherDashboard',   icon: LayoutDashboard, label: 'Dashboard',        roles: ['teacher'] },
  { path: '/StaffDashboard',     icon: LayoutDashboard, label: 'Dashboard',        roles: ['reception', 'marketing', 'accounting', 'user'] },
  { path: '/Students',           icon: Users,           label: 'Students' },
  { path: '/Courses',            icon: BookOpen,        label: 'Courses' },
  { path: '/Schedule',           icon: Calendar,        label: 'Schedule' },
  { path: '/Teachers',           icon: GraduationCap,   label: 'Teachers' },
  { path: '/Tasks',              icon: CheckSquare,     label: 'Tasks' },
  { path: '/InvoiceManagement',  icon: Receipt,         label: 'Invoices' },
  { path: '/Finance',            icon: DollarSign,      label: 'Finance' },
  { path: '/Payroll',            icon: DollarSign,      label: 'Payroll' },
  { path: '/Reports',            icon: BarChart3,       label: 'Reports' },
  { path: '/NotificationCenter', icon: Bell,            label: 'Notifications' },
  { path: '/Personnel',          icon: Users,           label: 'Personnel' },
  { path: '/Emails',             icon: Mail,            label: 'Emails' },
  { path: '/Certifications',     icon: Award,           label: 'Certifications' },
  { path: '/Classrooms',         icon: Building2,       label: 'Classrooms' },
  { path: '/Settings',           icon: Settings,        label: 'Settings' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPerm } = useCurrentUser();
  const role = user?.matched_role || user?.role || 'user';
  const [menuOpen, setMenuOpen] = useState(false);

  const pageKey = (path) => path.replace('/', '');

  // Filter menu items by granular permissions
  const visibleMenuItems = MENU_ITEMS.filter(item => {
    if (item.roles) return item.roles.includes(role);
    return hasPerm(pageKey(item.path), 'view');
  });

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Bottom Sheet Menu */}
      {menuOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden bg-card border-t border-border rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
            <h3 className="font-bold text-base">Menu</h3>
            <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-xl hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {visibleMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMenuOpen(false); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground/80'}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-inset-bottom">
        <div className="flex items-stretch h-16">
          {/* Regular nav items */}
          {BOTTOM_ITEMS.filter(item => {
            if (item.skipRoles && item.skipRoles.includes(role)) return false;
            return hasPerm(pageKey(item.path), 'view');
          }).map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors
                  ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors
              ${menuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${menuOpen ? 'bg-primary/10' : ''}`}>
              <Menu className="w-5 h-5" />
            </div>
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}