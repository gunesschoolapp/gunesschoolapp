import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Phone, Plus, Pencil, Trash2, RefreshCw, Eye, EyeOff, Users, Mail, AlertCircle, Check } from 'lucide-react';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { useCurrentUser } from '@/lib/useCurrentUser';

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const emptyForm = { full_name: '', phone: '', pin_plain: '', role: 'staff', user_email: '', is_active: true };

export default function StaffPinManagement() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPin, setShowPin] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(null);
  const [banReason, setBanReason] = useState('');
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff-pins'],
    queryFn: () => base44.entities.StaffPin.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.StaffPin.update(editing.id, data)
      : base44.entities.StaffPin.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-pins'] }); setOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffPin.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-pins'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.StaffPin.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-pins'] }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, is_banned, ban_reason }) => 
      base44.entities.StaffPin.update(id, { is_banned, ban_reason: is_banned ? ban_reason : '' }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['staff-pins'] });
      setShowBanDialog(null);
      setBanReason('');
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: (email) => base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Şifrenizi Sıfırla - Güneş School CRM',
      body: `Merhaba,\n\nŞifrenizi sıfırlamak için aşağıdaki linke tıklayınız:\n${window.location.origin}/staff-password-reset?email=${encodeURIComponent(email)}\n\nBu link 24 saat geçerlidir.\n\nSaygılarımızla,\nGüneş School Yönetimi`
    }),
    onSuccess: () => alert('Şifre sıfırlama maili gönderildi!'),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, pin_plain: generatePin() });
    setOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...s });
    setOpen(true);
  };

  const roleColors = { super_admin: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700', teacher: 'bg-green-100 text-green-700', staff: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Telefon + PIN ile giriş yapacak personeller</p>
        <Button size="sm" onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Personel Ekle</Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
      ) : staffList.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Henüz personel eklenmedi.</p>
        </div>
      ) : (
        <div className="space-y-2">
           {staffList.map(s => (
             <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border bg-card transition-all ${!s.is_active ? 'opacity-50' : ''} ${s.is_banned ? 'border-destructive/50 bg-destructive/5' : ''}`}>
               <div className="flex items-center gap-3 flex-1">
                 <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                   {s.full_name?.charAt(0)}
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="font-semibold text-sm">{s.full_name}</span>
                     <Badge className={`text-xs border-0 ${roleColors[s.role] || 'bg-gray-100 text-gray-700'}`}>{getRoleLabel(s.role)}</Badge>
                     {!s.is_active && <Badge variant="outline" className="text-xs text-destructive">Pasif</Badge>}
                     {s.is_banned && <Badge className="text-xs bg-destructive/20 text-destructive border-destructive/30">Yasaklı</Badge>}
                   </div>
                   <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                     <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>
                     {s.user_email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{s.user_email}</span>}
                     <span className="text-xs text-muted-foreground">PIN: <span className="font-mono font-bold">{s.pin_plain}</span></span>
                   </div>
                   {s.is_banned && <p className="text-xs text-destructive mt-1">Yasaklı: {s.ban_reason || 'Sebep belirtilmedi'}</p>}
                 </div>
               </div>
               <div className="flex items-center gap-1 flex-shrink-0">
                 {s.user_email && !s.is_banned && user?.role === 'super_admin' && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                     onClick={() => sendPasswordResetMutation.mutate(s.user_email)}
                     title="Şifre sıfırlama maili gönder"
                   >
                     <Mail className="w-4 h-4" />
                   </Button>
                 )}
                 {user?.role === 'super_admin' && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className={`w-8 h-8 ${s.is_banned ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-destructive hover:text-destructive/80 hover:bg-destructive/10'}`}
                     onClick={() => { setShowBanDialog(s); setBanReason(s.ban_reason || ''); }}
                     title={s.is_banned ? 'Yasağı kaldır' : 'Yasakla'}
                   >
                     {s.is_banned ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                   </Button>
                 )}
                 <Switch
                   checked={s.is_active}
                   onCheckedChange={v => toggleMutation.mutate({ id: s.id, is_active: v })}
                   className="scale-75"
                 />
                 <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                 {user?.role === 'super_admin' && (
                   <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-4 h-4" /></Button>
                 )}
               </div>
             </div>
           ))}
         </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Ad Soyad *</Label>
              <Input className="mt-1" placeholder="Ahmet Yılmaz" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">E-posta Adresi *</Label>
              <Input className="mt-1" type="email" placeholder="ahmet@gunesschool.com" value={form.user_email || ''} onChange={e => setForm({ ...form, user_email: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Şifre sıfırlama maili bu adrese gönderilecektir.</p>
            </div>
            <div>
              <Label className="text-xs">Telefon Numarası *</Label>
              <Input className="mt-1" placeholder="07700 900 000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Rol *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['super_admin', 'admin', 'teacher', 'staff'].map(r => (
                    <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">PIN Kodu *</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    type={showPin ? 'text' : 'password'}
                    placeholder="4 haneli PIN"
                    value={form.pin_plain}
                    onChange={e => setForm({ ...form, pin_plain: e.target.value })}
                    maxLength={6}
                    className="font-mono tracking-widest pr-9"
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, pin_plain: generatePin() })} title="Yeni PIN üret">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Personele bu PIN'i bildirin.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.full_name || !form.phone || !form.pin_plain || !form.user_email}
            >
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
            </div>
            </DialogContent>
            </Dialog>

            {/* Ban Dialog */}
            {showBanDialog && (
            <Dialog open={!!showBanDialog} onOpenChange={() => setShowBanDialog(null)}>
            <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle>{showBanDialog.is_banned ? 'Yasağı Kaldır' : 'Personeli Yasakla'}</DialogTitle>
             </DialogHeader>
             {!showBanDialog.is_banned && (
               <div className="space-y-3">
                 <p className="text-sm text-muted-foreground">Bu personeli yasaklarsanız, tekrar kullanıcı oluşturamaz.</p>
                 <div>
                   <Label className="text-xs">Yasaklama Nedeni (opsiyonel)</Label>
                   <Input 
                     className="mt-1" 
                     placeholder="Ör: Disipliner işlem" 
                     value={banReason} 
                     onChange={e => setBanReason(e.target.value)} 
                   />
                 </div>
               </div>
             )}
             {showBanDialog.is_banned && (
               <p className="text-sm text-muted-foreground">Bu personelin yasağını kaldırmak istiyor musunuz?</p>
             )}
             <div className="flex justify-end gap-2 pt-2 border-t">
               <Button variant="outline" onClick={() => setShowBanDialog(null)}>İptal</Button>
               <Button
                 variant={showBanDialog.is_banned ? 'default' : 'destructive'}
                 onClick={() => banMutation.mutate({ 
                   id: showBanDialog.id, 
                   is_banned: !showBanDialog.is_banned,
                   ban_reason: banReason
                 })}
                 disabled={banMutation.isPending}
               >
                 {banMutation.isPending ? 'İşleniyor...' : (showBanDialog.is_banned ? 'Yasağı Kaldır' : 'Yasakla')}
               </Button>
             </div>
            </DialogContent>
            </Dialog>
            )}
            </div>
            );
            }