import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const defaultStudent = {
  full_name: '', email: '', phone: '', workplace_phone: '', profession: '',
  date_of_birth: '', passport_number: '', passport_expiry: '', nationality: '',
  address: '', postal_code: '', workplace_address: '', workplace_postal_code: '', relative_phone: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  status: 'enrolled', enrollment_status: 'not_started',
  enrollment_date: new Date().toISOString().split('T')[0],
  course_price: '', course_hours: '', source: '', notes: ''
};

export default function StudentFormDialog({ open, onOpenChange, student, onSave, existingStudents = [] }) {
  const [form, setForm] = useState(student || defaultStudent);
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

  React.useEffect(() => {
    setForm(student || defaultStudent);
  }, [student, open]);

  const handleSave = async () => {
    // Duplicate email check (only for new students)
    if (!student && form.email) {
      const emailLower = form.email.toLowerCase().trim();
      const dup = existingStudents.find(s => s.email?.toLowerCase() === emailLower);
      if (dup) {
        setEmailError(`Bu e-posta adresi zaten kayıtlı: ${dup.full_name}`);
        return;
      }
    }
    setEmailError('');
    setSaving(true);
    try {
      const data = {
        ...form,
        course_price: form.course_price !== '' && form.course_price !== null && form.course_price !== undefined
          ? parseFloat(form.course_price) || null
          : null,
        course_hours: form.course_hours !== '' && form.course_hours !== null && form.course_hours !== undefined
          ? parseFloat(form.course_hours) || null
          : null,
      };
      const savedStudent = await onSave(data);
      
      // Send invitation email for new students with email
      if (!student && form.email && savedStudent?.id) {
        const { base44 } = await import('@/api/base44Client');
        try {
          // Create or update UserSetup record
          const existingSetup = await base44.entities.UserSetup.filter({ email: form.email });
          let setupId;
          if (existingSetup.length === 0) {
            const created = await base44.entities.UserSetup.create({
              email: form.email,
              full_name: form.full_name,
              invited_role: 'student',
              invite_type: 'student',
              status: 'pending',
              setup_completed: false,
              invited_at: new Date().toISOString(),
            });
            setupId = created.id;
          } else {
            await base44.entities.UserSetup.update(existingSetup[0].id, {
              full_name: form.full_name,
              invited_role: 'student',
              status: 'pending',
              setup_completed: false,
              invited_at: new Date().toISOString(),
            });
            setupId = existingSetup[0].id;
          }
          
          // Send invitation email
          await base44.functions.invoke('sendInviteEmail', {
            email: form.email,
            full_name: form.full_name,
            invited_role: 'student',
            setup_id: setupId,
          });
        } catch (error) {
          console.warn('Failed to send invitation email:', error);
          // Don't fail the student creation if email sending fails
        }
      }
      
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const F = (field) => ({
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value }))
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Öğrenci Düzenle' : 'Yeni Öğrenci'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">

          {/* Temel Bilgiler */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Temel Bilgiler</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-sm">Ad Soyad *</Label>
                <Input className="mt-1" {...F('full_name')} placeholder="Örn: Ayşe Yılmaz" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Ev / Mobil Tel</Label>
                  <Input className="mt-1" {...F('phone')} placeholder="+44..." />
                </div>
                <div>
                  <Label className="text-sm">İş Telefonu</Label>
                  <Input className="mt-1" {...F('workplace_phone')} placeholder="+44..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">E-posta</Label>
                  <Input
                    className={`mt-1 ${emailError ? 'border-destructive' : ''}`}
                    type="email"
                    value={form.email || ''}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailError(''); }}
                  />
                  {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                </div>
                <div>
                  <Label className="text-sm">Meslek</Label>
                  <Input className="mt-1" {...F('profession')} placeholder="Meslek..." />
                </div>
              </div>
            </div>
          </div>

          {/* Ders Durumu */}
          <div className="space-y-3 border rounded-xl p-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ders Durumu</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Ders Durumu</Label>
                <Select
                  value={form.enrollment_status || 'not_started'}
                  onValueChange={v => setForm(f => ({ ...f, enrollment_status: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Ders Almadı</SelectItem>
                    <SelectItem value="started">Ders Aldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Kayıt Tarihi</Label>
                <Input className="mt-1" type="date" {...F('enrollment_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Kurs Ücreti (£)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.course_price || ''}
                  onChange={e => setForm(f => ({ ...f, course_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-sm">Ders Saati</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.course_hours || ''}
                  onChange={e => setForm(f => ({ ...f, course_hours: e.target.value }))}
                  placeholder="Örn: 12"
                />
              </div>
              <div>
                <Label className="text-sm">CEFR Seviyesi</Label>
                <Select value={form.cefr_level || ''} onValueChange={v => setForm(f => ({ ...f, cefr_level: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                  <SelectContent>
                    {['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Öğrenci Durumu</Label>
                <Select value={form.status || 'enrolled'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Kayıtlı</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="prospect">Görüşüldü</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Kaynak</Label>
              <Select value={form.source || ''} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="referral">Referans</SelectItem>
                  <SelectItem value="walk_in">Yüz yüze</SelectItem>
                  <SelectItem value="social_media">Sosyal Medya</SelectItem>
                </SelectContent>
              </Select>
              </div>
              </div>
              </div>

          {/* Kimlik Bilgileri */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kimlik Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Pasaport / Kimlik No</Label>
                <Input className="mt-1" {...F('passport_number')} />
              </div>
              <div>
                <Label className="text-sm">Pasaport Geçerlilik</Label>
                <Input className="mt-1" type="date" {...F('passport_expiry')} />
              </div>
              <div>
                <Label className="text-sm">Uyruk</Label>
                <Input className="mt-1" {...F('nationality')} placeholder="Türk, İngiliz..." />
              </div>
              <div>
                <Label className="text-sm">Doğum Tarihi</Label>
                <Input className="mt-1" type="date" {...F('date_of_birth')} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Ev Adresi</Label>
              <Input className="mt-1" {...F('address')} placeholder="Tam adres" />
              <Input className="mt-2" {...F('postal_code')} placeholder="Posta kodu (örn: SW1A 1AA)" />
            </div>
            <div>
              <Label className="text-sm">İş Adresi</Label>
              <Input className="mt-1" {...F('workplace_address')} placeholder="İş adresi" />
              <Input className="mt-2" {...F('workplace_postal_code')} placeholder="İş posta kodu" />
            </div>
            <div>
              <Label className="text-sm">Akraba / Yakın Telefonu</Label>
              <Input className="mt-1" {...F('relative_phone')} placeholder="+44..." />
            </div>
          </div>

          {/* Acil Durum */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acil Durum Kişisi</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-sm">Ad Soyad</Label>
                <Input className="mt-1" {...F('emergency_contact_name')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Telefon</Label>
                  <Input className="mt-1" {...F('emergency_contact_phone')} />
                </div>
                <div>
                  <Label className="text-sm">Yakınlık</Label>
                  <Input className="mt-1" {...F('emergency_contact_relation')} placeholder="Eş, kardeş..." />
                </div>
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div>
            <Label className="text-sm">Notlar</Label>
            <Textarea className="mt-1" {...F('notes')} rows={2} placeholder="Öğrenci hakkında not..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button className="flex-1" onClick={handleSave} disabled={!form.full_name || saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}