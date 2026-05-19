import React from 'react';
import { Sun, Shield, BookOpen, Users, GraduationCap, Megaphone, Calculator } from 'lucide-react';

const DEMO_USERS = [
  { id: 'demo-admin', email: 'admin@gunesenglish.com', full_name: 'Admin User', role: 'admin', icon: Shield, color: 'from-red-500 to-red-600', desc: 'Full access to all modules' },
  { id: 'staff2', email: 'aylin@gunesenglish.com', full_name: 'Aylin Yıldız', role: 'reception', icon: Users, color: 'from-emerald-500 to-emerald-600', desc: 'Students, invoices, leads' },
  { id: 'staff3', email: 'onur@gunesenglish.com', full_name: 'Onur Çetin', role: 'marketing', icon: Megaphone, color: 'from-purple-500 to-purple-600', desc: 'Leads, students, emails' },
  { id: 't1', email: 'sarah@gunesenglish.com', full_name: 'Sarah Johnson', role: 'teacher', icon: BookOpen, color: 'from-blue-500 to-blue-600', desc: 'Courses, schedule, classroom' },
  { id: 's1', email: 'mehmet@email.com', full_name: 'Mehmet Yılmaz', role: 'student', icon: GraduationCap, color: 'from-amber-500 to-amber-600', desc: 'Student self-service portal' },
  { id: 'demo-accounting', email: 'accounting@gunesenglish.com', full_name: 'Muhasebe User', role: 'accounting', icon: Calculator, color: 'from-teal-500 to-teal-600', desc: 'Finance, payroll, reports' },
];

export default function Login() {
  const handleLogin = (user) => {
    localStorage.setItem('gunes_current_user', JSON.stringify(user));
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30 mx-auto mb-4">
            <Sun className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Güneş English School</h1>
          <p className="text-muted-foreground text-sm mt-1">Management System</p>
        </div>

        {/* Demo Login Cards */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-xl p-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
            Select a role to sign in
          </p>
          <div className="grid gap-2.5">
            {DEMO_USERS.map((user) => {
              const Icon = user.icon;
              return (
                <button
                  key={user.id}
                  onClick={() => handleLogin(user)}
                  className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border border-border/50 bg-white hover:bg-slate-50 hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${user.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{user.full_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium uppercase">{user.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.desc}</p>
                  </div>
                  <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">Sign in →</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Demo Mode — Firebase Firestore Backend
        </p>
      </div>
    </div>
  );
}
