import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Code, Plus, Edit2, Trash2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

const INTEGRATIONS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: '💬',
    color: 'bg-green-500',
    description: 'WhatsApp Business entegrasyonu ile müşterilerinizle iletişim kurun',
    status: 'available',
  },
  {
    id: 'instagram',
    name: 'Instagram DMs',
    icon: '📷',
    color: 'bg-pink-500',
    description: 'Instagram Direct Messages ile müşteri desteği sağlayın',
    status: 'available',
  },
  {
    id: 'facebook_messenger',
    name: 'Facebook Messenger',
    icon: 'f',
    color: 'bg-blue-600',
    description: 'Facebook Messenger üzerinden müşterilerle bağlantı kurun',
    status: 'available',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'bg-blue-400',
    description: 'Telegram botları ile otomasyonu sağlayın',
    status: 'available',
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: '📱',
    color: 'bg-purple-500',
    description: 'SMS gönderimi ile müşterilerle iletişim kurun',
    status: 'available',
  },
  {
    id: 'email',
    name: 'E-posta',
    icon: '✉️',
    color: 'bg-red-500',
    description: 'E-posta kampanyaları ve otomatik yanıtlar',
    status: 'available',
  },
];

export default function WebsiteIntegrations() {
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [copied, setCopied] = useState(null);
  const qc = useQueryClient();

  const { data: forms = [] } = useQuery({
    queryKey: ['website-forms'],
    queryFn: () => base44.entities.WebsiteForm.list(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['website-form-submissions'],
    queryFn: () => base44.entities.WebsiteFormSubmission.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WebsiteForm.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-forms'] });
      setShowNew(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WebsiteForm.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-forms'] }),
  });

  const handleCopyEmbed = (slug) => {
    const embedCode = `<iframe src="https://app.example.com/public/form/${slug}" style="width:100%;height:600px;border:none;border-radius:8px;" title="Form"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <ProtectedRoute requiredPermission="canManageWebForms">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Entegrasyonlar</h1>
            <p className="text-muted-foreground mt-1">CRM'nizi harici platformlarla bağlayın</p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations">İletişim Platformları</TabsTrigger>
            <TabsTrigger value="forms">Web Formları ({forms.length})</TabsTrigger>
            <TabsTrigger value="submissions">Gönderiler ({submissions.length})</TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {INTEGRATIONS.map(integration => (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg ${integration.color} flex items-center justify-center text-white text-xl font-bold`}>
                          {integration.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    <Badge variant={integration.status === 'available' ? 'default' : 'secondary'}>
                      {integration.status === 'available' ? 'Kullanılabilir' : 'Yakında'}
                    </Badge>
                    <Button className="w-full gap-2" variant="outline">
                      <Send className="w-4 h-4" />
                      Bağla
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-4 mt-4">
            <div className="flex justify-end mb-4">
              <Dialog open={showNew} onOpenChange={setShowNew}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" /> Yeni Form</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Form Oluştur</DialogTitle>
                  </DialogHeader>
                  <FormBuilder onSubmit={(data) => createMutation.mutate(data)} onClose={() => setShowNew(false)} />
                </DialogContent>
              </Dialog>
            </div>
            {forms.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Henüz form yok. Yeni bir form oluşturun.
                </CardContent>
              </Card>
            ) : (
              forms.map(form => (
                <Card key={form.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        <CardDescription className="mt-1">{form.description}</CardDescription>
                      </div>
                      <Badge variant={form.is_active ? 'default' : 'secondary'}>
                        {form.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Türü</p>
                        <p className="font-medium capitalize">{form.type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Alan Sayısı</p>
                        <p className="font-medium">{form.fields?.length || 0}</p>
                      </div>
                    </div>

                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Slug</p>
                      <code className="text-xs">{form.slug}</code>
                    </div>

                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Embed Kodu</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">
                          &lt;iframe src=".../{form.slug}"&gt;&lt;/iframe&gt;
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyEmbed(form.slug)}
                        >
                          {copied === form.slug ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Edit2 className="w-4 h-4" /> Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(form.id)}
                        className="gap-2 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" /> Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4 mt-4">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Henüz form gönderisi yok
                </CardContent>
              </Card>
            ) : (
              submissions.map(sub => (
                <Card key={sub.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm">
                          {forms.find(f => f.id === sub.form_id)?.name || 'Form'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(sub.created_date).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <Badge variant={sub.status === 'new' ? 'default' : 'secondary'}>
                        {sub.status === 'new' ? 'Yeni' : sub.status === 'reviewed' ? 'İncelendi' : 'Dönüştürüldü'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {Object.entries(sub.form_data || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}

function FormBuilder({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'lead',
    fields: [{ id: '1', name: 'full_name', label: 'Ad Soyad', type: 'text', required: true }],
    submit_button_text: 'Gönder',
    submit_message: 'Teşekkür ederiz!',
  });

  const handleAddField = () => {
    const newId = String(Math.max(...form.fields.map(f => parseInt(f.id) || 0)) + 1);
    setForm({
      ...form,
      fields: [...form.fields, { id: newId, name: '', label: '', type: 'text', required: false }],
    });
  };

  const handleRemoveField = (id) => {
    setForm({
      ...form,
      fields: form.fields.filter(f => f.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Form Adı</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>URL Slug</Label>
        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="lead-form" />
      </div>

      <div className="space-y-2">
        <Label>Tür</Label>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded">
          <option value="lead">Lead</option>
          <option value="enrollment">Kayıt</option>
          <option value="contact">İletişim</option>
        </select>
      </div>

      <div className="space-y-3">
        <Label>Alanlar</Label>
        {form.fields.map(field => (
          <div key={field.id} className="flex gap-2 p-2 border rounded">
            <Input placeholder="Alan adı" value={field.name} onChange={(e) => {
              setForm({
                ...form,
                fields: form.fields.map(f => f.id === field.id ? { ...f, name: e.target.value } : f),
              });
            }} className="text-xs" />
            <select value={field.type} onChange={(e) => {
              setForm({
                ...form,
                fields: form.fields.map(f => f.id === field.id ? { ...f, type: e.target.value } : f),
              });
            }} className="px-2 py-1 border rounded text-xs">
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="phone">Telefon</option>
              <option value="textarea">Metin</option>
            </select>
            <Button size="sm" variant="ghost" onClick={() => handleRemoveField(field.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={handleAddField} className="gap-2">
          <Plus className="w-3 h-3" /> Alan Ekle
        </Button>
      </div>

      <Button onClick={() => onSubmit(form)} className="w-full">Oluştur</Button>
    </div>
  );
}