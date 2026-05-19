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
  BookOpen, Users, CheckSquare, Calendar, Clock,
  ChevronRight, GraduationCap, Award, ClipboardCheck, ClipboardList
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-violet-50 text-violet-600',
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

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // Teacher name from user
  const teacherName = user?.full_name || '';

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  // My courses (teacher field matches name)
  const myCourses = courses.filter(c =>
    c.teacher && teacherName && c.teacher.toLowerCase().includes(teacherName.split(' ')[0]?.toLowerCase())
  );

  const myCourseIds = myCourses.map(c => c.id);

  // Today's lessons
  const todayLessons = lessons.filter(l => {
    if (!l.date) return false;
    return isToday(parseISO(l.date)) && myCourseIds.includes(l.course_id);
  });

  // Upcoming lessons (next 7 days, not today)
  const upcomingLessons = lessons.filter(l => {
    if (!l.date) return false;
    try {
      const d = parseISO(l.date);
      const now = new Date();
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return d > now && d <= week && myCourseIds.includes(l.course_id);
    } catch { return false; }
  }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

  // My students (enrolled in my courses)
  const myStudentIds = new Set(myCourses.flatMap(c => c.enrolled_students || []));
  const myStudents = students.filter(s => myStudentIds.has(s.id));

  // My tasks
  const myTasks = tasks.filter(t =>
    (t.assigned_to === user?.email) && t.status !== 'done'
  ).sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return (priority[a.priority] ?? 1) - (priority[b.priority] ?? 1);
  });

  const getCourseById = (id) => courses.find(c => c.id === id);

  const dayLabel = (dateStr) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Bugün';
    if (isTomorrow(d)) return 'Yarın';
    return format(d, 'dd MMM');
  };

  const priorityColor = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          Merhaba, {user?.full_name?.split(' ')[0] || 'Öğretmenim'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bugünün ders programı ve öğrencilerinize genel bakış</p>
      </div>

      {/* Quick Action */}
      <Button
        onClick={() => navigate('/TeacherLessonTools')}
        className="w-full gap-2 h-11 text-sm"
        variant="outline"
      >
        <ClipboardList className="w-4 h-4" /> Devam Takibi & Ders Notları
      </Button>

      {/* App Launcher */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 sm:p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Uygulamalar</p>
        <AppLauncher userRole={user?.role} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Aktif Kurslarım" value={myCourses.filter(c => c.status === 'active').length} color="blue" />
        <StatCard icon={Users} label="Öğrencilerim" value={myStudents.length} color="green" />
        <StatCard icon={Calendar} label="Bugün Dersim" value={todayLessons.length} color="amber" />
        <StatCard icon={CheckSquare} label="Bekleyen Görev" value={myTasks.length} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Lessons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Bugünün Dersleri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayLessons.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Bugün planlanmış ders yok</p>
            ) : todayLessons.map(lesson => {
              const course = getCourseById(lesson.course_id);
              return (
                <div key={lesson.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{course?.name || 'Ders'}</p>
                      <p className="text-xs text-muted-foreground">{lesson.start_time} — {lesson.end_time}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{course?.cefr_level}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upcoming Lessons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Yaklaşan Dersler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingLessons.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Yaklaşan ders bulunmuyor</p>
            ) : upcomingLessons.map(lesson => {
              const course = getCourseById(lesson.course_id);
              return (
                <div key={lesson.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{dayLabel(lesson.date)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{course?.name || 'Ders'}</p>
                      <p className="text-xs text-muted-foreground">{lesson.start_time} — {course?.room || ''}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{course?.cefr_level}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* My Courses */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" /> Kurslarım
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/Courses')}>
              Tümü <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {myCourses.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Atanmış kurs bulunmuyor</p>
            ) : myCourses.map(course => (
              <div key={course.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{course.name}</p>
                    <p className="text-xs text-muted-foreground">{(course.enrolled_students || []).length} öğrenci · {course.schedule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs bg-emerald-100 text-emerald-700">{course.cefr_level}</Badge>
                  <Badge variant={course.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {course.status === 'active' ? 'Aktif' : course.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" /> Görevlerim
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/Tasks')}>
              Tümü <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Bekleyen görev yok 🎉</p>
            ) : myTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{task.title}</p>
                    {task.due_date && <p className="text-xs text-muted-foreground">Son: {format(parseISO(task.due_date), 'dd MMM')}</p>}
                  </div>
                </div>
                <Badge className={`text-xs ${priorityColor[task.priority] || 'bg-gray-100 text-gray-700'}`}>
                  {task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* My Students */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Öğrencilerim
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/Students')}>
            Tümü <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {myStudents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Atanmış öğrenci bulunmuyor</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myStudents.slice(0, 6).map(student => (
                <button
                  key={student.id}
                  onClick={() => navigate(`/StudentProfile/${student.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-left w-full"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-primary">{student.full_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{student.full_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">{student.cefr_level}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}