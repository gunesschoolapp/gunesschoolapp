import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Star, Upload, Award, Check, Lock } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { hasPermission } from '@/lib/roles';

const STYLES = [
  {
    id: 'marble_gold',
    label: 'Mermer & Altın',
    description: 'Klasik, prestijli mermer doku',
    bg: '#f2f1ef',
    border: '#b4913c',
    headerBg: '#a0782a',
    text: '#1e190e',
    accent: '#b4913c',
  },
  {
    id: 'classic_blue',
    label: 'Classic Blue',
    description: 'Profesyonel mavi, kurumsal',
    bg: '#f5f8ff',
    border: '#2563eb',
    headerBg: '#2563eb',
    text: '#1e3a8a',
    accent: '#2563eb',
  },
  {
    id: 'elegant_gold',
    label: 'Elegant Gold',
    description: 'Lüks altın krem, resmi tören',
    bg: '#fffcf0',
    border: '#b48c28',
    headerBg: '#b48c28',
    text: '#3c280a',
    accent: '#b48c28',
  },
  {
    id: 'modern_dark',
    label: 'Modern Dark',
    description: 'Koyu zemin, şık ve çarpıcı',
    bg: '#0f172a',
    border: '#6366f1',
    headerBg: '#6366f1',
    text: '#f8fafc',
    accent: '#6366f1',
  },
  {
    id: 'rose_luxury',
    label: 'Rose Luxury',
    description: 'Pembe-gül tonu, zarif modern',
    bg: '#fff5f7',
    border: '#e11d48',
    headerBg: '#be123c',
    text: '#4c0519',
    accent: '#e11d48',
  },
  {
    id: 'forest_green',
    label: 'Forest & Sage',
    description: 'Yeşil doğal ton, sakin prestij',
    bg: '#f0fdf4',
    border: '#16a34a',
    headerBg: '#15803d',
    text: '#14532d',
    accent: '#16a34a',
  },
];

const EMPTY = {
  name: '',
  school_name: '',
  logo_url: '',
  signature1_name: '',
  signature1_title: '',
  signature1_url: '',
  signature2_name: '',
  signature2_title: '',
  signature2_url: '',
  template_style: 'marble_gold',
  certificate_title: 'BAŞARI BELGESİ',
  subtitle_text: 'Bu belge, aşağıda adı yazılı kişinin kursu başarıyla tamamladığını onaylar.',
  is_default: false,
};

function CertMiniPreview({ style, schoolName, title }) {
  const s = STYLES.find(st => st.id === style) || STYLES[0];
  const isDark = style === 'modern_dark';

  return (
    <div className="w-full h-28 rounded-lg overflow-hidden border-2 relative" style={{ backgroundColor: s.bg, borderColor: s.border }}>
      {/* Header */}
      <div className="h-6 flex items-center justify-center" style={{ backgroundColor: s.headerBg }}>
        <span className="text-white text-[8px] font-bold truncate px-2">
          {schoolName || 'GÜNEŞ ENGLISH SCHOOL'}
        </span>
      </div>
      {/* Body */}
      <div className="flex flex-col items-center justify-center h-16 px-2 gap-1">
        <span className="text-[7px] font-black tracking-wider" style={{ color: s.text }}>
          {title || 'BAŞARI BELGESİ'}
        </span>
        <div className="w-16 h-px" style={{ backgroundColor: s.accent }} />
        <span className="text-[9px] font-bold italic" style={{ color: s.text, opacity: 0.7 }}>
          Öğrenci Adı
        </span>
        <span className="text-[7px]" style={{ color: s.text, opacity: 0.5 }}>
          İngilizce B1 Kursu
        </span>
      </div>
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center" style={{ backgroundColor: s.headerBg }}>
        <span className="text-white text-[7px] opacity-70">Resmi Sertifika</span>
      </div>
    </div>
  );
}

