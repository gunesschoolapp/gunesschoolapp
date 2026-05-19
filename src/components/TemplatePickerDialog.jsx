import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Download, Languages, Printer } from 'lucide-react';
import CertificatePreviewCanvas from '@/components/certificates/CertificatePreviewCanvas';
import InvoicePreviewCanvas from '@/components/payments/InvoicePreviewCanvas';
import { printCanvas } from '@/lib/printCanvas';

export default function TemplatePickerDialog({
  open, onClose, onDownload, templates,
  title = 'Choose Template', type = 'certificate',
  // Certificate preview props
  studentName, courseName, completionDate,
  signature1Name, signature1Title, signature2Name, signature2Title,
  logoUrl: propLogoUrl, schoolName: propSchoolName,
  // Invoice preview props
  studentEmail, amount, invoiceDate, dueDate, status,
}) {
  const [selected, setSelected] = useState(templates[0]?.id);
  const [lang, setLang] = useState('tr');
  const previewCanvasRef = useRef(null);

  const selectedTpl = templates.find(t => t.id === selected);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            {/* Language toggle */}
            <div className="flex items-center gap-1 mr-8 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setLang('tr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${lang === 'tr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                🇹🇷 Türkçe
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${lang === 'en' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 py-2">
          {/* LEFT: Template list */}
          <div className="lg:col-span-2 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Şablon</p>
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setSelected(tpl.id)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:shadow-sm ${selected === tpl.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground/30'}`}
              >
                <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${tpl.accent}33, ${tpl.accent}88)`, borderLeft: `3px solid ${tpl.accent}` }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                </div>
                {selected === tpl.id && (
                  <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* RIGHT: Real preview */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Önizleme</p>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Languages className="w-3 h-3" /> {lang === 'tr' ? 'Türkçe' : 'English'}
              </span>
            </div>
            {selectedTpl && (
              <div className="rounded-xl border bg-muted/10 p-3">
                {type === 'certificate' ? (
                  <CertificatePreviewCanvas
                    ref={previewCanvasRef}
                    template={selected}
                    logoUrl={propLogoUrl}
                    schoolName={propSchoolName}
                    studentName={studentName || 'Ali Yılmaz'}
                    courseName={courseName || 'B2 Upper Intermediate'}
                    completionDate={completionDate || new Date().toISOString().split('T')[0]}
                    lang={lang}
                    signature1Name={signature1Name}
                    signature1Title={signature1Title}
                    signature2Name={signature2Name}
                    signature2Title={signature2Title}
                  />
                ) : (
                  <InvoicePreviewCanvas
                    ref={previewCanvasRef}
                    template={selected}
                    logoUrl={propLogoUrl}
                    schoolName={propSchoolName}
                    studentName={studentName || 'Ali Yılmaz'}
                    studentEmail={studentEmail || 'ali@example.com'}
                    courseName={courseName || 'B2 Upper Intermediate'}
                    amount={amount || 450}
                    invoiceDate={invoiceDate || new Date().toISOString().split('T')[0]}
                    dueDate={dueDate}
                    status={status || 'paid'}
                    lang={lang}
                  />
                )}
                <p className="text-xs text-muted-foreground text-center mt-2">{selectedTpl.label}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button variant="outline" className="gap-2" onClick={() => { if (previewCanvasRef.current) printCanvas(previewCanvasRef.current); }}>
            <Printer className="w-4 h-4" /> Yazdır
          </Button>
          <Button onClick={() => { onDownload(selected, { lang }); onClose(); }} className="gap-2">
            <Download className="w-4 h-4" /> PDF İndir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}