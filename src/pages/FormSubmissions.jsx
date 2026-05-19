import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserCheck, Mail, Phone, Globe } from 'lucide-react';
import { format } from 'date-fns';
import SendEmailDialog from '@/components/email/SendEmailDialog';

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusLabels = {
  new: 'Yeni', contacted: 'İletişim Kuruldu', converted: 'Dönüştürüldü', rejected: 'Reddedildi',
};

export default function FormSubmissions() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [emailTarget, setEmailTarget] = useState(null);
  const qc = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['form-submissions'],
    queryFn: () => base44.entities.FormSubmission.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormSubmission.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-submissions'] }),
  });

  const convertToLeadMutation = useMutation({
    mutationFn: async (sub) => {
      await base44.entities.Lead.create({
        full_name: sub.full_name, email: sub.email, phone: sub.phone,
        source: sub.how_did_you_hear === 'website' ? 'website' : 'social_media',
        interest_level: sub.current_level || 'unknown',
        notes: sub.message, status: 'new',
      });
      await base44.entities.FormSubmission.update(sub.id, { status: 'converted' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-submissions'] }),
  });

  const filtered = submissions.filter(s => {
    const matchSearch = s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || s.form_type === filterType;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Form Başvuruları</h1>
          <p className="text-muted-foreground text-sm mt-1">Website formlarından gelen başvurular</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
          <Globe className="w-4 h-4" />
          <span>Public form linkleri Settings'den alınabilir</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="İsim veya e-posta ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Formlar</SelectItem>
            <SelectItem value="lead">İlgi Formu</SelectItem>
            <SelectItem value="enrollment">Kayıt Formu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="new">Yeni</SelectItem>
            <SelectItem value="contacted">İletişim Kuruldu</SelectItem>
            <SelectItem value="converted">Dönüştürüldü</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex items-center justify-center py-16 text-muted-foreground">Henüz başvuru yok.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(sub => (
            <Card key={sub.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{sub.full_name}</span>
                      <Badge className={`text-xs border-0 ${statusColors[sub.status]}`}>{statusLabels[sub.status]}</Badge>
                      <Badge variant="outline" className="text-xs">{sub.form_type === 'lead' ? 'İlgi Formu' : 'Kayıt Formu'}</Badge>
                      {sub.current_level && sub.current_level !== 'unknown' && (
                        <Badge variant="secondary" className="text-xs">{sub.current_level}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {sub.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{sub.email}</span>}
                      {sub.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{sub.phone}</span>}
                      {sub.nationality && <span>{sub.nationality}</span>}
                    </div>
                    {sub.interested_course && <p className="text-sm text-muted-foreground mt-1">Kurs: {sub.interested_course}</p>}
                    {sub.message && <p className="text-sm text-foreground/70 mt-1 line-clamp-1">{sub.message}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{sub.created_date ? format(new Date(sub.created_date), 'dd MMM yyyy HH:mm') : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setEmailTarget(sub)}>
                      <Mail className="w-3 h-3" /> Mail Gönder
                    </Button>
                    {sub.status === 'new' && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => updateMutation.mutate({ id: sub.id, data: { status: 'contacted' } })}>
                        İletişim Kuruldu
                      </Button>
                    )}
                    {sub.status !== 'converted' && (
                      <Button size="sm" className="gap-1" onClick={() => convertToLeadMutation.mutate(sub)}>
                        <UserCheck className="w-3 h-3" /> Lead'e Dönüştür
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {emailTarget && (
        <SendEmailDialog
          open={!!emailTarget}
          onClose={() => setEmailTarget(null)}
          toEmail={emailTarget.email}
          toName={emailTarget.full_name}
        />
      )}
    </div>
  );
}