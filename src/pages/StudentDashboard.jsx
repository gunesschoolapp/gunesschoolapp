import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BookOpen, CreditCard, FileText, Award, MessageSquare, TrendingUp, Clock, Bell, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useLang } from '@/components/LanguageContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function StudentDashboard() {
  const { student } = useOutletContext();
  const { lang, toggleLang } = useLang();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    Promise.all([
      base44.entities.Payment.filter({ student_id: student.id }, '-payment_date', 10),
      base44.entities.Invoice.filter({ student_id: student.id }, '-issue_date', 10),
      base44.entities.Certificate.filter({ student_id: student.id }, '-completion_date', 10),
      base44.entities.Course.list(),
      base44.entities.ProgressReport.filter({ student_id: student.id }, '-created_date', 5),
      base44.entities.Notification.filter({ student_id: student.id, status: 'pending' }, '-created_date', 10),
      base44.entities.Conversation.filter({ student_id: student.id }),
    ]).then(([p, inv, cert, c, pr, notif, convs]) => {
      setPayments(p);
      setInvoices(inv);
      setCertificates(cert);
      setCourses(c);
      setProgress(pr);
      setNotifications(notif);
      const totalUnread = convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    }).finally(() => setLoading(false));
  }, [student?.id]);

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const latestProgress = progress[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (lang === 'tr') {
      if (h < 12) return 'Günaydın';
      if (h < 17) return 'İyi günler';
      return 'İyi akşamlar';
    } else {
      if (h < 12) return 'Good morning';
      if (h < 17) return 'Good afternoon';
      return 'Good evening';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with Language Selector */}
      <div className="flex items-center justify-between">
        <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-5 text-white flex-1">
          <p className="text-white/80 text-sm">{greeting()},</p>
          <h1 className="text-xl font-bold mt-1">{student?.full_name || (lang === 'tr' ? 'Öğrenci' : 'Student')}</h1>
          <p className="text-white/70 text-sm mt-1">{lang === 'tr' ? 'Hoş geldiniz! Bugün nasılsınız?' : 'Welcome back! How are you today?'}</p>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <Select value={lang} onValueChange={toggleLang}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tr">Türkçe</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link to="/student/payments" className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingPayments.length}</p>
          <p className="text-xs text-muted-foreground">{lang === 'tr' ? 'Bekleyen Ödeme' : 'Pending Payment'}</p>
        </Link>

        <Link to="/student/payments" className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
          <p className="text-xs text-muted-foreground">{lang === 'tr' ? 'Faturalar' : 'Invoices'}</p>
        </Link>

        <Link to="/student/lessons" className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{courses.length}</p>
          <p className="text-xs text-muted-foreground">{lang === 'tr' ? 'Aktif Kurs' : 'Active Courses'}</p>
        </Link>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{certificates.length}</p>
          <p className="text-xs text-muted-foreground">{lang === 'tr' ? 'Sertifikat' : 'Certificates'}</p>
        </div>

        <Link to="/student/chat" className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow relative">
          {unreadCount > 0 && (
            <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
          <p className="text-xs text-muted-foreground">{lang === 'tr' ? 'Yeni Mesaj' : 'New Messages'}</p>
        </Link>
      </div>

      {/* Latest progress */}
      {latestProgress && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">{lang === 'tr' ? 'Son İlerleme Raporu' : 'Latest Progress Report'}</h3>
            <span className="text-xs text-muted-foreground ml-auto">{latestProgress.period}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: lang === 'tr' ? 'Konuşma' : 'Speaking', val: latestProgress.speaking },
              { label: lang === 'tr' ? 'Dinleme' : 'Listening', val: latestProgress.listening },
              { label: lang === 'tr' ? 'Okuma' : 'Reading', val: latestProgress.reading },
              { label: lang === 'tr' ? 'Yazma' : 'Writing', val: latestProgress.writing },
              { label: lang === 'tr' ? 'Gramer' : 'Grammar', val: latestProgress.grammar },
              { label: lang === 'tr' ? 'Kelime' : 'Vocabulary', val: latestProgress.vocabulary },
            ].filter(s => s.val).map(skill => (
              <div key={skill.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{skill.label}</span>
                  <span className="font-medium">{skill.val}/10</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(skill.val / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {latestProgress.ai_summary && (
            <p className="text-xs text-muted-foreground mt-3 italic">"{latestProgress.ai_summary}"</p>
          )}
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">{lang === 'tr' ? 'Gelen Bildirimler' : 'Incoming Notifications'}</h3>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map(notif => (
              <div key={notif.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === 'tr' ? 'Kanal' : 'Channel'}: {notif.channel?.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">{lang === 'tr' ? 'Bekleyen Ödemeler' : 'Pending Payments'}</h3>
          </div>
          <div className="space-y-2">
            {pendingPayments.slice(0, 3).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">£{p.amount}</p>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Vade' : 'Due'}: {p.due_date ? format(new Date(p.due_date), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {p.status === 'overdue' ? (lang === 'tr' ? 'Gecikmiş' : 'Overdue') : (lang === 'tr' ? 'Bekliyor' : 'Pending')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}