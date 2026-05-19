import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, Upload, Check, Palette, Building2, CreditCard, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/lib/useCurrentUser';

const INVOICE_STYLES = [
  {
    id: 'classic',
    label: 'Classic Blue',
    description: 'Kurumsal & profesyonel',
    header: '#2563eb',
    accent: '#1d4ed8',
    bg: '#eff6ff',
  },
  {
    id: 'modern',
    label: 'Modern Dark',
    description: 'Sade & minimalist',
    header: '#111827',
    accent: '#374151',
    bg: '#f9fafb',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Canlı & prestijli',
    header: '#059669',
    accent: '#047857',
    bg: '#ecfdf5',
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Modern & özgün',
    header: '#7c3aed',
    accent: '#6d28d9',
    bg: '#f5f3ff',
  },
  {
    id: 'rose',
    label: 'Rose Gold',
    description: 'Şık & zarif',
    header: '#e11d48',
    accent: '#be123c',
    bg: '#fff1f2',
  },
  {
    id: 'slate',
    label: 'Slate Pro',
    description: 'Nötr & güvenilir',
    header: '#475569',
    accent: '#334155',
    bg: '#f8fafc',
  },
];

const defaultTemplate = {
  school_name: 'Güneş English School',
  school_address: '',
  school_phone: '',
  school_email: '',
  school_website: '',
  vat_number: '',
  company_number: '',
  logo_url: '',
  primary_color: '#2563eb',
  invoice_style: 'classic',
  default_vat_rate: 20,
  default_payment_terms: '14',
  footer_notes: 'Thank you for your payment. Please retain this invoice for your records.',
  bank_name: '',
  bank_account_number: '',
  bank_sort_code: '',
  is_active: true,
};

