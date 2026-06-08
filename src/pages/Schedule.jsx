import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, ChevronLeft, ChevronRight, Clock, MapPin, User, BookOpen,
  CheckCircle2, XCircle, Calendar, LayoutGrid, List, Edit, Trash2, AlertCircle
} from 'lucide-react';
import { useClassroomsQuery, getClassroomOptions } from '@/lib/classrooms';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, isToday as dateFnsIsToday } from 'date-fns';
import { enUS } from 'date-fns/locale';
import CalendarView from '@/components/schedule/CalendarView';
import { useAuth } from '@/lib/AuthContext';

const COURSE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', header: 'bg-blue-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', header: 'bg-violet-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', header: 'bg-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', header: 'bg-amber-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', header: 'bg-rose-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500', header: 'bg-cyan-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', header: 'bg-orange-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', header: 'bg-indigo-500' },
];

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_FORM = { course_id: '', date: '', start_time: '', end_time: '', teacher: '', topic: '', room: '', status: 'scheduled', notes: '' };

export default function Schedule() {
  const { user } = useAuth();
  const { data: classrooms = [] } = useClassroomsQuery();
  const CLASSROOM_OPTIONS = React.useMemo(() => getClassroomOptions(classrooms), [classrooms]);

  const getRoomLabel = (roomId) => {
    if (roomId === 'online') return 'Online';
    const room = classrooms.find(r => r.id === roomId);
    return room ? `${room.label} (${room.floor})` : roomId || '—';
  };

  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showForm, setShowForm] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [editLesson, setEditLesson] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'
  const [displayMode, setDisplayMode] = useState('cards'); // 'cards' | 'calendar'
  const queryClient = useQueryClient();

  const { data: currentTeacherData } = useQuery({
    queryKey: ['teacher', user?.email],
    queryFn: () => user?.email ? base44.entities.Teacher.filter({ email: user.email }) : Promise.resolve([]),
    enabled: !!user?.email,
  });

  const currentTeacherName = currentTeacherData?.[0]?.full_name || null;
  const isAdmin = user?.role === 'admin';

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list('-date'),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const courseColorMap = React.useMemo(() => {
    const map = {};
    courses.forEach((c, i) => { map[c.id] = COURSE_COLORS[i % COURSE_COLORS.length]; });
    return map;
  }, [courses]);

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Lesson.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lessons'] }); setShowForm(false); setFormData(EMPTY_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lesson.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lessons'] }); setEditLesson(null); setSelectedLesson(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Lesson.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lessons'] }); setSelectedLesson(null); },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const getLessonsForDay = (day) =>
    lessons.filter(l => l.date && isSameDay(parseISO(l.date), day))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const getCourseById = (id) => courses.find(c => c.id === id);

  const weekLessons = weekDays.flatMap(d => getLessonsForDay(d));
  const weekStats = {
    total: weekLessons.length,
    completed: weekLessons.filter(l => l.status === 'completed').length,
    cancelled: weekLessons.filter(l => l.status === 'cancelled').length,
    scheduled: weekLessons.filter(l => l.status === 'scheduled').length,
  };

  const openEdit = (lesson) => {
    setEditLesson(lesson);
    setFormData({
      course_id: lesson.course_id || '',
      date: lesson.date || '',
      start_time: lesson.start_time || '',
      end_time: lesson.end_time || '',
      teacher: lesson.teacher || '',
      topic: lesson.topic || '',
      room: lesson.room || '',
      status: lesson.status || 'scheduled',
      notes: lesson.notes || '',
    });
  };

  const checkConflicts = () => {
    if (!formData.date || !formData.start_time || !formData.end_time) return null;

    const conflicts = lessons.filter(lesson => {
      if (lesson.id === editLesson?.id) return false;
      if (!lesson.date || lesson.date !== formData.date) return false;

      const lessonStart = lesson.start_time;
      const lessonEnd = lesson.end_time;
      const newStart = formData.start_time;
      const newEnd = formData.end_time;

      // Teacher conflict
      if (formData.teacher && lesson.teacher === formData.teacher) {
        if (newStart < lessonEnd && newEnd > lessonStart) return true;
      }

      // Classroom conflict
      if (formData.room && lesson.room === formData.room) {
        if (newStart < lessonEnd && newEnd > lessonStart) return true;
      }

      return false;
    });

    return conflicts.length > 0 ? conflicts : null;
  };

  const handleSave = () => {
    const conflicts = checkConflicts();
    if (conflicts) {
      alert(`⚠️ Conflict detected! There is a time conflict with ${conflicts.length} lessons.`);
      return;
    }
    if (editLesson) {
      updateMutation.mutate({ id: editLesson.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage lessons and classes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={displayMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-2"
              onClick={() => setDisplayMode('cards')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={displayMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-2"
              onClick={() => setDisplayMode('calendar')}
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setEditLesson(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
            { label: 'This Week', value: weekStats.total, color: 'text-foreground', bg: 'bg-card', icon: BookOpen },
            { label: 'Scheduled', value: weekStats.scheduled, color: 'text-blue-600', bg: 'bg-blue-50', icon: Calendar },
            { label: 'Completed', value: weekStats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
            { label: 'Cancelled', value: weekStats.cancelled, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
          <Card key={label} className={`${bg} border`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl p-3 border">
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">
            {format(currentWeek, 'd MMM', { locale: enUS })} — {format(addDays(currentWeek, 6), 'd MMM yyyy', { locale: enUS })}
          </p>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Go to this week
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* DISPLAY MODES */}
      {displayMode === 'calendar' && (
        <CalendarView
          lessons={lessons}
          courses={courses}
          teachers={teachers}
          weekDays={weekDays}
          onLessonClick={setSelectedLesson}
          currentTeacher={isAdmin ? null : currentTeacherName}
          isAdmin={isAdmin}
        />
      )}

      {displayMode === 'cards' && (
        <>
      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dayLessons = getLessonsForDay(day);
            const isToday = dateFnsIsToday(day);
            return (
              <div
                key={idx}
                className={`rounded-xl border min-h-[200px] overflow-hidden ${isToday ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
              >
                {/* Day Header */}
                <div className={`p-2 text-center ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/40'}`}>
                  <p className="text-xs font-medium opacity-80">{DAY_NAMES[idx]}</p>
                  <p className="text-lg font-bold leading-tight">{format(day, 'd')}</p>
                  <p className="text-xs opacity-70">{format(day, 'MMM', { locale: enUS })}</p>
                </div>

                {/* Lessons */}
                <div className="p-2 space-y-1.5">
                  {dayLessons.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">No lessons</p>
                  )}
                  {dayLessons.map(lesson => {
                    const course = getCourseById(lesson.course_id);
                    const color = courseColorMap[lesson.course_id] || COURSE_COLORS[0];
                    const isCancelled = lesson.status === 'cancelled';
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`w-full text-left rounded-lg border p-2 text-xs transition-all hover:shadow-sm hover:scale-[1.02] ${color.bg} ${color.border} ${isCancelled ? 'opacity-50 line-through' : ''}`}
                      >
                        <div className={`flex items-center gap-1 font-semibold ${color.text} truncate`}>
                           <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
                           <span className="truncate">{course?.name || 'Course'}</span>
                         </div>
                        <div className="flex items-center gap-1 text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>{lesson.start_time}{lesson.end_time ? ` - ${lesson.end_time}` : ''}</span>
                        </div>
                        {lesson.teacher && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-0.5 truncate">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lesson.teacher}</span>
                          </div>
                        )}
                        {lesson.room && (
                         <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                           <MapPin className="w-3 h-3 flex-shrink-0" />
                           <span>{getRoomLabel(lesson.room)}</span>
                         </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {weekDays.every(d => getLessonsForDay(d).length === 0) && (
               <div className="py-16 text-center text-muted-foreground">
                 <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                 <p>No lessons this week</p>
               </div>
             )}
            {weekDays.map((day, idx) => {
              const dayLessons = getLessonsForDay(day);
              if (dayLessons.length === 0) return null;
              const isToday = dateFnsIsToday(day);
              return (
                <div key={idx}>
                  <div className={`px-4 py-2 border-b flex items-center gap-2 ${isToday ? 'bg-primary/5' : 'bg-muted/30'}`}>
                    <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                      {DAY_NAMES_FULL[idx]}, {format(day, 'd MMMM yyyy', { locale: enUS })}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">{dayLessons.length} lessons</Badge>
                  </div>
                  {dayLessons.map((lesson, li) => {
                    const course = getCourseById(lesson.course_id);
                    const color = courseColorMap[lesson.course_id] || COURSE_COLORS[0];
                    const statusCfg = STATUS_CONFIG[lesson.status] || STATUS_CONFIG.scheduled;
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors border-b last:border-b-0 ${li % 2 === 0 ? '' : 'bg-muted/10'}`}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div className={`w-1 self-stretch rounded-full ${color.dot}`} />
                        <div className="flex-1 min-w-0">
                           <p className="font-semibold text-sm truncate">{course?.name || 'Course'}</p>
                           {lesson.topic && <p className="text-xs text-muted-foreground truncate">{lesson.topic}</p>}
                         </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[90px]">
                          <Clock className="w-3.5 h-3.5" />
                          {lesson.start_time}{lesson.end_time ? ` - ${lesson.end_time}` : ''}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[100px] hidden md:flex">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">{lesson.teacher || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[80px] hidden md:flex">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{getRoomLabel(lesson.room)}</span>
                        </div>
                        <Badge className={`text-xs ${statusCfg.color} border-0 hidden sm:flex`}>{statusCfg.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Course Legend */}
      <div className="flex flex-wrap gap-2">
        {courses.slice(0, 8).map(course => {
          const color = courseColorMap[course.id] || COURSE_COLORS[0];
          return (
            <div key={course.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
              {course.name}
            </div>
          );
        })}
      </div>

      {/* Lesson Detail Dialog */}
      {selectedLesson && !editLesson && (
        <Dialog open={!!selectedLesson} onOpenChange={() => setSelectedLesson(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                 <BookOpen className="w-5 h-5 text-primary" />
                 Lesson Details
               </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {(() => {
                const course = getCourseById(selectedLesson.course_id);
                const color = courseColorMap[selectedLesson.course_id] || COURSE_COLORS[0];
                const statusCfg = STATUS_CONFIG[selectedLesson.status] || STATUS_CONFIG.scheduled;
                return (
                  <>
                    <div className={`rounded-xl p-4 ${color.bg} ${color.border} border`}>
                       <p className={`text-lg font-bold ${color.text}`}>{course?.name || 'Course'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{course?.cefr_level} Level</p>
                     </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium">{selectedLesson.date ? format(parseISO(selectedLesson.date), 'd MMMM yyyy', { locale: enUS }) : '—'}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Time</p>
                          <p className="font-medium">{selectedLesson.start_time} — {selectedLesson.end_time || '?'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Teacher</p>
                          <p className="font-medium">{selectedLesson.teacher || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                       <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                       <div>
                         <p className="text-xs text-muted-foreground">Room</p>
                         <p className="font-medium">{getRoomLabel(selectedLesson.room)}</p>
                       </div>
                      </div>
                    </div>
                    {selectedLesson.topic && (
                       <div className="bg-muted/40 rounded-lg p-3">
                         <p className="text-xs text-muted-foreground mb-1">Topic</p>
                         <p className="text-sm font-medium">{selectedLesson.topic}</p>
                       </div>
                     )}
                     {selectedLesson.notes && (
                       <div className="bg-muted/40 rounded-lg p-3">
                         <p className="text-xs text-muted-foreground mb-1">Notes</p>
                         <p className="text-sm">{selectedLesson.notes}</p>
                       </div>
                     )}
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusCfg.color} border-0`}>{statusCfg.label}</Badge>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(selectedLesson.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                      <Button size="sm" onClick={() => openEdit(selectedLesson)}>
                        <Edit className="w-4 h-4 mr-1" /> Edit
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add / Edit Lesson Dialog */}
      <Dialog open={showForm || !!editLesson} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditLesson(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editLesson ? 'Edit Lesson' : 'New Lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Course */}
            <div className="space-y-1.5">
              <Label>Course *</Label>
              <Select value={formData.course_id} onValueChange={v => setFormData({ ...formData, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        {c.name} <Badge variant="outline" className="text-xs">{c.cefr_level}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date + Times */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
              </div>
            </div>

            {/* Teacher + Room */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Teacher</Label>
                <Select value={formData.teacher} onValueChange={v => setFormData({ ...formData, teacher: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.id} value={t.full_name}>{t.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Room</Label>
                <Select value={formData.room || ''} onValueChange={v => setFormData({ ...formData, room: v })}>
                  <SelectTrigger><SelectValue placeholder="Select classroom" /></SelectTrigger>
                  <SelectContent>
                    {CLASSROOM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Input placeholder="e.g: Present Perfect Tense" value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })} />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Lesson notes..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditLesson(null); }}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!formData.course_id || !formData.date || createMutation.isPending || updateMutation.isPending}
              >
                {editLesson ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}