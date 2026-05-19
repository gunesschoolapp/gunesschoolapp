import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, Search, ChevronRight, Check, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';

const PAGES = [
  { key: 'Dashboard',          label: 'Dashboard',        ops: ['view'] },
  { key: 'Students',           label: 'Öğrenciler',       ops: ['view', 'create', 'edit', 'delete'] },
  { key: 'Courses',            label: 'Kurslar',          ops: ['view', 'create', 'edit', 'delete'] },
  { key: 'Schedule',           label: 'Ders Takvimi',     ops: ['view', 'create', 'edit'] },
  { key: 'Teachers',           label: 'Öğretmenler',      ops: ['view', 'create', 'edit', 'delete'] },
  { key: 'Tasks',              label: 'Görevler',         ops: ['view', 'create', 'edit', 'delete'] },
  { key: 'InvoiceManagement',  label: 'Faturalar',        ops: ['view', 'create', 'edit', 'delete'] },
  { key: 'Finance',            label: 'Finans',           ops: ['view', 'create', 'edit'] },
  { key: 'Accounting',         label: 'Muhasebe',         ops: ['view'] },
  { key: 'Payroll',            label: 'Maaş & Ödemeler',  ops: ['view', 'create', 'edit'] },
  { key: 'Reports',            label: 'Raporlar',         ops: ['view'] },
  { key: 'Emails',             label: 'E-postalar',       ops: ['view', 'create'] },
  { key: 'Classrooms',         label: 'Sınıflar',         ops: ['view', 'create', 'edit'] },
  { key: 'Classroom',          label: 'Sanal Sınıf',      ops: ['view'] },
  { key: 'NotificationCenter', label: 'Bildirim Merkezi', ops: ['view', 'create'] },
  { key: 'Personnel',          label: 'Tüm Personel',     ops: ['view', 'create', 'edit', 'delete'] },
  { key: 'Settings',           label: 'Ayarlar',          ops: ['view', 'edit'] },
];

const OP_LABELS = { view: 'Görüntüle', create: 'Ekle', edit: 'Düzenle', delete: 'Sil' };

const makePreset = (pages, ops = {}) => {
  const result = [];
  pages.forEach(key => {
    const page = PAGES.find(p => p.key === key);
    if (!page) return;
    page.ops.forEach(op => {
      const allowed = ops[key] ? ops[key].includes(op) : op === 'view';
      if (allowed) result.push(key + ':' + op);
    });
  });
  return result;
};

const ROLE_PRESETS = {
  teacher:      makePreset(['Dashboard', 'Courses', 'Schedule', 'Classrooms', 'Classroom', 'Tasks'],
                  { Tasks: ['view', 'create', 'edit'], Courses: ['view'], Schedule: ['view', 'edit'] }),
  receptionist: makePreset(['Dashboard', 'Students', 'Courses', 'Schedule', 'Tasks', 'NotificationCenter'],
                  { Students: ['view', 'create', 'edit'], Tasks: ['view', 'create', 'edit'] }),
  staff:        makePreset(['Dashboard', 'Students', 'Tasks'],
                  { Students: ['view'], Tasks: ['view', 'create', 'edit'] }),
  admin:        PAGES.flatMap(p => p.ops.map(op => p.key + ':' + op)),
  team_admin:   PAGES.flatMap(p => p.ops.map(op => p.key + ':' + op)),
  user:         makePreset(['Dashboard', 'Tasks'], { Tasks: ['view', 'create'] }),
};

// Migrate old format (plain page keys) to new format (page:op)
function migratePermissions(perms) {
  if (!perms || perms.length === 0) return [];
  return perms.flatMap(p => {
    if (p.includes(':')) return [p];
    const page = PAGES.find(pg => pg.key === p);
    return page ? [p + ':view'] : [];
  });
}

const opColorActive = { view: 'bg-blue-500 text-white border-blue-500', create: 'bg-green-500 text-white border-green-500', edit: 'bg-amber-500 text-white border-amber-500', delete: 'bg-red-500 text-white border-red-500' };
const opColorInactive = { view: 'border-blue-200 text-blue-400 hover:border-blue-400', create: 'border-green-200 text-green-400 hover:border-green-400', edit: 'border-amber-200 text-amber-400 hover:border-amber-400', delete: 'border-red-200 text-red-400 hover:border-red-400' };

