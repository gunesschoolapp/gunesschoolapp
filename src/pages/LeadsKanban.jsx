import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Phone, Mail, GripVertical, Columns3, List, Trash2, MoreHorizontal, Edit2, Settings } from 'lucide-react';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import PipelineStageManager from '@/components/leads/PipelineStageManager';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/components/LanguageContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function LeadsKanban() {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('kanban');
  const [displayCount, setDisplayCount] = useState(10);
  const [showPipelineManager, setShowPipelineManager] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: leads = [] } = useQuery({
    queryKey: ['students-as-leads'],
    queryFn: () => base44.entities.Student.list('-created_date'),
  });

  const { data: pipelineStages = [] } = useQuery({
    queryKey: ['leadPipelineStages'],
    queryFn: async () => {
      const stages = await base44.entities.LeadPipelineStage.list('order');
      return stages.filter(s => s.is_active);
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Student.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students-as-leads'] }),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Student.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students-as-leads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Student.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students-as-leads'] }),
  });

  const handleSave = async (data) => {
    if (editingLead) {
      await updateLeadMutation.mutateAsync({ id: editingLead.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingLead(null);
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const lead = leads.find(l => l.id === draggableId);
    if (!lead) return;

    // Hedef stage'i bul
    const targetStage = pipelineStages.find(s => s.id === destination.droppableId);
    if (!targetStage || !targetStage.associated_lead_statuses.length) return;

    // Lead'in yeni statüsünü hedef stage'in ilk statüsüne ayarla
    const newStatus = targetStage.associated_lead_statuses[0];
    await updateLeadMutation.mutateAsync({
      id: lead.id,
      data: { ...lead, status: newStatus }
    });
  };

  const getLeadsForStage = (stage) => {
    return leads.filter(l =>
      stage.associated_lead_statuses.includes(l.status) &&
      (l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
       l.email?.toLowerCase().includes(search.toLowerCase()) ||
       l.phone?.includes(search))
    );
  };

  const sourceLabels = {
    website: t('srcWebsite'),
    whatsapp: t('srcWhatsapp'),
    email: t('srcEmail'),
    referral: t('srcReferral'),
    walk_in: t('srcWalkIn'),
    social_media: t('srcSocial')
  };

  const filteredLeads = leads.filter(l =>
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  );

  const displayedLeads = filteredLeads.slice(0, displayCount);
  const hasMore = displayCount < filteredLeads.length;

  const statusLabels = {
    new: 'Yeni Lead',
    contacted: 'İletişime Geçildi',
    positive_lead: 'Olumlu Lead',
    negative_lead: 'Olumsuz Lead',
    enrolled: 'Kayıt Yapıldı',
    lost: 'Kayıp',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('leadsTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('leadsSubtitle')}</p>
        </div>
        <div className="flex gap-2">
           <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button
              size="sm"
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <Columns3 className="w-4 h-4" /> Kanban
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="w-4 h-4" /> Liste
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowPipelineManager(true)} title="Aşamaları Yönet">
            <Settings className="w-4 h-4" />
          </Button>
          <Button onClick={() => { setEditingLead(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> {t('newLead')}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchLeads')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pipelineStages.map(stage => (
              <div key={stage.id} className="flex-shrink-0 w-96">
                <div className="mb-3">
                  <h2 className="font-semibold text-sm">
                    {stage.stage_name}
                    <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                      {getLeadsForStage(stage).length}
                    </span>
                  </h2>
                </div>
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 p-3 rounded-lg min-h-96 ${
                        snapshot.isDraggingOver ? 'bg-accent/10' : 'bg-muted/30'
                      }`}
                    >
                      {getLeadsForStage(stage).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${
                                snapshot.isDragging
                                  ? 'shadow-lg ring-2 ring-primary'
                                  : 'shadow hover:shadow-md'
                              }`}
                            >
                              <Card className="cursor-grab active:cursor-grabbing bg-card">
                                <CardContent className="p-3">
                                  <div className="flex gap-2 items-start">
                                    <div {...provided.dragHandleProps} className="pt-1">
                                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div
                                      className="flex-1 cursor-pointer"
                                      onClick={() => {
                                        setEditingLead(lead);
                                        setShowForm(true);
                                      }}
                                    >
                                      <p className="font-semibold text-sm">{lead.full_name}</p>
                                      {lead.phone && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                          <Phone className="w-3 h-3" /> {lead.phone}
                                        </p>
                                      )}
                                      {lead.email && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Mail className="w-3 h-3" /> {lead.email}
                                        </p>
                                      )}
                                      <div className="flex gap-1 mt-2 flex-wrap">
                                        <Badge variant="secondary" className="text-xs">
                                          {sourceLabels[lead.source] || lead.source}
                                        </Badge>
                                        {lead.potential_sale_amount && (
                                          <Badge className="text-xs bg-accent/20 text-accent-foreground">
                                            £{lead.potential_sale_amount}
                                          </Badge>
                                        )}
                                      </div>
                                      {lead.assigned_to && (
                                        <p className="text-xs text-primary font-medium mt-2">
                                          👤 {lead.assigned_to}
                                        </p>
                                      )}
                                      {lead.notes && (
                                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                          {lead.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="space-y-2">
           {filteredLeads.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">Lead bulunamadı.</div>
           ) : (
             <>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="border-b">
                     <th className="text-left py-3 px-4 font-semibold text-sm">İsim</th>
                     <th className="text-left py-3 px-4 font-semibold text-sm">Telefon</th>
                     <th className="text-left py-3 px-4 font-semibold text-sm">E-mail</th>
                     <th className="text-left py-3 px-4 font-semibold text-sm">Kaynak</th>
                     <th className="text-left py-3 px-4 font-semibold text-sm">Durum</th>
                     <th className="text-left py-3 px-4 font-semibold text-sm">Atanan Personel</th>
                     <th className="text-left py-3 px-4 font-semibold text-sm">Potansiyel Satış</th>
                     <th className="text-center py-3 px-4 font-semibold text-sm">İşlem</th>
                   </tr>
                 </thead>
                 <tbody>
                   {displayedLeads.map(lead => (
                    <tr
                      key={lead.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setEditingLead(lead);
                        setShowForm(true);
                      }}
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-sm">{lead.full_name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm flex items-center gap-1">
                          {lead.phone ? (
                            <>
                              <Phone className="w-3 h-3 text-muted-foreground" /> {lead.phone}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm flex items-center gap-1">
                          {lead.email ? (
                            <>
                              <Mail className="w-3 h-3 text-muted-foreground" /> {lead.email}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-xs">
                          {sourceLabels[lead.source] || lead.source}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="text-xs bg-primary/10 text-primary">
                          {statusLabels[lead.status] || lead.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium">
                          {lead.assigned_to ? lead.assigned_to : '—'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium">
                          {lead.potential_sale_amount ? `£${lead.potential_sale_amount}` : '-'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                setEditingLead(lead);
                                setShowForm(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" /> Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={e => {
                                e.stopPropagation();
                                deleteMutation.mutate(lead.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setDisplayCount(prev => prev + 10)}>
                  Daha Fazla Yükle ({displayedLeads.length}/{filteredLeads.length})
                </Button>
              </div>
              )}
              </>
              )}
              </div>
              )}

      <LeadFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        lead={editingLead}
        onSave={handleSave}
      />

      <PipelineStageManager
        open={showPipelineManager}
        onOpenChange={setShowPipelineManager}
      />
    </div>
  );
}