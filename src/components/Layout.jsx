import React, { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Calendar,
  Menu, LogOut, Sun,
  UserCog, CheckSquare, Award,
  Settings, X, ChevronRight, Eye, EyeOff, GripVertical, Check,
  BarChart3, Banknote, DollarSign, MapPin, Bell, Monitor, FileText, Shield, MessageSquare
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import MobileBottomNav from '@/components/MobileBottomNav';
import TeamChatSidebar from '@/components/chat/TeamChatSidebar';
import QuickActionFAB from '@/components/QuickActionFAB';
import GlobalSearchBar from '@/components/GlobalSearchBar';

const CATEGORIES = {
  main:       { label: 'Main',        labelTr: 'ANA' },
  crm:        { label: 'CRM',         labelTr: 'CRM YÖNETİMİ' },
  education:  { label: 'Education',   labelTr: 'EĞİTİM' },
  finance:    { label: 'Finance',     labelTr: 'FİNANS' },
  personnel:  { label: 'Team',        labelTr: 'PERSONEL' },
  system:     { label: 'System',      labelTr: 'SİSTEM' },
};

const ALL_NAV = [
  // Ana - tüm roller
  { path: '/Dashboard',        icon: LayoutDashboard, key: 'dashboard',        category: 'main', roles: ['admin', 'team_admin'] },
  { path: '/TeacherDashboard', icon: LayoutDashboard, key: 'teacherDashboard', category: 'main', roles: ['teacher'] },
  { path: '/StaffDashboard',   icon: LayoutDashboard, key: 'staffDashboard',   category: 'main', roles: ['reception', 'marketing', 'accounting', 'user'] },
  { path: '/StudentSelfPortal',icon: LayoutDashboard, key: 'studentDashboard', category: 'main', roles: ['student'] },

  // CRM Yönetimi
  { path: '/Leads',           icon: Users,           key: 'leads',            category: 'crm', roles: ['admin', 'team_admin', 'reception', 'marketing', 'user'] },
  { path: '/Students',         icon: Users,           key: 'students',         category: 'crm', roles: ['admin', 'team_admin', 'reception', 'marketing', 'user'] },
  { path: '/FormSubmissions',  icon: FileText,        key: 'formSubmissions',  category: 'crm', roles: ['admin', 'team_admin', 'reception', 'marketing', 'user'] },

  // Eğitim
  { path: '/Courses',          icon: BookOpen,        key: 'courses',          category: 'education', roles: ['admin', 'team_admin', 'teacher', 'user'] },
  { path: '/Schedule',         icon: Calendar,        key: 'schedule',         category: 'education', roles: ['admin', 'team_admin', 'teacher', 'user'] },
  { path: '/Classrooms',       icon: MapPin,          key: 'classrooms',       category: 'education', roles: ['admin', 'team_admin', 'teacher'] },
  { path: '/Classroom',        icon: Monitor,         key: 'classroom',        category: 'education', roles: ['admin', 'team_admin', 'teacher'] },
  { path: '/Certifications',   icon: Award,           key: 'certifications',   category: 'education', roles: ['admin', 'team_admin', 'user'] },
  { path: '/Resources',        icon: FileText,        key: 'resources',        category: 'education', roles: ['admin', 'team_admin', 'teacher', 'student'] },
  { path: '/Packages',         icon: BookOpen,        key: 'packages',         category: 'education', roles: ['admin', 'team_admin', 'student', 'user'] },

  // Finans
  { path: '/Finance',          icon: DollarSign,      key: 'finance',          category: 'finance', roles: ['admin', 'accounting', 'user'] },
  { path: '/InvoiceManagement',icon: FileText,        key: 'invoiceManagement',category: 'finance', roles: ['admin', 'accounting', 'reception', 'user'] },
  { path: '/Accounting',       icon: BarChart3,       key: 'accounting',       category: 'finance', roles: ['admin', 'accounting'] },
  { path: '/Payroll',          icon: Banknote,        key: 'payroll',          category: 'finance', roles: ['admin', 'accounting'] },

  // Personel
  { path: '/Personnel',        icon: UserCog,         key: 'personnel',        category: 'personnel', roles: ['admin', 'team_admin'] },

  // Sistem
  { path: '/Tasks',            icon: CheckSquare,     key: 'tasks',            category: 'system', roles: ['admin', 'reception', 'marketing', 'accounting', 'teacher', 'user'] },
  { path: '/Reports',          icon: BarChart3,       key: 'reports',          category: 'system', roles: ['admin', 'accounting', 'user'] },
  { path: '/Settings',         icon: Settings,        key: 'settings',         category: 'system', roles: ['admin'] },
];

function loadNavConfig() {
  try {
    const saved = localStorage.getItem('nav_config');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { order: ALL_NAV.map(n => n.path), hidden: [] };
}

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [navConfig, setNavConfig] = useState(loadNavConfig);
  const [dragIndex, setDragIndex] = useState(null);
  const { user, hasPerm, loading } = useCurrentUser();
  const { logout } = useAuth();
  const [pendingNotifications, setPendingNotifications] = useState(0);
  const [newFormSubmissions, setNewFormSubmissions] = useState(0);

  const role = (user?.matched_role || user?.role) || 'user';

  // Fetch pending notifications
  React.useEffect(() => {
    if (user?.email) {
      base44.entities.Notification.filter({ status: 'pending' })
        .then(notifications => {
          setPendingNotifications(notifications?.length || 0);
        })
        .catch(() => setPendingNotifications(0));
      base44.entities.FormSubmission.filter({ status: 'new' })
        .then(subs => setNewFormSubmissions(subs?.length || 0))
        .catch(() => setNewFormSubmissions(0));
    }
  }, [user?.email]);

  const tKey = (key) => {
    const extras = {
      dashboard:        'Dashboard',
      teacherDashboard: 'Dashboard',
      staffDashboard:   'Dashboard',
      studentDashboard: 'Dashboard',
      leads:            'Leads (CRM)',
      students:         'Students',
      formSubmissions:  'Web Forms',
      courses:          'Courses',
      schedule:         'Schedule',
      classrooms:       'Classrooms',
      classroom:        'Virtual Classroom',
      certifications:   'Certifications',
      resourceLibrary:  'Resource Library',
      resources:        'Resources',
      packages:         'Packages',
      finance:          'Finance',
      invoiceManagement:'Invoices',
      accounting:       'Accounting',
      payroll:          'Payroll',
      personnel:        'Personnel',
      userPermissions:  'User Permissions',
      teachers:         'Teachers',
      salesStaff:       'Sales Team',
      emails:           'Emails',
      tasks:            'Tasks',
      reports:          'Reports',
      settings:         'Settings',
    };
    return extras[key] || key;
  };

  const saveConfig = useCallback((config) => {
    setNavConfig(config);
    localStorage.setItem('nav_config', JSON.stringify(config));
  }, []);

  const toggleHidden = (path) => {
    const hidden = navConfig.hidden.includes(path)
      ? navConfig.hidden.filter(p => p !== path)
      : [...navConfig.hidden, path];
    saveConfig({ ...navConfig, hidden });
  };

  const onDragStart = (e, idx) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const newOrder = [...navConfig.order];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(idx, 0, moved);
    setDragIndex(idx);
    setNavConfig(prev => ({ ...prev, order: newOrder }));
  };

  const onDragEnd = () => {
    localStorage.setItem('nav_config', JSON.stringify(navConfig));
    setDragIndex(null);
  };

  // Build sorted + filtered nav
  const sortedNav = [...ALL_NAV].sort((a, b) => {
    const ai = navConfig.order.indexOf(a.path);
    const bi = navConfig.order.indexOf(b.path);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Extract page key from path (e.g. '/Students' -> 'Students')
  const pathToKey = (path) => path.replace('/', '');

  // Filter by granular hasPerm (uses Staff permissions or role defaults)
  const navItems = sortedNav.filter(item => {
    if (navConfig.hidden.includes(item.path)) return false;
    // Only show the correct dashboard for the current role
    if (item.key === 'dashboard' && !['admin', 'team_admin'].includes(role)) return false;
    if (item.key === 'teacherDashboard' && role !== 'teacher') return false;
    if (item.key === 'staffDashboard' && ['admin', 'team_admin', 'teacher', 'student'].includes(role)) return false;
    if (item.key === 'studentDashboard' && role !== 'student') return false;
    // Dashboard items always visible for their role
    if (['dashboard', 'teacherDashboard', 'staffDashboard', 'studentDashboard'].includes(item.key)) return true;
    return hasPerm(pathToKey(item.path), 'view');
  });

  const editableItems = sortedNav.filter(item => hasPerm(pathToKey(item.path), 'view'));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                <Sun className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-black text-base leading-none">Gunes</h1>
                <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 font-medium tracking-wide uppercase">English School</p>
              </div>
            </div>
            <button className="lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User info strip */}
        {user && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-primary">{user.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none">{user.full_name || user.email}</p>
                <Badge className={`text-[9px] px-1.5 py-0 mt-0.5 border ${getRoleBadgeColor(role)}`}>{getRoleLabel(role)}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
           {editMode ? (
             <>
               <p className="text-[10px] text-sidebar-foreground/40 px-3 pb-2 uppercase tracking-wider">Drag & Hide</p>
               {editableItems.map((item, idx) => {
                 const isHidden = navConfig.hidden.includes(item.path);
                 return (
                   <div
                     key={item.path}
                     draggable
                     onDragStart={e => onDragStart(e, idx)}
                     onDragOver={e => onDragOver(e, idx)}
                     onDragEnd={onDragEnd}
                     className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all cursor-grab active:cursor-grabbing
                       ${isHidden ? 'opacity-40' : 'opacity-100'}
                       ${dragIndex === idx ? 'bg-sidebar-accent/80 scale-[0.98]' : 'hover:bg-sidebar-accent/40'}
                     `}
                   >
                     <GripVertical className="w-3.5 h-3.5 text-sidebar-foreground/30 flex-shrink-0" />
                     <item.icon className="w-4 h-4 flex-shrink-0 text-sidebar-foreground/60" />
                     <span className="flex-1 text-sidebar-foreground/80">{tKey(item.key)}</span>
                     <button
                       onClick={() => toggleHidden(item.path)}
                       className="p-1 rounded hover:bg-sidebar-accent transition-colors"
                     >
                       {isHidden
                         ? <EyeOff className="w-3.5 h-3.5 text-sidebar-foreground/30" />
                         : <Eye className="w-3.5 h-3.5 text-sidebar-foreground/60" />
                       }
                     </button>
                   </div>
                 );
               })}
               <button
                 onClick={() => setEditMode(false)}
                 className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
               >
                 <Check className="w-3.5 h-3.5" /> Done
                 </button>
             </>
           ) : (
             <>
               {Object.entries(CATEGORIES).map(([catKey, catInfo]) => {
                 const itemsInCat = navItems.filter(item => item.category === catKey);
                 if (itemsInCat.length === 0) return null;
                 return (
                   <div key={catKey} className="mb-3">
                     <p className="text-[10px] text-sidebar-foreground/40 px-3 pb-1.5 uppercase tracking-wider font-semibold">{catInfo.label}</p>
                     <div className="space-y-0.5">
                       {itemsInCat.map(item => {
                         const isActive = location.pathname === item.path;
                         return (
                           <Link
                             key={item.path}
                             to={item.path}
                             onClick={() => setSidebarOpen(false)}
                             className={`
                               flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                               ${isActive
                                 ? 'bg-primary text-white shadow-md shadow-primary/30'
                                 : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent'}
                             `}
                           >
                             <item.icon className="w-4 h-4 flex-shrink-0" />
                             <span className="flex-1">{tKey(item.key)}</span>
                             {item.key === 'formSubmissions' && newFormSubmissions > 0 && (
                               <div className="bg-destructive text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{newFormSubmissions}</div>
                             )}
                             {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                           </Link>
                         );
                       })}
                     </div>
                   </div>
                 );
               })}
             </>
           )}
         </nav>

        {/* Bottom actions */}
         <div className="p-3 border-t border-sidebar-border space-y-2">
           <Link
             to="/NotificationCenter"
             onClick={() => setSidebarOpen(false)}
             className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${location.pathname === '/NotificationCenter' ? 'bg-primary text-white' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'}`}
           >
             <Bell className="w-4 h-4" />
             <span className="flex-1">Notifications</span>
             {pendingNotifications > 0 && (
               <div className="bg-destructive text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingNotifications}</div>
             )}
           </Link>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card/80 backdrop-blur border-b border-border flex items-center gap-2 px-3 lg:px-6 flex-shrink-0 min-w-0">
          <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          {/* Page title — desktop only */}
          <div className="hidden lg:flex items-center gap-2 text-sm flex-shrink-0">
            <span className="font-semibold text-foreground">
              {ALL_NAV.find(n => n.path === location.pathname)?.key
                ? tKey(ALL_NAV.find(n => n.path === location.pathname)?.key)
                : 'Dashboard'}
            </span>
          </div>
          {/* Global Search — takes remaining space */}
          <div className="flex-1 min-w-0">
            <GlobalSearchBar />
          </div>
          {/* Right side */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!['student'].includes(role) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(true)}
                className="relative"
                title="Team Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>
            )}
            {user && <span className="text-sm text-muted-foreground hidden sm:block max-w-[120px] truncate">{user.full_name || user.email}</span>}
            <Link to="/Profile" className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 hover:border-primary/40 transition-colors flex-shrink-0">
              <span className="text-xs font-black text-primary">
                {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </Link>
          </div>
        </header>

        {/* Page content — add bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Team Chat Sidebar */}
      {!['student'].includes(role) && (
        <TeamChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} user={user} />
      )}

    </div>
  );
}