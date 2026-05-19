import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Award, Plus, Download, Trash2, Star, Settings, Eye } from 'lucide-react';
import TemplatePickerDialog from '@/components/TemplatePickerDialog';
import { CERTIFICATE_TEMPLATES } from '@/components/certificates/CertificateGenerator';
import { generateCertificatePDF } from '@/components/certificates/CertificateGenerator';
import SearchableSelect from '@/components/SearchableSelect';
import { Link } from 'react-router-dom';

export default function Certifications() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: '', course_id: '',
    completion_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { data: certificates = [] } = useQuery({ queryKey: ['certificates'], queryFn: () => base44.entities.Certificate.list('-created_date') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: certTemplates = [] } = useQuery({ queryKey: ['certificate_templates'], queryFn: () => base44.entities.CertificateTemplate.list() });

  const defaultTemplate = certTemplates.find(t => t.is_default) || certTemplates[0] || null;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setOpen(false);
      setForm({ student_id: '', course_id: '', completion_date: new Date().toISOString().split('T')[0], notes: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Certificate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certificates'] })
  });

  const [certPicker, setCertPicker] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);

  const doDownload = async (cert, lang) => {
    const student = students.find(s => s.id === cert.student_id);
    const course = courses.find(c => c.id === cert.course_id);
    const tpl = defaultTemplate;
    await generateCertificatePDF({
      studentName: student?.full_name || 'Öğrenci',
      courseName: course?.name || 'Kurs',
      completionDate: cert.completion_date,
      template: tpl?.template_style || 'marble_gold',
      logoUrl: tpl?.logo_url || '',
      schoolName: tpl?.school_name || 'Güneş English School',
      signature1Name: tpl?.signature1_name || '',
      signature1Title: tpl?.signature1_title || '',
      signature1Url: tpl?.signature1_url || '',
      signature2Name: tpl?.signature2_name || '',
      signature2Title: tpl?.signature2_title || '',
      signature2Url: tpl?.signature2_url || '',
      lang: lang || 'tr',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" /> Sertifikalar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kurs tamamlama sertifikalarını yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/Settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" /> Şablon Ayarları
            </Button>
          </Link>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Sertifika
          </Button>
        </div>
      </div>

      {/* Active template banner */}
      {defaultTemplate ? (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Aktif Şablon: <span className="font-bold">{defaultTemplate.name}</span></p>
            <p className="text-xs text-amber-600">{defaultTemplate.school_name} · {defaultTemplate.template_style === 'marble_gold' ? 'Mermer & Altın' : defaultTemplate.template_style}</p>
          </div>
          {defaultTemplate.logo_url && (
            <img src={defaultTemplate.logo_url} alt="logo" className="h-8 w-auto object-contain" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-muted/40 border rounded-xl px-4 py-3">
          <Award className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Varsayılan şablon tanımlanmamış. <Link to="/Settings" className="text-primary underline">Şablon oluşturun →</Link></p>
        </div>
      )}

      {certificates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Henüz sertifika yok</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map(cert => {
            const student = students.find(s => s.id === cert.student_id);
            const course = courses.find(c => c.id === cert.course_id);
            return (
              <Card key={cert.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-500" />
                    </div>
                    <Badge variant="outline" className="text-xs">{cert.completion_date}</Badge>
                  </div>
                  <p className="font-semibold text-foreground">{student?.full_name || '—'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{course?.name || '—'}</p>
                  {course?.cefr_level && <Badge className="mt-2 text-xs">{course.cefr_level}</Badge>}
                  {cert.notes && <p className="text-xs text-muted-foreground mt-2 italic">{cert.notes}</p>}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button size="sm" className="flex-1" variant="outline" onClick={() => setPreviewCert(cert)}>
                      <Eye className="w-3 h-3 mr-1" /> Önizle
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => setCertPicker(cert)}>
                      <Download className="w-3 h-3 mr-1" /> İndir
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(cert.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {previewCert && (() => {
         const certStudent = students.find(s => s.id === previewCert.student_id);
         const certCourse = courses.find(c => c.id === previewCert.course_id);
         const tpl = defaultTemplate;
         return (
           <TemplatePickerDialog
             open={true}
             onClose={() => setPreviewCert(null)}
             templates={CERTIFICATE_TEMPLATES}
             title="Sertifika Önizleme"
             type="certificate"
             studentName={certStudent?.full_name}
             courseName={certCourse?.name}
             completionDate={previewCert.completion_date}
             logoUrl={tpl?.logo_url}
             schoolName={tpl?.school_name}
             signature1Name={tpl?.signature1_name}
             signature1Title={tpl?.signature1_title}
             signature2Name={tpl?.signature2_name}
             signature2Title={tpl?.signature2_title}
             isPreview={true}
             onDownload={() => {}}
           />
         );
       })()}

      {certPicker && (() => {
         const certStudent = students.find(s => s.id === certPicker.student_id);
         const certCourse = courses.find(c => c.id === certPicker.course_id);
         const tpl = defaultTemplate;
         return (
           <TemplatePickerDialog
             open={true}
             onClose={() => setCertPicker(null)}
             templates={CERTIFICATE_TEMPLATES}
             title="Sertifika Şablonu & Dil Seçin"
             type="certificate"
             studentName={certStudent?.full_name}
             courseName={certCourse?.name}
             completionDate={certPicker.completion_date}
             logoUrl={tpl?.logo_url}
             schoolName={tpl?.school_name}
             signature1Name={tpl?.signature1_name}
             signature1Title={tpl?.signature1_title}
             signature2Name={tpl?.signature2_name}
             signature2Title={tpl?.signature2_title}
             onDownload={(_, { lang }) => doDownload(certPicker, lang)}
           />
         );
       })()}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yeni Sertifika Oluştur</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Öğrenci *</Label>
              <SearchableSelect
                value={form.student_id}
                onValueChange={v => setForm({ ...form, student_id: v })}
                placeholder="Öğrenci ara / seçin..."
                options={students.map(s => ({ value: s.id, label: s.full_name, subtitle: s.email || '' }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kurs *</Label>
              <SearchableSelect
                value={form.course_id}
                onValueChange={v => setForm({ ...form, course_id: v })}
                placeholder="Kurs ara / seçin..."
                options={courses.map(c => ({ value: c.id, label: c.name, subtitle: c.cefr_level || '' }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tamamlanma Tarihi *</Label>
              <Input type="date" value={form.completion_date} onChange={e => setForm({ ...form, completion_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.student_id || !form.course_id || createMutation.isPending}>
                {createMutation.isPending ? 'Kaydediliyor...' : 'Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}