import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare, CreditCard, BookOpen, Calendar, Home, LogOut, Menu, X, Bell
} from 'lucide-react';
import { Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/student/dashboard', icon: Home },
  { label: 'Mesajlar', path: '/student/chat', icon: MessageSquare },
  { label: 'Ödemelerim', path: '/student/payments', icon: CreditCard },
  { label: 'Derslerim', path: '/student/lessons', icon: BookOpen },
  { label: 'Devam', path: '/student/attendance', icon: Calendar },
];

export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user) setStudent(user);
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const handleLogout = () => base44.auth.logout('/');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground text-sm">Güneş English</p>
              <p className="text-xs text-sidebar-foreground/50">Öğrenci Portalı</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold text-xs">
                {student?.full_name?.[0] || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{student?.full_name || 'Yükleniyor...'}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate">{student?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Güneş English</span>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet context={{ student }} />
        </main>
      </div>
    </div>
  );
}