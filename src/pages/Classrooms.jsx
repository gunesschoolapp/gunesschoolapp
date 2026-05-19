import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, User, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CLASSROOMS = [
  { id: 'sinif1', label: 'Sınıf 1', floor: 'Üst Kat', icon: '🏫', color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { id: 'sinif2', label: 'Sınıf 2', floor: 'Üst Kat', icon: '🏫', color: 'bg-violet-50 border-violet-200', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { id: 'sinif3', label: 'Sınıf 3', floor: 'Alt Kat',  icon: '🏢', color: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
];

export const CLASSROOM_OPTIONS = [
  ...CLASSROOMS.map(c => ({ value: c.id, label: `${c.label} (${c.floor})` })),
  { value: 'online', label: 'Online' },
];

const cefrColors = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700', B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700', C2: 'bg-purple-100 text-purple-700',
};

function ClassroomCard({ classroom, courses, students, lessons }) {
  const [expanded, setExpanded] = useState(true);

  // Courses assigned to this classroom
  const roomCourses = courses.filter(c => c.room === classroom.id);

  // Upcoming lessons in this classroom (from lessons entity)
  const roomLessons = lessons
    .filter(l => l.room === classroom.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 5);

  // All enrolled students across room's courses
  const enrolledStudentIds = [...new Set(roomCourses.flatMap(c => c.enrolled_students || []))];
  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));

  return (
    <Card className={`border-2 ${classroom.color} transition-shadow hover:shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{classroom.icon}</div>
            <div>
              <CardTitle className="text-xl">{classroom.label}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{classroom.floor}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${classroom.badge}`}>
            <BookOpen className="w-3.5 h-3.5" />
            {roomCourses.length} Kurs
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${classroom.badge}`}>
            <Users className="w-3.5 h-3.5" />
            {enrolledStudents.length} Öğrenci
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {roomCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 italic">Bu sınıfa atanmış kurs yok</p>
          ) : (
            <>
              {/* Courses in this classroom */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Kurslar
                </h4>
                <div className="space-y-2">
                  {roomCourses.map(course => {
                    const courseStudents = students.filter(s => (course.enrolled_students || []).includes(s.id));
                    return (
                      <div key={course.id} className="bg-white rounded-xl border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{course.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge className={`text-xs ${cefrColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>{course.cefr_level}</Badge>
                              {course.teacher && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3" /> {course.teacher}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            <Users className="w-3 h-3 inline mr-0.5" />{courseStudents.length}/{course.max_students || '∞'}
                          </span>
                        </div>
                        {course.schedule && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {course.schedule}
                          </p>
                        )}
                        {/* Students in this course */}
                        {courseStudents.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t">
                            {courseStudents.map(s => (
                              <span key={s.id} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{s.full_name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming lessons */}
              {roomLessons.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Yaklaşan Dersler
                  </h4>
                  <div className="space-y-1.5">
                    {roomLessons.map(lesson => {
                      const course = courses.find(c => c.id === lesson.course_id);
                      return (
                        <div key={lesson.id} className="flex items-center gap-3 bg-white rounded-lg border px-3 py-2 text-sm">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${classroom.dot}`} />
                          <span className="font-medium truncate flex-1">{course?.name || 'Ders'}</span>
                          <span className="text-xs text-muted-foreground">{lesson.date}</span>
                          <span className="text-xs text-muted-foreground">{lesson.start_time}</span>
                          {lesson.teacher && <span className="text-xs text-muted-foreground hidden sm:block">{lesson.teacher}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function Classrooms() {
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list('-date', 50),
  });

  // Summary across all classrooms
  const activeCourses = courses.filter(c => c.status === 'active');
  const assignedCourses = activeCourses.filter(c => c.room);
  const unassignedCourses = activeCourses.filter(c => !c.room);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sınıflar</h1>
        <p className="text-muted-foreground mt-1">Her sınıfın kursları, öğretmenleri ve öğrencileri</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Toplam Sınıf</p><p className="text-xl font-bold">3</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <div><p className="text-xs text-muted-foreground">Atanmış Kurs</p><p className="text-xl font-bold text-blue-600">{assignedCourses.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-emerald-500" />
          <div><p className="text-xs text-muted-foreground">Toplam Öğrenci</p><p className="text-xl font-bold text-emerald-600">{students.filter(s => s.status === 'enrolled').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <div><p className="text-xs text-muted-foreground">Sınıfsız Kurs</p><p className="text-xl font-bold text-amber-600">{unassignedCourses.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Unassigned courses warning */}
      {unassignedCourses.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Sınıf atanmamış aktif kurslar:</p>
            <div className="flex flex-wrap gap-2">
              {unassignedCourses.map(c => (
                <Badge key={c.id} className="bg-amber-100 text-amber-700 border-amber-300">{c.name} ({c.cefr_level})</Badge>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-2">Kurslar → Düzenle ile sınıf atayabilirsiniz.</p>
          </CardContent>
        </Card>
      )}

      {/* Floor sections */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">🏫 Üst Kat</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {CLASSROOMS.filter(c => c.floor === 'Üst Kat').map(classroom => (
            <ClassroomCard key={classroom.id} classroom={classroom} courses={courses} students={students} lessons={lessons} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">🏢 Alt Kat</h2>
        <div className="grid grid-cols-1 gap-5">
          {CLASSROOMS.filter(c => c.floor === 'Alt Kat').map(classroom => (
            <ClassroomCard key={classroom.id} classroom={classroom} courses={courses} students={students} lessons={lessons} />
          ))}
        </div>
      </div>
    </div>
  );
}