import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import AppLauncher from '@/components/AppLauncher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckSquare, Bell, ChevronRight,
  ClipboardList, Users, AlertCircle
} from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-black text-foreground mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ status: 'pending' }),
  });

  // My tasks (assigned to me, not done)
  const myTasks = tasks
    .filter(t => t.assigned_to === user?.email && t.status !== 'done')
    .sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    });

  const overdueTasks = myTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const todayTasks = myTasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));

  // Recent students
  const recentStudents = [...students]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const priorityColor = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Merhaba, {user?.full_name?.split(' ')[0] || 'Personel'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Görevlerinize ve öğrencilerinize genel bakış</p>
      </div>

      {/* App Launcher */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 sm:p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Uygulamalar</p>
        <AppLauncher userRole={user?.role} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckSquare} label="Bekleyen Görevim" value={myTasks.length} color="blue" />
        <StatCard icon={AlertCircle} label="Gecikmiş Görev" value={overdueTasks.length} color="red" />
        <StatCard icon={Users} label="Toplam Öğrenci" value={students.length} color="amber" />
        <StatCard icon={CheckSquare} label="Bugün Görev" value={todayTasks.length} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Görevlerim
              {overdueTasks.length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-xs">{overdueTasks.length} gecikmiş</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/Tasks')}>
              Tümü <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Bekleyen görev yok 🎉</p>
            ) : myTasks.slice(0, 6).map(task => {
              const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
              return (
                <div key={task.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${isOverdue ? 'bg-red-50 border border-red-100' : 'bg-muted/30 hover:bg-muted/60'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckSquare className={`w-4 h-4 flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                          {isOverdue ? '⚠ Gecikmiş · ' : ''}{format(parseISO(task.due_date), 'dd MMM')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${priorityColor[task.priority] || 'bg-gray-100 text-gray-700'}`}>
                    {task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Prospects */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Görüşme Aşamasındaki Öğrenciler
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/Students')}>
              Tümü <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {students.filter(s => s.status === 'prospect').length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Görüşme aşamasında öğrenci yok</p>
            ) : students.filter(s => s.status === 'prospect').slice(0, 6).map(student => (
              <button
                key={student.id}
                onClick={() => navigate(`/StudentProfile/${student.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{student.full_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">{student.phone || student.email}</p>
                  </div>
                </div>
                <Badge className="text-xs flex-shrink-0 bg-amber-100 text-amber-700">Görüşme</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Students */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Son Kayıt Olan Öğrenciler
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/Students')}>
              Tümü <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentStudents.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Henüz öğrenci yok</p>
            ) : recentStudents.map(student => (
              <button
                key={student.id}
                onClick={() => navigate(`/StudentProfile/${student.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-primary">{student.full_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">{student.email || student.phone}</p>
                  </div>
                </div>
                <Badge className={`text-xs flex-shrink-0 ${student.status === 'enrolled' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                  {student.status === 'enrolled' ? 'Kayıtlı' : student.status === 'active' ? 'Aktif' : student.status}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Bekleyen Bildirimler
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/NotificationCenter')}>
              Tümü <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Bekleyen bildirim yok ✅</p>
            ) : notifications.slice(0, 6).map(notif => (
              <div key={notif.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <Bell className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{notif.message?.slice(0, 60) || 'Bildirim'}{(notif.message?.length || 0) > 60 ? '…' : ''}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {notif.channel?.toUpperCase()} · {notif.notification_type === 'payment_reminder' ? 'Ödeme Hatırlatması' : notif.notification_type}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}