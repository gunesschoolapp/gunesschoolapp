import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, UserPlus, CreditCard, Users, Calendar, TrendingDown } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

const ACTIONS_BY_PAGE = {
  '/Leads': [
    { icon: UserPlus, labelTr: 'Hızlı Lead Ekle', labelEn: 'Quick Lead', action: 'lead' },
  ],
  '/Students': [
    { icon: Users, labelTr: 'Hızlı Öğrenci Ekle', labelEn: 'Quick Student', action: 'student' },
  ],
  '/Finance': [
    { icon: CreditCard, labelTr: 'Hızlı Ödeme Al', labelEn: 'Quick Payment', action: 'payment' },
  ],
  '/Schedule': [
    { icon: Calendar, labelTr: 'Hızlı Ders Ekle', labelEn: 'Quick Lesson', action: 'lesson' },
  ],
};

const DEFAULT_ACTIONS = [
  { icon: Users, labelTr: 'Öğrenci Ekle', labelEn: 'Add Student', path: '/Students', action: 'new' },
  { icon: CreditCard, labelTr: 'Ödeme Al', labelEn: 'Take Payment', path: '/Finance', action: 'new_payment' },
  { icon: TrendingDown, labelTr: 'Gider Ekle', labelEn: 'Add Expense', path: '/Expenses', action: 'new' },
];

export default function QuickActionFAB({ lang }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();

  // Don't show on student/public pages
  const hiddenPaths = ['/student', '/public', '/staff-login', '/setup-account'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;
  if (!user || user.role === 'student') return null;

  const handleAction = (path, action) => {
    setOpen(false);
    navigate(action ? `${path}?action=${action}` : path);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-20 right-4 z-50 lg:bottom-6 flex flex-col items-end gap-2">
        {/* Action items */}
        {open && DEFAULT_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={() => handleAction(action.path, action.action)}
              className="flex items-center gap-2 bg-card border border-border shadow-lg rounded-full pl-3 pr-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all animate-in slide-in-from-bottom-2"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span>{lang === 'tr' ? action.labelTr : action.labelEn}</span>
            </button>
          );
        })}

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300
            ${open
              ? 'bg-destructive text-white rotate-45 shadow-destructive/30'
              : 'bg-primary text-white shadow-primary/40 active:scale-95'
            }`}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}