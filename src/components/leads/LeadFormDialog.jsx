import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const defaultLead = {
  full_name: '', email: '', phone: '', date_of_birth: '', nationality: '',
  passport_number: '', passport_expiry: '', address: '', source: 'website',
  status: 'new', interest_level: 'unknown', notes: '', assigned_to: '', 
  potential_sale_amount: '', course_id: '', last_contact_date: ''
};

export default function LeadFormDialog({ open, onOpenChange, lead, onSave }) {
  const [form, setForm] = useState(lead || defaultLead);
  const [saving, setSaving] = useState(false);
  const [studentData, setStudentData] = useState({
    enrollment_date: new Date().toISOString().split('T')[0],
    scholarship: 'none'
  });

  const { data: salesStaff = [] } = useQuery({
    queryKey: ['salesStaff'],
    queryFn: () => base44.entities.SalesStaff.list(),
    enabled: open,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
    enabled: open,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      setForm(lead || defaultLead);
      setStudentData({
        enrollment_date: new Date().toISOString().split('T')[0],
        scholarship: 'none'
      });
    }
  }, [open, lead]);

  const handleCourseChange = (courseId) => {
    setForm({...form, course_id: courseId});
    const selectedCourse = courses.find(c => c.id === courseId);
    if (selectedCourse && selectedCourse.price) {
      setForm(prev => ({...prev, potential_sale_amount: selectedCourse.price}));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  const handleSaveAndConvert = async () => {
    setSaving(true);
    await onSave(form);
    
    // Lead'i öğrenciye dönüştür
    if (lead) {
      try {
        await base44.entities.Student.create({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          date_of_birth: form.date_of_birth,
          nationality: form.nationality,
          passport_number: form.passport_number,
          passport_expiry: form.passport_expiry,
          address: form.address,
          enrollment_date: studentData.enrollment_date,
          cefr_level: studentData.cefr_level,
          status: 'enrolled',
          scholarship: studentData.scholarship,
          notes: form.notes,
          source: form.source
        });
      } catch (err) {
        console.error('Öğrenci oluşturma hatası:', err);
      }
    }
    
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Lead Düzenle' : 'Yeni Lead Ekle'}</DialogTitle>
        </DialogHeader>

        {lead ? (
          // Lead düzenle - Tab yapısı
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Lead Detayları</TabsTrigger>
              <TabsTrigger value="convert">Öğrenciye Dönüştür</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ad Soyad *</Label>
                  <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kurs Seç</Label>
                  <Select value={form.course_id} onValueChange={handleCourseChange}>
                    <SelectTrigger><SelectValue placeholder="Kurs seçin" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                         <SelectItem key={course.id} value={course.id}>
                           {course.name}
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Potansiyel Satış Miktarı (£)</Label>
                  <Input type="number" value={form.potential_sale_amount} onChange={e => setForm({...form, potential_sale_amount: e.target.value})} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doğum Tarihi</Label>
                  <Input type="date" value={form.date_of_birth || ''} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Uyruk</Label>
                  <Input value={form.nationality || ''} onChange={e => setForm({...form, nationality: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pasaport / Kimlik No</Label>
                  <Input value={form.passport_number || ''} onChange={e => setForm({...form, passport_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Pasaport Geçerlilik Tarihi</Label>
                  <Input type="date" value={form.passport_expiry || ''} onChange={e => setForm({...form, passport_expiry: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Atanan Personel</Label>
                  <Select value={form.assigned_to} onValueChange={v => setForm({...form, assigned_to: v})}>
                    <SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                    <SelectContent>
                      {salesStaff.map(staff => (
                        <SelectItem key={staff.id} value={staff.full_name}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                      {teachers.length > 0 && salesStaff.length > 0 && <Separator className="my-1" />}
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.full_name}>
                          {teacher.full_name} (Öğretmen)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kaynak</Label>
                <Select value={form.source} onValueChange={v => setForm({...form, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="referral">Referans</SelectItem>
                    <SelectItem value="walk_in">Yüz yüze</SelectItem>
                    <SelectItem value="social_media">Sosyal Medya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Son Konuşma Tarihi</Label>
                <Input type="date" value={form.last_contact_date || ''} onChange={e => setForm({...form, last_contact_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Pipeline Durumu</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Yeni Lead</SelectItem>
                    <SelectItem value="contacted">Görüşüldü</SelectItem>
                    <SelectItem value="negotiation">Teklif Verildi</SelectItem>
                    <SelectItem value="trial_scheduled">Kararsız</SelectItem>
                    <SelectItem value="enrolled">Kayıt Oldu</SelectItem>
                    <SelectItem value="lost">Kayıp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                <Button onClick={handleSave} disabled={!form.full_name || saving}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="convert" className="space-y-4 mt-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Bu lead kaydedildikten sonra aşağıdaki bilgilerle öğrenci olarak sisteme eklenecektir.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="text-sm font-semibold">Öğrenci Bilgileri</div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ad Soyad</Label>
                    <div className="text-sm font-medium p-2 bg-background rounded border">
                      {form.full_name || '—'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <div className="text-sm font-medium p-2 bg-background rounded border">
                      {form.phone || '—'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-posta</Label>
                  <div className="text-sm font-medium p-2 bg-background rounded border">
                    {form.email || '—'}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kayıt Tarihi *</Label>
                  <Input
                    type="date"
                    value={studentData.enrollment_date}
                    onChange={e => setStudentData({...studentData, enrollment_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Burs</Label>
                  <Select value={studentData.scholarship} onValueChange={v => setStudentData({...studentData, scholarship: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Burs Yok</SelectItem>
                      <SelectItem value="25">%25 Burs</SelectItem>
                      <SelectItem value="50">%50 Burs</SelectItem>
                      <SelectItem value="75">%75 Burs</SelectItem>
                      <SelectItem value="100">%100 Burs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notlar</Label>
                  <div className="text-sm text-muted-foreground p-2 bg-background rounded border min-h-16">
                    {form.notes || '—'}
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  "Lead Kaydet + Öğrenci Oluştur" düğmesine basınca lead kaydedilecek ve aynı anda yeni öğrenci profili oluşturulacaktır. Öğrenci ve lead iki ayrı varlık olarak kaydedilecek, ikisi de sorgulanabilecektir.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                <Button onClick={handleSaveAndConvert} disabled={!form.full_name || saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? 'İşlem yapılıyor...' : '✓ Lead + Öğrenci Oluştur'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Yeni lead ekleme
          <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ad Soyad *</Label>
              <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-posta</Label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="space-y-2">
           <Label>Kurs Seç</Label>
           <Select value={form.course_id} onValueChange={handleCourseChange}>
             <SelectTrigger><SelectValue placeholder="Kurs seçin" /></SelectTrigger>
             <SelectContent>
               {courses.map(course => (
                 <SelectItem key={course.id} value={course.id}>
                   {course.name}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
          </div>
          <div className="space-y-2">
           <Label>Potansiyel Satış Miktarı (£)</Label>
           <Input type="number" value={form.potential_sale_amount} onChange={e => setForm({...form, potential_sale_amount: e.target.value})} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Doğum Tarihi</Label>
              <Input type="date" value={form.date_of_birth || ''} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Uyruk</Label>
              <Input value={form.nationality || ''} onChange={e => setForm({...form, nationality: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pasaport / Kimlik No</Label>
              <Input value={form.passport_number || ''} onChange={e => setForm({...form, passport_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Pasaport Geçerlilik Tarihi</Label>
              <Input type="date" value={form.passport_expiry || ''} onChange={e => setForm({...form, passport_expiry: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Adres</Label>
            <Input value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
            <div className="space-y-2">
              <Label>Atanan Personel</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm({...form, assigned_to: v})}>
                <SelectTrigger><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                <SelectContent>
                  {salesStaff.map(staff => (
                    <SelectItem key={staff.id} value={staff.full_name}>
                      {staff.full_name}
                    </SelectItem>
                  ))}
                  {teachers.length > 0 && salesStaff.length > 0 && <Separator className="my-1" />}
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.full_name}>
                      {teacher.full_name} (Öğretmen)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kaynak</Label>
              <Select value={form.source} onValueChange={v => setForm({...form, source: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="referral">Referans</SelectItem>
                  <SelectItem value="walk_in">Yüz yüze</SelectItem>
                  <SelectItem value="social_media">Sosyal Medya</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2">
                <Label>Son Konuşma Tarihi</Label>
                <Input type="date" value={form.last_contact_date || ''} onChange={e => setForm({...form, last_contact_date: e.target.value})} />
              </div>
            <div className="space-y-2">
              <Label>Pipeline Durumu</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Yeni Lead</SelectItem>
                  <SelectItem value="contacted">Görüşüldü</SelectItem>
                  <SelectItem value="negotiation">Teklif Verildi</SelectItem>
                  <SelectItem value="trial_scheduled">Kararsız</SelectItem>
                  <SelectItem value="enrolled">Kayıt Oldu</SelectItem>
                  <SelectItem value="lost">Kayıp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button onClick={handleSave} disabled={!form.full_name || saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}