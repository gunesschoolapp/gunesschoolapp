import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Download, Search, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InvoicePDFGenerator from './InvoicePDFGenerator';

const statusConfig = {
  draft: { label: 'Taslak', class: 'bg-gray-100 text-gray-600' },
  sent: { label: 'Gönderildi', class: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Ödendi', class: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Gecikmiş', class: 'bg-red-100 text-red-700' },
  cancelled: { label: 'İptal', class: 'bg-gray-100 text-gray-500' },
};

export default function InvoicesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const qc = useQueryClient();

  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-issue_date', 200) });
  const { data: templates = [] } = useQuery({ queryKey: ['invoice-templates'], queryFn: () => base44.entities.InvoiceTemplate.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['orders-tab'], queryFn: () => base44.entities.Order.filter({ status: 'paid' }) });
  const { data: students = [] } = useQuery({ queryKey: ['students-inv'], queryFn: () => base44.entities.Student.list() });
  const { data: payments = [] } = useQuery({ queryKey: ['payments-inv'], queryFn: () => base44.entities.Payment.list() });

  // Normalize invoice: handle old schema (amount) vs new schema (total_amount/subtotal)
  const normalizeInvoice = (inv) => {
    const total = inv.total_amount ?? inv.amount ?? 0;
    const sub = inv.subtotal ?? inv.amount ?? 0;
    const student = students.find(s => s.id === inv.student_id);
    return {
      ...inv,
      total_amount: total,
      subtotal: sub,
      student_name: inv.student_name || student?.full_name || '-',
      student_email: inv.student_email || student?.email || '-',
    };
  };

  const normalizedInvoices = invoices.map(normalizeInvoice);

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] })
  });

  const activeTemplate = templates.find(t => t.is_active) || templates[0];

  const filtered = normalizedInvoices.filter(inv => {
    const matchSearch = !search || (inv.invoice_number || '').toLowerCase().includes(search.toLowerCase()) || (inv.student_name || '').toLowerCase().includes(search.toLowerCase()) || (inv.student_email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary totals
  const totalPaid = normalizedInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const totalPending = normalizedInvoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + i.total_amount, 0);
  const totalOverdue = normalizedInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Amount', value: normalizedInvoices.reduce((s, i) => s + i.total_amount, 0), color: 'text-foreground', icon: '📋' },
          { label: 'Paid', value: totalPaid, color: 'text-emerald-600', icon: '✅' },
          { label: 'Pending', value: totalPending, color: 'text-amber-600', icon: '⏳' },
          { label: 'Overdue', value: totalOverdue, color: 'text-red-600', icon: '⚠️' },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <span className="text-base">{card.icon}</span>
            </div>
            <p className={`text-xl font-bold ${card.color}`}>£{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Fatura no veya öğrenci ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fatura No</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Öğrenci</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tutar</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">KDV</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Toplam</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Durum</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />Fatura bulunamadı
                </td></tr>
              ) : filtered.map((inv, i) => {
                const s = statusConfig[inv.status] || statusConfig.draft;
                return (
                  <tr key={inv.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-medium">{inv.student_name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {inv.issue_date ? format(new Date(inv.issue_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">£{(inv.subtotal || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">£{(inv.vat_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold">£{(inv.total_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <Select value={inv.status} onValueChange={v => updateMut.mutate({ id: inv.id, data: { status: v } })}>
                        <SelectTrigger className={`h-7 w-28 text-xs border-0 ${s.class}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          title="Sipariş detayı gör"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => InvoicePDFGenerator.download(inv, activeTemplate)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Dialog */}
      <Dialog open={!!previewInvoice} onOpenChange={() => setPreviewInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fatura: {previewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-4">
              {/* Order / Payment source badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  previewInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {previewInvoice.status === 'paid' ? '✅ Ödendi' : '⏳ Bekliyor'}
                </span>
                {previewInvoice.source === 'stripe' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                    💳 Stripe Ödemesi
                  </span>
                )}
              </div>

              {/* Student & Order Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Öğrenci</p>
                  <p className="font-semibold text-sm">{previewInvoice.student_name || '-'}</p>
                  <p className="text-xs text-muted-foreground">{previewInvoice.student_email}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Fatura Tarihi</p>
                  <p className="font-semibold text-sm">
                    {previewInvoice.issue_date ? new Date(previewInvoice.issue_date).toLocaleDateString('tr-TR') : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">No: {previewInvoice.invoice_number}</p>
                </div>
              </div>

              {/* Stripe Session Info */}
              {previewInvoice.notes && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-violet-700 mb-1">Ödeme Referansı</p>
                  <p className="text-violet-600 font-mono break-all">{previewInvoice.notes}</p>
                </div>
              )}

              {/* Line Items */}
              {(previewInvoice.line_items || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kalemler</p>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Açıklama</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Adet</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Birim Fiyat</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewInvoice.line_items.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-4 py-2.5 font-medium">{item.description}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right">£{(item.unit_price || 0).toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-bold">£{(item.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ara Toplam</span><span>£{(previewInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>KDV (%{previewInvoice.vat_rate || 0})</span><span>£{(previewInvoice.vat_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1.5">
                    <span>GENEL TOPLAM</span><span className="text-emerald-600">£{(previewInvoice.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPreviewInvoice(null)}>Kapat</Button>
            {activeTemplate && (
              <Button onClick={() => InvoicePDFGenerator.download(previewInvoice, activeTemplate)}>
                <Download className="w-4 h-4 mr-1" /> PDF İndir
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoicePreview({ invoice, template }) {
  const primaryColor = template?.primary_color || '#2563eb';
  return (
    <div className="border border-border rounded-xl overflow-hidden text-sm">
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: primaryColor }}>
        <div className="flex justify-between items-start">
          <div>
            {template?.logo_url && <img src={template.logo_url} alt="Logo" className="h-12 mb-2 object-contain" />}
            <h2 className="text-white font-bold text-lg">{template?.school_name}</h2>
            <p className="text-white/80 text-xs">{template?.school_address}</p>
            {template?.vat_number && <p className="text-white/70 text-xs">VAT: {template.vat_number}</p>}
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-2xl">FATURA</p>
            <p className="text-white/80 font-mono">{invoice.invoice_number}</p>
            <p className="text-white/70 text-xs mt-1">
              {invoice.issue_date ? format(new Date(invoice.issue_date), 'dd MMMM yyyy') : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Billed To */}
        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Fatura Kesilen</p>
          <p className="font-semibold">{invoice.student_name}</p>
          <p className="text-muted-foreground text-xs">{invoice.student_email}</p>
          {invoice.student_address && <p className="text-muted-foreground text-xs">{invoice.student_address}</p>}
        </div>

        {/* Line items */}
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-2 font-semibold">Açıklama</th>
              <th className="text-right py-2 font-semibold">Adet</th>
              <th className="text-right py-2 font-semibold">Birim Fiyat</th>
              <th className="text-right py-2 font-semibold">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items || []).map((item, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">£{(item.unit_price || 0).toFixed(2)}</td>
                <td className="py-2 text-right">£{(item.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Ara Toplam</span><span>£{(invoice.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">KDV (%{invoice.vat_rate || 20})</span><span>£{(invoice.vat_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-sm border-t border-border pt-1">
              <span>GENEL TOPLAM</span>
              <span>£{(invoice.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bank details */}
        {template?.bank_account_number && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs">
            <p className="font-semibold mb-1">Banka Bilgileri</p>
            <p className="text-muted-foreground">{template.bank_name} · Sort: {template.bank_sort_code} · Hesap: {template.bank_account_number}</p>
          </div>
        )}

        {template?.footer_notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border pt-3">{template.footer_notes}</p>
        )}
      </div>
    </div>
  );
}