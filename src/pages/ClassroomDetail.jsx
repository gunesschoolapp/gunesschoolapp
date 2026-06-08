import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Users, BookOpen, User, Clock, UserPlus, Search,
  Check, X, GraduationCap, Plus, MapPin, ChevronRight
} from 'lucide-react';

const cefrColors = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',       B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700',   C2: 'bg-purple-100 text-purple-700',
};

// ─── Picker Dialog ──────────────────────────────────────────
function PickerDialog({ open, onClose, title, icon, items, selectedIds = [], onSave, searchPlaceholder, renderItem }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(selectedIds));
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(item =>
    (item.name || item.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggle = id => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSave = async () => {
    setSaving(true);
    await onSave([...selected]);
    setSaving(false);
    onClose();
  };

  const prevSet = new Set(selectedIds);
  const addedCount = [...selected].filter(id => !prevSet.has(id)).length;
  const removedCount = [...prevSet].filter(id => !selected.has(id)).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            {icon} {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={searchPlaceholder || 'Ara...'} value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" autoFocus />
          </div>
          <div className="flex items-center gap-3 text-xs bg-muted/60 rounded-lg px-3 py-2">
            <span className="text-muted-foreground">Seçili: <strong>{selected.size}</strong></span>
            {addedCount > 0 && <span className="text-emerald-600 font-medium">+{addedCount} eklenecek</span>}
            {removedCount > 0 && <span className="text-rose-600 font-medium">-{removedCount} çıkarılacak</span>}
            <button className="ml-auto text-primary hover:underline text-xs"
              onClick={() => setSelected(new Set(selected.size === items.length ? [] : items.map(i => i.id)))}>
              {selected.size === items.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-3 space-y-1">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-10">Sonuç bulunamadı</p>
          )}
          {filtered.map(item => {
            const isSelected = selected.has(item.id);
            const wasSel = prevSet.has(item.id);
            return (
              <button key={item.id} onClick={() => toggle(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border-2 ${
                  isSelected ? 'bg-primary/8 border-primary/40' : 'bg-transparent border-transparent hover:bg-muted/60'}`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {renderItem ? renderItem(item) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {(item.full_name || item.name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.full_name || item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.email || ''}</p>
                    </div>
                  </>
                )}
                {!wasSel && isSelected && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 ml-auto">Eklenecek</Badge>}
                {wasSel && !isSelected && <Badge variant="outline" className="text-xs text-rose-600 border-rose-300 ml-auto">Çıkarılacak</Badge>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">İptal</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Kaydediliyor...' : `Kaydet (${selected.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ClassroomDetail() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('students');
  const [showStudentPicker, setShowStudentPicker] = useState(null);   // course object
  const [showTeacherPicker, setShowTeacherPicker] = useState(null);   // course object
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  const { data: classrooms = [] } = useQuery({ queryKey: ['classrooms'], queryFn: () => base44.entities.Classroom.list() });
  const { data: courses = [] }    = useQuery({ queryKey: ['courses'],    queryFn: () => base44.entities.Course.list() });
  const { data: students = [] }   = useQuery({ queryKey: ['students'],   queryFn: () => base44.entities.Student.list() });
  const { data: teachers = [] }   = useQuery({ queryKey: ['teachers'],   queryFn: () => base44.entities.Teacher.list() });

  const courseUpdate = useMutation({
    mutationFn: ({ courseId, data }) => base44.entities.Course.update(courseId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const classroom = classrooms.find(c => c.id === classroomId);
  const roomCourses = courses.filter(c => c.room === classroomId);
  const allEnrolledIds = [...new Set(roomCourses.flatMap(c => c.enrolled_students || []))];
  const allEnrolledStudents = students.filter(s => allEnrolledIds.includes(s.id));
  const roomTeachers = teachers.filter(t =>
    roomCourses.some(c => c.teacher_id === t.id || c.teacher === t.full_name)
  );

  if (!classroom) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Sınıf bulunamadı</p>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Geri</Button>
      </div>
    );
  }

  const handleStudentSave = async (courseId, newIds) => {
    await courseUpdate.mutateAsync({ courseId, data: { enrolled_students: newIds } });
  };

  const handleTeacherSave = async (courseId, ids) => {
    const t = teachers.find(x => x.id === ids[0]);
    await courseUpdate.mutateAsync({ courseId, data: { teacher_id: t?.id || null, teacher: t?.full_name || null, teacher_name: t?.full_name || null } });
  };

  const handleCourseSave = async (newIds) => {
    const toAssign   = newIds.filter(id => !roomCourses.find(c => c.id === id));
    const toUnassign = roomCourses.filter(c => !newIds.includes(c.id)).map(c => c.id);
    await Promise.all([
      ...toAssign.map(id   => courseUpdate.mutateAsync({ courseId: id, data: { room: classroomId } })),
      ...toUnassign.map(id => courseUpdate.mutateAsync({ courseId: id, data: { room: null } })),
    ]);
  };

  const removeStudent = async (courseId, studentId) => {
    const course = courses.find(c => c.id === courseId);
    const updated = (course?.enrolled_students || []).filter(id => id !== studentId);
    await courseUpdate.mutateAsync({ courseId, data: { enrolled_students: updated } });
  };

  const TABS = [
    { id: 'students', label: 'Öğrenciler', icon: <Users className="w-4 h-4" />,        count: allEnrolledStudents.length },
    { id: 'courses',  label: 'Kurslar',    icon: <BookOpen className="w-4 h-4" />,     count: roomCourses.length },
    { id: 'teachers', label: 'Öğretmenler',icon: <GraduationCap className="w-4 h-4" />,count: roomTeachers.length },
  ];

  return (
    <div className="space-y-0 pb-24">

      {/* ─── Header Card ────────────────────────────────── */}
      <div className={`rounded-2xl border-2 p-5 mb-5 ${classroom.color || 'bg-card border-border'}`}>
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-4xl">{classroom.icon || '🏫'}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{classroom.label}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{classroom.floor}</span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button size="sm" className="gap-1.5" onClick={() => { setActiveTab('students'); setShowStudentPicker(roomCourses[0] || '__all'); }}>
            <UserPlus className="w-4 h-4" /> Öğrenci Ekle
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setActiveTab('teachers'); setShowTeacherPicker(roomCourses[0] || '__all'); }}>
            <GraduationCap className="w-4 h-4" /> Öğretmen Ata
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowCoursePicker(true)}>
            <BookOpen className="w-4 h-4" /> Kurs Ata
          </Button>
        </div>
      </div>

      {/* ─── Stat badges row ────────────────────────────── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 text-sm">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">{allEnrolledStudents.length}</span>
          <span className="text-muted-foreground">öğrenci</span>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 text-sm">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">{roomCourses.length}</span>
          <span className="text-muted-foreground">kurs</span>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 text-sm">
          <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">{roomTeachers.length}</span>
          <span className="text-muted-foreground">öğretmen</span>
        </div>
      </div>

      {/* ─── Tab Bar ────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ─── Tab: Öğrenciler ─────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {roomCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="font-medium">Henüz öğrenci yok</p>
                <p className="text-sm text-muted-foreground">Önce bir kurs atayın, sonra öğrenci ekleyebilirsiniz</p>
                <Button variant="outline" onClick={() => setShowCoursePicker(true)}>
                  <BookOpen className="w-4 h-4 mr-2" /> Kurs Ata
                </Button>
              </CardContent>
            </Card>
          ) : (
            roomCourses.map(course => {
              const courseStudents = students.filter(s => (course.enrolled_students || []).includes(s.id));
              return (
                <Card key={course.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${cefrColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>{course.cefr_level}</Badge>
                          <CardTitle className="text-base">{course.name}</CardTitle>
                        </div>
                        {course.teacher && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> {course.teacher}
                          </p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => setShowStudentPicker(course)}
                        className="gap-1.5 flex-shrink-0">
                        <UserPlus className="w-3.5 h-3.5" /> Öğrenci Ekle
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {courseStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2 text-center">
                        Bu kursta henüz öğrenci yok —{' '}
                        <button className="text-primary hover:underline" onClick={() => setShowStudentPicker(course)}>öğrenci ekle</button>
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {courseStudents.map(s => (
                          <div key={s.id} className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5 group">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                              {s.full_name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{s.full_name}</p>
                            </div>
                            <button onClick={() => removeStudent(course.id, s.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── Tab: Kurslar ────────────────────────────────── */}
      {activeTab === 'courses' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{roomCourses.length} kurs atanmış</p>
            <Button size="sm" variant="outline" onClick={() => setShowCoursePicker(true)}>
              <Plus className="w-4 h-4 mr-1" /> Kurs Ata
            </Button>
          </div>

          {roomCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="font-medium">Bu sınıfa kurs atanmamış</p>
                <Button variant="outline" onClick={() => setShowCoursePicker(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Kurs Ata
                </Button>
              </CardContent>
            </Card>
          ) : (
            roomCourses.map(course => {
              const courseStudents = students.filter(s => (course.enrolled_students || []).includes(s.id));
              return (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{course.name}</span>
                          <Badge className={`text-xs ${cefrColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>{course.cefr_level}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" /> {courseStudents.length} öğrenci
                          </span>
                          {course.teacher && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="w-3 h-3" /> {course.teacher}</span>}
                          {course.schedule && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {course.schedule}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs"
                          onClick={() => setShowStudentPicker(course)}>
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> Öğrenci
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-rose-500 hover:bg-rose-50"
                          onClick={async () => { if (confirm('Kursu sınıftan kaldır?')) await courseUpdate.mutateAsync({ courseId: course.id, data: { room: null } }); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── Tab: Öğretmenler ─────────────────────────────── */}
      {activeTab === 'teachers' && (
        <div className="space-y-3">
          {roomCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="font-medium">Önce kurs atayın</p>
                <p className="text-sm text-muted-foreground">Kurs atandıktan sonra öğretmen atayabilirsiniz</p>
                <Button variant="outline" onClick={() => setShowCoursePicker(true)}>
                  <BookOpen className="w-4 h-4 mr-2" /> Kurs Ata
                </Button>
              </CardContent>
            </Card>
          ) : (
            roomCourses.map(course => {
              const courseTeacher = teachers.find(t => t.id === course.teacher_id || t.full_name === course.teacher);
              return (
                <Card key={course.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${cefrColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>{course.cefr_level}</Badge>
                          <span className="font-medium text-sm">{course.name}</span>
                        </div>
                        {courseTeacher ? (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-200 to-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
                              {courseTeacher.full_name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{courseTeacher.full_name}</p>
                              <p className="text-xs text-muted-foreground">{courseTeacher.email || ''}</p>
                            </div>
                          </div>
                        ) : course.teacher ? (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {course.teacher}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic mt-1">Öğretmen atanmamış</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0 gap-1.5"
                        onClick={() => setShowTeacherPicker(course)}>
                        <GraduationCap className="w-3.5 h-3.5" />
                        {course.teacher ? 'Değiştir' : 'Öğretmen Ata'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── Student Picker ──────────────────────────────── */}
      {showStudentPicker && showStudentPicker !== '__all' && (
        <PickerDialog
          open
          onClose={() => setShowStudentPicker(null)}
          title={`Öğrenci Ekle — ${showStudentPicker.name}`}
          icon={<UserPlus className="w-5 h-5 text-primary" />}
          items={students}
          selectedIds={showStudentPicker.enrolled_students || []}
          searchPlaceholder="Öğrenci ara..."
          onSave={ids => handleStudentSave(showStudentPicker.id, ids)}
        />
      )}

      {/* If no courses, show info when student button tapped */}
      {showStudentPicker === '__all' && (
        <Dialog open onOpenChange={() => setShowStudentPicker(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Önce Kurs Atayın</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Öğrenci eklemek için önce bu sınıfa bir kurs atamanız gerekiyor.</p>
            <Button onClick={() => { setShowStudentPicker(null); setShowCoursePicker(true); }}>
              <BookOpen className="w-4 h-4 mr-2" /> Kurs Ata
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Teacher Picker ──────────────────────────────── */}
      {showTeacherPicker && showTeacherPicker !== '__all' && (
        <PickerDialog
          open
          onClose={() => setShowTeacherPicker(null)}
          title={`Öğretmen Ata — ${showTeacherPicker.name}`}
          icon={<GraduationCap className="w-5 h-5 text-primary" />}
          items={teachers}
          selectedIds={showTeacherPicker.teacher_id ? [showTeacherPicker.teacher_id] : []}
          searchPlaceholder="Öğretmen ara..."
          onSave={ids => handleTeacherSave(showTeacherPicker.id, ids)}
          renderItem={t => (
            <>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-200 to-violet-100 flex items-center justify-center text-sm font-bold text-violet-700 flex-shrink-0">
                {t.full_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.email || t.specialization || ''}</p>
              </div>
            </>
          )}
        />
      )}

      {showTeacherPicker === '__all' && (
        <Dialog open onOpenChange={() => setShowTeacherPicker(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Önce Kurs Atayın</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Öğretmen atamak için önce bu sınıfa bir kurs atamanız gerekiyor.</p>
            <Button onClick={() => { setShowTeacherPicker(null); setShowCoursePicker(true); }}>
              <BookOpen className="w-4 h-4 mr-2" /> Kurs Ata
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Course Picker ───────────────────────────────── */}
      {showCoursePicker && (
        <PickerDialog
          open
          onClose={() => setShowCoursePicker(false)}
          title="Kurs Ata"
          icon={<BookOpen className="w-5 h-5 text-primary" />}
          items={courses.filter(c => c.status === 'active')}
          selectedIds={roomCourses.map(c => c.id)}
          searchPlaceholder="Kurs ara..."
          onSave={handleCourseSave}
          renderItem={course => (
            <>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{course.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`text-xs py-0 ${cefrColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>{course.cefr_level}</Badge>
                  {course.teacher && <span className="text-xs text-muted-foreground truncate">{course.teacher}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{(course.enrolled_students || []).length} öğ.</span>
                </div>
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
