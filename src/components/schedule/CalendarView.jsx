import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CLASSROOM_OPTIONS } from '@/pages/Classrooms';

const COURSE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', header: 'bg-blue-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', header: 'bg-violet-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', header: 'bg-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', header: 'bg-amber-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', header: 'bg-rose-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', header: 'bg-cyan-500' },
];

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = 7 + i;
  return `${String(hour).padStart(2, '0')}:00`;
});

const getTimeSlotIndex = (timeStr) => {
  if (!timeStr) return 0;
  const hour = parseInt(timeStr.split(':')[0]);
  return Math.max(0, Math.min(15, hour - 7));
};

const getConflicts = (lessons, teachers, classrooms) => {
  const conflicts = {};

  lessons.forEach((lesson, idx) => {
    if (!lesson.date || !lesson.start_time || !lesson.end_time) return;

    const conflictingLessons = lessons.filter((other, oidx) => {
      if (oidx <= idx || !other.date || !other.start_time || !other.end_time) return false;
      if (!isSameDay(parseISO(lesson.date), parseISO(other.date))) return false;

      const lessonStart = parseInt(lesson.start_time.split(':')[0]);
      const lessonEnd = parseInt(lesson.end_time.split(':')[0]);
      const otherStart = parseInt(other.start_time.split(':')[0]);
      const otherEnd = parseInt(other.end_time.split(':')[0]);

      const sameTeacher = lesson.teacher && lesson.teacher === other.teacher;
      const sameRoom = lesson.room && lesson.room === other.room;
      const timeConflict = lessonStart < otherEnd && otherStart < lessonEnd;

      return timeConflict && (sameTeacher || sameRoom);
    });

    if (conflictingLessons.length > 0) {
      conflicts[lesson.id] = conflictingLessons.map(l => l.id);
    }
  });

  return conflicts;
};

