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
import { useLessonReminder } from '@/hooks/useLessonReminder';
import { Switch } from '@/components/ui/switch';
import MobileBottomNav from '@/components/MobileBottomNav';
import TeamChatSidebar from '@/components/chat/TeamChatSidebar';
import QuickActionFAB from '@/components/QuickActionFAB';
import GlobalSearchBar from '@/components/GlobalSearchBar';
import { useLanguage } from '@/lib/LanguageContext';

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
  { path: '/MyPackages',       icon: BookOpen,        key: 'myPackages',       category: 'education', roles: ['student'] },
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
  const [activePopup, setActivePopup] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Auto lesson reminders (runs every 60s for admin)
  useLessonReminder(user);

  const role = (user?.matched_role || user?.role) || 'user';
  const { language, setLanguage, t } = useLanguage();

  // Fetch pending notifications and pop-ups
  React.useEffect(() => {
    if (user?.email) {
      const fetchNotifications = () => {
        base44.entities.Notification.list()
          .then(notifications => {
            const isAdmin = ['admin', 'team_admin'].includes(role);
            const filtered = notifications.filter(n => {
              if (isAdmin) return !n.read;
              return n.recipient_email === user.email && !n.read;
            });
            setPendingNotifications(filtered.length);

            // Find first unread popup notification addressed to this user
            const popupNotif = filtered.find(n => n.is_popup && n.recipient_email === user.email);
            if (popupNotif) {
              setActivePopup(popupNotif);
            } else {
              setActivePopup(null);
            }
          })
          .catch(() => {
            setPendingNotifications(0);
            setActivePopup(null);
          });
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);

      base44.entities.FormSubmission.filter({ status: 'new' })
        .then(subs => setNewFormSubmissions(subs?.length || 0))
        .catch(() => setNewFormSubmissions(0));

      return () => clearInterval(interval);
    }
  }, [user?.email, role]);

  const tKey = (key) => {
    return t(key);
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
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.profile_photo_url ? (
                    <img src={user.profile_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-primary">{user.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none">{user.full_name || user.email}</p>
                  <Badge className={`text-[9px] px-1.5 py-0 mt-0.5 border ${getRoleBadgeColor(role)}`}>{getRoleLabel(role)}</Badge>
                </div>
              </div>

              {role === 'student' && (
                <div className="flex items-center bg-sidebar-accent/50 p-0.5 rounded-lg border border-sidebar-border flex-shrink-0">
                  <button
                    onClick={() => setLanguage('tr')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                      language === 'tr'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    TR
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                      language === 'en'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    EN
                  </button>
                </div>
              )}
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
         <div className="p-3 pb-16 lg:pb-3 border-t border-sidebar-border space-y-2 bg-sidebar">
            <Link
              to="/NotificationCenter"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${location.pathname === '/NotificationCenter' ? 'bg-primary text-white' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60'}`}
            >
              <Bell className="w-4 h-4" />
              <span className="flex-1">{t('notifications')}</span>
              {pendingNotifications > 0 && (
                <div className="bg-destructive text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingNotifications}</div>
              )}
            </Link>
           <button
             onClick={() => logout()}
             className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
           >
             <LogOut className="w-4 h-4" />
             {t('signOut')}
           </button>
         </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-card/80 backdrop-blur border-b border-border flex items-center gap-2 px-3 lg:px-6 flex-shrink-0 min-w-0 relative z-30">
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
            {role === 'student' && (
              <div className="flex items-center bg-muted p-1 rounded-xl border border-border/50 mr-1.5 flex-shrink-0">
                <button
                  onClick={() => setLanguage('tr')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    language === 'tr'
                      ? 'bg-background text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    language === 'en'
                      ? 'bg-background text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  EN
                </button>
              </div>
            )}
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
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 hover:border-primary/40 transition-colors flex-shrink-0 overflow-hidden"
              >
                {user?.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black text-primary">
                    {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </button>

              {profileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  
                  {/* Floating Dropdown */}
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2.5 border-b border-border/60 mb-1">
                      <p className="text-sm font-bold text-foreground truncate">{user?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <div className="mt-1.5">
                        <Badge className={`text-[9px] px-1.5 py-0 border ${getRoleBadgeColor(role)}`}>
                          {getRoleLabel(role)}
                        </Badge>
                      </div>
                    </div>
                    
                    <Link
                      to="/Profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors w-full text-left"
                    >
                      <UserCog className="w-4 h-4 text-muted-foreground" />
                      <span>{t('profile') || 'Profilim'}</span>
                    </Link>
                    
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left mt-1"
                    >
                      <LogOut className="w-4 h-4 text-destructive" />
                      <span>{t('signOut') || 'Çıkış Yap'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
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

      {/* Global Pop-up Announcement Modal */}
      {activePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in duration-300">
            {activePopup.image_url && (
              <div className="w-full max-h-56 overflow-hidden bg-muted border-b border-border">
                <img src={activePopup.image_url} alt={activePopup.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                  {activePopup.notification_type === 'lesson_reminder' ? '⏰' : '📢'}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground leading-snug">{activePopup.title}</h3>
                  {activePopup.sent_by && (
                    <p className="text-xs text-muted-foreground mt-0.5">{language === 'tr' ? 'Gönderen' : 'Sent by'}: {activePopup.sent_by}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground/85 whitespace-pre-line leading-relaxed mb-6">
                {activePopup.message}
              </p>
              <Button
                className="w-full font-bold shadow-lg shadow-primary/20 h-11 rounded-xl"
                onClick={async () => {
                  try {
                    await base44.entities.Notification.update(activePopup.id, { read: true });
                    setActivePopup(null);
                    setPendingNotifications(prev => Math.max(0, prev - 1));
                  } catch (err) {
                    console.error('Failed to dismiss popup notification:', err);
                  }
                }}
              >
                {language === 'tr' ? 'Okudum / Kapat' : 'Mark as Read / Dismiss'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}