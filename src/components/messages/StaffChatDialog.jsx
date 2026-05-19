import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function StaffChatDialog({ open, onClose, onCreate, currentUserEmail }) {
  const [form, setForm] = useState({ staff_ids: [] });
  const [search, setSearch] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const filteredStaff = staff.filter(s => 
    s.email && 
    s.email !== currentUserEmail &&
    (s.full_name.toLowerCase().includes(search.toLowerCase()) || 
     s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedStaff = staff.filter(s => form.staff_ids.includes(s.id));

  const handleCreate = () => {
    if (form.staff_ids.length === 0) return;
    
    onCreate({
      staff_ids: form.staff_ids,
      staff_names: selectedStaff.map(s => s.full_name).join(', '),
      contact_identifier: selectedStaff.map(s => s.email).join('; '),
      channel: 'internal',
      status: 'open',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    });
    setForm({ staff_ids: [] });
    setSearch('');
    onClose();
  };

  const toggleStaff = (staffId) => {
    setForm(prev => ({
      ...prev,
      staff_ids: prev.staff_ids.includes(staffId)
        ? prev.staff_ids.filter(id => id !== staffId)
        : [...prev.staff_ids, staffId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Çalışanlarla Sohbet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm">Çalışanları Seç *</Label>
            <Input
              className="mt-1"
              placeholder="Çalışan adı veya email ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {search && (
            <div className="border rounded-lg max-h-48 overflow-y-auto space-y-1">
              {filteredStaff.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm flex items-center gap-2 ${
                    form.staff_ids.includes(s.id) ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.staff_ids.includes(s.id)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {form.staff_ids.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Seçilen Çalışanlar</Label>
              <div className="space-y-1">
                {selectedStaff.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                    <span>{s.full_name}</span>
                    <button
                      onClick={() => toggleStaff(s.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button onClick={handleCreate} disabled={form.staff_ids.length === 0}>
              Sohbet Başlat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}