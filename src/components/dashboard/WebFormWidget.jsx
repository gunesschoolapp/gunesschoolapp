import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Globe, Copy, Check, Code, Eye, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const LEAD_FORM_PATH = '/public/lead-form';
const ENROLLMENT_FORM_PATH = '/public/enrollment-form';

function getBaseUrl() {
  return window.location.origin;
}

function EmbedCodeDialog({ open, onOpenChange, formPath, title }) {
  const [copied, setCopied] = useState(false);
  const url = `${getBaseUrl()}${formPath}`;
  const embedCode = `<iframe 
  src="${url}" 
  style="width:100%;height:700px;border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);" 
  title="${title}"
  loading="lazy">
</iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            {title} — Embed Kodu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aşağıdaki kodu web sitenizin HTML'ine yapıştırın. Form otomatik olarak CRM'e veri gönderir.
          </p>

          {/* Preview link */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{url}</span>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                <ExternalLink className="w-3 h-3" /> Önizle
              </Button>
            </a>
          </div>

          {/* Embed code */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Embed Kodu (iframe)</Label>
            <div className="relative">
              <pre className="bg-muted text-xs p-4 rounded-lg overflow-x-auto whitespace-pre leading-relaxed font-mono border">
{embedCode}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 h-7 gap-1 text-xs"
                onClick={handleCopy}
              >
                {copied ? <><Check className="w-3 h-3" />Kopyalandı!</> : <><Copy className="w-3 h-3" />Kopyala</>}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">💡 Kullanım Talimatı:</p>
            <p>1. Embed kodunu web sitenizin istediğiniz sayfasına yapıştırın (WordPress, Wix, Squarespace vb.)</p>
            <p>2. Form gönderimleri otomatik olarak CRM'deki <strong>Lead Yönetimi</strong> sayfasına düşer</p>
            <p>3. Forma girilen bilgiler anlık olarak sisteme kaydedilir</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WebFormWidget() {
  const [showLeadEmbed, setShowLeadEmbed] = useState(false);
  const [showEnrollEmbed, setShowEnrollEmbed] = useState(false);

  const { data: submissions = [] } = useQuery({
    queryKey: ['form-submissions-count'],
    queryFn: () => base44.entities.FormSubmission.list('-created_date', 5),
  });

  const newCount = submissions.filter(s => s.status === 'new' || !s.status).length;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Web Sitesi Entegrasyonu
            </CardTitle>
            {newCount > 0 && (
              <Badge className="bg-primary/10 text-primary border-0 text-xs">{newCount} yeni başvuru</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Formlarınızı web sitenize iframe olarak gömin. Gelen başvurular otomatik CRM'e kaydedilir.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Lead Form */}
            <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">📋 Lead Formu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">İlgilenen adaylar için</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Aktif</Badge>
              </div>
              <div className="flex gap-2">
                <a href={`${getBaseUrl()}${LEAD_FORM_PATH}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1">
                    <Eye className="w-3 h-3" /> Önizle
                  </Button>
                </a>
                <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => setShowLeadEmbed(true)}>
                  <Code className="w-3 h-3" /> Embed Kodu
                </Button>
              </div>
            </div>

            {/* Enrollment Form */}
            <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">📝 Kayıt Formu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Öğrenci kayıt başvurusu</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Aktif</Badge>
              </div>
              <div className="flex gap-2">
                <a href={`${getBaseUrl()}${ENROLLMENT_FORM_PATH}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1">
                    <Eye className="w-3 h-3" /> Önizle
                  </Button>
                </a>
                <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => setShowEnrollEmbed(true)}>
                  <Code className="w-3 h-3" /> Embed Kodu
                </Button>
              </div>
            </div>
          </div>

          {/* Recent submissions */}
          {submissions.length > 0 && (
            <div className="pt-1 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Son Başvurular</p>
              <div className="space-y-1">
                {submissions.slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20">
                    <span className="font-medium">{s.full_name || s.email || 'Adsız'}</span>
                    <span className="text-muted-foreground">{new Date(s.created_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EmbedCodeDialog
        open={showLeadEmbed}
        onOpenChange={setShowLeadEmbed}
        formPath={LEAD_FORM_PATH}
        title="Lead Formu"
      />
      <EmbedCodeDialog
        open={showEnrollEmbed}
        onOpenChange={setShowEnrollEmbed}
        formPath={ENROLLMENT_FORM_PATH}
        title="Kayıt Formu"
      />
    </>
  );
}