import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Clock, MapPin, MoreHorizontal, Trash2, Search } from 'lucide-react';
const getRoomLabel = (roomId) => {
  const map = { sinif1: 'Sınıf 1 (Üst)', sinif2: 'Sınıf 2 (Üst)', sinif3: 'Sınıf 3 (Alt)' };
  return map[roomId] || roomId || '';
};
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CourseFormDialog from '@/components/courses/CourseFormDialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';



export default function Courses() {
  const { user } = useAuth();
  const statusConfig = {
    active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  };
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: currentTeacher } = useQuery({
    queryKey: ['teacher', user?.email],
    queryFn: () => user?.email ? base44.entities.Teacher.filter({ email: user.email }) : Promise.resolve([]),
    enabled: !!user?.email,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const isTeacherRole = user?.role === 'teacher' || user?.matched_role === 'teacher';
  const teacherName = currentTeacher?.[0]?.full_name;

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', user?.email, isTeacherRole, teacherName],
    queryFn: async () => {
      const all = await base44.entities.Course.list('-created_date');
      if (isTeacherRole && teacherName) {
        return all.filter(c => c.teacher?.toLowerCase() === teacherName.toLowerCase());
      }
      return all;
    },
    // Admin veya staff: hemen yükle. Teacher: teacherName yüklenene kadar bekle.
    enabled: !!user && (!isTeacherRole || !!teacherName),
  });

  const activeCourse = selectedCourse ? (courses.find(c => c.id === selectedCourse.id) || selectedCourse) : null;

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Course.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Course.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Course.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const handleSave = async (data) => {
    if (editingCourse) {
      await updateMutation.mutateAsync({ id: editingCourse.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingCourse(null);
  };

  const isTeacher = currentTeacher?.length > 0;
  const canManageCourse = (course) => {
    if (user?.role === 'admin') return true;
    if (isTeacher && course.teacher === currentTeacher[0]?.full_name) return true;
    return false;
  };

  const addStudentToCourse = async (course, student) => {
    const enrolled = course.enrolled_students || [];
    if (!enrolled.includes(student.id)) {
      // If student is already enrolled in another course, remove them from that course's enrolled_students list first
      if (student.course_id && student.course_id !== course.id) {
        const oldCourse = courses.find(c => c.id === student.course_id);
        if (oldCourse) {
          const oldEnrolled = oldCourse.enrolled_students || [];
          await base44.entities.Course.update(oldCourse.id, {
            enrolled_students: oldEnrolled.filter(id => id !== student.id)
          });
        }
      }

      // Update new course
      await updateMutation.mutateAsync({
        id: course.id,
        data: { enrolled_students: [...enrolled, student.id] }
      });

      // Update student
      await base44.entities.Student.update(student.id, { course_id: course.id });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
    setStudentSearch('');
  };

  const removeStudentFromCourse = async (course, studentId) => {
    const enrolled = course.enrolled_students || [];
    // Update course
    await updateMutation.mutateAsync({
      id: course.id,
      data: { enrolled_students: enrolled.filter(id => id !== studentId) }
    });

    // Clear student's course_id
    const student = students.find(s => s.id === studentId);
    if (student && student.course_id === course.id) {
      await base44.entities.Student.update(studentId, { course_id: '' });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
         <div>
           <h1 className="text-xl font-bold tracking-tight">Courses</h1>
           <p className="text-sm text-muted-foreground mt-0.5">{courses.filter(c => c.status === 'active').length} active courses</p>
         </div>
         <Button size="sm" onClick={() => { setEditingCourse(null); setShowForm(true); }}>
           <Plus className="w-4 h-4 mr-1" /> Add
         </Button>
       </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={courseSearch}
          onChange={e => setCourseSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">No courses yet</div>
        ) : (
          courses
            .filter(c => 
              c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
              c.teacher?.toLowerCase().includes(courseSearch.toLowerCase())
            )
            .map(course => {
            const enrolledStudentObjs = students.filter(s => course.enrolled_students?.includes(s.id));
            const enrolled = course.enrolled_students?.length || 0;
            const max = course.max_students || 12;
            const fill = Math.round((enrolled / max) * 100);
            return (
              <Card key={course.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-lg">{course.name}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={`text-xs ${statusConfig[course.status]?.color || 'bg-gray-100'}`}>
                          {statusConfig[course.status]?.label}
                        </Badge>
                      </div>
                    </div>
                    {canManageCourse(course) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedCourse(course)}>Manage Students</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingCourse(course); setShowForm(true); }}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(course.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                     {course.teacher && <p>👨‍🏫 Teacher: {course.teacher}</p>}
                     {course.schedule && <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{course.schedule}</p>}
                     {course.room && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{getRoomLabel(course.room)}</p>}
                   </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Occupancy</span>
                      <span className="font-semibold">{enrolled}/{max}</span>
                    </div>
                    <Progress value={fill} className="h-2" />
                  </div>

                   {canManageCourse(course) && enrolledStudentObjs.length > 0 && (
                     <div className="mt-4 pt-3 border-t">
                       <p className="text-xs text-muted-foreground mb-2">Students ({enrolledStudentObjs.length}):</p>
                       <div className="flex flex-wrap gap-1">
                         {enrolledStudentObjs.slice(0, 3).map(s => (
                           <Badge key={s.id} variant="outline" className="text-xs">
                             {s.full_name}
                           </Badge>
                         ))}
                         {enrolledStudentObjs.length > 3 && (
                           <Badge variant="outline" className="text-xs">+{enrolledStudentObjs.length - 3}</Badge>
                         )}
                       </div>
                     </div>
                   )}
                  </CardContent>
                  </Card>
                  );
                  })
                  )}
      </div>

      <CourseFormDialog
         open={showForm}
         onOpenChange={setShowForm}
         course={editingCourse}
         onSave={handleSave}
       />

       {/* Student Management Dialog */}
        {activeCourse && (
          <Dialog open={!!activeCourse} onOpenChange={() => setSelectedCourse(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{activeCourse.name} - Student Management</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Add Student */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Student</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </div>
                  {studentSearch && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto">
                      {students
                        .filter(s => 
                          s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) &&
                          !activeCourse.enrolled_students?.includes(s.id)
                        )
                        .map(s => (
                          <button
                            key={s.id}
                            onClick={() => addStudentToCourse(activeCourse, s)}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                          >
                            {s.full_name} <span className="text-xs text-muted-foreground ml-1">({s.email})</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Enrolled Students */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enrolled Students ({activeCourse.enrolled_students?.length || 0})</label>
                  <div className="space-y-2">
                    {students
                      .filter(s => activeCourse.enrolled_students?.includes(s.id))
                      .map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <span>{s.full_name}</span>
                          <button
                            onClick={() => removeStudentFromCourse(activeCourse, s.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      );
      }