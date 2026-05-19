import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, Pencil, Trash2, LayoutGrid, List } from 'lucide-react';
import KanbanBoard from '@/components/tasks/KanbanBoard';

const defaultTask = {
  title: '', description: '', assigned_type: 'person', assigned_to: '', assigned_team_id: '', related_lead_id: '',
  related_student_id: '', due_date: '', priority: 'medium', status: 'open', type: 'other'
};

const priorityConfig = {
  low: { label: 'Low', tr: 'Düşük', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', tr: 'Orta', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', tr: 'Yüksek', color: 'bg-red-100 text-red-700' },
};

const typeConfig = {
  follow_up: { label: 'Follow Up', tr: 'Takip' },
  trial_booking: { label: 'Trial Booking', tr: 'Trial Rezervasyon' },
  payment_chase: { label: 'Payment Chase', tr: 'Ödeme Takibi' },
  attendance_warning: { label: 'Attendance Warning', tr: 'Devamsızlık Uyarısı' },
  other: { label: 'Other', tr: 'Diğer' },
};

export default function Tasks() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [filter, setFilter] = useState('open');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultTask);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });
  const { data: leads = [] } = useQuery({ queryKey: ['leads'], queryFn: () => base44.entities.Lead.list() });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Task.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  });

  const openNew = () => { setEditing(null); setForm(defaultTask); setShowForm(true); };
  const openEdit = (task) => { setEditing(task); setForm({ ...task }); setShowForm(true); };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const toggleDone = (task) => {
    updateMutation.mutate({ id: task.id, data: { ...task, status: task.status === 'done' ? 'open' : 'done' } });
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  // Non-admins only see tasks assigned to them or created by them
  const visibleTasks = isAdmin ? tasks : tasks.filter(t =>
    t.assigned_to === user?.email ||
    t.created_by === user?.email ||
    !t.assigned_to // unassigned tasks visible to all
  );

  const filtered = visibleTasks.filter(task => filter === 'all' ? true : task.status === filter);
  const openCount = visibleTasks.filter(t => t.status === 'open').length;
  const highPriorityOpen = visibleTasks.filter(t => t.status === 'open' && t.priority === 'high').length;

  const isOverdue = (task) => task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} open
            {highPriorityOpen > 0 && <span className="text-red-500 ml-2">· {highPriorityOpen} high priority</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>

      {/* Kanban view */}
      {viewMode === 'kanban' && !isLoading && (
        <KanbanBoard
          tasks={visibleTasks}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onAdd={openNew}
        />
      )}

      {/* List view */}
      {viewMode === 'list' && <>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['open', 'in_progress', 'done', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
          >
            {s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : s === 'done' ? 'Done' : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No tasks found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const overdue = isOverdue(task);
            const pc = priorityConfig[task.priority] || priorityConfig.medium;
            return (
              <Card key={task.id} className={`transition-all ${task.status === 'done' ? 'opacity-60' : ''} ${overdue ? 'border-red-200' : ''}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <button onClick={() => toggleDone(task)} className="mt-0.5 flex-shrink-0">
                    {task.status === 'done'
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                      <Badge className={`text-xs ${pc.color}`}>{pc.label}</Badge>
                      {task.type && task.type !== 'other' && (
                        <Badge variant="outline" className="text-xs">{typeConfig[task.type]?.label}</Badge>
                      )}
                      {overdue && <Badge className="text-xs bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>}
                    </div>
                    {task.description && <div className="text-xs text-muted-foreground mt-1">{task.description}</div>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.due_date && <span className={`flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}><Clock className="w-3 h-3" />{task.due_date}</span>}
                      {task.assigned_type === 'person' && task.assigned_to && <span>→ {task.assigned_to}</span>}
                      {task.assigned_type === 'team' && task.assigned_team_id && <span>→ Team</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(task)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => deleteMutation.mutate(task.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </>}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
               <label className="text-sm font-medium mb-1 block">Due Date</label>
               <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-sm font-medium mb-1 block">Assignment Type</label>
                 <Select value={form.assigned_type} onValueChange={v => setForm({ ...form, assigned_type: v, assigned_to: '', assigned_team_id: '' })}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="person">Person</SelectItem>
                     <SelectItem value="team">Team</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               {form.assigned_type === 'person' ? (
                 <div>
                   <label className="text-sm font-medium mb-1 block">Assigned Person</label>
                   <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                     <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value={null}>None</SelectItem>
                       {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
               ) : (
                 <div>
                   <label className="text-sm font-medium mb-1 block">Assigned Team</label>
                   <Input value={form.assigned_team_id} onChange={e => setForm({ ...form, assigned_team_id: e.target.value })} placeholder="Team name" />
                 </div>
               )}
             </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Related Lead</label>
              <Select value={form.related_lead_id} onValueChange={v => setForm({ ...form, related_lead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.title}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}