function StyleGrid({ value, onChange, schoolName, title }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {STYLES.map(style => {
        const isSelected = value === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onChange(style.id)}
            className={`relative rounded-xl border-2 overflow-hidden text-left transition-all p-0 ${
              isSelected ? 'border-primary shadow-md' : 'border-border hover:border-muted-foreground/40'
            }`}
          >
            <div className="p-2">
              <CertMiniPreview style={style.id} schoolName={schoolName} title={title} />
            </div>
            <div className="px-2 pb-2">
              <p className="text-xs font-semibold">{style.label}</p>
              <p className="text-[10px] text-muted-foreground">{style.description}</p>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function CertificateTemplateSettings() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const canDesign = hasPermission(user?.role, 'canManageTemplateDesign');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState({});

  const { data: templates = [] } = useQuery({
    queryKey: ['certificate_templates'],
    queryFn: () => base44.entities.CertificateTemplate.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.is_default) {
        const others = templates.filter(t => t.is_default && t.id !== editing?.id);
        await Promise.all(others.map(t => base44.entities.CertificateTemplate.update(t.id, { is_default: false })));
      }
      return editing
        ? base44.entities.CertificateTemplate.update(editing.id, data)
        : base44.entities.CertificateTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate_templates'] });
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.CertificateTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certificate_templates'] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      await Promise.all(templates.map(t =>
        base44.entities.CertificateTemplate.update(t.id, { is_default: t.id === id })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certificate_templates'] }),
  });

  const handleUpload = async (field) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(u => ({ ...u, [field]: true }));
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, [field]: file_url }));
      setUploading(u => ({ ...u, [field]: false }));
    };
    input.click();
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({
      name: tpl.name || '',
      school_name: tpl.school_name || '',
      logo_url: tpl.logo_url || '',
      signature1_name: tpl.signature1_name || '',
      signature1_title: tpl.signature1_title || '',
      signature1_url: tpl.signature1_url || '',
      signature2_name: tpl.signature2_name || '',
      signature2_title: tpl.signature2_title || '',
      signature2_url: tpl.signature2_url || '',
      template_style: tpl.template_style || 'marble_gold',
      certificate_title: tpl.certificate_title || 'BAŞARI BELGESİ',
      subtitle_text: tpl.subtitle_text || '',
      is_default: tpl.is_default || false,
    });
    setOpen(true);
  };

  const styleInfo = (styleId) => STYLES.find(s => s.id === styleId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Sertifika Şablonları
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Sertifika bastığında kullanılacak tasarım şablonları</p>
        </div>
        {canDesign && (
          <Button size="sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Yeni Şablon
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz şablon tanımlanmamış</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}>
            İlk Şablonu Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => {
            const s = styleInfo(tpl.template_style);
            return (
              <div key={tpl.id} className={`relative rounded-xl border-2 overflow-hidden ${tpl.is_default ? 'border-primary' : 'border-border'}`}>
                {tpl.is_default && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-primary text-primary-foreground text-xs gap-1 shadow">
                      <Star className="w-3 h-3" /> Varsayılan
                    </Badge>
                  </div>
                )}
                {/* Preview */}
                <div className="p-3">
                  <CertMiniPreview
                    style={tpl.template_style}
                    schoolName={tpl.school_name}
                    title={tpl.certificate_title}
                  />
                </div>
                {/* Info */}
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {tpl.logo_url && <img src={tpl.logo_url} alt="logo" className="w-6 h-6 object-contain rounded border" />}
                    <p className="font-semibold text-sm truncate">{tpl.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{tpl.school_name}</p>
                  {s && <Badge variant="outline" className="text-[10px] mt-1">{s.label}</Badge>}
                  {tpl.signature1_name && (
                    <p className="text-[10px] text-muted-foreground mt-1">✍️ {tpl.signature1_name}{tpl.signature1_title ? ` · ${tpl.signature1_title}` : ''}</p>
                  )}
                  <div className="flex gap-1.5 mt-3">
                    {canDesign && !tpl.is_default && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setDefaultMutation.mutate(tpl.id)}>
                        <Star className="w-3 h-3 mr-1" /> Varsayılan
                      </Button>
                    )}
                    {canDesign && (
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(tpl)}>
                        <Edit className="w-3 h-3 mr-1" /> Düzenle
                      </Button>
                    )}
                    {canDesign && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 px-2 ml-auto" onClick={() => deleteMutation.mutate(tpl.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!canDesign && <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Sadece görüntüleme</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Şablonu Düzenle' : 'Yeni Sertifika Şablonu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Basic */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Şablon Adı *</Label>
                <Input placeholder="Ör: Ana Şablon" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Okul / Kurum Adı *</Label>
                <Input placeholder="Ör: Güneş English School" value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sertifika Başlığı</Label>
                <Input value={form.certificate_title} onChange={e => setForm(f => ({ ...f, certificate_title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Alt Metin</Label>
                <Input value={form.subtitle_text} onChange={e => setForm(f => ({ ...f, subtitle_text: e.target.value }))} />
              </div>
            </div>

            {/* Style picker - admin only */}
            {canDesign ? (
              <div className="space-y-2">
                <Label>Tasarım Stili</Label>
                <StyleGrid
                  value={form.template_style}
                  onChange={v => setForm(f => ({ ...f, template_style: v }))}
                  schoolName={form.school_name}
                  title={form.certificate_title}
                />
              </div>
            ) : (
              <div className="bg-muted/40 border border-border rounded-xl p-3 flex items-center gap-3 text-muted-foreground">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">Tasarım stili sadece admin tarafından değiştirilebilir.</p>
              </div>
            )}

            {/* Logo - admin only */}
            {canDesign && (
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10 w-auto object-contain border rounded" />}
                  <Button type="button" variant="outline" size="sm" onClick={() => handleUpload('logo_url')} disabled={uploading.logo_url}>
                    <Upload className="w-4 h-4 mr-1" /> {uploading.logo_url ? 'Yükleniyor...' : 'Logo Yükle'}
                  </Button>
                  {form.logo_url && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm(f => ({ ...f, logo_url: '' }))}>Kaldır</Button>}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="border rounded-xl p-4 space-y-4">
              <p className="text-sm font-semibold">İmzalar</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { prefix: 'signature1', label: '1. İmza (Sol)' },
                  { prefix: 'signature2', label: '2. İmza (Sağ)' },
                ].map(({ prefix, label }) => (
                  <div key={prefix} className="space-y-2.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ad Soyad</Label>
                      <Input
                        placeholder="Ör: Kemal Erkeç"
                        value={form[`${prefix}_name`]}
                        onChange={e => setForm(f => ({ ...f, [`${prefix}_name`]: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unvan</Label>
                      <Input
                        placeholder="Ör: Okul Müdürü"
                        value={form[`${prefix}_title`]}
                        onChange={e => setForm(f => ({ ...f, [`${prefix}_title`]: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">İmza Görseli</Label>
                      <div className="flex items-center gap-2">
                        {form[`${prefix}_url`] && <img src={form[`${prefix}_url`]} alt="sig" className="h-8 w-auto border rounded" />}
                        <Button type="button" variant="outline" size="sm" onClick={() => handleUpload(`${prefix}_url`)} disabled={uploading[`${prefix}_url`]}>
                          <Upload className="w-3 h-3 mr-1" /> {uploading[`${prefix}_url`] ? '...' : 'Yükle'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Default */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
              <div>
                <p className="text-sm font-medium">Varsayılan Şablon</p>
                <p className="text-xs text-muted-foreground">Sertifika oluşturulurken bu şablon otomatik seçilir</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>İptal</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.school_name || saveMutation.isPending}>
                {saveMutation.isPending ? 'Kaydediliyor...' : editing ? 'Kaydet' : 'Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}