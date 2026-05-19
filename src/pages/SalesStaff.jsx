import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Mail, Phone, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SalesStaff() {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', role: 'sales' });
  const queryClient = useQueryClient();

  const { data: staff = [] } = useQuery({
    queryKey: ['salesStaff'],
    queryFn: () => base44.entities.SalesStaff.list('-created_date'),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.SalesStaff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesStaff'] });
      setFormData({ full_name: '', email: '', phone: '', role: 'sales' });
      setShowDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SalesStaff.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesStaff'] }),
  });

  const handleSubmit = async () => {
    if (formData.full_name.trim()) {
      await createMutation.mutateAsync(formData);
    }
  };

  const allPersonnel = [
    ...staff.map(s => ({ ...s, type: 'sales' })),
    ...teachers.map(t => ({ ...t, type: 'teacher' }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Satış Personeli & Öğretmenler</h1>
          <p className="text-muted-foreground mt-1">Lead'lerle ilgilenen kişileri yönetin</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Yeni Personel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Satış Personeli Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Ad Soyad *</Label>
                <Input
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Örn: Burcu Hanım"
                />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="burcu@example.com"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0700 000 0000"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
                <Button onClick={handleSubmit} disabled={!formData.full_name.trim()}>Ekle</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allPersonnel.map(person => (
          <Card key={person.id} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{person.full_name}</h3>
                  <Badge variant={person.type === 'sales' ? 'default' : 'secondary'} className="text-xs mt-1">
                    {person.type === 'sales' ? 'Satış Personeli' : 'Öğretmen'}
                  </Badge>
                </div>
                {person.type === 'sales' && (
                  <button
                    onClick={() => deleteMutation.mutate(person.id)}
                    className="p-1 hover:bg-muted rounded text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {person.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {person.email}
                  </p>
                )}
                {person.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" /> {person.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}