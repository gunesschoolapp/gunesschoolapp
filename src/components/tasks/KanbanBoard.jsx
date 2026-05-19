import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, Pencil, Trash2, Plus } from 'lucide-react';

const COLUMNS = [
  { id: 'open', label: 'Açık', color: 'border-t-slate-400', bg: 'bg-slate-50' },
  { id: 'in_progress', label: 'Devam Ediyor', color: 'border-t-blue-500', bg: 'bg-blue-50/40' },
  { id: 'done', label: 'Tamamlandı', color: 'border-t-emerald-500', bg: 'bg-emerald-50/40' },
];

const priorityConfig = {
  low: { label: 'Düşük', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Orta', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'Yüksek', color: 'bg-red-100 text-red-700' },
};

function TaskCard({ task, index, onEdit, onDelete, isDragging }) {
  const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
  const pc = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-xl border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30 rotate-1' : 'hover:shadow-md'}
            ${isOverdue ? 'border-red-200' : 'border-border'}
            ${task.status === 'done' ? 'opacity-60' : ''}
          `}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className={`text-sm font-medium leading-snug flex-1 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </p>
            <div className="flex gap-0.5 flex-shrink-0">
              <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-muted transition-colors">
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={() => onDelete(task.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3 h-3 text-destructive/70" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`text-xs px-1.5 py-0 ${pc.color}`}>{pc.label}</Badge>
            {isOverdue && (
              <Badge className="text-xs px-1.5 py-0 bg-red-100 text-red-700">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Gecikmiş
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            {task.due_date ? (
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </span>
            ) : <span />}
            {task.assigned_to && (
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0" title={task.assigned_to}>
                <span className="text-[10px] font-bold text-primary">{task.assigned_to.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function KanbanBoard({ tasks, onStatusChange, onEdit, onDelete, onAdd }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const task = tasks.find(t => t.id === draggableId);
    if (task && task.status !== newStatus) {
      onStatusChange(draggableId, newStatus);
    }
  };

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {COLUMNS.map(col => {
          const colTasks = tasksByStatus(col.id);
          return (
            <div key={col.id} className={`rounded-2xl border-t-4 ${col.color} ${col.bg} border border-border/60 flex flex-col`}>
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="w-5 h-5 rounded-full bg-white/80 border text-xs font-bold flex items-center justify-center text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>
                {col.id === 'open' && (
                  <button onClick={onAdd} className="w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 space-y-2.5 min-h-[200px] transition-colors rounded-b-2xl
                      ${snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/20' : ''}
                    `}
                  >
                    {colTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                    {provided.placeholder}
                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center py-8 text-xs text-muted-foreground/50">
                        Görev yok
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}