import React, { useState, useMemo, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, Eye, Trash2, Filter, X, CheckCircle, Clock, AlertCircle,
  FileText, DollarSign, Calendar, Plus, Send, Loader2, BarChart3, Printer, ListOrdered
} from 'lucide-react';
import InstallmentPlanDialog from '@/components/invoices/InstallmentPlanDialog';
import { format } from 'date-fns';
import { generateInvoicePDF, INVOICE_TEMPLATES } from '@/components/payments/InvoiceGenerator';
import InvoicePreviewCanvas from '@/components/payments/InvoicePreviewCanvas';
import TemplatePickerDialog from '@/components/TemplatePickerDialog';
import SearchableSelect from '@/components/SearchableSelect';
import FinancialStatusSummary from '@/components/invoices/FinancialStatusSummary';
import { printCanvas } from '@/lib/printCanvas';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: FileText },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: X },
};

export default function InvoiceManagement() {
  const queryClient = useQueryClient();
  
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStudent, setFilterStudent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadPicker, setDownloadPicker] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [installmentInvoice, setInstallmentInvoice] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const invoiceCanvasRef = useRef(null);
  const [createForm, setCreateForm] = useState({ 
    invoice_type: 'student', 
    student_id: '', 
    company_name: '',
    company_tax_id: '',
    company_email: '',
    company_address: '',
    course_id: '', 
    amount: '', 
    due_date: '' 
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: invoiceTemplates = [] } = useQuery({
    queryKey: ['invoice_templates'],
    queryFn: () => base44.entities.InvoiceTemplate.list(),
  });
  const defaultInvTemplate = invoiceTemplates.find(t => t.is_default) || invoiceTemplates[0] || null;

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setEditingInvoice(null);
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedInvoices(new Set());
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
      return base44.entities.Invoice.create({
        ...data,
        invoice_number: invoiceNumber,
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'draft',
        payment_status: 'unpaid',
        amount_paid: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowCreateForm(false);
      setCreateForm({ student_id: '', course_id: '', amount: '', due_date: '' });
    },
  });

  const handleCreate = () => {
    const { invoice_type, student_id, company_name, course_id, amount, due_date } = createForm;
    const recipientMissing = invoice_type === 'company' ? !company_name : !student_id;
    if (recipientMissing || !amount || !due_date) {
      alert('Please fill in all required fields');
      return;
    }
    createInvoiceMutation.mutate({ ...createForm, amount: parseFloat(amount) });
  };

  const handleSendEmail = async (inv) => {
    const student = getStudentInfo(inv.student_id);
    if (!student?.email) {
      alert('This student has no email address!');
      return;
    }
    setSendingId(inv.id);
    try {
      await base44.functions.invoke('sendInvoiceEmail', { invoice_id: inv.id });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert(`Invoice sent to ${student.email}.`);
    } catch (e) {
      alert('Send error: ' + e.message);
    } finally {
      setSendingId(null);
    }
  };

  // Filtering
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const statusMatch = filterStatus === 'all' || inv.status === filterStatus;
      const studentMatch = filterStudent === '' || inv.student_id === filterStudent;
      const searchMatch = searchTerm === '' || 
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.student_email?.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && studentMatch && searchMatch;
    });
  }, [invoices, filterStatus, filterStudent, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const totalAmount = filtered.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidAmount = filtered.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingAmount = filtered.filter(inv => inv.status === 'sent' || inv.status === 'draft').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const overdueAmount = filtered.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    return { totalAmount, paidAmount, pendingAmount, overdueAmount };
  }, [filtered]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedInvoices(new Set(filtered.map(inv => inv.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (id, checked) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedInvoices(newSelected);
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedInvoices.size} invoices?`)) return;
    selectedInvoices.forEach(id => deleteInvoiceMutation.mutate(id));
  };

  const handleBulkDownload = () => {
    if (selectedInvoices.size === 0) return;
    setDownloadPicker('bulk');
  };

  const getStudentInfo = (studentId) => {
    return students.find(s => s.id === studentId);
  };

  const getCourseInfo = (courseId) => {
    return courses.find(c => c.id === courseId);
  };
  
  const getInvoiceRecipient = (inv) => {
    if (inv.invoice_type === 'company') {
      return { name: inv.company_name || '—', email: inv.company_email || '—' };
    }
    const student = getStudentInfo(inv.student_id);
    return { name: student?.full_name || inv.student_name || '—', email: student?.email || inv.student_email || '—' };
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Invoice Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} invoices</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create
        </Button>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="mb-2">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Financial Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <FinancialStatusSummary
            invoices={invoices}
            students={students}
            onSendEmail={handleSendEmail}
            sendingId={sendingId}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold mt-2">£{stats.totalAmount.toLocaleString('en-GB')}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold mt-2 text-emerald-600">£{stats.paidAmount.toLocaleString('en-GB')}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold mt-2 text-amber-600">£{stats.pendingAmount.toLocaleString('en-GB')}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold mt-2 text-red-600">£{stats.overdueAmount.toLocaleString('en-GB')}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search (Number, Name, Email)</Label>
              <Input
                id="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student">Student</Label>
              <SearchableSelect
                value={filterStudent}
                onValueChange={setFilterStudent}
                placeholder="All"
                options={[{ value: '', label: 'All' }, ...students.map(s => ({ value: s.id, label: s.full_name, subtitle: s.email || '' }))]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Actions</Label>
              <div className="flex gap-2 pt-1">
                {selectedInvoices.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDownload}
                      className="flex-1"
                    >
                      <Download className="w-3 h-3 mr-1" /> Download ({selectedInvoices.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No invoices found</CardContent></Card>
        ) : (
          filtered.map(inv => {
            const recipient = getInvoiceRecipient(inv);
            const isEditing = editingInvoice === inv.id;
            return (
              <Card key={inv.id} className={`transition-all ${selectedInvoices.has(inv.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                       <div className="grid grid-cols-2 gap-2">
                         <div>
                           <Label className="text-xs">Amount (£)</Label>
                           <Input type="number" step="0.01" className="h-8 mt-1" value={editingData.amount || inv.amount || ''} onChange={e => setEditingData({ ...editingData, amount: parseFloat(e.target.value) })} />
                         </div>
                         <div>
                           <Label className="text-xs">Due Date</Label>
                           <Input type="date" className="h-8 mt-1" value={editingData.due_date || inv.due_date || ''} onChange={e => setEditingData({ ...editingData, due_date: e.target.value })} />
                         </div>
                       </div>
                       <div>
                         <Label className="text-xs">Status</Label>
                         <Select value={editingData.status || inv.status} onValueChange={v => setEditingData({ ...editingData, status: v })}>
                           <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                           <SelectContent>
                             <SelectItem value="draft">Draft</SelectItem>
                             <SelectItem value="sent">Sent</SelectItem>
                             <SelectItem value="paid">Paid</SelectItem>
                             <SelectItem value="overdue">Overdue</SelectItem>
                             <SelectItem value="cancelled">Cancelled</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="flex gap-2">
                         <Button size="sm" className="flex-1" onClick={() => updateInvoiceMutation.mutate({ id: inv.id, data: { ...inv, ...editingData } })}>Save</Button>
                         <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingInvoice(null); setEditingData({}); }}>Cancel</Button>
                       </div>
                     </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox checked={selectedInvoices.has(inv.id)} onCheckedChange={checked => handleSelectInvoice(inv.id, checked)} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{recipient.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{inv.invoice_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <p className="font-bold text-sm">£{(inv.amount || 0).toLocaleString('en-GB')}</p>
                          <Badge className={`text-xs ${statusConfig[inv.status]?.color}`}>{statusConfig[inv.status]?.label}</Badge>
                        </div>
                      </div>
                      {inv.installment_plan?.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {inv.installment_plan.map((ins, idx) => (
                            <span key={idx} className={`text-xs px-2 py-0.5 rounded-full border ${ins.paid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                              {idx+1}. £{ins.amount} {ins.paid ? '✓' : `(${ins.due_date ? format(new Date(ins.due_date), 'dd MMM') : '?'})`}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Due: {inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '-'}</p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingInvoice(inv.id); setEditingData(inv); }}>Edit</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-500" title="Installment Plan" onClick={() => setInstallmentInvoice(inv)}>
                            <ListOrdered className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPreviewInvoice(inv)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSendEmail(inv)} disabled={sendingId === inv.id}>
                            {sendingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-blue-500" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDownloadPicker(inv.id)}><Download className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => { if (confirm('Delete?')) deleteInvoiceMutation.mutate(inv.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewInvoice && (() => {
        const student = getStudentInfo(previewInvoice.student_id);
        const course = getCourseInfo(previewInvoice.course_id);
        return (
          <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Invoice Preview - {previewInvoice.invoice_number}</DialogTitle>
              </DialogHeader>
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={() => { const c = document.getElementById('invoice-print-canvas'); if (c) printCanvas(c); }} className="gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>
              <div className="flex items-center justify-center py-4">
                <InvoicePreviewCanvas
                  canvasId="invoice-print-canvas"
                  template={defaultInvTemplate?.template_style || "classic_blue"}
                  logoUrl={defaultInvTemplate?.logo_url || ""}
                  schoolName={defaultInvTemplate?.school_name || "Güneş English School"}
                  studentName={
                    previewInvoice.invoice_type === 'company' 
                      ? previewInvoice.company_name || '—'
                      : student?.full_name || previewInvoice.student_name || '—'
                  }
                  studentEmail={
                    previewInvoice.invoice_type === 'company'
                      ? previewInvoice.company_email || '—'
                      : student?.email || previewInvoice.student_email || '—'
                  }
                  courseName={course?.name || 'Service'}
                  amount={previewInvoice.amount || 0}
                  invoiceDate={previewInvoice.issue_date}
                  dueDate={previewInvoice.due_date}
                  status={previewInvoice.status}
                  lang="en"
                />
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <SearchableSelect
                value={createForm.student_id}
                onValueChange={(v) => setCreateForm({ ...createForm, student_id: v })}
                placeholder="Select a student"
                options={students.map(s => ({ value: s.id, label: s.full_name, subtitle: s.email || '' }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Course *</Label>
              <SearchableSelect
                value={createForm.course_id}
                onValueChange={(v) => setCreateForm({ ...createForm, course_id: v })}
                placeholder="Select a course"
                options={courses.map(c => ({ value: c.id, label: c.name, subtitle: c.teacher || '' }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (£) *</Label>
                <Input type="number" step="0.01" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createInvoiceMutation.isPending}>
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Picker Modal */}
      {downloadPicker && (() => {
        const invoicesToDownload = downloadPicker === 'bulk'
          ? Array.from(selectedInvoices).map(id => invoices.find(inv => inv.id === id))
          : [invoices.find(inv => inv.id === downloadPicker)];

        return (
          <TemplatePickerDialog
            open={true}
            onClose={() => setDownloadPicker(null)}
            templates={INVOICE_TEMPLATES}
            title={`${invoicesToDownload.length > 1 ? 'Bulk ' : ''}Download PDF`}
            type="invoice"
            studentName={invoicesToDownload[0]?.student_name}
            studentEmail={invoicesToDownload[0]?.student_email}
            courseName={getCourseInfo(invoicesToDownload[0]?.course_id)?.name}
            amount={invoicesToDownload[0]?.total_amount}
            invoiceDate={invoicesToDownload[0]?.issue_date}
            dueDate={invoicesToDownload[0]?.due_date}
            status={invoicesToDownload[0]?.status}
            isBulk={invoicesToDownload.length > 1}
            onDownload={(tpl, { lang }) => {
              invoicesToDownload.forEach((inv, idx) => {
                const student = getStudentInfo(inv.student_id);
                const course = getCourseInfo(inv.course_id);
                const delay = idx * 100;
                setTimeout(() => {
                  generateInvoicePDF({
                    invoice: inv,
                    student,
                    course,
                    template: tpl,
                    lang: lang || 'en',
                  });
                }, delay);
              });
              setDownloadPicker(null);
            }}
          />
        );
      })()}

      {/* Installment Plan Dialog */}
      {installmentInvoice && (
        <InstallmentPlanDialog
          open={!!installmentInvoice}
          onOpenChange={(open) => !open && setInstallmentInvoice(null)}
          invoice={installmentInvoice}
          onSave={(data) => updateInvoiceMutation.mutate({ id: installmentInvoice.id, data: { ...installmentInvoice, ...data } })}
        />
      )}

    </div>
  );
}