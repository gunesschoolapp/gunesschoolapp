import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const defaultForm = { student_id: '', channel: 'whatsapp', contact_identifier: '' };

export default function NewConversationDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState(defaultForm);
  const [studentSearch, setStudentSearch] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const selectedStudent = students.find(s => s.id === form.student_id);
  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.channel) return;
    onCreate({
      ...form,
      student_name: selectedStudent?.full_name || '',
      contact_identifier: form.contact_identifier || selectedStudent?.phone || selectedStudent?.email || '',
      status: 'open',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    });
    setForm(defaultForm);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm">Öğrenci (opsiyonel)</Label>
            <input
              type="text"
              placeholder="Öğrenci adı ara..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-md text-sm"
            />
            {studentSearch && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredStudents.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setForm({ ...form, student_id: s.id });
                      setStudentSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm ${
                      form.student_id === s.id ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <p className="font-medium">{s.full_name}</p>
                    {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                  </button>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Öğrenci bulunamadı</p>
                )}
              </div>
            )}
            {selectedStudent && form.student_id && (
              <p className="text-xs text-muted-foreground">Seçilen: {selectedStudent.full_name}</p>
            )}
          </div>
          <div>
            <Label className="text-sm">Channel *</Label>
            <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="facebook">Facebook Messenger</SelectItem>
                <SelectItem value="instagram">Instagram DM</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Contact (phone / email / handle)</Label>
            <Input
              className="mt-1"
              placeholder="e.g. +44 7700 900000"
              value={form.contact_identifier}
              onChange={e => setForm({ ...form, contact_identifier: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate}>Start Conversation</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}