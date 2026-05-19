import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CreditCard, AlertCircle, CheckCircle, Clock, Download, BarChart3, Eye } from 'lucide-react';
import { generateInvoicePDF, INVOICE_TEMPLATES } from '@/components/payments/InvoiceGenerator';
import TemplatePickerDialog from '@/components/TemplatePickerDialog';
import SearchableSelect from '@/components/SearchableSelect';
import InvoicePreviewCanvas from '@/components/payments/InvoicePreviewCanvas';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import StatCard from '@/components/dashboard/StatCard';
import { useLang } from '@/components/LanguageContext';

export default function Payments() {
  const { t } = useLang();
  const statusConfig = {
    paid: { label: t('payStatusPaid'), color: 'bg-emerald-100 text-emerald-700' },
    pending: { label: t('payStatusPending'), color: 'bg-amber-100 text-amber-700' },
    overdue: { label: t('payStatusOverdue'), color: 'bg-red-100 text-red-700' },
    cancelled: { label: t('payStatusCancelled'), color: 'bg-gray-100 text-gray-700' },
  };
  const methodLabels = { cash: t('methodCash'), credit_card: t('methodCard'), bank_transfer: t('methodTransfer'), other: t('methodOther') };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    student_id: '', course_id: '', amount: 0, payment_date: '', due_date: '',
    status: 'pending', payment_method: 'cash', installment_number: 1, total_installments: 1, notes: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [invoicePicker, setInvoicePicker] = useState(null); // payment object
  const [previewPayment, setPreviewPayment] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list('-created_date') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Payment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);

  const getStudentName = (id) => students.find(s => s.id === id)?.full_name || '-';
  const getCourseName = (id) => courses.find(c => c.id === id)?.name || '-';

  const handleStudentChange = (studentId) => {
    const student = students.find(s => s.id === studentId);
    const enrolledCourse = student ? courses.find(c => c.enrolled_students?.includes(studentId)) : null;
    setForm({
      ...form,
      student_id: studentId,
      course_id: enrolledCourse?.id || '',
      amount: enrolledCourse?.price || 0,
    });
  };

  const filtered = filterStatus === 'all' ? payments : payments.filter(p => p.status === filterStatus);

  // Report data
  const reportData = useMemo(() => {
    const now = new Date();
    const last12Months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now,
    });

    const monthlyReport = last12Months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthPayments = payments.filter(p => {
        const date = new Date(p.payment_date || p.due_date || '');
        return isWithinInterval(date, { start, end });
      });
      return {
        period: format(month, 'MMM yyyy'),
        paid: monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
        pending: monthPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
        overdue: monthPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0),
        total: monthPayments.length,
      };
    });

    const weeklyReport = [];
    const weeks = 12;
    for (let i = weeks - 1; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - (i * 7));
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const weekPayments = payments.filter(p => {
        const date = new Date(p.payment_date || p.due_date || '');
        return isWithinInterval(date, { start, end });
      });
      weeklyReport.push({
        period: `${format(start, 'dd MMM')} - ${format(end, 'dd MMM')}`,
        paid: weekPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
        pending: weekPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
        overdue: weekPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0),
        total: weekPayments.length,
      });
    }

    const currentYear = now.getFullYear();
    const yearlyReport = [];
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      const yearPayments = payments.filter(p => {
        const date = new Date(p.payment_date || p.due_date || '');
        return date.getFullYear() === year;
      });
      yearlyReport.push({
        period: year.toString(),
        paid: yearPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
        pending: yearPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
        overdue: yearPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0),
        total: yearPayments.length,
      });
    }

    return { monthlyReport, weeklyReport, yearlyReport };
  }, [payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('paymentsTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('paymentsSubtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t('newPayment')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Paid" value={`£${totalPaid.toLocaleString('en-GB')}`} icon={CheckCircle} color="green" />
        <StatCard title="Pending" value={`£${totalPending.toLocaleString('en-GB')}`} icon={Clock} color="amber" />
        <StatCard title="Overdue" value={`£${totalOverdue.toLocaleString('en-GB')}`} icon={AlertCircle} color="red" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="list">Listesi</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Raporlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('paymentList')}</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="paid">{t('payStatusPaid')}</SelectItem>
              <SelectItem value="pending">{t('payStatusPending')}</SelectItem>
              <SelectItem value="overdue">{t('payStatusOverdue')}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('student')}</TableHead>
                  <TableHead>{t('course')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('dueDate')}</TableHead>
                  <TableHead>{t('instalment')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('noPaymentsFound')}</TableCell></TableRow>
                ) : (
                  filtered.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{getStudentName(payment.student_id)}</TableCell>
                      <TableCell>{getCourseName(payment.course_id)}</TableCell>
                      <TableCell className="font-semibold">£{payment.amount?.toLocaleString('en-GB')}</TableCell>
                      <TableCell>{payment.due_date || '-'}</TableCell>
                      <TableCell>{payment.installment_number}/{payment.total_installments}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusConfig[payment.status]?.color}`}>
                          {statusConfig[payment.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {payment.status !== 'paid' && (
                            <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: payment.id, data: { ...payment, status: 'paid', payment_date: format(new Date(), 'yyyy-MM-dd') } })}>
                              {t('markPaid')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title={t('previewInvoice')}
                            onClick={() => setPreviewPayment(payment)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title={t('downloadInvoice')}
                            onClick={() => setInvoicePicker(payment)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Monthly Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('monthlyReports')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('period')}</TableHead>
                        <TableHead className="text-right">{t('collected')}</TableHead>
                        <TableHead className="text-right">{t('pending')}</TableHead>
                        <TableHead className="text-right">{t('overdue')}</TableHead>
                        <TableHead className="text-right">{t('transactionCount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.monthlyReport.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.period}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">£{row.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-600 font-semibold">£{row.pending.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">£{row.overdue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('weeklyReports')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dates')}</TableHead>
                        <TableHead className="text-right">{t('collected')}</TableHead>
                        <TableHead className="text-right">{t('pending')}</TableHead>
                        <TableHead className="text-right">{t('overdue')}</TableHead>
                        <TableHead className="text-right">{t('transactionCount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.weeklyReport.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-xs">{row.period}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">£{row.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-600 font-semibold">£{row.pending.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">£{row.overdue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Yearly Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('yearlyReports')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('year')}</TableHead>
                        <TableHead className="text-right">{t('collected')}</TableHead>
                        <TableHead className="text-right">{t('pending')}</TableHead>
                        <TableHead className="text-right">{t('overdue')}</TableHead>
                        <TableHead className="text-right">{t('transactionCount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.yearlyReport.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.period}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">£{row.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-600 font-semibold">£{row.pending.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">£{row.overdue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {previewPayment && (() => {
        const prevStudent = students.find(s => s.id === previewPayment.student_id);
        const prevCourse = courses.find(c => c.id === previewPayment.course_id);
        return (
          <Dialog open={!!previewPayment} onOpenChange={(open) => !open && setPreviewPayment(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('invoicePreview')}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center py-4">
                <InvoicePreviewCanvas
                  template="classic_blue"
                  logoUrl=""
                  schoolName="Güneş English School"
                  studentName={prevStudent?.full_name}
                  studentEmail={prevStudent?.email}
                  courseName={prevCourse?.name}
                  amount={previewPayment.amount}
                  invoiceDate={previewPayment.payment_date}
                  dueDate={previewPayment.due_date}
                  status={previewPayment.status}
                  lang="tr"
                />
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {invoicePicker && (() => {
        const invStudent = students.find(s => s.id === invoicePicker.student_id);
        const invCourse = courses.find(c => c.id === invoicePicker.course_id);
        return (
          <TemplatePickerDialog
            open={true}
            onClose={() => setInvoicePicker(null)}
            templates={INVOICE_TEMPLATES}
            title={t('selectInvoiceTemplate')}
            type="invoice"
            studentName={invStudent?.full_name}
            studentEmail={invStudent?.email}
            courseName={invCourse?.name}
            amount={invoicePicker.amount}
            invoiceDate={invoicePicker.payment_date}
            dueDate={invoicePicker.due_date}
            status={invoicePicker.status}
            onDownload={(tpl, { lang }) => generateInvoicePDF({
              payment: invoicePicker,
              student: invStudent,
              course: invCourse,
              template: tpl,
              lang: lang || 'tr',
            })}
          />
        );
      })()}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('newPaymentRecord')}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('student')}</Label>
                <SearchableSelect
                  value={form.student_id}
                  onValueChange={handleStudentChange}
                  placeholder={t('searchStudents')}
                  options={students.map(s => {
                    const duplicates = students.filter(d => d.full_name === s.full_name);
                    const label = duplicates.length > 1 && s.passport_number 
                      ? `${s.full_name} (${s.passport_number})`
                      : s.full_name;
                    return { value: s.id, label, subtitle: s.email || '' };
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('course')}</Label>
                <SearchableSelect
                  value={form.course_id}
                  onValueChange={v => setForm({...form, course_id: v})}
                  placeholder={t('selectCourse')}
                  options={courses.map(c => ({ value: c.id, label: c.name, subtitle: c.cefr_level || '' }))}
                  disabled={!form.student_id}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('amount')}</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>{t('dueDate')}</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('paymentMethod')}</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({...form, payment_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('methodCash')}</SelectItem>
                    <SelectItem value="credit_card">{t('methodCard')}</SelectItem>
                    <SelectItem value="bank_transfer">{t('methodTransfer')}</SelectItem>
                    <SelectItem value="other">{t('methodOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('instalmentNo')}</Label>
                <Input type="number" value={form.installment_number} onChange={e => setForm({...form, installment_number: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-2">
                <Label>{t('totalInstalments')}</Label>
                <Input type="number" value={form.total_installments} onChange={e => setForm({...form, total_installments: parseInt(e.target.value) || 1})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>{t('cancel')}</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.student_id || !form.amount}>{t('save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}