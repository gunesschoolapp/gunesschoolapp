import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  paid: { label: 'Tahsil Edildi', class: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Bekliyor', class: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'Gecikmiş', class: 'bg-red-100 text-red-700' },
  cancelled: { label: 'İptal', class: 'bg-gray-100 text-gray-600' },
};

const methodLabel = { cash: 'Nakit', credit_card: 'K.Kartı', bank_transfer: 'Banka', other: 'Diğer' };

export default function IncomeLedgerTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const { data: payments = [] } = useQuery({ queryKey: ['payments-all'], queryFn: () => base44.entities.Payment.list('-payment_date', 500) });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices-ledger'], queryFn: () => base44.entities.Invoice.list('-issue_date', 500) });

  const getStudent = id => students.find(s => s.id === id);
  const getCourse = id => courses.find(c => c.id === id);

  // Merge payments + invoices (avoid duplicate via stripe_session_id)
  const stripeSessionsInPayments = new Set(payments.map(p => p.stripe_session_id).filter(Boolean));
  const invoiceEntries = invoices
    .filter(inv => inv.status === 'paid' && !stripeSessionsInPayments.has(inv.stripe_session_id))
    .map(inv => {
      const student = students.find(s => s.id === inv.student_id);
      return {
        id: `inv-${inv.id}`,
        student_id: inv.student_id,
        student_name: inv.student_name || student?.full_name || '-',
        amount: inv.total_amount ?? inv.amount ?? 0,
        status: 'paid',
        payment_date: inv.issue_date || inv.created_date,
        payment_method: inv.source === 'stripe' ? 'credit_card' : 'other',
        description: (inv.line_items?.[0]?.description) || inv.invoice_number || 'Invoice',
        source: inv.source || 'manual',
        _isInvoice: true,
      };
    });

  const allEntries = [...payments, ...invoiceEntries];

  const months = [...new Set(allEntries.map(p => p.payment_date?.slice(0, 7)).filter(Boolean))].sort().reverse();

  const filtered = allEntries.filter(p => {
    const student = getStudent(p.student_id);
    const name = p.student_name || student?.full_name || '';
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchMonth = monthFilter === 'all' || (p.payment_date || '').startsWith(monthFilter);
    return matchSearch && matchStatus && matchMonth;
  });

  const totalFiltered = filtered.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Öğrenci ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="paid">Tahsil Edildi</SelectItem>
            <SelectItem value="pending">Bekliyor</SelectItem>
            <SelectItem value="overdue">Gecikmiş</SelectItem>
            <SelectItem value="cancelled">İptal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Ay" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Aylar</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{filtered.length} kayıt · Tahsil Edilen</span>
        <span className="font-bold text-primary text-lg">£{totalFiltered.toLocaleString()}</span>
      </div>

      {/* Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Öğrenci</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kurs</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Taksit</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Yöntem</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tutar</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => {
                    const student = getStudent(p.student_id);
                    const course = getCourse(p.course_id);
                    const s = statusConfig[p.status] || statusConfig.pending;
                    const displayName = p.student_name || student?.full_name || '-';
                    const methodLabel_ = { cash: 'Nakit', credit_card: 'K.Kartı', bank_transfer: 'Banka', other: 'Diğer' };
                    return (
                      <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium">{displayName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{course?.name || p.description || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.total_installments > 1 ? `${p.installment_number}/${p.total_installments}` : p._isInvoice ? '📄 Invoice' : '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.source === 'stripe' ? '💳 Stripe' : methodLabel_[p.payment_method] || '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${p.status === 'paid' ? 'text-emerald-600' : p.status === 'overdue' ? 'text-destructive' : 'text-foreground'}`}>
                          £{(p.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.class}`}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={5} className="px-4 py-3 font-semibold text-sm">TOPLAM</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    £{filtered.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}