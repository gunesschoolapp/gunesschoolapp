import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, BookOpen, User, Clock, MapPin, ChevronDown, ChevronUp,
  Plus, MoreHorizontal, Trash2, UserPlus, X, Search, Check, LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useClassroomsQuery } from '@/lib/classrooms';

const THEMES = {
  blue:    { color: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'    },
  violet:  { color: 'bg-violet-50 border-violet-200',badge: 'bg-violet-100 text-violet-700',dot: 'bg-violet-500'  },
  emerald: { color: 'bg-emerald-50 border-emerald-200',badge:'bg-emerald-100 text-emerald-700',dot:'bg-emerald-500'},
  amber:   { color: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500'   },
  rose:    { color: 'bg-rose-50 border-rose-200',    badge: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-500'    },
  cyan:    { color: 'bg-cyan-50 border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700',    dot: 'bg-cyan-500'    },
  orange:  { color: 'bg-orange-50 border-orange-200',badge: 'bg-orange-100 text-orange-700',dot: 'bg-orange-500'  },
};

const EMPTY_FORM = { label: '', floor: 'Üst Kat', icon: '🏫', colorTheme: 'blue' };

const cefrColors = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',       B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700',   C2: 'bg-purple-100 text-purple-700',
};

// ─── Student Add Dialog ─────────────────────────────────────
function AddStudentDialog({ open, onClose, course, students, onSave }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(course?.enrolled_students || []));
  const [saving, setSaving] = useState(false);

  const enrolled = new Set(course?.enrolled_students || []);
  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(course.id, [...selected]);
    setSaving(false);
    onClose();
  };

  const addedCount = [...selected].filter(id => !enrolled.has(id)).length;
  const removedCount = [...enrolled].filter(id => !selected.has(id)).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Öğrenci Ekle / Çıkar
          </DialogTitle>
          {course && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Kurs: <strong>{course.name}</strong>
            </p>
          )}
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Öğrenci ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs bg-muted/50 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Seçili: <strong className="text-foreground">{selected.size}</strong></span>
          {addedCount > 0 && <span className="text-emerald-600">+{addedCount} eklenecek</span>}
          {removedCount > 0 && <span className="text-rose-600">-{removedCount} çıkarılacak</span>}
          <button
            className="ml-auto text-xs text-primary hover:underline"
            onClick={() => setSelected(new Set([...selected.size === students.length ? [] : students.map(s => s.id)]))}
          >
            {selected.size === students.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
          </button>
        </div>

        {/* Student list */}
        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Öğrenci bulunamadı</p>
          )}
          {filtered.map(student => {
            const isSelected = selected.has(student.id);
            const wasEnrolled = enrolled.has(student.id);
            return (
              <button
                key={student.id}
                onClick={() => toggle(student.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-card border-transparent hover:bg-muted/50'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {student.full_name?.[0] || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.email || student.level || ''}</p>
                </div>

                {/* Status badge */}
                {wasEnrolled && !isSelected && (
                  <Badge variant="outline" className="text-xs text-rose-600 border-rose-300 flex-shrink-0">Çıkarılacak</Badge>
                )}
                {!wasEnrolled && isSelected && (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 flex-shrink-0">Eklenecek</Badge>
                )}
                {wasEnrolled && isSelected && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">Kayıtlı</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">İptal</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Classroom Card ─────────────────────────────────────────
function ClassroomCard({ classroom, courses, students, lessons, isAdmin, onEdit, onDelete, onEnrollmentChange }) {
  const [expanded, setExpanded] = useState(true);
  const [addStudentCourse, setAddStudentCourse] = useState(null);
  const navigate = useNavigate(); // course being edited

  const roomCourses = courses.filter(c => c.room === classroom.id);
  const roomLessons = lessons
    .filter(l => l.room === classroom.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, 5);

  const enrolledStudentIds = [...new Set(roomCourses.flatMap(c => c.enrolled_students || []))];
  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));

  const handleSaveEnrollment = async (courseId, newStudentIds) => {
    await onEnrollmentChange(courseId, newStudentIds);
  };

  return (
    <>
      <Card
        className={`border-2 ${classroom.color || 'bg-card border-border'} transition-shadow hover:shadow-lg cursor-pointer`}
        onClick={() => navigate(`/ClassroomDetail?id=${classroom.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{classroom.icon || '🏫'}</div>
              <div>
                <CardTitle className="text-xl">{classroom.label}</CardTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{classroom.floor}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/ClassroomDetail?id=${classroom.id}`)}>
                      <LogIn className="w-4 h-4 mr-2" /> Sınıfa Gir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(classroom)}>Düzenle</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => {
                      if (confirm('Bu sınıfı silmek istediğinizden emin misiniz?')) onDelete(classroom.id);
                    }}>
                      <Trash2 className="w-4 h-4 mr-2" /> Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex gap-3 mt-3 flex-wrap">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${classroom.badge || 'bg-secondary text-secondary-foreground'}`}>
              <BookOpen className="w-3.5 h-3.5" />
              {roomCourses.length} Kurs
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${classroom.badge || 'bg-secondary text-secondary-foreground'}`}>
              <Users className="w-3.5 h-3.5" />
              {enrolledStudents.length} Öğrenci
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-5 pt-0">
            {roomCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 italic">
                Bu sınıfa atanmış kurs yok
              </p>
            ) : (
              <>
                {/* Courses */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Kurslar
                  </h4>
                  <div className="space-y-3">
                    {roomCourses.map(course => {
                      const courseStudents = students.filter(s => (course.enrolled_students || []).includes(s.id));
                      return (
                        <div key={course.id} className="bg-white rounded-xl border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{course.name}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Badge className={`text-xs ${cefrColors[course.cefr_level] || 'bg-gray-100 text-gray-700'}`}>{course.cefr_level}</Badge>
                                {course.teacher && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" /> {course.teacher}
                                  </span>
                                )}
                                {course.schedule && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" /> {course.schedule}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">
                                <Users className="w-3 h-3 inline mr-0.5" />{courseStudents.length}/{course.max_students || '∞'}
                              </span>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1 hover:bg-primary hover:text-white border-primary/30 text-primary"
                                  onClick={() => setAddStudentCourse(course)}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Öğrenci
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Enrolled students chips */}
                          {courseStudents.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                              {courseStudents.map(s => (
                                <div
                                  key={s.id}
                                  className="flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full group"
                                >
                                  <span>{s.full_name}</span>
                                  {isAdmin && (
                                    <button
                                      onClick={() => {
                                        const updated = (course.enrolled_students || []).filter(id => id !== s.id);
                                        onEnrollmentChange(course.id, updated);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-rose-500 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic pt-1 border-t">
                              Bu kursta kayıtlı öğrenci yok —
                              <button className="text-primary ml-1 hover:underline" onClick={() => setAddStudentCourse(course)}>
                                öğrenci ekle
                              </button>
                            </p>
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
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${classroom.dot || 'bg-primary'}`} />
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

      {/* Student Add/Remove Dialog */}
      {addStudentCourse && (
        <AddStudentDialog
          open={!!addStudentCourse}
          onClose={() => setAddStudentCourse(null)}
          course={addStudentCourse}
          students={students}
          onSave={handleSaveEnrollment}
        />
      )}
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Classrooms() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: classrooms = [], isLoading: roomsLoading } = useClassroomsQuery();

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

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Classroom.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Classroom.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Classroom.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
  });

  // Course enrollment update
  const enrollmentMutation = useMutation({
    mutationFn: ({ courseId, studentIds }) =>
      base44.entities.Course.update(courseId, { enrolled_students: studentIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const handleEnrollmentChange = async (courseId, newStudentIds) => {
    await enrollmentMutation.mutateAsync({ courseId, studentIds: newStudentIds });
  };

  const handleSave = async () => {
    const themeStyles = THEMES[formData.colorTheme] || THEMES.blue;
    const data = {
      label: formData.label,
      floor: formData.floor,
      icon: formData.icon,
      color: themeStyles.color,
      badge: themeStyles.badge,
      dot: themeStyles.dot,
      colorTheme: formData.colorTheme,
    };
    if (editingClassroom) {
      await updateMutation.mutateAsync({ id: editingClassroom.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setShowForm(false);
    setFormData(EMPTY_FORM);
    setEditingClassroom(null);
  };

  const openEdit = (classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      label: classroom.label || '',
      floor: classroom.floor || 'Üst Kat',
      icon: classroom.icon || '🏫',
      colorTheme: classroom.colorTheme || 'blue',
    });
    setShowForm(true);
  };

  const classroomsByFloor = React.useMemo(() => {
    const groups = {};
    classrooms.forEach(c => {
      const floor = c.floor || 'Diğer';
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(c);
    });
    return groups;
  }, [classrooms]);

  const activeCourses = courses.filter(c => c.status === 'active');
  const assignedCourses = activeCourses.filter(c => c.room);
  const unassignedCourses = activeCourses.filter(c => !c.room);
  const isAdmin = true;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sınıflar</h1>
          <p className="text-muted-foreground mt-1">Her sınıfın kursları, öğretmenleri ve öğrencileri</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setEditingClassroom(null); setFormData(EMPTY_FORM); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Sınıf Ekle
          </Button>
        )}
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Toplam Sınıf</p><p className="text-xl font-bold">{classrooms.length}</p></div>
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

      {/* Unassigned warning */}
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

      {/* Classroom list */}
      {roomsLoading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : Object.keys(classroomsByFloor).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Kayıtlı sınıf bulunmuyor</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(classroomsByFloor).map(([floor, list]) => (
            <div key={floor} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                🏫 {floor}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {list.map(classroom => (
                  <ClassroomCard
                    key={classroom.id}
                    classroom={classroom}
                    courses={courses}
                    students={students}
                    lessons={lessons}
                    isAdmin={isAdmin}
                    onEdit={openEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onEnrollmentChange={handleEnrollmentChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Classroom Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClassroom ? 'Sınıfı Düzenle' : 'Yeni Sınıf Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Sınıf Adı *</Label>
              <Input
                placeholder="Örn: Sınıf 4, Lab 1"
                value={formData.label}
                onChange={e => setFormData({ ...formData, label: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kat / Konum *</Label>
              <Select value={formData.floor} onValueChange={v => setFormData({ ...formData, floor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Üst Kat">Üst Kat</SelectItem>
                  <SelectItem value="Alt Kat">Alt Kat</SelectItem>
                  <SelectItem value="Zemin Kat">Zemin Kat</SelectItem>
                  <SelectItem value="Online">Online / Sanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>İkon *</Label>
              <Select value={formData.icon} onValueChange={v => setFormData({ ...formData, icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="🏫">🏫 Okul</SelectItem>
                  <SelectItem value="🏢">🏢 Bina</SelectItem>
                  <SelectItem value="📖">📖 Kitap</SelectItem>
                  <SelectItem value="💻">💻 Bilgisayar</SelectItem>
                  <SelectItem value="📐">📐 Cetvel</SelectItem>
                  <SelectItem value="⭐">⭐ Yıldız</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Renk Teması</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(THEMES).map(themeKey => (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => setFormData({ ...formData, colorTheme: themeKey })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      formData.colorTheme === themeKey
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white border-border hover:border-primary/50'
                    }`}
                  >
                    {themeKey.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingClassroom(null); }}>İptal</Button>
              <Button onClick={handleSave} disabled={!formData.label || !formData.floor}>
                {editingClassroom ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}