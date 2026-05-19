import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLang } from '@/components/LanguageContext';

export default function AttendancePage() {
  const { t } = useLang();
  const statusConfig = {
    present: { label: t('attPresent'), icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
    absent: { label: t('attAbsent'), icon: XCircle, color: 'text-red-600 bg-red-50' },
    late: { label: t('attLate'), icon: Clock, color: 'text-amber-600 bg-amber-50' },
    excused: { label: t('attExcused'), icon: AlertTriangle, color: 'text-blue-600 bg-blue-50' },
  };
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date') });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Attendance.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const course = courses.find(c => c.id === selectedCourse);
  const enrolledStudentIds = course?.enrolled_students || [];
  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));

  // If no enrolled students for course, show all active students
  const displayStudents = enrolledStudents.length > 0 ? enrolledStudents : (selectedCourse ? students.filter(s => s.status === 'active') : []);

  const getAttendance = (studentId) => {
    return attendance.find(a => a.student_id === studentId && a.date === selectedDate && a.course_id === selectedCourse);
  };

  const handleMark = async (studentId, status) => {
    const existing = getAttendance(studentId);
    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, data: { ...existing, status } });
    } else {
      await createMutation.mutateAsync({
        student_id: studentId, course_id: selectedCourse, date: selectedDate, status
      });
    }
  };

  // Attendance summary
  const todayAttendance = attendance.filter(a => a.date === selectedDate && a.course_id === selectedCourse);
  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('attendanceTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('attendanceSubtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger><SelectValue placeholder={t('selectCourse')} /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.cefr_level})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
          </div>
        </CardContent>
      </Card>

      {selectedCourse && todayAttendance.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(statusConfig).map(([key, config]) => {
            const count = todayAttendance.filter(a => a.status === key).length;
            const Icon = config.icon;
            return (
              <Card key={key} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCourse && displayStudents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{course?.name} - {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayStudents.map(student => {
                const att = getAttendance(student.id);
                return (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{student.full_name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
                        <Badge className="text-xs bg-primary/10 text-primary mt-0.5">{student.cefr_level}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {Object.entries(statusConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        const isActive = att?.status === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleMark(student.id, key)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                              isActive ? config.color + ' ring-2 ring-offset-1' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={config.label}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : selectedCourse ? (
        <div className="text-center py-12 text-muted-foreground">{t('noStudentsEnrolled')}</div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">{t('selectCourseFirst')}</div>
      )}
    </div>
  );
}