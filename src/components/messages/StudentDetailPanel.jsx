import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Phone, Mail, User, Calendar, Gift, FileText, TrendingUp, Award,
  DollarSign, BarChart3, Download, Plus, AlertCircle, MessageCircle, MailOpen, Star, Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import InvoicePreviewCanvas from '@/components/payments/InvoicePreviewCanvas';

const cefrColors = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700',
  C2: 'bg-purple-100 text-purple-700',
};

export default function StudentDetailPanel({ studentId, open, onOpenChange }) {
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  const shouldFetch = !!studentId && open;

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const allStudents = await base44.entities.Student.list();
      // Try to find by exact ID match first
      let found = allStudents.find(s => s.id === studentId);
      if (found) return found;
      // If studentId looks like a name, search by name
      found = allStudents.find(s => s.full_name?.toLowerCase() === studentId.toLowerCase());
      if (found) return found;
      // Otherwise return the first match
      return allStudents.length > 0 ? allStudents[0] : null;
    },
    enabled: shouldFetch,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: () => base44.entities.Payment.filter({ student_id: studentId }),
    enabled: shouldFetch,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    enabled: shouldFetch,
  });

  const { data: progressReports = [] } = useQuery({
    queryKey: ['student-progress', studentId],
    queryFn: () => base44.entities.ProgressReport.filter({ student_id: studentId }),
    enabled: shouldFetch,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['student-certificates', studentId],
    queryFn: () => base44.entities.Certificate.filter({ student_id: studentId }),
    enabled: shouldFetch,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['student-conversations', studentId],
    queryFn: () => base44.entities.Conversation.filter({ student_id: studentId }, '-last_message_at', 50),
    enabled: shouldFetch,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['student-messages', conversations],
    queryFn: async () => {
      if (conversations.length === 0) return [];
      const allMessages = [];
      for (const conv of conversations.slice(0, 5)) {
        const msgs = await base44.entities.Message.filter({ conversation_id: conv.id }, 'sent_at', 20);
        allMessages.push(...msgs);
      }
      return allMessages.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
    },
    enabled: shouldFetch && conversations.length > 0,
  });

  const { data: studentEmails = [] } = useQuery({
    queryKey: ['student-emails', studentId],
    queryFn: async () => {
      try {
        return await base44.entities.InboxEmail.filter({ student_id: studentId }, '-received_at', 30);
      } catch {
        return [];
      }
    },
    enabled: shouldFetch && !!studentId,
  });

  const createCertMutation = useMutation({
    mutationFn: (data) => base44.entities.Certificate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates', studentId] });
      setShowCertDialog(false);
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-payments', studentId] });
      setShowInvoiceDialog(false);
    },
  });

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

  // Payment reports
  const paymentStats = useMemo(() => {
    const now = new Date();
    const stats = {
      monthly: [],
      yearly: [],
      weekly: []
    };

    // Monthly
    const last12Months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now,
    });
    stats.monthly = last12Months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthPayments = payments.filter(p => {
        const date = new Date(p.payment_date || p.due_date || '');
        return isWithinInterval(date, { start, end }) && p.status === 'paid';
      });
      return {
        period: format(month, 'MMM yyyy'),
        amount: monthPayments.reduce((s, p) => s + (p.amount || 0), 0),
        count: monthPayments.length,
      };
    });

    // Yearly
    const currentYear = now.getFullYear();
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      const yearPayments = payments.filter(p => {
        const date = new Date(p.payment_date || p.due_date || '');
        return date.getFullYear() === year && p.status === 'paid';
      });
      stats.yearly.push({
        period: year.toString(),
        amount: yearPayments.reduce((s, p) => s + (p.amount || 0), 0),
        count: yearPayments.length,
      });
    }

    return stats;
  }, [payments]);

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);
  const lastReport = progressReports.length > 0 ? progressReports.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] : null;

  if (!shouldFetch || !student) return null;

  return (
    <div className="flex h-full gap-4">
      {/* Student Info Panel (Middle) */}
      <div className="w-80 border-r bg-background overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary">{student.full_name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{student.full_name}</h2>
              <Badge className={`text-xs mt-1 ${cefrColors[student.cefr_level] || 'bg-gray-100'}`}>
                {student.cefr_level}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="text-emerald-600 font-medium">Tahsil</p>
              <p className="font-bold text-emerald-700">£{totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <p className="text-amber-600 font-medium">Bekleyen</p>
              <p className="font-bold text-amber-700">£{totalPending.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-red-600 font-medium">Gecikmiş</p>
              <p className="font-bold text-red-700">£{totalOverdue.toLocaleString()}</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="space-y-2 pt-2 border-t">
            {[
              { id: 'overview', label: 'Özet' },
              { id: 'payments', label: 'Ödemeler' },
              { id: 'progress', label: 'İlerleme' },
              { id: 'messages', label: 'Mesajlar' },
              { id: 'emails', label: 'E-postalar' },
              { id: 'actions', label: 'İşlemler' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content (Right) */}
      <div className="flex-1 overflow-y-auto">

        <div className="p-4 space-y-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <section className="space-y-2 text-sm">
                <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> İletişim Bilgileri
                </h3>
                <div className="space-y-2">
                  {student.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{student.phone}</p>}
                  {student.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{student.email}</p>}
                  {student.enrollment_date && <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />Kayıt: {student.enrollment_date}</p>}
                </div>
              </section>

              <Separator />

              <section className="space-y-2 text-sm">
                <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Mali Özet
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-emerald-600 font-medium">Tahsil</p>
                    <p className="text-lg font-bold text-emerald-700">£{totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <p className="text-xs text-amber-600 font-medium">Bekleyen</p>
                    <p className="text-lg font-bold text-amber-700">£{totalPending.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-xs text-red-600 font-medium">Gecikmiş</p>
                    <p className="text-lg font-bold text-red-700">£{totalOverdue.toLocaleString()}</p>
                  </div>
                </div>
              </section>

              <Separator />

              {lastReport && (
                <section className="space-y-2 text-sm">
                  <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Son İlerleme
                  </h3>
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="font-medium">{lastReport.period}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-muted-foreground">Konuşma</p>
                        <p className="font-bold">{lastReport.speaking}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Dinleme</p>
                        <p className="font-bold">{lastReport.listening}/10</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground">Okuma</p>
                        <p className="font-bold">{lastReport.reading}/10</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {/* Paid Payments */}
              <section className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-emerald-600">Ödenen Ödemeler</h3>
                <div className="space-y-2">
                  {payments
                    .filter(p => p.status === 'paid')
                    .slice()
                    .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0))
                    .map(p => (
                      <div key={p.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-foreground">{courseMap[p.course_id]?.name || 'Kurs'}</span>
                          <span className="font-bold text-emerald-700">£{p.amount?.toLocaleString()}</span>
                        </div>
                        <p className="text-muted-foreground">
                          {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : ''}
                        </p>
                      </div>
                    ))}
                  {payments.filter(p => p.status === 'paid').length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">Ödenen ödeme yok</p>
                  )}
                </div>
              </section>

              <Separator />

              {/* Pending & Overdue Payments */}
              <section className="space-y-2">
                <h3 className="font-semibold text-xs uppercase tracking-wide text-amber-600">Ödenecek Ödemeler</h3>
                <div className="space-y-2">
                  {payments
                    .filter(p => p.status === 'pending' || p.status === 'overdue')
                    .slice()
                    .sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0))
                    .map(p => (
                      <div key={p.id} className={`rounded-lg border p-3 text-xs ${p.status === 'overdue' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-foreground">{courseMap[p.course_id]?.name || 'Kurs'}</span>
                          <span className={`font-bold ${p.status === 'overdue' ? 'text-red-700' : 'text-amber-700'}`}>£{p.amount?.toLocaleString()}</span>
                        </div>
                        <p className="text-muted-foreground">
                          {p.due_date ? format(new Date(p.due_date), 'dd MMM yyyy') : p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : ''}
                        </p>
                        {p.status === 'overdue' && (
                          <Badge className="mt-2 bg-red-600 text-white text-xs">Gecikmiş</Badge>
                        )}
                      </div>
                    ))}
                  {payments.filter(p => p.status === 'pending' || p.status === 'overdue').length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">Ödenecek ödeme yok</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            progressReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">İlerleme raporu bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {progressReports
                  .slice()
                  .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                  .map(report => (
                    <Card key={report.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          {report.period}
                          {report.ready_for_next_level && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Sonraki Seviye</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Konuşma', value: report.speaking },
                            { label: 'Dinleme', value: report.listening },
                            { label: 'Okuma', value: report.reading },
                            { label: 'Yazma', value: report.writing },
                          ].map(skill => (
                            <div key={skill.label}>
                              <div className="flex justify-between mb-1">
                                <p className="text-xs text-muted-foreground">{skill.label}</p>
                                <p className="text-xs font-semibold">{skill.value}/10</p>
                              </div>
                              <Progress value={(skill.value || 0) * 10} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                        {report.teacher_comments && (
                          <div className="pt-2 border-t text-xs">
                            <p className="text-muted-foreground mb-1">Öğretmen Yorumu</p>
                            <p>{report.teacher_comments}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                  )
                  )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Konuşma bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map(conv => (
                   <div key={conv.id} className="rounded-lg border p-3 space-y-2 text-sm">
                     <div className="flex items-center justify-between">
                       <p className="font-medium text-xs">{conv.channel?.toUpperCase()}</p>
                       <p className="text-xs text-muted-foreground">
                         {conv.last_message_at ? format(new Date(conv.last_message_at), 'dd MMM HH:mm') : ''}
                       </p>
                     </div>
                     <p className="text-xs text-muted-foreground truncate">{conv.last_message || 'No messages'}</p>
                   </div>
                 ))}
               </div>
            )
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            studentEmails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MailOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">E-posta bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {studentEmails.map(email => (
                  <div key={email.id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-xs text-muted-foreground">{email.from_name || email.from_email}</p>
                      </div>
                      {email.starred && <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(email.received_at), 'dd MMM HH:mm')}
                    </p>
                  </div>
                ))}
                </div>
                )
                )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <section className="space-y-3">
              <h3 className="font-semibold text-sm">Hızlı İşlemler</h3>

              {/* Create Certificate */}
              <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <Award className="w-4 h-4" /> Sertifika Oluştur
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sertifika Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="course">Kurs</Label>
                      <Select>
                        <SelectTrigger id="course">
                          <SelectValue placeholder="Kurs seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date">Tamamlanma Tarihi</Label>
                      <Input type="date" id="date" />
                    </div>
                    <Button
                      onClick={() => {
                        const courseId = document.querySelector('[id="course"]')?.value;
                        const date = document.querySelector('[id="date"]')?.value;
                        if (courseId && date) {
                          createCertMutation.mutate({
                            student_id: studentId,
                            course_id: courseId,
                            completion_date: date,
                          });
                        }
                      }}
                      className="w-full"
                    >
                      Sertifika Oluştur
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Create Invoice */}
              <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="w-4 h-4" /> Fatura Kes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Fatura Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Form */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="inv-course">Kurs</Label>
                        <Select>
                          <SelectTrigger id="inv-course">
                            <SelectValue placeholder="Kurs seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Tutar (£)</Label>
                        <Input type="number" id="amount" placeholder="0.00" />
                      </div>
                      <div>
                        <Label htmlFor="inv-date">Fatura Tarihi</Label>
                        <Input type="date" id="inv-date" />
                      </div>
                      <div>
                        <Label htmlFor="inv-template">Şablon</Label>
                        <Select defaultValue="classic_blue">
                          <SelectTrigger id="inv-template">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classic_blue">Klasik Mavi</SelectItem>
                            <SelectItem value="modern_minimal">Modern Minimal</SelectItem>
                            <SelectItem value="warm_professional">Sıcak Profesyonel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => {
                          const courseId = document.querySelector('[id="inv-course"]')?.value;
                          const amount = parseFloat(document.querySelector('[id="amount"]')?.value || 0);
                          const date = document.querySelector('[id="inv-date"]')?.value;
                          if (courseId && amount && date) {
                            createInvoiceMutation.mutate({
                              student_id: studentId,
                              course_id: courseId,
                              total_amount: amount,
                              issue_date: date,
                              invoice_number: `INV-${Date.now()}`,
                              status: 'draft',
                            });
                          }
                        }}
                        className="w-full"
                      >
                        Fatura Oluştur
                      </Button>
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ÖNIZLEME</Label>
                      <div className="h-80 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                        <InvoicePreviewCanvas
                          template={document.querySelector('[id="inv-template"]')?.value || 'classic_blue'}
                          logoUrl=""
                          schoolName="Güneş English School"
                          studentName={student?.full_name}
                          studentEmail={student?.email}
                          courseName={courses.find(c => c.id === document.querySelector('[id="inv-course"]')?.value)?.name}
                          amount={document.querySelector('[id="amount"]')?.value || 0}
                          invoiceDate={document.querySelector('[id="inv-date"]')?.value}
                          dueDate=""
                          status="draft"
                          lang="tr"
                        />
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Certificates List */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Sertifikalar ({certificates.length})</h4>
                <div className="space-y-2">
                  {certificates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sertifika yok</p>
                  ) : (
                    certificates.map(cert => (
                      <div key={cert.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                        <span>{courseMap[cert.course_id]?.name || 'Kurs'}</span>
                        <Badge variant="secondary">{format(new Date(cert.completion_date), 'dd MMM yyyy')}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}