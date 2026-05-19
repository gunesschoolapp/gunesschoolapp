import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Users, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Save, ClipboardList, FileText
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

const ATT_OPTIONS = [
  { value: 'present', label: 'Katıldı', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'absent', label: 'Katılmadı', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', activeClass: 'bg-red-500 text-white border-red-500' },
  { value: 'late', label: 'Geç', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'excused', label: 'Mazeretli', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', activeClass: 'bg-blue-500 text-white border-blue-500' },
];

export default function TeacherLessonTools() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const teacherName = user?.full_name || '';

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonNote, setLessonNote] = useState('');
  const [attMap, setAttMap] = useState({}); // { studentId: status }
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [expandedLesson, setExpandedLesson] = useState(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list('-date', 100),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-all'],
    queryFn: () => base44.entities.Attendance.list('-date', 500),
  });

  const createAtt = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-all'] }),
  });

  const updateAtt = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-all'] }),
  });

  const updateLesson = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lesson.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });

  // My courses
  const myCourses = useMemo(() =>
    courses.filter(c => c.teacher && teacherName && c.teacher.toLowerCase().includes(teacherName.split(' ')[0]?.toLowerCase())),
    [courses, teacherName]
  );
  const myCourseIds = useMemo(() => new Set(myCourses.map(c => c.id)), [myCourses]);

  // My lessons (past + today), sorted newest first
  const myLessons = useMemo(() =>
    lessons
      .filter(l => myCourseIds.has(l.course_id) && l.date <= format(new Date(), 'yyyy-MM-dd'))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30),
    [lessons, myCourseIds]
  );

  const getCourse = (id) => courses.find(c => c.id === id);

  const getStudentsForCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return students.filter(s => (course?.enrolled_students || []).includes(s.id));
  };

  const getLessonAttendance = (lessonId) =>
    attendance.filter(a => a.lesson_id === lessonId);

  const openLesson = (lesson) => {
    setSelectedLesson(lesson);
    setLessonNote(lesson.notes || '');
    // Pre-fill attendance from existing records
    const existing = getLessonAttendance(lesson.id);
    const map = {};
    existing.forEach(a => { map[a.student_id] = a.status; });
    setAttMap(map);
    setSavedMsg('');
  };

  const handleSave = async () => {
    if (!selectedLesson) return;
    setSaving(true);
    try {
      // Save lesson notes
      if (lessonNote !== (selectedLesson.notes || '')) {
        await updateLesson.mutateAsync({ id: selectedLesson.id, data: { notes: lessonNote } });
      }

      // Save attendance
      const courseStudents = getStudentsForCourse(selectedLesson.course_id);
      const existingAtt = getLessonAttendance(selectedLesson.id);

      for (const student of courseStudents) {
        const status = attMap[student.id];
        if (!status) continue;
        const existing = existingAtt.find(a => a.student_id === student.id);
        const attData = {
          student_id: student.id,
          course_id: selectedLesson.course_id,
          lesson_id: selectedLesson.id,
          date: selectedLesson.date,
          status,
        };
        if (existing) {
          await updateAtt.mutateAsync({ id: existing.id, data: attData });
        } else {
          await createAtt.mutateAsync(attData);
        }
      }

      setSavedMsg('✅ Kaydedildi!');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Ders Araçları
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Devam takibi ve ders notları</p>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance" className="gap-1.5"><Users className="w-4 h-4" />Devam Takibi</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><FileText className="w-4 h-4" />Ders Notları</TabsTrigger>
        </TabsList>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="mt-4 space-y-3">
          {myLessons.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz geçmiş ders bulunmuyor</p>
            </div>
          ) : myLessons.map(lesson => {
            const course = getCourse(lesson.course_id);
            const courseStudents = getStudentsForCourse(lesson.course_id);
            const existingAtt = getLessonAttendance(lesson.id);
            const attCount = existingAtt.length;
            const isOpen = expandedLesson === lesson.id;
            const isLessonToday = isToday(parseISO(lesson.date));

            return (
              <Card key={lesson.id} className={isLessonToday ? 'ring-1 ring-primary/40' : ''}>
                <button
                  className="w-full text-left"
                  onClick={() => {
                    if (isOpen) {
                      setExpandedLesson(null);
                      setSelectedLesson(null);
                    } else {
                      setExpandedLesson(lesson.id);
                      openLesson(lesson);
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isLessonToday ? 'bg-primary text-white' : 'bg-muted'}`}>
                          <span className="text-xs font-bold leading-none">{format(parseISO(lesson.date), 'dd')}</span>
                          <span className="text-[10px] opacity-70">{format(parseISO(lesson.date), 'MMM', { locale: tr })}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{course?.name || 'Ders'}</p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.start_time}{lesson.end_time ? ` - ${lesson.end_time}` : ''} · {courseStudents.length} öğrenci
                            {attCount > 0 && <span className="ml-1 text-emerald-600">· {attCount} kayıt</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLessonToday && <Badge className="bg-primary/10 text-primary text-xs">Bugün</Badge>}
                        {attCount > 0 && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Kayıtlı</Badge>}
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {isOpen && (
                  <CardContent className="pt-0 space-y-3">
                    {courseStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Bu kursta kayıtlı öğrenci yok</p>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          {courseStudents.map(student => {
                            const current = attMap[student.id] || null;
                            return (
                              <div key={student.id} className="bg-muted/30 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-primary">{student.full_name?.charAt(0)}</span>
                                  </div>
                                  <span className="text-sm font-medium">{student.full_name}</span>
                                  {student.cefr_level && <Badge variant="outline" className="text-xs ml-auto">{student.cefr_level}</Badge>}
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                  {ATT_OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    const active = current === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        onClick={() => setAttMap(prev => ({ ...prev, [student.id]: opt.value }))}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                          active ? opt.activeClass : `${opt.bg} ${opt.color}`
                                        }`}
                                      >
                                        <Icon className="w-3 h-3" />
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          {savedMsg ? (
                            <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>
                          ) : <span />}
                          <Button size="sm" onClick={handleSave} disabled={saving}>
                            <Save className="w-4 h-4 mr-1.5" />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes" className="mt-4 space-y-3">
          {myLessons.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz ders bulunmuyor</p>
            </div>
          ) : myLessons.map(lesson => {
            const course = getCourse(lesson.course_id);
            const isOpen = expandedLesson === `note-${lesson.id}`;
            const isLessonToday = isToday(parseISO(lesson.date));
            const hasNote = !!lesson.notes;

            return (
              <Card key={lesson.id} className={isLessonToday ? 'ring-1 ring-primary/40' : ''}>
                <button
                  className="w-full text-left"
                  onClick={() => {
                    if (isOpen) {
                      setExpandedLesson(null);
                      setSelectedLesson(null);
                    } else {
                      setExpandedLesson(`note-${lesson.id}`);
                      setSelectedLesson(lesson);
                      setLessonNote(lesson.notes || '');
                      setSavedMsg('');
                    }
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isLessonToday ? 'bg-primary text-white' : 'bg-muted'}`}>
                          <span className="text-xs font-bold leading-none">{format(parseISO(lesson.date), 'dd')}</span>
                          <span className="text-[10px] opacity-70">{format(parseISO(lesson.date), 'MMM', { locale: tr })}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{course?.name || 'Ders'}</p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.topic ? lesson.topic : lesson.start_time}
                            {hasNote && <span className="ml-1 text-amber-600">· Not var</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasNote && <Badge className="bg-amber-100 text-amber-700 text-xs">Not</Badge>}
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {isOpen && (
                  <CardContent className="pt-0 space-y-3">
                    <Textarea
                      placeholder="Ders notlarınızı girin... (işlenen konular, öğrenci gözlemleri, bir sonraki ders planı vb.)"
                      value={lessonNote}
                      onChange={e => setLessonNote(e.target.value)}
                      rows={4}
                    />
                    <div className="flex items-center justify-between">
                      {savedMsg ? (
                        <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>
                      ) : <span />}
                      <Button
                        size="sm"
                        onClick={async () => {
                          setSaving(true);
                          await updateLesson.mutateAsync({ id: lesson.id, data: { notes: lessonNote } });
                          setSaving(false);
                          setSavedMsg('✅ Not kaydedildi!');
                          setTimeout(() => setSavedMsg(''), 3000);
                        }}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {saving ? 'Kaydediliyor...' : 'Notu Kaydet'}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}