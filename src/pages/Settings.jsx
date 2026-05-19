import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, Mail, Check, Plus, Pencil, Trash2, Star, FileText, Award, Plug, Shield, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import InvoiceTemplateSettings from './InvoiceTemplateSettings';
import CertificateTemplateSettings from './CertificateTemplateSettings';
import IntegrationShowcase from '@/components/settings/IntegrationShowcase';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useAuth } from '@/lib/AuthContext';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';

// Modules with per-action granularity
const MODULES = [
  { key: 'Dashboard',          label: 'Dashboard',         actions: ['view'] },
  { key: 'Students',           label: 'Students',          actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'Courses',            label: 'Courses',           actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'Schedule',           label: 'Schedule',          actions: ['view', 'create', 'edit'] },
  { key: 'Teachers',           label: 'Teachers',          actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'Tasks',              label: 'Tasks',             actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'InvoiceManagement',  label: 'Invoices',          actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'Finance',            label: 'Finance',           actions: ['view', 'create', 'edit'] },
  { key: 'Accounting',         label: 'Accounting',        actions: ['view', 'create', 'edit'] },
  { key: 'Payroll',            label: 'Payroll',           actions: ['view', 'create', 'edit'] },
  { key: 'Reports',            label: 'Reports',           actions: ['view'] },
  { key: 'Emails',             label: 'Emails',            actions: ['view', 'create'] },
  { key: 'Classrooms',         label: 'Classrooms',        actions: ['view', 'create', 'edit'] },
  { key: 'Classroom',          label: 'Virtual Classroom', actions: ['view'] },
  { key: 'NotificationCenter', label: 'Notifications',     actions: ['view', 'create'] },
  { key: 'Personnel',          label: 'Personnel',         actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'Settings',           label: 'Settings',          actions: ['view', 'edit'] },
];

const ACTION_COLORS = {
  view:   'bg-blue-100 text-blue-700 border-blue-200',
  create: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  edit:   'bg-amber-100 text-amber-700 border-amber-200',
  delete: 'bg-red-100 text-red-700 border-red-200',
};

const makePreset = (modules) => {
  const out = [];
  modules.forEach(({ key, actions }) => actions.forEach(a => out.push(key + ':' + a)));
  return out;
};

const ROLE_PRESETS = {
  admin:        makePreset(MODULES),
  teacher:      makePreset(MODULES.filter(m => ['Dashboard','Courses','Schedule','Classrooms','Classroom','Tasks'].includes(m.key))),
  receptionist: makePreset(MODULES.filter(m => ['Dashboard','Students','Courses','Schedule','Tasks','InvoiceManagement','NotificationCenter','Emails'].includes(m.key))),
  staff:        makePreset(MODULES.filter(m => ['Dashboard','Students','Tasks'].includes(m.key))),
  user:         makePreset(MODULES.filter(m => ['Dashboard','Tasks'].includes(m.key))),
};

// Migrate legacy flat permissions (e.g. 'Students') to new format (e.g. 'Students:view', ...)
function migrateLegacyPermissions(perms) {
  if (!perms || perms.length === 0) return perms || [];
  if (perms[0]?.includes(':')) return perms;
  const out = [];
  perms.forEach(key => {
    const mod = MODULES.find(m => m.key === key);
    if (mod) mod.actions.forEach(a => out.push(key + ':' + a));
  });
  return out;
}

