import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, Pencil, Trash2, Mail, Phone, Users,
  BookOpen, ShoppingBag, PhoneCall, Briefcase, MoreVertical, LayoutGrid, List
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  { id: 'teacher',   label: 'Öğretmen',        icon: BookOpen,    color: 'bg-blue-100 text-blue-700' },
  { id: 'sales',     label: 'Satış',            icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'reception', label: 'Resepsiyon',        icon: PhoneCall,   color: 'bg-violet-100 text-violet-700' },
  { id: 'admin',     label: 'Yönetim',           icon: Briefcase,   color: 'bg-amber-100 text-amber-700' },
  { id: 'other',     label: 'Diğer',             icon: Users,       color: 'bg-gray-100 text-gray-700' },
];

function getRoleInfo(id) {
  return ROLES.find(r => r.id === id) || ROLES[ROLES.length - 1];
}

function RoleBadge({ roleId }) {
  const r = getRoleInfo(roleId);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${r.color}`}>
      <r.icon className="w-3 h-3" />
      {r.label}
    </span>
  );
}

const BRANCH_COLORS = {
  english: 'bg-blue-100 text-blue-700',
  turkish: 'bg-red-100 text-red-700',
  ielts:   'bg-violet-100 text-violet-700',
  kids:    'bg-amber-100 text-amber-700',
};
const BRANCH_LABELS = { english: 'English', turkish: 'Turkish', ielts: 'IELTS/TOEFL', kids: 'Kids', other: 'Diğer' };

// ─── Form ─────────────────────────────────────────────────────────────────────
const EMPTY = {
  full_name: '', email: '', phone: '', address: '',
  date_of_birth: '', nationality: '', passport_number: '', passport_expiry: '',
  roles: ['other'], branch: 'english', specialization: '',
  salary_type: 'fixed', fixed_salary: '', group_rate: '', individual_rate: '',
  online_rate: '', trial_rate: '', start_date: '',
  status: 'active', bio: '', notes: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
};

function PersonnelForm({ person, onClose, onSave }) {
  const [form, setForm] = useState(person ? { ...EMPTY, ...person, roles: person.roles?.length ? person.roles : ['other'] } : EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleRole = (roleId) => {
    const current = form.roles || [];
    const updated = current.includes(roleId) ? current.filter(r => r !== roleId) : [...current, roleId];
    set('roles', updated.length ? updated : ['other']);
  };

  const isTeacher = (form.roles || []).includes('teacher');

  const handleSave = () => {
    const payload = {
      ...form,
      fixed_salary:    Number(form.fixed_salary) || 0,
      group_rate:      Number(form.group_rate) || 0,
      individual_rate: Number(form.individual_rate) || 0,
      online_rate:     Number(form.online_rate) || 0,
      trial_rate:      Number(form.trial_rate) || 0,
    };
    onSave(payload);
  };

  const F = ({ label, children, col = 1 }) => (
    <div className={col === 2 ? 'col-span-2' : ''}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Role selector */}
      <div className="p-4 bg-muted/30 rounded-xl border border-border">
        <p className="text-sm font-semibold mb-3">Görevler (birden fazla seçilebilir)</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(role => {
            const selected = (form.roles || []).includes(role.id);
            return (
              <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                  selected ? `${role.color} border-current` : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/50'
                }`}>
                <role.icon className="w-3.5 h-3.5" />
                {role.label}
                {selected && <span className="ml-0.5">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList className={`grid w-full ${isTeacher ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="basic">Temel</TabsTrigger>
          <TabsTrigger value="personal">Kişisel</TabsTrigger>
          {isTeacher && <TabsTrigger value="rates">Ücretler</TabsTrigger>}
          <TabsTrigger value="emergency">Acil Durum</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Ad Soyad *" col={2}><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} /></F>
            <F label="E-posta"><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></F>
            <F label="Telefon"><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></F>
            {isTeacher && (
              <F label="Branş">
                <Select value={form.branch} onValueChange={v => set('branch', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BRANCH_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            )}
            <F label="Durum">
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </F>
            {isTeacher && <F label="Uzmanlık" col={2}><Input value={form.specialization} onChange={e => set('specialization', e.target.value)} /></F>}
            <F label="Adres" col={2}><Input value={form.address} onChange={e => set('address', e.target.value)} /></F>
            <F label="Notlar" col={2}><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></F>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Doğum Tarihi"><Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></F>
            <F label="Uyruk"><Input value={form.nationality} onChange={e => set('nationality', e.target.value)} /></F>
            <F label="Pasaport / TC No"><Input value={form.passport_number} onChange={e => set('passport_number', e.target.value)} /></F>
            <F label="Pasaport Geçerlilik"><Input type="date" value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} /></F>
            <F label="İşe Başlama"><Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></F>
          </div>
        </TabsContent>

        {isTeacher && (
          <TabsContent value="rates" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="Aylık Sabit Maaş £" col={2}><Input type="number" value={form.fixed_salary} onChange={e => set('fixed_salary', e.target.value)} /></F>
              <F label="Grup Dersi £/saat"><Input type="number" value={form.group_rate} onChange={e => set('group_rate', e.target.value)} /></F>
              <F label="Birebir £/saat"><Input type="number" value={form.individual_rate} onChange={e => set('individual_rate', e.target.value)} /></F>
              <F label="Online £/saat"><Input type="number" value={form.online_rate} onChange={e => set('online_rate', e.target.value)} /></F>
              <F label="Trial Ders £"><Input type="number" value={form.trial_rate} onChange={e => set('trial_rate', e.target.value)} /></F>
            </div>
          </TabsContent>
        )}

        <TabsContent value="emergency" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Acil Durum Kişisi" col={2}><Input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></F>
            <F label="Telefon"><Input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></F>
            <F label="Yakınlık"><Input value={form.emergency_contact_relation} placeholder="eş, kardeş..." onChange={e => set('emergency_contact_relation', e.target.value)} /></F>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="outline" onClick={onClose}>İptal</Button>
        <Button onClick={handleSave} disabled={!form.full_name.trim()}>Kaydet</Button>
      </div>
    </div>
  );
}

// ─── Person Card ──────────────────────────────────────────────────────────────
function PersonCard({ person, onEdit, onDelete, isLegacy }) {
  const roles = person._roles || person.roles || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-primary">{person.full_name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-sm">{person.full_name}</p>
              <Badge variant={person.status === 'active' || !person.status ? 'default' : 'secondary'} className="text-xs mt-0.5">
                {person.status === 'inactive' ? 'Pasif' : 'Aktif'}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(person)}><Pencil className="w-4 h-4 mr-2" />Düzenle</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(person.id, isLegacy)}>
                <Trash2 className="w-4 h-4 mr-2" />Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Roles */}
        <div className="flex flex-wrap gap-1 mb-3">
          {roles.map(r => <RoleBadge key={r} roleId={r} />)}
        </div>

        {/* Branch badge for teachers */}
        {person.branch && (
          <span className={`inline-flex text-xs px-2 py-0.5 rounded-md font-medium mb-2 ${BRANCH_COLORS[person.branch] || 'bg-gray-100 text-gray-700'}`}>
            {BRANCH_LABELS[person.branch] || person.branch}
          </span>
        )}

        {/* Contact */}
        <div className="space-y-1 mt-1">
          {person.email && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{person.email}</p>}
          {person.phone && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{person.phone}</p>}
          {person.specialization && <p className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="w-3 h-3" />{person.specialization}</p>}
        </div>

        {/* Salary info */}
        {person.fixed_salary > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            Maaş: <strong className="text-foreground">£{person.fixed_salary}</strong>/ay
          </div>
        )}

        {/* Legacy warning */}
        {isLegacy && (
          <p className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">Eski kayıt — düzenlemek için Personel paneline taşıyın</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Personnel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // New unified Staff entity
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list('-created_date'),
  });

  // Legacy: Teacher entity
  const { data: teacherList = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list('-created_date'),
  });

  // Legacy: SalesStaff entity
  const { data: salesList = [], isLoading: loadingSales } = useQuery({
    queryKey: ['salesStaff'],
    queryFn: () => base44.entities.SalesStaff.list('-created_date'),
  });

  const isLoading = loadingStaff || loadingTeachers || loadingSales;

  // Combine: tag legacy items with their source
  const allPersonnel = useMemo(() => {
    const staff = staffList.map(p => ({ ...p, _source: 'staff', _roles: p.roles?.length ? p.roles : ['other'] }));
    const teachers = teacherList.map(p => ({ ...p, _source: 'teacher', _roles: ['teacher'] }));
    const sales = salesList.map(p => ({ ...p, _source: 'sales', _roles: ['sales'] }));
    return [...staff, ...teachers, ...sales];
  }, [staffList, teacherList, salesList]);

  const createMutation = useMutation({
    mutationFn: d => base44.entities.Staff.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, source }) => {
      if (source === 'teacher') return base44.entities.Teacher.delete(id);
      if (source === 'sales') return base44.entities.SalesStaff.delete(id);
      return base44.entities.Staff.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['teachers'] });
      qc.invalidateQueries({ queryKey: ['salesStaff'] });
    },
  });

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setShowForm(true); };

  const handleSave = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const handleDelete = (id, source) => deleteMutation.mutate({ id, source });

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => `${p._source}-${p.id}`)));
    }
  };

  const handleBulkDelete = () => {
    if (!confirm(`${selectedIds.size} personel silinecek. Emin misiniz?`)) return;
    filtered.forEach(p => {
      const key = `${p._source}-${p.id}`;
      if (selectedIds.has(key)) {
        handleDelete(p.id, p._source);
      }
    });
    setSelectedIds(new Set());
  };

  const filtered = useMemo(() => {
    return allPersonnel.filter(p => {
      const matchSearch = !search ||
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === 'all' || (p._roles || []).includes(activeTab);
      return matchSearch && matchTab;
    });
  }, [allPersonnel, search, activeTab]);

  const counts = useMemo(() => {
    const c = { all: allPersonnel.length };
    ROLES.forEach(r => { c[r.id] = allPersonnel.filter(p => (p._roles || []).includes(r.id)).length; });
    return c;
  }, [allPersonnel]);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight">Personeller</h1>
          <p className="text-sm text-muted-foreground">{allPersonnel.length} kişi kayıtlı</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Ekle</Button>
      </div>

      {/* Search & View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="İsim veya e-posta ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex gap-1 overflow-x-auto h-auto flex-nowrap bg-muted/50 p-1 w-full">
          <TabsTrigger value="all" className="gap-1 text-xs flex-shrink-0">
            Tümü <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-bold">{counts.all}</span>
          </TabsTrigger>
          {ROLES.map(role => (
            <TabsTrigger key={role.id} value={role.id} className="gap-1 text-xs flex-shrink-0">
              {role.label}
              {counts[role.id] > 0 && <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-bold">{counts[role.id]}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          {selectedIds.size > 0 && (
            <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
              <p className="text-sm font-medium">{selectedIds.size} personel seçildi</p>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />Seçilenleri Sil
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Personel bulunamadı.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Personel Ekle</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(person => (
                <PersonCard
                  key={`${person._source}-${person.id}`}
                  person={person}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  isLegacy={person._source !== 'staff'}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Görev</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(person => {
                    const key = `${person._source}-${person.id}`;
                    const isSelected = selectedIds.has(key);
                    return (
                      <TableRow key={key} className={isSelected ? 'bg-primary/5' : ''}>
                        <TableCell className="w-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(key)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{person.full_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{person.email || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{person.phone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(person._roles || []).map(r => <RoleBadge key={r} roleId={r} />)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={person.status === 'active' || !person.status ? 'default' : 'secondary'} className="text-xs">
                            {person.status === 'inactive' ? 'Pasif' : 'Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-7 h-7">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(person)}><Pencil className="w-4 h-4 mr-2" />Düzenle</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(person.id, person._source)}>
                                <Trash2 className="w-4 h-4 mr-2" />Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}</DialogTitle>
          </DialogHeader>
          <PersonnelForm
            person={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}