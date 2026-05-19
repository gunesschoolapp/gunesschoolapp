import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const ALL_PERMISSIONS = [
  { key: 'canViewDashboard', label: 'Dashboard Görüntüle' },
  { key: 'canManageLeads', label: 'Lead Yönetimi' },
  { key: 'canManageStudents', label: 'Öğrenci Yönetimi' },
  { key: 'canManageCourses', label: 'Kurs Yönetimi' },
  { key: 'canManageTeachers', label: 'Öğretmen Yönetimi' },
  { key: 'canManagePayments', label: 'Ödeme Yönetimi' },
  { key: 'canManageExpenses', label: 'Gider Yönetimi' },
  { key: 'canViewReports', label: 'Raporları Görüntüle' },
  { key: 'canViewFinance', label: 'Finansal Yönetim' },
  { key: 'canManageUsers', label: 'Kullanıcı Yönetimi' },
  { key: 'canManageSettings', label: 'Ayarları Yönet' },
  { key: 'canManageSchedule', label: 'Takvim/Ders Programı' },
  { key: 'canManageCertificates', label: 'Sertifika Yönetimi' },
  { key: 'canManagePersonnel', label: 'Personel Yönetimi' },
];

// System roles that CAN be edited
const SYSTEM_ROLES = [
  {
    id: 'admin',
    role_name: 'admin',
    display_name: 'Administrator',
    description: 'Tüm sisteme tam erişim, tüm işlemleri yönetir',
    is_system: true,
    permissions: ['canViewDashboard', 'canManageLeads', 'canManageStudents', 'canManageCourses', 'canManageTeachers', 'canManagePayments', 'canManageExpenses', 'canViewReports', 'canViewFinance', 'canManageUsers', 'canManageSettings', 'canManageSchedule', 'canManageCertificates', 'canManagePersonnel'],
  },
  {
    id: 'personel',
    role_name: 'personel',
    display_name: 'Personel',
    description: 'Lead, öğrenci, kurs ve ödemeleri yönetir ancak ayarlara erişemez',
    is_system: true,
    permissions: ['canViewDashboard', 'canManageLeads', 'canManageStudents', 'canManageCourses', 'canManagePayments'],
  },
  {
    id: 'teacher',
    role_name: 'teacher',
    display_name: 'Öğretmen',
    description: 'Dashboard ve kendi derslerini yönetebilir',
    is_system: true,
    permissions: ['canViewDashboard', 'canManageSchedule'],
  },
  {
    id: 'student',
    role_name: 'student',
    display_name: 'Öğrenci',
    description: 'Kendi verilerine sınırlı erişim',
    is_system: true,
    permissions: ['canViewDashboard'],
  },
];

export default function RoleManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    role_name: '',
    display_name: '',
    description: '',
    permissions: [],
  });
  const queryClient = useQueryClient();

  const { data: customRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    initialData: [],
  });

  // Combine system roles with custom roles
  const allRoles = [...SYSTEM_ROLES, ...customRoles];

  const updateRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.update(editingRole.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      resetForm();
      setDialogOpen(false);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const resetForm = () => {
    setFormData({
      role_name: '',
      display_name: '',
      description: '',
      permissions: [],
    });
    setEditingRole(null);
  };

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        role_name: role.role_name,
        display_name: role.display_name,
        description: role.description || '',
        permissions: role.permissions || [],
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRole) {
      if (editingRole.is_system) {
        // For system roles, update the in-memory data structure
        const updatedRoles = SYSTEM_ROLES.map(r => 
          r.id === editingRole.id 
            ? { ...r, display_name: formData.display_name, description: formData.description, permissions: formData.permissions }
            : r
        );
        // In a real app, this would persist to database
      }
      updateRoleMutation.mutate(formData);
    }
  };

  const togglePermission = (perm) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Rol Yönetimi</h2>
          <p className="text-muted-foreground mt-1">Sistem rollerini yönetin ve izinleri ayarlayın</p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Rolü Düzenle' : 'Yeni Rol Oluştur'}</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role_name">Rol Adı</Label>
                  <Input
                    id="role_name"
                    placeholder="ör: admin, öğretmen"
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    disabled={editingRole?.is_system}
                  />
                  {editingRole?.is_system && <p className="text-xs text-muted-foreground mt-1">Sistem rolü - değiştirilemez</p>}
                </div>
                <div>
                  <Label htmlFor="display_name">Görüntü Adı</Label>
                  <Input
                    id="display_name"
                    placeholder="ör: Yönetici"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  placeholder="Rol açıklaması"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-3">
                <Label className="block font-semibold">Yetkilendirmeler</Label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-700">Bu rolle ilgili tüm yetkileri seçin. Bu roller tüm kullanıcılar tarafından kullanılacak.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto bg-muted/30 p-3 rounded-lg">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center space-x-2 bg-white p-2 rounded">
                      <Checkbox
                        id={perm.key}
                        checked={formData.permissions.includes(perm.key)}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                      <Label htmlFor={perm.key} className="font-normal cursor-pointer text-xs">
                        {perm.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">
                  {editingRole ? 'Rolü Güncelle' : 'Rol Oluştur'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {allRoles.map((role) => (
          <Card key={role.id} className={role.is_system ? 'border-primary/30 bg-primary/5' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>{role.display_name}</CardTitle>
                    {role.is_system && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-semibold">
                        Sistem Rolü
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1">{role.role_name}</CardDescription>
                  {role.description && <p className="text-sm text-muted-foreground mt-2">{role.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(role)}
                    className="gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    {role.is_system ? 'Ayarla' : 'Düzenle'}
                  </Button>
                  {!role.is_system && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteRoleMutation.mutate(role.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Atanan Yetkilendirmeler ({role.permissions?.length || 0}):</Label>
                {role.permissions && role.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20 font-medium"
                      >
                        ✓ {ALL_PERMISSIONS.find((p) => p.key === perm)?.label || perm}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Hiçbir yetki atanmamış</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}