import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, UserCheck, Phone, Mail, MessageCircle, Calendar, LayoutGrid, List } from 'lucide-react';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import { useNavigate } from 'react-router-dom';

import { format, parseISO } from 'date-fns';

// New pipeline stages as requested
const PIPELINE_STAGES = [
  { key: 'new',         label: 'Yeni Lead',      color: 'bg-blue-100 text-blue-700',     headerBg: 'bg-blue-500',   dot: 'bg-blue-500' },
  { key: 'contacted',   label: 'Görüşüldü',       color: 'bg-amber-100 text-amber-700',   headerBg: 'bg-amber-500',  dot: 'bg-amber-500' },
  { key: 'negotiation', label: 'Teklif Verildi',  color: 'bg-orange-100 text-orange-700', headerBg: 'bg-orange-500', dot: 'bg-orange-500' },
  { key: 'trial_scheduled', label: 'Kararsız',    color: 'bg-violet-100 text-violet-700', headerBg: 'bg-violet-500', dot: 'bg-violet-500' },
  { key: 'enrolled',    label: 'Kayıt Oldu',      color: 'bg-emerald-100 text-emerald-700', headerBg: 'bg-emerald-500', dot: 'bg-emerald-500' },
];

const LOST_STAGE = { key: 'lost', label: 'Kayıp', color: 'bg-red-100 text-red-700', headerBg: 'bg-red-400', dot: 'bg-red-400' };
const ALL_STAGES = [...PIPELINE_STAGES, LOST_STAGE];

const stageByKey = Object.fromEntries(ALL_STAGES.map(s => [s.key, s]));

const sourceLabels = { website: 'Website', whatsapp: 'WhatsApp', email: 'E-posta', referral: 'Referans', walk_in: 'Yüz yüze', social_media: 'Sosyal Medya', instagram: 'Instagram' };

export default function Leads() {

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Lead.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Lead.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const handleSave = async (data) => {
    if (editingLead) {
      await updateMutation.mutateAsync({ id: editingLead.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingLead(null);
  };

  const handleConvertToStudent = async (lead) => {
    await base44.entities.Student.create({
      full_name: lead.full_name, email: lead.email, phone: lead.phone,
      cefr_level: lead.interest_level !== 'unknown' ? lead.interest_level : 'A1',
      status: 'enrolled', enrollment_date: new Date().toISOString().split('T')[0],
    });
    await updateMutation.mutateAsync({ id: lead.id, data: { ...lead, status: 'enrolled' } });
    queryClient.invalidateQueries({ queryKey: ['students'] });
  };

  const moveToStage = (lead, stageKey) => {
    updateMutation.mutate({ id: lead.id, data: { ...lead, status: stageKey, last_contact_date: new Date().toISOString().split('T')[0] } });
  };

  const filteredLeads = leads.filter(l =>
    !search ||
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  );

  // Kanban: group by stage
  const leadsByStage = Object.fromEntries(
    ALL_STAGES.map(s => [s.key, filteredLeads.filter(l => l.status === s.key)])
  );

  const LeadCard = ({ lead }) => {
    const stage = stageByKey[lead.status] || LOST_STAGE;
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{lead.full_name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{lead.full_name}</p>
                {lead.interest_level && lead.interest_level !== 'unknown' && (
                  <Badge className="text-[10px] px-1 py-0 mt-0.5 bg-blue-100 text-blue-700">{lead.interest_level}</Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditingLead(lead); setShowForm(true); }}>Düzenle</DropdownMenuItem>
                {lead.status !== 'enrolled' && (
                  <DropdownMenuItem onClick={() => handleConvertToStudent(lead)}>
                    <UserCheck className="w-3.5 h-3.5 mr-2" /> Öğrenciye Dönüştür
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => { if(confirm('Sil?')) deleteMutation.mutate(lead.id); }}>Sil</DropdownMenuItem>
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t mt-1">Taşı →</div>
                {ALL_STAGES.filter(s => s.key !== lead.status).map(s => (
                  <DropdownMenuItem key={s.key} onClick={() => moveToStage(lead, s.key)}>
                    <div className={`w-2 h-2 rounded-full ${s.dot} mr-2`} />{s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2 space-y-1">
            {lead.phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  <MessageCircle className="w-3 h-3" /> {lead.phone}
                </a>
              </div>
            )}
            {lead.source && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block" />
                {sourceLabels[lead.source] || lead.source}
              </p>
            )}
            {lead.last_contact_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Son: {format(parseISO(lead.last_contact_date), 'dd MMM yyyy')}
              </p>
            )}
            {lead.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2 italic border-t pt-1 mt-1">{lead.notes}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Lead Yönetimi</h1>
          <p className="text-muted-foreground text-sm">{leads.length} toplam lead</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 px-2.5" onClick={() => setViewMode('kanban')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 px-2.5" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => { setEditingLead(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Yeni Lead
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Lead ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Yükleniyor...</div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = leadsByStage[stage.key] || [];
            return (
              <div key={stage.key} className="flex-shrink-0 w-64">
                <div className={`${stage.headerBg} rounded-t-xl px-3 py-2 flex items-center justify-between`}>
                  <span className="text-white text-sm font-semibold">{stage.label}</span>
                  <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">{stageLeads.length}</span>
                </div>
                <div className="bg-muted/30 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Boş</p>
                  ) : (
                    stageLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
                  )}
                </div>
              </div>
            );
          })}
          {/* Lost column smaller */}
          <div className="flex-shrink-0 w-48">
            <div className="bg-red-400 rounded-t-xl px-3 py-2 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Kayıp</span>
              <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">{(leadsByStage['lost'] || []).length}</span>
            </div>
            <div className="bg-muted/30 rounded-b-xl p-2 space-y-2 min-h-[100px]">
              {(leadsByStage['lost'] || []).map(lead => <LeadCard key={lead.id} lead={lead} />)}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Lead bulunamadı</div>
          ) : filteredLeads.map(lead => {
            const stage = stageByKey[lead.status] || LOST_STAGE;
            return (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{lead.full_name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{lead.full_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {lead.phone && (
                          <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                            <MessageCircle className="w-3 h-3" />{lead.phone}
                          </a>
                        )}
                        {lead.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{lead.email}</span>}
                        {lead.source && <span className="text-xs text-muted-foreground">{sourceLabels[lead.source]}</span>}
                        {lead.last_contact_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />Son: {format(parseISO(lead.last_contact_date), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lead.interest_level && lead.interest_level !== 'unknown' && (
                      <Badge className="text-xs bg-blue-100 text-blue-700">{lead.interest_level}</Badge>
                    )}
                    <Badge className={`text-xs ${stage.color}`}>{stage.label}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingLead(lead); setShowForm(true); }}>Düzenle</DropdownMenuItem>
                        {lead.status !== 'enrolled' && (
                          <DropdownMenuItem onClick={() => handleConvertToStudent(lead)}>
                            <UserCheck className="w-4 h-4 mr-2" /> Öğrenciye Dönüştür
                          </DropdownMenuItem>
                        )}
                        {ALL_STAGES.filter(s => s.key !== lead.status).map(s => (
                          <DropdownMenuItem key={s.key} onClick={() => moveToStage(lead, s.key)}>
                            <div className={`w-2 h-2 rounded-full ${s.dot} mr-2`} />{s.label}'a taşı
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem className="text-destructive" onClick={() => { if(confirm('Sil?')) deleteMutation.mutate(lead.id); }}>Sil</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LeadFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        lead={editingLead}
        onSave={handleSave}
      />
    </div>
  );
}