function StyleCard({ style, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 overflow-hidden text-left transition-all hover:shadow-md ${
        isSelected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/40'
      }`}
    >
      {/* Mini invoice preview */}
      <div className="h-28" style={{ background: style.bg }}>
        {/* Header */}
        <div className="h-7 flex items-center px-3 justify-between" style={{ backgroundColor: style.header }}>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-white/30" />
            <div className="w-14 h-1.5 rounded bg-white/50" />
          </div>
          <div className="text-white text-[8px] font-black tracking-widest">INVOICE</div>
        </div>
        {/* Body */}
        <div className="p-2.5 space-y-1.5">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="w-16 h-1.5 rounded" style={{ backgroundColor: style.accent, opacity: 0.4 }} />
              <div className="w-10 h-1 rounded" style={{ backgroundColor: style.accent, opacity: 0.2 }} />
            </div>
            <div className="w-12 h-6 rounded" style={{ backgroundColor: style.bg, border: `1px solid ${style.accent}22` }}>
              <div className="w-full h-full flex flex-col justify-center px-1 gap-0.5">
                <div className="w-full h-1 rounded" style={{ backgroundColor: style.accent, opacity: 0.2 }} />
                <div className="w-3/4 h-1 rounded" style={{ backgroundColor: style.accent, opacity: 0.15 }} />
              </div>
            </div>
          </div>
          {/* Table */}
          <div className="rounded overflow-hidden" style={{ border: `1px solid ${style.accent}22` }}>
            <div className="h-3 px-1.5 flex items-center" style={{ backgroundColor: style.header }}>
              <div className="flex-1 h-1 rounded bg-white/40" />
              <div className="w-6 h-1 rounded bg-white/40" />
            </div>
            <div className="h-2.5 px-1.5 flex items-center gap-1" style={{ backgroundColor: style.bg }}>
              <div className="flex-1 h-1 rounded" style={{ backgroundColor: style.accent, opacity: 0.2 }} />
              <div className="w-6 h-1 rounded" style={{ backgroundColor: style.accent, opacity: 0.2 }} />
            </div>
          </div>
          {/* Total */}
          <div className="flex justify-end">
            <div className="h-3 w-14 rounded flex items-center justify-center" style={{ backgroundColor: style.header }}>
              <div className="w-8 h-1 rounded bg-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-3 py-2 bg-card border-t">
        <p className="text-xs font-bold">{style.label}</p>
        <p className="text-[10px] text-muted-foreground">{style.description}</p>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

function LivePreview({ form }) {
  const style = INVOICE_STYLES.find(s => s.id === form.invoice_style) || INVOICE_STYLES[0];

  return (
    <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ background: style.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: style.header }}>
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" className="h-9 object-contain rounded bg-white/10 px-1" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-sm">{(form.school_name || 'G').charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm leading-tight">{form.school_name || 'Okul Adı'}</p>
            <p className="text-white/60 text-[10px]">{form.school_email || 'email@school.com'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-xl tracking-widest">INVOICE</p>
          <p className="text-white/60 text-[10px]">#INV-2024-001</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4" style={{ background: 'white' }}>
        <div className="flex justify-between">
          <div>
            <p className="text-[9px] uppercase font-bold tracking-wider text-gray-400 mb-1">Billed To</p>
            <p className="text-sm font-semibold text-gray-800">Öğrenci Adı</p>
            <p className="text-[11px] text-gray-400">ogrenci@email.com</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase font-bold tracking-wider text-gray-400 mb-1">Due Date</p>
            <p className="text-sm text-gray-700">14 Nis 2024</p>
            {form.vat_number && <p className="text-[10px] text-gray-400 mt-0.5">VAT: {form.vat_number}</p>}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden border border-gray-100">
          <div className="px-4 py-2 flex text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: style.header }}>
            <span className="flex-1">Kurs / Hizmet</span>
            <span>Tutar</span>
          </div>
          <div className="px-4 py-2.5 flex text-xs text-gray-600 bg-gray-50/50">
            <span className="flex-1">English B1 Kursu - 3 Ay</span>
            <span>£450.00</span>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-44 space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Subtotal</span><span>£450.00</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>VAT ({form.default_vat_rate || 20}%)</span>
              <span>£{((form.default_vat_rate || 20) * 4.5).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold px-3 py-1.5 rounded-lg text-white mt-1" style={{ backgroundColor: style.header }}>
              <span>TOTAL</span>
              <span>£{(450 + (form.default_vat_rate || 20) * 4.5).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank info */}
        {(form.bank_name || form.bank_account_number) && (
          <div className="border-t pt-3 text-[10px] text-gray-400">
            <p className="font-semibold text-gray-500 mb-0.5">Payment Details</p>
            {form.bank_name && <p>{form.bank_name}</p>}
            {form.bank_account_number && <p>Account: {form.bank_account_number} {form.bank_sort_code && `| Sort: ${form.bank_sort_code}`}</p>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 text-center" style={{ backgroundColor: style.header }}>
        <p className="text-white/60 text-[9px]">{form.footer_notes || form.school_website || form.school_name}</p>
      </div>
    </div>
  );
}

export default function InvoiceTemplateSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const canDesign = !user?.role || user?.role === 'admin' || user?.role === 'team_admin';
  const [form, setForm] = useState(defaultTemplate);
  const [logoUploading, setLogoUploading] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['invoice-templates'],
    queryFn: () => base44.entities.InvoiceTemplate.list()
  });

  useEffect(() => {
    if (templates.length > 0) {
      const t = templates[0];
      setExistingId(t.id);
      setForm({ ...defaultTemplate, ...t });
    }
  }, [templates]);

  const saveMut = useMutation({
    mutationFn: (data) => existingId
      ? base44.entities.InvoiceTemplate.update(existingId, data)
      : base44.entities.InvoiceTemplate.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice-templates'] });
      toast({ title: 'Şablon kaydedildi ✓', duration: 2000 });
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setLogoUploading(false);
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const currentStyle = INVOICE_STYLES.find(s => s.id === form.invoice_style) || INVOICE_STYLES[0];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Fatura Şablonu Ayarları</h2>
          <p className="text-sm text-muted-foreground">Tüm faturalarda kullanılacak okul bilgileri ve tasarım</p>
        </div>
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} className="gap-2 px-6">
          {saveMut.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Kaydediliyor...</> : <><Save className="w-4 h-4" />Kaydet</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* LEFT: Settings (3 cols) */}
        <div className="xl:col-span-3 space-y-1">
          <Tabs defaultValue="design">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="design" className="gap-1.5 text-xs"><Palette className="w-3.5 h-3.5" />Tasarım</TabsTrigger>
              <TabsTrigger value="info" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" />Okul Bilgileri</TabsTrigger>
              <TabsTrigger value="bank" className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" />Banka & Ödeme</TabsTrigger>
            </TabsList>

            {/* DESIGN TAB */}
            <TabsContent value="design" className="space-y-5 mt-0">
              {/* Style Picker */}
              <div className="bg-card border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentStyle.header }}>
                    <FileText className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm">Fatura Stili</h3>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{currentStyle.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {INVOICE_STYLES.map(style => (
                    <StyleCard
                      key={style.id}
                      style={style}
                      isSelected={form.invoice_style === style.id}
                      onClick={() => set('invoice_style', style.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Logo & Colors */}
              <div className="bg-card border rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Palette className="w-4 h-4 text-muted-foreground" />Logo & Görsel</h3>

                {/* Logo upload */}
                <div>
                  <Label className="text-xs text-muted-foreground">Okul Logosu</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    {form.logo_url ? (
                      <div className="relative group">
                        <img src={form.logo_url} alt="Logo" className="h-12 object-contain rounded-xl border border-border bg-muted/20 px-2" />
                        <button
                          onClick={() => set('logo_url', '')}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                        >✕</button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                        <Upload className="w-4 h-4" />
                      </div>
                    )}
                    <label className="cursor-pointer flex-1">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors font-medium">
                        <Upload className="w-4 h-4" />
                        {logoUploading ? 'Yükleniyor...' : form.logo_url ? 'Logoyu Değiştir' : 'Logo Yükle'}
                      </div>
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG veya SVG önerilir. Şeffaf arka plan için PNG kullanın.</p>
                </div>

                {/* VAT Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">KDV / VAT Oranı (%)</Label>
                    <Input type="number" value={form.default_vat_rate} onChange={e => set('default_vat_rate', parseFloat(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ödeme Vadesi (gün)</Label>
                    <Input value={form.default_payment_terms} onChange={e => set('default_payment_terms', e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Footer Notes */}
              <div className="bg-card border rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Fatura Alt Notu</h3>
                <Textarea
                  value={form.footer_notes}
                  onChange={e => set('footer_notes', e.target.value)}
                  rows={3}
                  placeholder="Teşekkür notu, ödeme şartları, yasal bilgiler..."
                  className="resize-none"
                />
              </div>
            </TabsContent>

            {/* INFO TAB */}
            <TabsContent value="info" className="mt-0">
              <div className="bg-card border rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" />Okul / Şirket Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Okul / Şirket Adı *</Label>
                    <Input value={form.school_name} onChange={e => set('school_name', e.target.value)} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Adres</Label>
                    <Textarea value={form.school_address} onChange={e => set('school_address', e.target.value)} rows={2} className="mt-1 resize-none" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefon</Label>
                    <Input value={form.school_phone} onChange={e => set('school_phone', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">E-posta</Label>
                    <Input type="email" value={form.school_email} onChange={e => set('school_email', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Website</Label>
                    <Input value={form.school_website} onChange={e => set('school_website', e.target.value)} placeholder="www.gunesschool.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">VAT Numarası</Label>
                    <Input value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="GB123456789" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Company Number</Label>
                    <Input value={form.company_number} onChange={e => set('company_number', e.target.value)} placeholder="12345678" className="mt-1" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* BANK TAB */}
            <TabsContent value="bank" className="mt-0">
              <div className="bg-card border rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" />Banka & Ödeme Bilgileri</h3>
                <p className="text-xs text-muted-foreground">Bu bilgiler faturanın alt bölümünde görünür.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Banka Adı</Label>
                    <Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Barclays, HSBC..." className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hesap Numarası</Label>
                    <Input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="12345678" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Sort Code</Label>
                    <Input value={form.bank_sort_code} onChange={e => set('bank_sort_code', e.target.value)} placeholder="12-34-56" className="mt-1" />
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-muted/40 rounded-xl p-3 space-y-1 text-xs text-muted-foreground border border-dashed">
                  <p className="font-semibold text-foreground">💡 İpuçları</p>
                  <p>• Banka bilgileri girildikten sonra faturada otomatik gösterilir</p>
                  <p>• Ödeme vadesi, fatura oluşturulurken kullanılır</p>
                  <p>• VAT oranı faturadaki KDV hesaplamasını etkiler</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Live Preview (2 cols) */}
        <div className="xl:col-span-2 space-y-3">
          <div className="sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Canlı Önizleme</h3>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: currentStyle.header }}>
                {currentStyle.label}
              </span>
            </div>
            <LivePreview form={form} />
            <p className="text-[10px] text-center text-muted-foreground mt-2">Değişiklikler anlık olarak önizlemede yansır</p>
          </div>
        </div>
      </div>
    </div>
  );
}