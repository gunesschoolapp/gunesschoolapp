import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, MoreHorizontal, Trash2, BookOpen, UserX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import { useAuth } from '@/lib/AuthContext';

const LESSON_STATUS = {
  started:     { label: 'Ders Aldı',   color: 'bg-emerald-100 text-emerald-700' },
  not_started: { label: 'Ders Almadı', color: 'bg-amber-100 text-amber-700' },
};

const TABS = [
  { key: 'all',         label: 'Tümü' },
  { key: 'started',     label: 'Ders Aldı' },
  { key: 'not_started', label: 'Ders Almadı' },
];

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [displayCount, setDisplayCount] = useState(30);
  const queryClient = useQueryClient();

  const { data: teacherCourses = [] } = useQuery({
    queryKey: ['teacher-courses', user?.email],
    queryFn: async () => {
      if (!isTeacher) return [];
      // Öğretmenin adını bul
      const teacherRecords = await base44.entities.Teacher.filter({ email: user.email });
      if (!teacherRecords?.length) return [];
      const teacherName = teacherRecords[0].full_name;
      return base44.entities.Course.filter({ teacher: teacherName });
    },
    enabled: isTeacher && !!user?.email,
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', isTeacher ? 'teacher' : 'all', user?.email],
    queryFn: () => base44.entities.Student.list('-created_date'),
  });

  // Öğretmen ise sadece kendi kurslarındaki öğrencileri göster
  const myStudentIds = isTeacher
    ? new Set(teacherCourses.flatMap(c => c.enrolled_students || []))
    : null;

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Student.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Student.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const handleSave = async (data) => {
    if (editingStudent) {
      await updateMutation.mutateAsync({ id: editingStudent.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingStudent(null);
  };

  const enrolledStudents = students.filter(s => {
    if (s.status !== 'enrolled') return false;
    if (myStudentIds !== null) return myStudentIds.has(s.id);
    return true;
  });

  const filtered = enrolledStudents.filter(s => {
    const matchSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search);

    let matchTab = true;
    if (activeTab === 'started') {
      matchTab = s.enrollment_status === 'started';
    } else if (activeTab === 'not_started') {
      matchTab = s.enrollment_status !== 'started';
    }

    return matchSearch && matchTab;
  });

  const displayed = filtered.slice(0, displayCount);
  const hasMore = displayCount < filtered.length;

  const countFor = (key) => {
    if (key === 'all') return enrolledStudents.length;
    if (key === 'started') return enrolledStudents.filter(s => s.enrollment_status === 'started').length;
    if (key === 'not_started') return enrolledStudents.filter(s => s.enrollment_status !== 'started').length;
    return 0;
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Öğrenciler</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enrolledStudents.length} kayıtlı · {countFor('started')} ders alıyor
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditingStudent(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Ekle
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="İsim veya telefon ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setDisplayCount(30); }}
            className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 flex-shrink-0
              ${activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? 'bg-white/20' : 'bg-background'}`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">Öğrenci bulunamadı</p>
          <p className="text-sm mt-1">Bu kategoride henüz kayıt yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(student => {
            const lessonStatus = LESSON_STATUS[student.enrollment_status] || LESSON_STATUS.not_started;
            return (
              <Card
                key={student.id}
                className="hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
                onClick={() => navigate(`/StudentProfile/${student.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-primary">
                          {student.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{student.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {student.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />{student.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`text-xs ${lessonStatus.color}`}>
                        {lessonStatus.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* Quick lesson status toggle */}
                          {student.enrollment_status === 'started' ? (
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: student.id, data: { enrollment_status: 'not_started' } }); }}>
                              <UserX className="w-4 h-4 mr-2 text-amber-500" /> Ders Almadı'ya Al
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: student.id, data: { enrollment_status: 'started' } }); }}>
                              <BookOpen className="w-4 h-4 mr-2 text-emerald-500" /> Ders Aldı'ya Al
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditingStudent(student); setShowForm(true); }}>
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={e => { e.stopPropagation(); if (confirm('Silmek istediğinize emin misiniz?')) deleteMutation.mutate(student.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {student.enrollment_date && (
                    <p className="text-xs text-muted-foreground mt-2 ml-14">Kayıt: {student.enrollment_date}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setDisplayCount(prev => prev + 30)}>
            Daha Fazla ({displayed.length}/{filtered.length})
          </Button>
        </div>
      )}

      <StudentFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        student={editingStudent}
        onSave={handleSave}
        existingStudents={students}
      />
    </div>
  );
}