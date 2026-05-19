import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function PipelineStageManager({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    stage_name: '',
    associated_lead_statuses: [],
    color: 'bg-blue-100 text-blue-700'
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['leadPipelineStages'],
    queryFn: () => base44.entities.LeadPipelineStage.list('order')
  });

  const createStageMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadPipelineStage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPipelineStages'] });
      resetForm();
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeadPipelineStage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPipelineStages'] });
      resetForm();
    }
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadPipelineStage.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leadPipelineStages'] })
  });

  const resetForm = () => {
    setFormData({ stage_name: '', associated_lead_statuses: [], color: 'bg-blue-100 text-blue-700' });
    setEditingStage(null);
    setShowForm(false);
  };

  const handleEditStage = (stage) => {
    setEditingStage(stage);
    setFormData({
      stage_name: stage.stage_name,
      associated_lead_statuses: stage.associated_lead_statuses || [],
      color: stage.color
    });
    setShowForm(true);
  };

  const handleSaveStage = () => {
    if (!formData.stage_name.trim()) {
      alert('Aşama adı gerekli');
      return;
    }
    if (editingStage) {
      updateStageMutation.mutate({
        id: editingStage.id,
        data: {
          ...formData,
          order: editingStage.order
        }
      });
    } else {
      createStageMutation.mutate({
        ...formData,
        order: stages.length
      });
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const reorderedStages = Array.from(stages);
    const [movedStage] = reorderedStages.splice(source.index, 1);
    reorderedStages.splice(destination.index, 0, movedStage);

    // Tüm aşamaların order değerini güncelle
    for (let i = 0; i < reorderedStages.length; i++) {
      if (reorderedStages[i].order !== i) {
        await updateStageMutation.mutateAsync({
          id: reorderedStages[i].id,
          data: { ...reorderedStages[i], order: i }
        });
      }
    }
  };

  const statusOptions = [
    'new', 'contacted', 'positive_lead', 'negative_lead', 'enrolled', 'lost'
  ];

  const colorOptions = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
    'bg-purple-100 text-purple-700',
    'bg-red-100 text-red-700',
    'bg-cyan-100 text-cyan-700'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pipeline Aşamalarını Yönet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Aşama Adı</Label>
              <Input
                placeholder="Örn: Yeni Lead"
                value={formData.stage_name}
                onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>İlişkili Lead Statüsleri (seç)</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(status => (
                  <button
                    key={status}
                    className={`px-3 py-2 rounded border text-sm font-medium transition ${
                      formData.associated_lead_statuses.includes(status)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:border-primary/50'
                    }`}
                    onClick={() => {
                      const statuses = formData.associated_lead_statuses.includes(status)
                        ? formData.associated_lead_statuses.filter(s => s !== status)
                        : [...formData.associated_lead_statuses, status];
                      setFormData({ ...formData, associated_lead_statuses: statuses });
                    }}
                  >
                    {status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Renk</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    className={`px-4 py-2 rounded border-2 transition ${
                      formData.color === color ? 'border-primary' : 'border-transparent'
                    } ${color}`}
                    onClick={() => setFormData({ ...formData, color })}
                    title={color}
                  >
                    Renk
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveStage} className="w-full">
                {editingStage ? 'Güncelle' : 'Ekle'}
              </Button>
              {editingStage && (
                <Button variant="outline" onClick={resetForm} className="w-full">
                  İptal
                </Button>
              )}
            </div>
          </div>

          {/* Stages List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Mevcut Aşamalar</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`border rounded-lg ${snapshot.isDraggingOver ? 'bg-accent/10' : ''}`}
                  >
                    {stages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Aşama bulunmuyor
                      </div>
                    ) : (
                      stages.map((stage, index) => (
                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-3 border-b flex items-start gap-3 ${
                                snapshot.isDragging ? 'bg-accent/20' : ''
                              }`}
                            >
                              <div {...provided.dragHandleProps} className="pt-1">
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </div>

                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm">{stage.stage_name}</p>
                                  <Badge className={stage.color}>
                                    {stage.associated_lead_statuses?.length || 0} statü
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {stage.associated_lead_statuses?.map(status => (
                                    <span key={status} className="text-xs bg-muted px-2 py-1 rounded">
                                      {status.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditStage(stage)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (window.confirm('Bu aşamayı silmek istediğinize emin misiniz?')) {
                                      deleteStageMutation.mutate(stage.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}