function PermissionPanel({ person, onClose }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [role, setRole] = useState(person.role || 'staff');
  const [permissions, setPermissions] = useState(migratePermissions(person.permissions || []));

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.update(person.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel-mgmt'] });
      toast({ title: 'Kaydedildi ✓' });
      onClose();
    },
  });

  const sendResetMutation = useMutation({
    mutationFn: () => base44.functions.invoke('personnelLogin', { email: person.email, action: 'forgot_password' }),
    onSuccess: () => toast({ title: 'Şifre sıfırlama linki gönderildi ✓' }),
  });

  const toggleOp = (pageKey, op) => {
    const token = pageKey + ':' + op;
    setPermissions(prev => prev.includes(token) ? prev.filter(p => p !== token) : [...prev, token]);
  };

  const togglePage = (pageKey) => {
    const page = PAGES.find(p => p.key === pageKey);
    const allTokens = page.ops.map(op => pageKey + ':' + op);
    const hasAll = allTokens.every(t => permissions.includes(t));
    if (hasAll) {
      setPermissions(prev => prev.filter(p => !allTokens.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...allTokens])]);
    }
  };

  const applyPreset = (presetRole) => {
    setPermissions(ROLE_PRESETS[presetRole] || []);
  };

  const totalGranted = permissions.length;
  const totalPossible = PAGES.flatMap(p => p.ops).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
          {person.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{person.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{person.email}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Role */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Rol</Label>
          <Select value={role} onValueChange={val => { setRole(val); applyPreset(val); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="team_admin">Ekip Yöneticisi</SelectItem>
              <SelectItem value="teacher">Öğretmen</SelectItem>
              <SelectItem value="receptionist">Resepsiyon</SelectItem>
              <SelectItem value="staff">Personel</SelectItem>
              <SelectItem value="user">Kullanıcı</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Rol değiştirince sayfa izinleri otomatik güncellenir.</p>
        </div>

        {/* Page Permissions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sayfa & İşlem İzinleri
              <span className="ml-2 font-normal text-primary">({totalGranted}/{totalPossible})</span>
            </Label>
            <div className="flex gap-1.5">
              <button onClick={() => setPermissions(PAGES.flatMap(p => p.ops.map(op => p.key + ':' + op)))} className="text-xs text-primary hover:underline">Tümünü Seç</button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setPermissions([])} className="text-xs text-muted-foreground hover:underline">Temizle</button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-3 mb-3 flex-wrap">
            {Object.entries(OP_LABELS).map(([op, label]) => (
              <div key={op} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-sm ${opColorActive[op].split(' ')[0]}`} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden divide-y">
            {PAGES.map((page) => {
              const pageTokens = page.ops.map(op => page.key + ':' + op);
              const activeCount = pageTokens.filter(t => permissions.includes(t)).length;
              const hasAll = activeCount === pageTokens.length;
              const hasSome = activeCount > 0 && !hasAll;

              return (
                <div key={page.key} className={`px-3 py-2.5 ${activeCount > 0 ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => togglePage(page.key)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        hasAll ? 'bg-primary border-primary' :
                        hasSome ? 'bg-primary/40 border-primary' : 'border-border'
                      }`}
                    >
                      {activeCount > 0 && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className="text-sm font-medium">{page.label}</span>
                    {activeCount > 0 && (
                      <span className="text-[10px] text-primary ml-auto">{activeCount}/{pageTokens.length}</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap pl-6">
                    {page.ops.map(op => {
                      const token = page.key + ':' + op;
                      const active = permissions.includes(token);
                      return (
                        <button
                          key={op}
                          onClick={() => toggleOp(page.key, op)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-all ${active ? opColorActive[op] : opColorInactive[op]}`}
                        >
                          {OP_LABELS[op]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reset Link */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            onClick={() => sendResetMutation.mutate()}
            disabled={sendResetMutation.isPending}
          >
            <Lock className="w-3.5 h-3.5" />
            {sendResetMutation.isPending ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>İptal</Button>
        <Button size="sm" onClick={() => updateMutation.mutate({ roles: [role], role, permissions })} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}

export default function PersonnelManagement() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: personnel = [] } = useQuery({
    queryKey: ['personnel-mgmt'],
    queryFn: () => base44.entities.Staff.list('-created_date'),
  });

  const seenEmails = new Set();
  const uniquePersonnel = personnel
    .map(p => ({
      ...p,
      role: p.role || (p.roles?.includes('admin') ? 'admin' : p.roles?.includes('teacher') ? 'teacher' : p.roles?.includes('reception') ? 'receptionist' : 'staff'),
    }))
    .filter(p => {
      if (!p.email) return true;
      const key = p.email.toLowerCase();
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });

  const filtered = uniquePersonnel.filter(p =>
    !search ||
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* LEFT: Personnel List */}
      <div className="w-80 flex-shrink-0 border-r flex flex-col bg-background">
        <div className="p-4 border-b flex-shrink-0">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Personel İzinleri
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Rol ve sayfa erişimlerini yönetin</p>
        </div>

        <div className="p-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Personel ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {filtered.map(person => {
            const isSelected = selected?.id === person.id;
            const permCount = migratePermissions(person.permissions || []).length;
            return (
              <div
                key={person.id}
                onClick={() => setSelected(person)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {person.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{person.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`text-[10px] px-1.5 py-0 border ${getRoleBadgeColor(person.role)}`}>
                    {getRoleLabel(person.role)}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">{permCount} izin</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? 'Personel bulunamadı' : 'Henüz personel yok'}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Permission Panel */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <PermissionPanel
            key={selected.id}
            person={selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Shield className="w-16 h-16 opacity-20" />
            <p className="font-medium">Bir personel seçin</p>
            <p className="text-sm">Sol listeden personele tıklayarak izinlerini yönetin</p>
          </div>
        )}
      </div>
    </div>
  );
}