function UserPermissionsPanel({ user, onClose, onSaved }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [role, setRole] = useState(user.role || 'user');
  const _rawPerms = user.permissions;
  const _hasExplicitPerms = Array.isArray(_rawPerms) && _rawPerms.length > 0;
  const _migratedPerms = _hasExplicitPerms ? migrateLegacyPermissions(_rawPerms) : [];
  const [permissions, setPermissions] = useState(
    _migratedPerms.length > 0 ? _migratedPerms : (ROLE_PRESETS[user.role] || makePreset(MODULES))
  );

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Save to User entity
      await base44.entities.User.update(user.id, data);
      // Also sync permissions+role to Staff record if one exists
      try {
        const staffResults = await base44.entities.Staff.filter({ email: user.email });
        if (staffResults?.length > 0) {
          await base44.entities.Staff.update(staffResults[0].id, {
            role: data.role,
            permissions: data.permissions,
          });
        }
      } catch {}
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Saved ✓', duration: 2000 });
      onSaved();
    },
  });

  const hasPerm = (key, action) => permissions.includes(key + ':' + action);

  const toggleAction = (key, action) => {
    const token = key + ':' + action;
    setPermissions(prev => prev.includes(token) ? prev.filter(p => p !== token) : [...prev, token]);
  };

  const toggleAllActions = (key) => {
    const mod = MODULES.find(m => m.key === key);
    const all = mod.actions.map(a => key + ':' + a);
    const allActive = all.every(t => permissions.includes(t));
    if (allActive) {
      setPermissions(prev => prev.filter(p => !all.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...all])]);
    }
  };

  const totalActive = MODULES.reduce((acc, m) => acc + m.actions.filter(a => hasPerm(m.key, a)).length, 0);
  const totalPossible = MODULES.reduce((acc, m) => acc + m.actions.length, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
          {user.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Role</Label>
          <Select value={role} onValueChange={val => { setRole(val); setPermissions(ROLE_PRESETS[val] || []); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="receptionist">Receptionist</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Changing role auto-updates permissions.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Permissions ({totalActive}/{totalPossible})
            </Label>
            <div className="flex gap-1.5">
              <button onClick={() => setPermissions(makePreset(MODULES))} className="text-xs text-primary hover:underline">All</button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setPermissions([])} className="text-xs text-muted-foreground hover:underline">Clear</button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {['view','create','edit','delete'].map(a => (
              <span key={a} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${ACTION_COLORS[a]}`}>{a}</span>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_40px_44px_36px_44px] items-center px-3 py-1.5 bg-muted/50 border-b">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Module</span>
              <span className="text-[10px] text-center text-blue-600 font-bold">V</span>
              <span className="text-[10px] text-center text-emerald-600 font-bold">C</span>
              <span className="text-[10px] text-center text-amber-600 font-bold">E</span>
              <span className="text-[10px] text-center text-red-600 font-bold">D</span>
            </div>
            {MODULES.map((mod, i) => {
              const rowActive = mod.actions.every(a => hasPerm(mod.key, a));
              const rowPartial = !rowActive && mod.actions.some(a => hasPerm(mod.key, a));
              return (
                <div key={mod.key} className={`grid grid-cols-[1fr_40px_44px_36px_44px] items-center px-3 py-2.5 transition-colors ${i % 2 === 0 ? 'bg-muted/10' : ''} hover:bg-muted/20`}>
                  <button onClick={() => toggleAllActions(mod.key)} className="flex items-center gap-2 text-left">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      rowActive ? 'bg-primary border-primary' : rowPartial ? 'bg-primary/40 border-primary/60' : 'border-border'
                    }`}>
                      {(rowActive || rowPartial) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm font-medium">{mod.label}</span>
                  </button>
                  {['view','create','edit','delete'].map(action => {
                    const available = mod.actions.includes(action);
                    const active = available && hasPerm(mod.key, action);
                    return (
                      <div key={action} className="flex justify-center">
                        {available ? (
                          <button
                            onClick={() => toggleAction(mod.key, action)}
                            className={`w-6 h-6 rounded transition-all border-2 flex items-center justify-center ${
                              active ? ACTION_COLORS[action] : 'border-border hover:border-muted-foreground/40'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                          </button>
                        ) : (
                          <div className="w-6 h-6 flex items-center justify-center">
                            <span className="text-muted-foreground/20 text-xs">—</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">V=View · C=Create · E=Edit · D=Delete · Click module name to toggle all</p>
        </div>
      </div>

      <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => updateMutation.mutate({ role, permissions })} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function UserPermissionsTab() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users-perms'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-16rem)] overflow-hidden border rounded-xl">
      <div className="w-72 flex-shrink-0 border-r flex flex-col">
        <div className="p-3 border-b">
          <Input className="h-8 text-sm" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {filtered.map(u => (
            <div key={u.id} onClick={() => setSelected(u)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected?.id === u.id ? 'bg-primary/10' : 'hover:bg-muted/40'}`}>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {u.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground truncate">{u.role}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">No users found</p>}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <UserPermissionsPanel key={selected.id} user={selected} onClose={() => setSelected(null)} onSaved={() => setSelected(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Shield className="w-16 h-16 opacity-20" />
            <p className="font-medium">Select a user</p>
            <p className="text-sm">Click a user to manage their role and granular permissions</p>
          </div>
        )}
      </div>
    </div>
  );
}

const emptyAccount = {
  name: '', email: '', from_name: '',
  smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', use_ssl: false,
  imap_host: '', imap_port: 993, imap_ssl: true,
  is_default: false, status: 'active'
};

function UserPasswordDialog({ user, open, onOpenChange, onSave }) {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSave = async () => {
    if (!newPassword || !confirmPassword) { setError('Please enter a password'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    onSave(newPassword);
    setNewPassword(''); setConfirmPassword(''); setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user?.full_name} - Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">New Password</Label>
            <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Confirm Password</Label>
            <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Change Password</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmailAccountsTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyAccount);
  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: () => base44.entities.EmailAccount.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.EmailAccount.update(editing.id, data)
      : base44.entities.EmailAccount.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-accounts'] }); setOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailAccount.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-accounts'] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      for (const acc of accounts) {
        if (acc.is_default) await base44.entities.EmailAccount.update(acc.id, { is_default: false });
      }
      await base44.entities.EmailAccount.update(id, { is_default: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-accounts'] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyAccount); setOpen(true); };
  const openEdit = (acc) => { setEditing(acc); setForm({ ...acc }); setOpen(true); };

  const F = ({ label, children, half }) => (
    <div className={half ? '' : 'col-span-2'}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">SMTP/IMAP accounts for sending and receiving emails</p>
        <Button size="sm" onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Add Account</Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No email accounts added yet.
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.id} className={`flex items-center justify-between p-3 rounded-xl border bg-card ${acc.is_default ? 'border-primary/40' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{acc.name}</span>
                    {acc.is_default && <Badge className="bg-primary/10 text-primary border-0 text-xs">Default</Badge>}
                    {acc.imap_host && <Badge variant="outline" className="text-xs">IMAP ✓</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{acc.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!acc.is_default && (
                  <Button variant="ghost" size="sm" onClick={() => setDefaultMutation.mutate(acc.id)} className="text-xs gap-1 hidden sm:flex">
                    <Star className="w-3 h-3" />Default
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(acc)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => deleteMutation.mutate(acc.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'Add Email Account'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <F label="Account Name *"><Input placeholder="e.g. School General" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
            <F label="Sender Name" half><Input placeholder="School Name" value={form.from_name} onChange={e => setForm({ ...form, from_name: e.target.value })} /></F>
            <F label="Email Address *"><Input type="email" placeholder="info@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>

            <div className="col-span-2 pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SMTP (Sending)</p>
            </div>
            <div><Label className="text-xs">SMTP Host *</Label><div className="mt-1"><Input placeholder="mail.example.com" value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} /></div></div>
            <div><Label className="text-xs">Port</Label><div className="mt-1"><Input type="number" placeholder="587" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })} /></div></div>
            <div><Label className="text-xs">Username *</Label><div className="mt-1"><Input placeholder="info@example.com" value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })} /></div></div>
            <div><Label className="text-xs">Password *</Label><div className="mt-1"><Input type="password" placeholder="••••••••" value={form.smtp_pass} onChange={e => setForm({ ...form, smtp_pass: e.target.value })} /></div></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.use_ssl} onCheckedChange={v => setForm({ ...form, use_ssl: v })} />
              <Label className="text-xs">SSL/TLS (port 465)</Label>
            </div>

            <div className="col-span-2 pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">IMAP (Inbox — optional)</p>
            </div>
            <div><Label className="text-xs">IMAP Host</Label><div className="mt-1"><Input placeholder="imap.example.com" value={form.imap_host || ''} onChange={e => setForm({ ...form, imap_host: e.target.value })} /></div></div>
            <div><Label className="text-xs">IMAP Port</Label><div className="mt-1"><Input type="number" placeholder="993" value={form.imap_port || 993} onChange={e => setForm({ ...form, imap_port: Number(e.target.value) })} /></div></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.imap_ssl !== false} onCheckedChange={v => setForm({ ...form, imap_ssl: v })} />
              <Label className="text-xs">IMAP SSL</Label>
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <Switch checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} />
              <Label className="text-xs">Use as default account</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.email || !form.smtp_host || !form.smtp_user || !form.smtp_pass}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  const { user: currentUserFromHook } = useCurrentUser();
  const { user: authUser } = useAuth();
  const currentUser = currentUserFromHook || authUser;
  const queryClient = useQueryClient();
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('staff');
  const [emailError, setEmailError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await base44.asServiceRole.entities.User.list('-created_date', 200);
      } catch {
        return await base44.entities.User.list('-created_date', 200);
      }
    }
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites'],
    queryFn: () => base44.entities.PendingInvite.list('-invited_at'),
  });



  const isAdmin = currentUser?.role === 'admin';

  const updateUserPasswordMutation = useMutation({
    mutationFn: ({ userId, password }) => base44.entities.User.update(userId, { temp_password: password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPasswordDialogOpen(false);
      setSelectedUserForPassword(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      try {
        await base44.entities.User.delete(id);
      } catch {
        await base44.asServiceRole.entities.User.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-setups'] });
    },
  });

  const [isInviting, setIsInviting] = useState(false);

  const handleAddMember = async () => {
    if (!newMemberEmail || !newMemberName) { setEmailError('All fields are required'); return; }
    const emailLower = newMemberEmail.toLowerCase().trim();
    if (users.some(u => u.email?.toLowerCase() === emailLower)) { setEmailError('This email is already registered'); return; }
    setEmailError('');
    setIsInviting(true);
    try {
      // Invite via platform (sends the invite email)
      const platformRole = newMemberRole === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(emailLower, platformRole);

      // Track the invite locally so it shows in the pending list
      await base44.entities.PendingInvite.create({
        full_name: newMemberName, email: emailLower, role: newMemberRole, invited_at: new Date().toISOString(),
      });

      setNewMemberName(''); setNewMemberEmail(''); setNewMemberRole('staff');
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    } catch (error) {
      setEmailError(error.message || 'Failed to send invite. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const registeredEmails = new Set(users.map(u => u.email?.toLowerCase()));
  const filteredPending = pendingInvites.filter(p => !registeredEmails.has(p.email?.toLowerCase()));

  const filteredMembers = [
    ...users.filter(u => {
      const s = searchTerm.toLowerCase();
      return (u.email || '').toLowerCase().includes(s) || (u.full_name || '').toLowerCase().includes(s);
    }).map(u => ({ type: 'active', data: u })),
    ...filteredPending.filter(p => {
      const s = searchTerm.toLowerCase();
      return (p.email || '').toLowerCase().includes(s) || (p.full_name || '').toLowerCase().includes(s);
    }).map(p => ({ type: 'pending', data: p }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Users, roles and system settings</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto gap-1 p-1 whitespace-nowrap min-w-full">
            <TabsTrigger value="users" className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0"><Users className="w-3.5 h-3.5" />Users</TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0"><Shield className="w-3.5 h-3.5" />Permissions</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0"><Plug className="w-3.5 h-3.5" />Integrations</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0"><Mail className="w-3.5 h-3.5" />Email</TabsTrigger>
            <TabsTrigger value="invoice" className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0"><FileText className="w-3.5 h-3.5" />Invoices</TabsTrigger>
            <TabsTrigger value="cert_templates" className="gap-1.5 text-xs whitespace-nowrap flex-shrink-0"><Award className="w-3.5 h-3.5" />Certificates</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="mt-4 space-y-4">
          {isAdmin && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4 text-primary" />Add New User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">An invite email will be sent. Once they accept and log in, they'll appear as an active user and you can set their permissions.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Full Name *</Label>
                    <Input placeholder="John Doe" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Email *</Label>
                    <Input type="email" placeholder="john@example.com" value={newMemberEmail} onChange={e => { setNewMemberEmail(e.target.value); setEmailError(''); }} className={emailError ? 'border-destructive' : ''} />
                    {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Role *</Label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddMember} disabled={!newMemberEmail || !newMemberName || isInviting} className="w-full gap-2">
                      {isInviting ? 'Sending...' : inviteSent ? <><Check className="w-4 h-4" />Invite Sent!</> : <><Plus className="w-4 h-4" />Send Invite</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />All Users ({filteredMembers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <div className="space-y-3">
                {filteredMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">No users found</p>
                ) : (
                  filteredMembers.map(member => {
                    const data = member.data;
                    const isSelf = data.id === currentUser?.id;
                    const isPending = member.type === 'pending';
                    return (
                      <div key={data.id} className={`p-4 rounded-lg border bg-card flex items-start justify-between gap-3 ${isPending ? 'opacity-70 border-dashed' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate">{data.full_name || data.email}</p>
                            {isPending
                              ? <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Invite Pending</span>
                              : <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Active" />}
                            {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{data.email}</p>
                          {!isPending && (!data.permissions || data.permissions.length === 0) && data.role === 'admin' && (
                            <p className="text-xs text-emerald-600 font-medium">Full Access (Admin)</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isPending && isAdmin && (
                            <>
                              <Badge variant="outline" className="text-xs">{data.role}</Badge>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={async () => {
                                await base44.entities.PendingInvite.delete(data.id);
                                queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
                              }}><Trash2 className="w-3 h-3" /></Button>
                            </>
                          )}
                          {!isPending && !isSelf && isAdmin && (
                            <>
                              <Select value={data.role || 'user'} onValueChange={val => updateRoleMutation.mutate({ id: data.id, role: val })}>
                                <SelectTrigger className={`h-7 text-xs w-32 border ${getRoleBadgeColor(data.role)}`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="teacher">Teacher</SelectItem>
                                  <SelectItem value="receptionist">Receptionist</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setSelectedUserForPassword(data); setPasswordDialogOpen(true); }}>🔑 Password</Button>
                            </>
                          )}
                          {isSelf && (
                            <Badge className={`text-xs border ${getRoleBadgeColor(data.role)}`}>{getRoleLabel(data.role)}</Badge>
                          )}
                          {!isPending && !isSelf && isAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={async () => {
                              if (!window.confirm(`Remove ${data.full_name || data.email}?`)) return;
                              deleteUserMutation.mutate(data.id);
                            }}><Trash2 className="w-3 h-3" /></Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <UserPermissionsTab />
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <IntegrationShowcase />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <Card><CardContent className="pt-5"><EmailAccountsTab /></CardContent></Card>
        </TabsContent>

        <TabsContent value="invoice" className="mt-4">
          <Card><CardContent className="pt-5"><InvoiceTemplateSettings /></CardContent></Card>
        </TabsContent>

        <TabsContent value="cert_templates" className="mt-4">
          <Card><CardContent className="pt-5"><CertificateTemplateSettings /></CardContent></Card>
        </TabsContent>
      </Tabs>

      {selectedUserForPassword && (
        <UserPasswordDialog
          user={selectedUserForPassword}
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          onSave={(password) => updateUserPasswordMutation.mutate({ userId: selectedUserForPassword.id, password })}
        />
      )}
    </div>
  );
}