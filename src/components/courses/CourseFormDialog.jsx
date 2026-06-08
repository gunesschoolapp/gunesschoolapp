import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useClassroomsQuery, getClassroomOptions } from '@/lib/classrooms';

const defaultCourse = {
  name: '', teacher: '', schedule: '', start_date: '', end_date: '',
  max_students: 12, status: 'active', room: '', description: ''
};

export default function CourseFormDialog({ open, onOpenChange, course, onSave }) {
  const { data: classrooms = [] } = useClassroomsQuery();
  const CLASSROOM_OPTIONS = React.useMemo(() => getClassroomOptions(classrooms), [classrooms]);

  const [form, setForm] = useState(course || defaultCourse);
  const [saving, setSaving] = useState(false);

  const { data: teacherEntities = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
    enabled: open,
  });

  const { data: staffEntities = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: open,
  });

  // Combine: Staff with teacher role + legacy Teacher entity
  const teachers = React.useMemo(() => {
    const staffTeachers = staffEntities.filter(s => (s.roles || []).includes('teacher'));
    const legacyIds = new Set(staffTeachers.map(s => s.email));
    const legacyTeachers = teacherEntities.filter(t => !legacyIds.has(t.email));
    return [...staffTeachers, ...legacyTeachers];
  }, [staffEntities, teacherEntities]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? 'Kurs Düzenle' : 'Yeni Kurs'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kurs Adı *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Öğretmen</Label>
              <Select value={form.teacher} onValueChange={v => setForm({...form, teacher: v})}>
                <SelectTrigger><SelectValue placeholder="Öğretmen seçin" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.full_name}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sınıf</Label>
              <Select value={form.room || ''} onValueChange={v => setForm({...form, room: v})}>
                <SelectTrigger><SelectValue placeholder="Sınıf seçin" /></SelectTrigger>
                <SelectContent>
                  {CLASSROOM_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Input value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})} placeholder="Pzt-Çrş 14:00-15:30" />
            </div>
            <div className="space-y-2">
              <Label>Max Öğrenci</Label>
              <Input type="number" value={form.max_students} onChange={e => setForm({...form, max_students: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Başlangıç</Label>
              <Input
                type="date"
                value={form.start_date}
                min={!course ? new Date().toISOString().split('T')[0] : undefined}
                onChange={e => setForm({...form, start_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Bitiş</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="upcoming">Yaklaşan</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={!form.name || saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}