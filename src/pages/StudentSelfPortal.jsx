import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard, BookOpen, Calendar, CheckCircle, XCircle, Clock,
  AlertCircle, User, MapPin, Award, TrendingUp, Bot, MessageSquare,
  Bell, Trash2, Check
} from 'lucide-react';
import AITeacherChat from '@/components/ai-teacher/AITeacherChat';
import StudentChatPanel from '@/components/chat/StudentChatPanel';
import { format, parseISO } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useLanguage } from '@/lib/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const levelColors = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700', B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700', C2: 'bg-purple-100 text-purple-700',
};

export default function StudentSelfPortal() {
  const { language, t } = useLanguage();
  const activeLocale = language === 'tr' ? tr : enUS;

  const attConfig = {
    present: { label: t('present'), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    absent: { label: t('absent'), icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    late: { label: t('late'), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    excused: { label: t('excused'), icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  };

  const payStatus = {
    paid: { label: t('paidStatus'), color: 'bg-emerald-100 text-emerald-700' },
    pending: { label: t('pendingStatus'), color: 'bg-amber-100 text-amber-700' },
    overdue: { label: t('overdueStatus'), color: 'bg-red-100 text-red-700' },
    cancelled: { label: t('cancelledStatus'), color: 'bg-gray-100 text-gray-600' },
  };

  const [user, setUser] = useState(null);
  const [studentRecord, setStudentRecord] = useState(null);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const markAsRead = async (notifId) => {
    try {
      await base44.entities.Notification.update(notifId, { read: true });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const deleteNotification = async (notifId) => {
    try {
      await base44.entities.Notification.delete(notifId);
      const toDelete = notifications.find(n => n.id === notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      if (toDelete && !toDelete.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  useEffect(() => {
    base44.auth.me().then(async u => {
      if (!u) { base44.auth.redirectToLogin(window.location.href); return; }
      setUser(u);

      // Find student record by email
      const students = await base44.entities.Student.filter({ email: u.email });
      const student = students[0] || null;
      setStudentRecord(student);

      if (!student) { setLoading(false); return; }

      const allCourses = await base44.entities.Course.list();
      const myCourses = allCourses.filter(c => (c.enrolled_students || []).includes(student.id));
      setCourses(myCourses);

      const courseIds = myCourses.map(c => c.id);

      await Promise.all([
        base44.entities.Payment.filter({ student_id: student.id }, '-payment_date', 50).then(setPayments),
        base44.entities.Invoice.filter({ student_id: student.id }, '-issue_date', 20).then(setInvoices),
        base44.entities.Certificate.filter({ student_id: student.id }, '-completion_date', 10).then(setCertificates),
        base44.entities.ProgressReport.filter({ student_id: student.id }, '-created_date', 5).then(setProgress),
        base44.entities.Attendance.filter({ student_id: student.id }, '-date', 100).then(setAttendance),
        courseIds.length > 0
          ? base44.entities.Lesson.list('-date', 100).then(all =>
              setLessons(all.filter(l => courseIds.includes(l.course_id)))
            )
          : Promise.resolve(),
      ]);

      const allNotifs = await base44.entities.Notification.list();
      const myNotifs = allNotifs.filter(n => n.recipient_email === u.email).sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
      setNotifications(myNotifs);
      setUnreadCount(myNotifs.filter(n => !n.read).length);
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!studentRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="font-semibold text-lg mb-2">{t('studentNotFound')}</h2>
            <p className="text-sm text-muted-foreground">
              {user?.email} {t('noProfileWithEmail')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingLessons = lessons.filter(l => l.date >= today && l.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15);
  const paidTotal = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingTotal = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attRate = attendance.length > 0 ? Math.round(((presentCount + attendance.filter(a => a.status === 'late').length) / attendance.length) * 100) : 0;
  const latestProgress = progress[0];

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 pt-8 pb-6">
        <div className="max-w-2xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm">{t('welcome')}</p>
            <h1 className="text-2xl font-bold mt-1">{studentRecord.full_name}</h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {studentRecord.cefr_level && (
                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                  {studentRecord.cefr_level}
                </span>
              )}
              {certificates.length > 0 && (
                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <Award className="w-3 h-3" /> {certificates.length} {t('certificate')}
                </span>
              )}
            </div>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotificationsDialog(true)}
            className="relative p-2 hover:bg-white/10 rounded-xl transition-all"
            title="Notifications"
          >
            <Bell className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="p-3">
              <p className="text-lg font-bold text-emerald-600">£{paidTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{t('paid')}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <p className={`text-lg font-bold ${pendingTotal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>£{pendingTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{t('pending')}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <p className={`text-lg font-bold ${attRate >= 80 ? 'text-emerald-600' : attRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>%{attRate}</p>
              <p className="text-xs text-muted-foreground">{t('attendance')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 mt-5">
        <Tabs defaultValue="schedule">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="schedule" className="text-xs gap-1"><Calendar className="w-3.5 h-3.5" />{t('schedule')}</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs gap-1"><CreditCard className="w-3.5 h-3.5" />{t('payments')}</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs gap-1"><CheckCircle className="w-3.5 h-3.5" />{t('attendance')}</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs gap-1"><MessageSquare className="w-3.5 h-3.5" />{t('messages')}</TabsTrigger>
            <TabsTrigger value="ai_teacher" className="text-xs gap-1"><Bot className="w-3.5 h-3.5" />{t('aiTeacher')}</TabsTrigger>
          </TabsList>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="mt-4 space-y-4">
            {/* Enrolled courses */}
            {courses.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('enrolledCourses')}</h3>
                <div className="space-y-2">
                  {courses.map(course => (
                    <Card key={course.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{course.name}</p>
                            <div className="flex flex-wrap gap-2 mt-0.5">
                              {course.teacher && <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{course.teacher}</span>}
                              {course.schedule && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{course.schedule}</span>}
                              {course.room && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{course.room}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge className={levelColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}>{course.cefr_level}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming lessons */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('upcomingLessons')}</h3>
              {upcomingLessons.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('upcomingLessonsNotFound')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingLessons.map(lesson => {
                    const course = courses.find(c => c.id === lesson.course_id);
                    return (
                      <Card key={lesson.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-primary text-xs font-bold leading-none">{format(parseISO(lesson.date), 'dd')}</span>
                            <span className="text-primary/60 text-[10px]">{format(parseISO(lesson.date), 'MMM', { locale: activeLocale })}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{course?.name || 'Ders'}</p>
                            <p className="text-xs text-muted-foreground">
                              {lesson.start_time}{lesson.end_time ? ` - ${lesson.end_time}` : ''}
                              {lesson.topic && ` · ${lesson.topic}`}
                              {lesson.room && ` · ${lesson.room}`}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 text-xs flex-shrink-0">{t('scheduledStatus')}</Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Progress */}
            {latestProgress && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('latestProgressReport')}</h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{latestProgress.period}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: t('speaking'), val: latestProgress.speaking },
                        { label: t('listening'), val: latestProgress.listening },
                        { label: t('reading'), val: latestProgress.reading },
                        { label: t('writing'), val: latestProgress.writing },
                        { label: t('grammar'), val: latestProgress.grammar },
                        { label: t('vocabulary'), val: latestProgress.vocabulary },
                      ].filter(s => s.val).map(skill => (
                        <div key={skill.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{skill.label}</span>
                            <span className="font-medium">{skill.val}/10</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(skill.val / 10) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {latestProgress.ai_summary && (
                      <p className="text-xs text-muted-foreground mt-3 italic">"{latestProgress.ai_summary}"</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            {payments.length === 0 && invoices.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('paymentRecordsNotFound')}</p>
              </div>
            ) : (
              <>
                {/* Payment summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card border rounded-xl p-3 text-center">
                    <p className="text-base font-bold">£{(paidTotal + pendingTotal).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t('total')}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-emerald-700">£{paidTotal.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600">{t('paid')}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-amber-700">£{pendingTotal.toLocaleString()}</p>
                    <p className="text-xs text-amber-600">{t('pending')}</p>
                  </div>
                </div>

                {/* Payments list */}
                {payments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('paymentHistory')}</h3>
                    <div className="space-y-2">
                      {payments.map(p => {
                        const s = payStatus[p.status] || payStatus.pending;
                        return (
                          <Card key={p.id}>
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">£{(p.amount || 0).toLocaleString()}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy', { locale: activeLocale }) : p.due_date ? `${t('dueDate')} ${format(new Date(p.due_date), 'dd MMM yyyy', { locale: activeLocale })}` : '-'}
                                    {p.total_installments > 1 && ` · ${t('installment')} ${p.installment_number}/${p.total_installments}`}
                                  </p>
                                </div>
                              </div>
                              <Badge className={`${s.color} text-xs flex-shrink-0`}>{s.label}</Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {invoices.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('invoices')}</h3>
                    <div className="space-y-2">
                      {invoices.map(inv => (
                        <Card key={inv.id}>
                          <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{inv.invoice_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {inv.issue_date ? format(new Date(inv.issue_date), 'dd MMM yyyy', { locale: activeLocale }) : '-'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold">£{(inv.amount || 0).toLocaleString()}</p>
                              <Badge className={`text-xs ${payStatus[inv.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                                {payStatus[inv.status]?.label || inv.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            {/* Rate */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">{t('generalAttendanceRate')}</span>
                  <span className={`font-bold ${attRate >= 80 ? 'text-emerald-600' : attRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>%{attRate}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${attRate >= 80 ? 'bg-emerald-500' : attRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${attRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: t('present'), count: attendance.filter(a => a.status === 'present').length, color: 'text-emerald-600' },
                    { label: t('absent'), count: attendance.filter(a => a.status === 'absent').length, color: 'text-red-600' },
                    { label: t('late'), count: attendance.filter(a => a.status === 'late').length, color: 'text-amber-600' },
                    { label: t('excused'), count: attendance.filter(a => a.status === 'excused').length, color: 'text-blue-600' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Attendance list */}
            {attendance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('attendanceRecordsNotFound')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendance.map(a => {
                  const s = attConfig[a.status] || attConfig.present;
                  const Icon = s.icon;
                  const course = courses.find(c => c.id === a.course_id);
                  return (
                    <Card key={a.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{course?.name || 'Ders'}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.date ? format(parseISO(a.date), 'dd MMM yyyy', { locale: activeLocale }) : '-'}
                          </p>
                        </div>
                        <span className={`text-xs font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          {/* MESSAGES TAB */}
          <TabsContent value="messages" className="mt-4">
            <StudentChatPanel studentRecord={studentRecord} user={user} />
          </TabsContent>

          {/* AI TEACHER TAB */}
          <TabsContent value="ai_teacher" className="mt-4">
            <AITeacherChat student={studentRecord} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Notifications Modal */}
      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent className="max-w-md w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Bell className="w-5 h-5 text-primary" />
              {language === 'tr' ? 'Bildirimleriniz' : 'Notifications'}
              {unreadCount > 0 && (
                <Badge className="ml-1 bg-red-100 text-red-700 font-semibold px-2 py-0.5 text-xs">
                  {unreadCount} {language === 'tr' ? 'yeni' : 'new'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-3">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-25" />
                <p className="text-sm">{language === 'tr' ? 'Okunmamış bildiriminiz yok.' : 'No unread notifications.'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`border rounded-xl p-3 transition-all relative ${
                      notif.read ? 'bg-slate-50/70 opacity-75' : 'bg-primary/5 border-primary/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm flex-shrink-0">
                        {notif.notification_type === 'lesson_reminder' ? '⏰' : '🔔'}
                      </div>
                      <div className="flex-1 min-w-0 pr-12">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {notif.sent_at ? new Date(notif.sent_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US') : ''}
                          </span>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground leading-snug">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                          title={language === 'tr' ? 'Okundu olarak işaretle' : 'Mark as read'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        title={language === 'tr' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              className="w-full mt-3 h-10 rounded-xl font-semibold"
              variant="outline"
              onClick={() => setShowNotificationsDialog(false)}
            >
              {language === 'tr' ? 'Kapat' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}