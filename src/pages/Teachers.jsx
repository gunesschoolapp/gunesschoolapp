import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, MoreVertical, Pencil, Trash2, Mail, Phone, Globe, CreditCard, AlertCircle, BookOpen, ChevronRight, User } from 'lucide-react';

const defaultTeacher = {
  full_name: '', email: '', phone: '', date_of_birth: '', nationality: '',
  passport_number: '', passport_expiry: '', address: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  branch: 'english', specialization: '', salary_type: 'hourly',
  group_rate: '', individual_rate: '', online_rate: '', trial_rate: '', fixed_salary: '',
  status: 'active', bio: '', start_date: '', notes: ''
};

const branchColors = {
  english: 'bg-blue-100 text-blue-700',
  turkish: 'bg-red-100 text-red-700',
  ielts: 'bg-violet-100 text-violet-700',
  kids: 'bg-amber-100 text-amber-700',
};
const branchLabel = { english: 'English', turkish: 'Turkish', ielts: 'IELTS/TOEFL', kids: 'Kids' };

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function TeacherRow({ teacher, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setOpen(true)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">{teacher.full_name?.charAt(0)}</span>
            </div>
            <div>
              <p className="font-medium text-sm">{teacher.full_name}</p>
              {teacher.specialization && <p className="text-xs text-muted-foreground">{teacher.specialization}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={`text-xs ${branchColors[teacher.branch] || 'bg-gray-100 text-gray-700'}`}>
            {branchLabel[teacher.branch] || teacher.branch}
          </Badge>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{teacher.email || '—'}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{teacher.phone || '—'}</td>
        <td className="px-4 py-3 text-sm">
          <div className="flex gap-3 flex-wrap">
            {teacher.group_rate > 0 && <span className="text-xs">Group: <strong>£{teacher.group_rate}</strong></span>}
            {teacher.individual_rate > 0 && <span className="text-xs">1-on-1: <strong>£{teacher.individual_rate}</strong></span>}
            {teacher.online_rate > 0 && <span className="text-xs">Online: <strong>£{teacher.online_rate}</strong></span>}
            {teacher.trial_rate > 0 && <span className="text-xs">Trial: <strong>£{teacher.trial_rate}</strong></span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {teacher.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={e => { e.stopPropagation(); setOpen(true); }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={e => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(teacher); }}>
                  <Pencil className="w-4 h-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(teacher.id); }}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {/* Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">{teacher.full_name?.charAt(0)}</span>
              </div>
              <div>
                <DialogTitle className="text-xl">{teacher.full_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${branchColors[teacher.branch] || 'bg-gray-100 text-gray-700'}`}>
                    {branchLabel[teacher.branch] || teacher.branch}
                  </Badge>
                  <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {teacher.status === 'active' ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="contact">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="rates">Rates</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="mt-4 space-y-1">
              <InfoRow icon={Mail} label="Email" value={teacher.email} />
              <InfoRow icon={Phone} label="Phone" value={teacher.phone} />
              <InfoRow icon={Globe} label="Address" value={teacher.address} />
              <InfoRow icon={BookOpen} label="Specialization" value={teacher.specialization} />
              {teacher.bio && (
                <div className="pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm">{teacher.bio}</p>
                </div>
              )}
              {teacher.notes && (
                <div className="pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{teacher.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="personal" className="mt-4 space-y-1">
              <InfoRow icon={User} label="Date of Birth" value={teacher.date_of_birth} />
              <InfoRow icon={Globe} label="Nationality" value={teacher.nationality} />
              <InfoRow icon={CreditCard} label="Passport/ID Number" value={teacher.passport_number} />
              <InfoRow icon={CreditCard} label="Passport Expiry" value={teacher.passport_expiry} />
              <InfoRow icon={BookOpen} label="Start Date" value={teacher.start_date} />
            </TabsContent>

            <TabsContent value="rates" className="mt-4">
              {teacher.fixed_salary && (
                <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Fixed Monthly Salary</p>
                  <p className="text-2xl font-bold text-primary">£{teacher.fixed_salary}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Group Lesson', value: teacher.group_rate },
                  { label: '1-on-1 Lesson', value: teacher.individual_rate },
                  { label: 'Online Lesson', value: teacher.online_rate },
                  { label: 'Trial Lesson', value: teacher.trial_rate },
                ].map(item => (
                  <Card key={item.label} className="p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {item.value > 0 ? `£${item.value}` : '—'}
                    </p>
                    {item.value > 0 && <p className="text-xs text-muted-foreground">/hour</p>}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="mt-4 space-y-1">
              <InfoRow icon={User} label="Emergency Contact Name" value={teacher.emergency_contact_name} />
              <InfoRow icon={Phone} label="Phone" value={teacher.emergency_contact_phone} />
              <InfoRow icon={AlertCircle} label="Relationship" value={teacher.emergency_contact_relation} />
              {!teacher.emergency_contact_name && (
                <p className="text-sm text-muted-foreground py-4 text-center">No emergency contact added.</p>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={() => { setOpen(false); onEdit(teacher); }}>
              <Pencil className="w-4 h-4 mr-2" />Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function F({ label, children, col = 1 }) {
  return (
    <div className={col === 2 ? 'col-span-2' : ''}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function Teachers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultTeacher);
  const [formTab, setFormTab] = useState('basic');

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list('-created_date')
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(defaultTeacher); setFormTab('basic'); };

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Teacher.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); closeForm(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Teacher.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); closeForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Teacher.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] })
  });

  const openNew = () => { setEditing(null); setForm(defaultTeacher); setShowForm(true); };
  const openEdit = (teacher) => { setEditing(teacher); setForm({ ...teacher }); setShowForm(true); };

  const handleSubmit = async () => {
    const payload = {
      ...form,
      group_rate: Number(form.group_rate) || 0,
      individual_rate: Number(form.individual_rate) || 0,
      online_rate: Number(form.online_rate) || 0,
      trial_rate: Number(form.trial_rate) || 0,
      fixed_salary: Number(form.fixed_salary) || 0,
    };
    
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      // For new teachers, create and send invitation
      const savedTeacher = await createMutation.mutateAsync(payload);
      
      if (form.email && savedTeacher?.id) {
        try {
          // Create or update UserSetup record
          const existingSetup = await base44.entities.UserSetup.filter({ email: form.email });
          let setupId;
          if (existingSetup.length === 0) {
            const created = await base44.entities.UserSetup.create({
              email: form.email,
              full_name: form.full_name,
              invited_role: 'teacher',
              invite_type: 'staff',
              status: 'pending',
              setup_completed: false,
              invited_at: new Date().toISOString(),
            });
            setupId = created.id;
          } else {
            await base44.entities.UserSetup.update(existingSetup[0].id, {
              full_name: form.full_name,
              invited_role: 'teacher',
              status: 'pending',
              setup_completed: false,
              invited_at: new Date().toISOString(),
            });
            setupId = existingSetup[0].id;
          }
          
          // Send invitation email
          await base44.functions.invoke('sendInviteEmail', {
            email: form.email,
            full_name: form.full_name,
            invited_role: 'teacher',
            setup_id: setupId,
          });
        } catch (error) {
          console.warn('Failed to send invitation email:', error);
          // Don't fail the teacher creation if email sending fails
        }
      }
    }
  };

  const filtered = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} teachers</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Teacher</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No teachers yet</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Branch</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Rates</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(teacher => (
                  <TeacherRow
                    key={teacher.id}
                    teacher={teacher}
                    onEdit={openEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Teacher' : 'New Teacher'}</DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="rates">Rates</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="Full Name *" col={2}><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></F>
                <F label="Email"><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
                <F label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
                <F label="Branch">
                  <Select value={form.branch} onValueChange={v => setForm({ ...form, branch: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="turkish">Turkish</SelectItem>
                      <SelectItem value="ielts">IELTS/TOEFL</SelectItem>
                      <SelectItem value="kids">Kids</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="Status">
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
                <F label="Specialization" col={2}><Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} /></F>
                <F label="Bio" col={2}><Input value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></F>
                <F label="Notes" col={2}><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></F>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></F>
                <F label="Nationality"><Input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} /></F>
                <F label="Passport/ID Number"><Input value={form.passport_number} onChange={e => setForm({ ...form, passport_number: e.target.value })} /></F>
                <F label="Passport Expiry"><Input type="date" value={form.passport_expiry} onChange={e => setForm({ ...form, passport_expiry: e.target.value })} /></F>
                <F label="Start Date"><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></F>
                <F label="Address" col={2}><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></F>
              </div>
            </TabsContent>

            <TabsContent value="rates" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="Fixed Monthly Salary (£)" col={2}><Input type="number" value={form.fixed_salary} onChange={e => setForm({ ...form, fixed_salary: e.target.value })} placeholder="Monthly salary" /></F>
                <F label="Group Lesson (£/hr)"><Input type="number" value={form.group_rate} onChange={e => setForm({ ...form, group_rate: e.target.value })} /></F>
                <F label="1-on-1 Lesson (£/hr)"><Input type="number" value={form.individual_rate} onChange={e => setForm({ ...form, individual_rate: e.target.value })} /></F>
                <F label="Online Lesson (£/hr)"><Input type="number" value={form.online_rate} onChange={e => setForm({ ...form, online_rate: e.target.value })} /></F>
                <F label="Trial Lesson (£)"><Input type="number" value={form.trial_rate} onChange={e => setForm({ ...form, trial_rate: e.target.value })} /></F>
                <F label="Salary Type" col={2}>
                  <Select value={form.salary_type} onValueChange={v => setForm({ ...form, salary_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="per_lesson">Per Lesson</SelectItem>
                    </SelectContent>
                  </Select>
                </F>
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <F label="Emergency Contact Name" col={2}><Input value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></F>
                <F label="Phone"><Input value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></F>
                <F label="Relationship"><Input value={form.emergency_contact_relation} placeholder="Spouse, sibling, parent..." onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} /></F>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.full_name}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}