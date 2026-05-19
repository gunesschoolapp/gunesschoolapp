import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BookOpen, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

const levelColors = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700',
  C2: 'bg-purple-100 text-purple-700',
};

export default function StudentLessons() {
  const { student } = useOutletContext();
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    base44.entities.Course.list().then(allCourses => {
      const myCourses = allCourses.filter(c =>
        c.enrolled_students?.includes(student.id)
      );
      setCourses(myCourses);

      if (myCourses.length > 0) {
        const courseIds = myCourses.map(c => c.id);
        base44.entities.Lesson.list('-date', 50).then(allLessons => {
          setLessons(allLessons.filter(l => courseIds.includes(l.course_id)));
        });
      }
    }).finally(() => setLoading(false));
  }, [student?.id]);

  const upcomingLessons = lessons
    .filter(l => l.status !== 'cancelled' && l.date >= format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  if (loading) return (
    <div className="p-6 flex justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-xl font-bold">Derslerim</h1>

      {/* My courses */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kayıtlı Kurslar</h2>
        {courses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz kayıtlı kurs yok</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map(course => (
              <div key={course.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-tight">{course.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>
                    {course.cefr_level}
                  </span>
                </div>
                {course.teacher && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <User className="w-3.5 h-3.5" />
                    {course.teacher}
                  </div>
                )}
                {course.schedule && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    {course.schedule}
                  </div>
                )}
                {course.room && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {course.room}
                  </div>
                )}
                <div className={`mt-3 inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                  course.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  course.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {course.status === 'active' ? 'Aktif' : course.status === 'upcoming' ? 'Yakında' : course.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming lessons */}
      {upcomingLessons.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Yaklaşan Dersler</h2>
          <div className="space-y-2">
            {upcomingLessons.map(lesson => {
              const course = courses.find(c => c.id === lesson.course_id);
              return (
                <div key={lesson.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-bold leading-none">
                      {format(new Date(lesson.date), 'dd')}
                    </span>
                    <span className="text-primary/70 text-[10px]">
                      {format(new Date(lesson.date), 'MMM')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{course?.name || 'Ders'}</p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.start_time && `${lesson.start_time}${lesson.end_time ? ` - ${lesson.end_time}` : ''}`}
                      {lesson.topic && ` · ${lesson.topic}`}
                      {lesson.room && ` · ${lesson.room}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                    lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    lesson.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {lesson.status === 'completed' ? 'Tamamlandı' : lesson.status === 'cancelled' ? 'İptal' : 'Planlandı'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}