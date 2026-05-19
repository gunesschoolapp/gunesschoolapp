import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Bell, Settings, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('notifications');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    template_type: 'payment_reminder',
    channel: 'whatsapp',
    title: '',
    template_text: '',
    language: 'tr'
  });
  const [sendForm, setSendForm] = useState({
    notification_type: 'announcement',
    recipient_type: 'student',
    student_id: '',
    channels: [], // ['whatsapp', 'sms', 'chat', 'email']
    phone_number: '',
    email: '',
    message: ''
  });

  // Veri alma
  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date'),
    refetchInterval: 10000
  });

  // Non-admins only see their own notifications
  const notifications = isAdmin ? allNotifications : allNotifications.filter(n => n.created_by === user?.email);

  const { data: templates = [] } = useQuery({
    queryKey: ['notification_templates'],
    queryFn: () => base44.entities.NotificationTemplate.list()
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_templates'] });
      setShowTemplateForm(false);
      setTemplateForm({ template_type: 'payment_reminder', channel: 'whatsapp', title: '', template_text: '', language: 'tr' });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification_templates'] })
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  // Eski bildirimleri sil (30 günü geçen)
  React.useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    notifications.forEach(notif => {
      const createdDate = new Date(notif.created_date);
      if (createdDate < thirtyDaysAgo) {
        base44.entities.Notification.delete(notif.id).catch(() => {});
      }
    });
  }, []);

  // İstatistikler
   const stats = useMemo(() => {
     return {
       total: notifications.length,
       sent: notifications.filter(n => n.status === 'sent').length,
       pending: notifications.filter(n => n.status === 'pending').length,
       failed: notifications.filter(n => n.status === 'failed').length,
       unread: notifications.filter(n => !n.read).length
     };
   }, [notifications]);

  const handleCreateTemplate = () => {
    if (!templateForm.title || !templateForm.template_text) {
      alert('Başlık ve template metni gerekli');
      return;
    }
    createTemplateMutation.mutate(templateForm);
  };

  const handleSendNotification = () => {
    if (!sendForm.message || sendForm.channels.length === 0) {
      alert('Mesaj ve en az bir kanal seçimi gerekli');
      return;
    }

    // Her kanal için ayrı bildirim oluştur
    const promises = sendForm.channels.map(channel => {
      const notificationData = {
        notification_type: sendForm.notification_type,
        recipient_type: sendForm.recipient_type,
        student_id: sendForm.student_id || null,
        channel: channel,
        phone_number: sendForm.phone_number || null,
        email: sendForm.email || null,
        message: sendForm.message,
        status: 'pending'
      };
      return base44.entities.Notification.create(notificationData);
    });

    Promise.all(promises).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowSendForm(false);
      setSendForm({
        notification_type: 'announcement',
        recipient_type: 'student',
        student_id: '',
        channels: [],
        phone_number: '',
        email: '',
        message: ''
      });
      alert(`${sendForm.channels.length} kanal üzerinden bildirim gönderildi`);
    }).catch(() => alert('Bildirim gönderirken hata oluştu'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
       <div className="flex justify-between items-start gap-3 flex-wrap">
         <div>
           <h1 className="text-2xl font-bold tracking-tight">Bildirim Merkezi</h1>
           <p className="text-muted-foreground mt-1">Çok kanallı (WhatsApp, SMS, Chat, Email) bildirimleri gönderin ve yönetin</p>
         </div>
         <div className="flex gap-2">
           <Button onClick={() => setShowSendForm(true)} variant="default">
             <Plus className="w-4 h-4 mr-2" /> Bildirim Gönder
           </Button>
           {isAdmin && (
             <Button onClick={() => setShowTemplateForm(true)} variant="outline">
               <Plus className="w-4 h-4 mr-2" /> Template Ekle
             </Button>
           )}
         </div>
       </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Gönderilen Bildirimler
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="templates" className="gap-2">
              <Settings className="w-4 h-4" /> Templates
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Toplam</p>
                <p className="text-3xl font-bold mt-2">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Okunmamış</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.unread}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Gönderilen</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.sent}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Başarısız</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
              </CardContent>
            </Card>
          </div>

          {/* Notifications Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bildirim Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Okundu</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Kanal</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Mesaj</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.filter(n => !n.read).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Okunmamış bildirim yok
                        </TableCell>
                      </TableRow>
                    ) : (
                      notifications.filter(n => !n.read).map(notif => (
                        <TableRow key={notif.id} className={notif.read ? 'opacity-60' : ''}>
                          <TableCell className="text-sm">
                            <button
                              onClick={() => !notif.read && markAsReadMutation.mutate(notif.id)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                notif.read
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                              }`}
                            >
                              {notif.read ? '✓ Okundu' : 'Okunmadı'}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">
                              {notif.notification_type === 'payment_reminder' ? '💰' : 
                               notif.notification_type === 'lesson_cancellation' ? '📅' : 
                               notif.notification_type === 'announcement' ? '📢' : '🔔'}
                              {' ' + notif.notification_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{notif.channel.toUpperCase()}</TableCell>
                          <TableCell className="text-sm">{notif.phone_number}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{notif.message}</TableCell>
                          <TableCell>
                            <Badge className={
                              notif.status === 'sent' ? 'bg-green-100 text-green-700' :
                              notif.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {notif.status === 'sent' ? '✓' : notif.status === 'pending' ? '⏳' : '✕'}
                              {' ' + notif.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {notif.sent_at ? new Date(notif.sent_at).toLocaleDateString('tr-TR') : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (window.confirm('Sil?')) {
                                  deleteNotificationMutation.mutate(notif.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          </TableRow>
                          ))
                          )}
                          </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Templates Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bildirim Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tür</TableHead>
                      <TableHead>Kanal</TableHead>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Template Metni</TableHead>
                      <TableHead>Dil</TableHead>
                      <TableHead>Durumu</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Template bulunmuyor
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map(tpl => (
                        <TableRow key={tpl.id}>
                          <TableCell className="text-sm">
                            <Badge variant="outline">{tpl.template_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{tpl.channel.toUpperCase()}</TableCell>
                          <TableCell className="text-sm font-medium">{tpl.title}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{tpl.template_text}</TableCell>
                          <TableCell className="text-sm">{tpl.language === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}</TableCell>
                          <TableCell>
                            <Badge className={tpl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                              {tpl.is_active ? '✓ Aktif' : '✕ Pasif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (window.confirm('Sil?')) {
                                  deleteTemplateMutation.mutate(tpl.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Notification Dialog */}
       <Dialog open={showSendForm} onOpenChange={setShowSendForm}>
         <DialogContent className="max-w-lg">
           <DialogHeader>
             <DialogTitle>Bildirim Gönder</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 mt-4">
             <div className="space-y-2">
               <Label>Bildirim Türü</Label>
               <Select value={sendForm.notification_type} onValueChange={(v) => setSendForm({ ...sendForm, notification_type: v })}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="announcement">📢 Duyuru</SelectItem>
                   <SelectItem value="lesson_cancellation">📅 Ders İptali</SelectItem>
                   <SelectItem value="payment_reminder">💰 Ödeme Hatırlatması</SelectItem>
                   <SelectItem value="trial_scheduled">🎯 Trial Planlandı</SelectItem>
                   <SelectItem value="message">💬 Mesaj</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <Label>Alıcı Tipi</Label>
               <Select value={sendForm.recipient_type} onValueChange={(v) => setSendForm({ ...sendForm, recipient_type: v })}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="student">Öğrenci</SelectItem>
                   <SelectItem value="staff">Personel</SelectItem>
                   <SelectItem value="both">Her İkisi</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <Label>Kanallar (Birden fazla seçebilirsiniz)</Label>
               <div className="flex flex-wrap gap-2">
                 {[
                   { id: 'whatsapp', label: '💬 WhatsApp' },
                   { id: 'sms', label: '📱 SMS' },
                   { id: 'chat', label: '💭 Sistem Chat' },
                   { id: 'email', label: '✉️ E-mail' }
                 ].map(ch => (
                   <button
                     key={ch.id}
                     onClick={() => {
                       const updated = sendForm.channels.includes(ch.id)
                         ? sendForm.channels.filter(c => c !== ch.id)
                         : [...sendForm.channels, ch.id];
                       setSendForm({ ...sendForm, channels: updated });
                     }}
                     className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                       sendForm.channels.includes(ch.id)
                         ? 'bg-primary text-white'
                         : 'bg-muted text-muted-foreground hover:bg-muted/80'
                     }`}
                   >
                     {ch.label}
                   </button>
                 ))}
               </div>
             </div>

             {(sendForm.channels.includes('whatsapp') || sendForm.channels.includes('sms')) && (
               <div className="space-y-2">
                 <Label>Telefon Numarası</Label>
                 <Input
                   placeholder="+90..."
                   value={sendForm.phone_number}
                   onChange={(e) => setSendForm({ ...sendForm, phone_number: e.target.value })}
                 />
               </div>
             )}

             {sendForm.channels.includes('email') && (
               <div className="space-y-2">
                 <Label>E-mail Adresi</Label>
                 <Input
                   type="email"
                   placeholder="ornek@email.com"
                   value={sendForm.email}
                   onChange={(e) => setSendForm({ ...sendForm, email: e.target.value })}
                 />
               </div>
             )}

             <div className="space-y-2">
               <Label>Mesaj</Label>
               <textarea
                 className="w-full border rounded-md p-2 text-sm"
                 rows="4"
                 value={sendForm.message}
                 onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                 placeholder="Göndermek istediğiniz mesajı yazın..."
               />
               <p className="text-xs text-muted-foreground">Karakterler: {sendForm.message.length}/160 (SMS)</p>
             </div>

             <div className="flex justify-end gap-3 pt-2">
               <Button variant="outline" onClick={() => setShowSendForm(false)}>İptal</Button>
               <Button onClick={handleSendNotification}>Gönder</Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

      {/* Template Create Dialog */}
       <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Template Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Template Türü</Label>
              <Select value={templateForm.template_type} onValueChange={(v) => setTemplateForm({ ...templateForm, template_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_reminder">Ödeme Hatırlatması</SelectItem>
                  <SelectItem value="lesson_cancellation">Ders İptali</SelectItem>
                  <SelectItem value="announcement">Duyuru</SelectItem>
                  <SelectItem value="trial_scheduled">Trial Planlandı</SelectItem>
                  <SelectItem value="custom">Özel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kanal</Label>
              <Select value={templateForm.channel} onValueChange={(v) => setTemplateForm({ ...templateForm, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Başlık</Label>
              <Input 
                value={templateForm.title} 
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                placeholder="Örn: Ödeme Hatırlatması"
              />
            </div>
            <div className="space-y-2">
              <Label>Template Metni</Label>
              <textarea 
                className="w-full border rounded-md p-2 text-sm"
                rows="4"
                value={templateForm.template_text}
                onChange={(e) => setTemplateForm({ ...templateForm, template_text: e.target.value })}
                placeholder="Örn: Merhaba {{student_name}}, faturanız £{{amount}} vade tarihi {{due_date}}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {'{{student_name}}, {{amount}}, {{date}}, {{due_date}}, {{course_name}}, {{lesson_date}}'} 
              </p>
            </div>
            <div className="space-y-2">
              <Label>Dil</Label>
              <Select value={templateForm.language} onValueChange={(v) => setTemplateForm({ ...templateForm, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowTemplateForm(false)}>İptal</Button>
              <Button onClick={handleCreateTemplate} disabled={createTemplateMutation.isPending}>
                Template Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}