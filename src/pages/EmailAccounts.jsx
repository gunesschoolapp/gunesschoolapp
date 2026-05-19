import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail, Trash2, Edit2, Check, X, AlertCircle, ChevronDown } from 'lucide-react';

const defaultAccount = {
  name: '',
  email: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  from_name: '',
  use_ssl: false,
  imap_host: '',
  imap_port: 993,
  imap_ssl: true,
  is_default: false,
  status: 'active'
};

export default function EmailAccounts() {
   const [showForm, setShowForm] = useState(false);
   const [editingAccount, setEditingAccount] = useState(null);
   const [form, setForm] = useState(defaultAccount);
   const [expandedGuide, setExpandedGuide] = useState(null);
   const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['emailAccounts'],
    queryFn: () => base44.entities.EmailAccount.list(),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.EmailAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailAccounts'] });
      setShowForm(false);
      setForm(defaultAccount);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailAccounts'] });
      setShowForm(false);
      setEditingAccount(null);
      setForm(defaultAccount);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.EmailAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailAccounts'] })
  });

  const handleSave = async () => {
    if (!form.name || !form.email || !form.smtp_host || !form.smtp_user || !form.smtp_pass) {
      return;
    }

    if (editingAccount) {
      await updateMutation.mutateAsync({ id: editingAccount.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setForm(account);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
    setForm(defaultAccount);
  };

  return (
     <div className="space-y-4 pb-24">
       <div className="flex items-center justify-between gap-3">
         <div>
           <h1 className="text-xl font-bold tracking-tight">E-posta Hesapları</h1>
           <p className="text-sm text-muted-foreground mt-0.5">E-posta hesaplarını yönetin</p>
         </div>
         <Button size="sm" onClick={() => { setEditingAccount(null); setForm(defaultAccount); setShowForm(true); }}>
           <Plus className="w-4 h-4 mr-1" /> Ekle
         </Button>
       </div>

       {/* Kurulum Rehberleri */}
       <Card>
         <CardContent className="p-4 space-y-3">
           <div className="flex items-center gap-2 text-sm font-semibold">
             <AlertCircle className="w-4 h-4 text-amber-600" />
             Gelen Kutusu İçin IMAP Kurulumu
           </div>

           {['gmail', 'godaddy'].map(provider => (
             <div key={provider} className="border rounded p-3">
               <button
                 onClick={() => setExpandedGuide(expandedGuide === provider ? null : provider)}
                 className="w-full flex items-center justify-between hover:bg-muted/30 p-2 rounded transition-colors"
               >
                 <span className="font-semibold text-sm">
                   {provider === 'gmail' ? '📧 Gmail' : '🌐 GoDaddy'}
                 </span>
                 <ChevronDown className={`w-4 h-4 transition-transform ${expandedGuide === provider ? 'rotate-180' : ''}`} />
               </button>

               {expandedGuide === provider && (
                 <div className="mt-2 p-2 bg-muted/20 rounded text-xs space-y-2">
                   {provider === 'gmail' ? (
                     <>
                       <p><strong>SMTP:</strong> smtp.gmail.com, Port: 587</p>
                       <p><strong>IMAP:</strong> imap.gmail.com, Port: 993</p>
                       <p>1. <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" className="text-primary underline">App Password oluştur</a></p>
                       <p>2. Kullanıcı adı: Gmail adresin</p>
                       <p>3. Şifre: Oluşturduğun 16 karakterlik şifreyi kullan</p>
                     </>
                   ) : (
                     <>
                       <p><strong>SMTP:</strong> sxb1plzcpnl508174.prod.sxb1.secureserver.net, Port: 465 (SSL aktif)</p>
                       <p><strong>IMAP:</strong> sxb1plzcpnl508174.prod.sxb1.secureserver.net, Port: 993</p>
                       <p>1. GoDaddy Kontrol Paneline gir</p>
                       <p>2. Email → Ayarlar → Advanced</p>
                       <p>3. "Üçüncü taraf uygulamalar" için IMAP'i etkinleştir</p>
                       <p>4. Kullanıcı adı: E-posta adresin (tam)</p>
                     </>
                   )}
                 </div>
               )}
             </div>
           ))}
         </CardContent>
       </Card>

      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz e-posta hesabı eklenmemiş. Yeni bir hesap ekleyerek başlayın.
            </CardContent>
          </Card>
        ) : (
          accounts.map(account => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{account.name}</h3>
                        {account.is_default && <Badge className="bg-primary/20 text-primary text-xs">Varsayılan</Badge>}
                        <Badge variant={account.status === 'active' ? 'default' : 'outline'} className="text-xs">
                          {account.status === 'active' ? 'Aktif' : 'İnaktif'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">SMTP: {account.smtp_host}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(account.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Hesabı Düzenle' : 'Yeni E-posta Hesabı'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Temel Bilgiler */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Temel Bilgiler</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div className="space-y-2">
                   <Label>Hesap Adı *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="örn: Okul Genel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta Adresi *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="örn: info@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gönderici Adı</Label>
                  <Input
                    value={form.from_name}
                    onChange={e => setForm({...form, from_name: e.target.value})}
                    placeholder="örn: Güneş English School"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">İnaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SMTP Ayarları */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">SMTP Ayarları (Gönderme)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div className="space-y-2">
                   <Label>SMTP Sunucusu *</Label>
                  <Input
                    value={form.smtp_host}
                    onChange={e => setForm({...form, smtp_host: e.target.value})}
                    placeholder="örn: smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port *</Label>
                  <Input
                    type="number"
                    value={form.smtp_port}
                    onChange={e => setForm({...form, smtp_port: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Kullanıcı *</Label>
                  <Input
                    value={form.smtp_user}
                    onChange={e => setForm({...form, smtp_user: e.target.value})}
                    placeholder="e-posta adı veya kullanıcı adı"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Şifresi *</Label>
                  <Input
                    type="password"
                    value={form.smtp_pass}
                    onChange={e => setForm({...form, smtp_pass: e.target.value})}
                    placeholder="uygulama şifresi veya şifre"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp_ssl"
                  checked={form.use_ssl}
                  onChange={e => setForm({...form, use_ssl: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="smtp_ssl" className="cursor-pointer">SSL/TLS Kullan (Port 465 için)</Label>
              </div>
            </div>

            {/* IMAP Ayarları */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">IMAP Ayarları (Alma)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div className="space-y-2">
                   <Label>IMAP Sunucusu</Label>
                  <Input
                    value={form.imap_host}
                    onChange={e => setForm({...form, imap_host: e.target.value})}
                    placeholder="örn: imap.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IMAP Port</Label>
                  <Input
                    type="number"
                    value={form.imap_port}
                    onChange={e => setForm({...form, imap_port: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="imap_ssl"
                  checked={form.imap_ssl}
                  onChange={e => setForm({...form, imap_ssl: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="imap_ssl" className="cursor-pointer">IMAP SSL Kullan</Label>
              </div>
            </div>

            {/* Varsayılan */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_default"
                checked={form.is_default}
                onChange={e => setForm({...form, is_default: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_default" className="cursor-pointer">Varsayılan Hesap Olarak Ayarla</Label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleCancel}>İptal</Button>
              <Button
                onClick={handleSave}
                disabled={!form.name || !form.email || !form.smtp_host || !form.smtp_user || !form.smtp_pass}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}