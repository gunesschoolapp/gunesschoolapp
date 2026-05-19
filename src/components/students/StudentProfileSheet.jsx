import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Mail, User, Calendar, GraduationCap, CreditCard, Gift, FileText, TrendingUp, BookOpen, Award, Edit2, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

const cefrColors = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700',
  C2: 'bg-purple-100 text-purple-700',
};

const statusColors = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const statusLabels = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', cancelled: 'Cancelled' };
const methodLabels = { cash: 'Cash', credit_card: 'Credit Card', bank_transfer: 'Bank Transfer', other: 'Other' };

export default function StudentProfileSheet({ student, open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [editedStudent, setEditedStudent] = useState(null);

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', student?.id],
    queryFn: () => base44.entities.Payment.filter({ student_id: student.id }),
    enabled: !!student?.id && open,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    enabled: open,
  });

  const { data: progressReports = [] } = useQuery({
    queryKey: ['progressReports', student?.id],
    queryFn: () => base44.entities.ProgressReport.filter({ student_id: student.id }),
    enabled: !!student?.id && open,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', student?.id],
    queryFn: () => base44.entities.Certificate.filter({ student_id: student.id }),
    enabled: !!student?.id && open,
  });

  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.update(student.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setEditMode(false);
    },
  });

  React.useEffect(() => {
    if (open && student) {
      setEditedStudent(student);
    }
  }, [open, student]);

  if (!student) return null;

  const handleSave = async () => {
    if (editedStudent) {
      await updateMutation.mutateAsync(editedStudent);
    }
  };

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
  const enrolledCourses = courses.filter(c => c.enrolled_students?.includes(student.id));
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);

  const scholarshipLabel = student.scholarship && student.scholarship !== 'none'
    ? `${student.scholarship}% Scholarship`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {student.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{editMode ? (
                  <input 
                    type="text" 
                    value={editedStudent?.full_name || ''} 
                    onChange={(e) => setEditedStudent({...editedStudent, full_name: e.target.value})}
                    className="border rounded px-2 py-1"
                  />
                ) : student.full_name}</SheetTitle>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} className="p-1 hover:bg-muted rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge className={`text-xs ${cefrColors[student.cefr_level] || 'bg-gray-100'}`}>
                    {student.cefr_level}
                  </Badge>
                  {scholarshipLabel && (
                    <Badge className="text-xs bg-amber-100 text-amber-700">
                      <Gift className="w-3 h-3 mr-1" />{scholarshipLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {editMode && (
              <div className="flex gap-2">
                <button onClick={handleSave} className="p-2 hover:bg-muted rounded">
                  <Check className="w-4 h-4 text-green-600" />
                </button>
                <button onClick={() => setEditMode(false)} className="p-2 hover:bg-muted rounded">
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4 h-auto">
            <TabsTrigger value="info" className="text-xs flex flex-col items-center gap-1 py-2">
              <User className="w-4 h-4" />
              <span className="text-xs">Bilgi</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-xs flex flex-col items-center gap-1 py-2">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs">Kurslar</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs flex flex-col items-center gap-1 py-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Ödemeler</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs flex flex-col items-center gap-1 py-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">İlerleme</span>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="text-xs flex flex-col items-center gap-1 py-2">
              <Award className="w-4 h-4" />
              <span className="text-xs">Sertifikalar</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
           <TabsContent value="info" className="space-y-4">
            <div className="space-y-4 text-sm">
              {/* Kişisel Bilgiler */}
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-3">Kişisel Bilgiler</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Doğum Tarihi</p>
                    {editMode ? (
                      <input 
                        type="date"
                        value={editedStudent?.date_of_birth || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, date_of_birth: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm mt-1"
                      />
                    ) : (
                      <p className="font-medium text-sm">{editedStudent?.date_of_birth || '-'}</p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Uyruk</p>
                    {editMode ? (
                      <input 
                        type="text"
                        value={editedStudent?.nationality || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, nationality: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm mt-1"
                      />
                    ) : (
                      <p className="font-medium text-sm">{editedStudent?.nationality || '-'}</p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Pasaport No</p>
                    {editMode ? (
                      <input 
                        type="text"
                        value={editedStudent?.passport_number || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, passport_number: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm mt-1"
                      />
                    ) : (
                      <p className="font-medium text-sm">{editedStudent?.passport_number || '-'}</p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Pasaport Sona Eriş</p>
                    {editMode ? (
                      <input 
                        type="date"
                        value={editedStudent?.passport_expiry || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, passport_expiry: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm mt-1"
                      />
                    ) : (
                      <p className="font-medium text-sm">{editedStudent?.passport_expiry || '-'}</p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Adres</p>
                    {editMode ? (
                      <input 
                        type="text"
                        value={editedStudent?.address || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, address: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm mt-1"
                      />
                    ) : (
                      <p className="font-medium text-sm">{editedStudent?.address || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* İletişim */}
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-3">İletişim</h4>
                <div className="space-y-2">
                  <div className={editMode ? "border rounded p-2" : ""}>
                    <label className="text-xs text-muted-foreground">Telefon</label>
                    {editMode ? (
                      <input 
                        type="tel"
                        value={editedStudent?.phone || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, phone: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm"
                      />
                    ) : (
                      <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{editedStudent?.phone || '-'}</p>
                    )}
                  </div>
                  <div className={editMode ? "border rounded p-2" : ""}>
                    <label className="text-xs text-muted-foreground">E-mail</label>
                    {editMode ? (
                      <input 
                        type="email"
                        value={editedStudent?.email || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, email: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm"
                      />
                    ) : (
                      <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{editedStudent?.email || '-'}</p>
                    )}
                  </div>
                  <div className={editMode ? "border rounded p-2" : ""}>
                    <label className="text-xs text-muted-foreground">Kayıt Tarihi</label>
                    {editMode ? (
                      <input 
                        type="date"
                        value={editedStudent?.enrollment_date || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, enrollment_date: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm"
                      />
                    ) : (
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {editedStudent?.enrollment_date || '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Acil Durum */}
              {(student.emergency_contact_name || student.emergency_contact_phone) && (
                <>
                  <div>
                    <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-3">Acil Durum</h4>
                    <div className="space-y-2 text-sm">
                      {student.emergency_contact_name && <p><span className="text-muted-foreground">Ad:</span> {student.emergency_contact_name}</p>}
                      {student.emergency_contact_relation && <p><span className="text-muted-foreground">İlişki:</span> {student.emergency_contact_relation}</p>}
                      {student.emergency_contact_phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{student.emergency_contact_phone}</p>}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Akademik Bilgi */}
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-3">Akademik</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Mevcut Seviye</p>
                    <Badge className={`mt-1 ${cefrColors[student.cefr_level] || 'bg-gray-100'}`}>
                      {student.cefr_level}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">İlgi Seviyesi</p>
                    <Badge className="mt-1 bg-blue-100 text-blue-700">
                      {student.interest_level || 'Bilinmiyor'}
                    </Badge>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Durum</p>
                    <p className="font-medium text-sm mt-1">{student.status}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Atanan Personel</p>
                    {editMode ? (
                      <input 
                        type="text"
                        value={editedStudent?.assigned_to || ''}
                        onChange={(e) => setEditedStudent({...editedStudent, assigned_to: e.target.value})}
                        className="border rounded px-2 py-1 w-full text-sm mt-1"
                        placeholder="Personel adı veya e-postası"
                      />
                    ) : (
                      <p className="font-medium text-sm mt-1">{editedStudent?.assigned_to || '—'}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Burs & İndirimler */}
              <div>
                <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-3">Burs & İndirimler</h4>
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Burs</span>
                    <span className="font-medium">
                      {student.scholarship && student.scholarship !== 'none'
                        ? `%${student.scholarship}`
                        : '—'}
                    </span>
                  </div>
                  {student.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sabit İndirim</span>
                      <span className="font-medium">£{student.discount_amount}</span>
                    </div>
                  )}
                  {student.scholarship_notes && (
                    <p className="text-xs text-muted-foreground pt-2 border-t">{student.scholarship_notes}</p>
                  )}
                  {!scholarshipLabel && !student.discount_amount && (
                    <p className="text-muted-foreground text-xs">Burs veya indirim uygulanmadı.</p>
                  )}
                </div>
              </div>

              {student.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-2">Notlar</h4>
                    <p className="text-muted-foreground text-sm">{student.notes}</p>
                  </div>
                </>
              )}
            </div>
           </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <div className="space-y-2 text-sm">
              {enrolledCourses.length === 0 ? (
                <p className="text-muted-foreground py-4">Kayıtlı kurs yok.</p>
              ) : (
                <div className="space-y-2">
                  {enrolledCourses.map(course => (
                    <div key={course.id} className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{course.name}</p>
                          <p className="text-xs text-muted-foreground">{course.cefr_level}</p>
                        </div>
                        <Badge className={`text-xs ${
                          course.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          course.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                          course.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {course.status}
                        </Badge>
                      </div>
                      {course.teacher && <p className="text-xs text-muted-foreground">Öğretmen: {course.teacher}</p>}
                      {course.schedule && <p className="text-xs text-muted-foreground">Saat: {course.schedule}</p>}
                      {course.room && <p className="text-xs text-muted-foreground">Yer: {course.room}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium">Ödendi</p>
                <p className="text-lg font-bold text-emerald-700">£{totalPaid.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-xs text-amber-600 font-medium">Beklemede</p>
                <p className="text-lg font-bold text-amber-700">£{totalPending.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-xs text-red-600 font-medium">Gecikmiş</p>
                <p className="text-lg font-bold text-red-700">£{totalOverdue.toLocaleString()}</p>
              </div>
            </div>

            {payments.length === 0 ? (
              <p className="text-muted-foreground text-xs py-2">Ödeme kaydı bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                {payments
                  .slice()
                  .sort((a, b) => new Date(b.payment_date || b.due_date || 0) - new Date(a.payment_date || a.due_date || 0))
                  .map(p => (
                    <div key={p.id} className="rounded-lg border p-3 flex items-center justify-between gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-xs">
                          {courseMap[p.course_id]?.name || 'Kurs'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.installment_number && p.total_installments
                            ? `Taksit ${p.installment_number}/${p.total_installments} · `
                            : ''}
                          {methodLabels[p.payment_method] || ''}
                          {p.payment_date ? ` · ${p.payment_date}` : p.due_date ? ` · Vade: ${p.due_date}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">£{(p.amount || 0).toLocaleString()}</p>
                        <Badge className={`text-xs ${statusColors[p.status] || 'bg-gray-100'}`}>
                          {statusLabels[p.status] || p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            {progressReports.length === 0 ? (
              <p className="text-muted-foreground text-xs py-2">Henüz rapor yok.</p>
            ) : (
              <div className="space-y-4">
                {progressReports
                  .slice()
                  .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
                  .map(report => (
                    <div key={report.id} className="rounded-lg border p-4 space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">{report.period}</p>
                        {report.ready_for_next_level && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                            Sonraki Seviye Hazır
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Konuşma', value: report.speaking },
                          { label: 'Dinleme', value: report.listening },
                          { label: 'Okuma', value: report.reading },
                          { label: 'Yazma', value: report.writing },
                          { label: 'Dilbilgisi', value: report.grammar },
                          { label: 'Kelime', value: report.vocabulary },
                        ].map(skill => (
                          <div key={skill.label}>
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-xs text-muted-foreground">{skill.label}</p>
                              <p className="text-xs font-semibold">{skill.value}/10</p>
                            </div>
                            <Progress value={(skill.value || 0) * 10} className="h-1.5" />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded bg-muted p-2">
                          <p className="text-xs text-muted-foreground">Devam</p>
                          <p className="text-sm font-semibold">{report.attendance_rate || 0}%</p>
                        </div>
                        <div className="rounded bg-muted p-2">
                          <p className="text-xs text-muted-foreground">Ödev</p>
                          <p className="text-sm font-semibold">{report.homework_completion || 0}%</p>
                        </div>
                      </div>

                      {report.teacher_comments && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Öğretmen Yorumu</p>
                          <p className="text-xs text-foreground">{report.teacher_comments}</p>
                        </div>
                      )}

                      {report.recommended_level && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Önerilen Seviye</p>
                          <Badge className="mt-1 bg-primary/10 text-primary">{report.recommended_level}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-4">
            {certificates.length === 0 ? (
              <p className="text-muted-foreground text-xs py-2">Sertifika bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                {certificates
                  .slice()
                  .sort((a, b) => new Date(b.completion_date || 0) - new Date(a.completion_date || 0))
                  .map(cert => (
                    <div key={cert.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-semibold">{courseMap[cert.course_id]?.name || 'Kurs'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Tamamlanma: {cert.completion_date}</p>
                      {cert.notes && <p className="text-xs text-foreground mt-2">{cert.notes}</p>}
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>


      </SheetContent>
    </Sheet>
  );
}