export default function CalendarView({ lessons, courses, teachers, weekDays, onLessonClick, currentTeacher = null, isAdmin = false }) {
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [filterRoom, setFilterRoom] = useState('all');
  const [viewType, setViewType] = useState(currentTeacher && !isAdmin ? 'my_lessons' : 'all'); // 'all' | 'my_lessons'

  const courseColorMap = useMemo(() => {
    const map = {};
    courses.forEach((c, i) => {
      map[c.id] = COURSE_COLORS[i % COURSE_COLORS.length];
    });
    return map;
  }, [courses]);

  const getCourseById = (id) => courses.find(c => c.id === id);
  const getRoomLabel = (roomId) => {
    const room = CLASSROOM_OPTIONS.find(opt => opt.value === roomId);
    return room ? room.label : roomId || '—';
  };

  const conflicts = useMemo(() => getConflicts(lessons, teachers, CLASSROOM_OPTIONS), [lessons]);
  const hasConflict = (lessonId) => !!conflicts[lessonId];
  const getConflictingIds = (lessonId) => conflicts[lessonId] || [];

  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      if (viewType === 'my_lessons' && lesson.teacher !== currentTeacher) return false;
      if (viewType === 'all' && filterTeacher !== 'all' && lesson.teacher !== filterTeacher) return false;
      if (filterRoom !== 'all' && lesson.room !== filterRoom) return false;
      return true;
    });
  }, [lessons, filterTeacher, filterRoom, viewType, currentTeacher]);

  const uniqueTeachers = useMemo(() => {
    const t = new Set(lessons.filter(l => l.teacher).map(l => l.teacher));
    return Array.from(t).sort();
  }, [lessons]);

  const uniqueRooms = useMemo(() => {
    const r = new Set(lessons.filter(l => l.room).map(l => l.room));
    return Array.from(r).sort();
  }, [lessons]);

  const DAY_NAMES_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const DAY_NAMES_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  return (
    <div className="space-y-4">
      {/* View Type Toggle + Filters */}
      <div className="space-y-4">
        {currentTeacher && !isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewType === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Tüm Dersler
            </button>
            <button
              onClick={() => setViewType('my_lessons')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewType === 'my_lessons'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Benim Derslerim
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-4 items-end">
          {viewType === 'all' && (
            <div className="space-y-2">
              <label className="text-xs font-medium">Öğretmen</label>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Öğretmenler</SelectItem>
                  {uniqueTeachers.map(teacher => (
                    <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium">Sınıf</label>
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sınıflar</SelectItem>
                {uniqueRooms.map(room => (
                  <SelectItem key={room} value={room}>{getRoomLabel(room)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Conflict Warnings */}
      {Object.keys(conflicts).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">{Object.keys(conflicts).length} çakışma bulundu</p>
            <p className="text-amber-700 text-xs mt-1">Aynı öğretmen veya sınıfın aynı saatte iki dersi olmuş.</p>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="inline-block min-w-full">
          {/* Header Row with Days */}
          <div className="grid gap-px" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
            <div className="bg-card p-3 flex items-center justify-center border-r text-xs font-medium text-muted-foreground">
              Saat
            </div>
            {weekDays.map((day, idx) => {
              const isToday = new Date().toDateString() === day.toDateString();
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-r last:border-r-0 ${
                    isToday ? 'bg-primary/5 border-primary' : 'bg-card'
                  }`}
                >
                  <p className="text-xs font-medium">{DAY_NAMES_SHORT[idx]}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(day, 'MMM', { locale: tr })}</p>
                </div>
              );
            })}
          </div>

          {/* Time slots and lessons */}
          {TIME_SLOTS.map((timeSlot, timeIdx) => (
            <div key={timeSlot} className="grid gap-px border-t" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
              <div className="bg-muted/40 p-2 text-center text-xs font-medium border-r text-muted-foreground">
                {timeSlot}
              </div>

              {weekDays.map((day, dayIdx) => {
                const dayLessons = filteredLessons.filter(
                  l => l.date && isSameDay(parseISO(l.date), day)
                );

                const lessonsAtTime = dayLessons.filter(l => {
                  if (!l.start_time || !l.end_time) return false;
                  const start = parseInt(l.start_time.split(':')[0]);
                  const end = parseInt(l.end_time.split(':')[0]);
                  const currentHour = parseInt(timeSlot.split(':')[0]);
                  return start === currentHour;
                });

                return (
                  <div
                    key={`${timeSlot}-${dayIdx}`}
                    className="bg-card border-r last:border-r-0 p-1 min-h-16 relative hover:bg-muted/20 transition-colors"
                  >
                    {lessonsAtTime.map(lesson => {
                      const course = getCourseById(lesson.course_id);
                      const color = courseColorMap[lesson.course_id] || COURSE_COLORS[0];
                      const conflict = hasConflict(lesson.id);
                      const duration = parseInt(lesson.end_time.split(':')[0]) - parseInt(lesson.start_time.split(':')[0]);
                      const heightClass = `${duration > 1 ? `row-span-${duration}` : ''}`;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onLessonClick(lesson)}
                          className={`w-full text-left text-xs rounded p-1.5 transition-all hover:shadow-md transform hover:scale-105 cursor-pointer block
                            ${color.bg} ${conflict ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                          title={conflict ? 'Çakışan ders!' : ''}
                        >
                          <div className="font-medium truncate">{course?.name}</div>
                          <div className="text-muted-foreground text-xs truncate">
                            {lesson.start_time} - {lesson.end_time}
                          </div>
                          {lesson.teacher && (
                            <div className="text-muted-foreground text-xs truncate">{lesson.teacher}</div>
                          )}
                          {conflict && (
                            <div className="text-amber-600 text-xs font-semibold mt-0.5">⚠ Çakışma</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2">
        {courses.slice(0, 8).map(course => {
          const color = courseColorMap[course.id] || COURSE_COLORS[0];
          return (
            <div
              key={course.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color.bg}`}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.header }} />
              {course.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}