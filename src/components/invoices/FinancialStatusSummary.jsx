import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Search, ChevronDown, ChevronRight, Send, Loader2, User
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';

const statusConfig = {
  draft:     { label: 'Taslak',    color: 'bg-gray-100 text-gray-700' },
  sent:      { label: 'Gönderildi', color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Ödendi',    color: 'bg-emerald-100 text-emerald-700' },
  pending:   { label: 'Bekliyor',  color: 'bg-amber-100 text-amber-700' },
  overdue:   { label: 'Gecikmiş', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'İptal',    color: 'bg-gray-100 text-gray-500' },
};

function StudentFinancialRow({ student, invoices, onSendEmail, sendingId }) {
  const [expanded, setExpanded] = useState(false);

  const studentInvoices = invoices.filter(inv => inv.student_id === student.id);
  if (studentInvoices.length === 0) return null;

  const totalBilled = studentInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  const totalPaid = studentInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((s, inv) => s + (inv.amount || 0), 0);
  const totalUnpaid = totalBilled - totalPaid;
  const overdueInvoices = studentInvoices.filter(inv =>
    inv.status !== 'paid' && inv.status !== 'cancelled' &&
    inv.due_date && isPast(parseISO(inv.due_date))
  );
  const paidPercent = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const hasOverdue = overdueInvoices.length > 0;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${hasOverdue ? 'border-red-200' : 'border-border'}`}>
      {/* Header Row */}
      <button
        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors ${hasOverdue ? 'bg-red-50/50' : 'bg-card'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{student.full_name}</span>
            {student.email && <span className="text-xs text-muted-foreground">{student.email}</span>}
            {hasOverdue && (
              <Badge className="bg-red-100 text-red-700 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" /> {overdueInvoices.length} Gecikmiş
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <div className="flex-1 max-w-[180px]">
              <Progress value={paidPercent} className="h-1.5" />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{paidPercent}% ödendi</span>
          </div>
        </div>
        <div className="flex items-center gap-6 ml-auto">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Toplam</p>
            <p className="font-semibold text-sm">£{totalBilled.toLocaleString('en-GB')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Kalan</p>
            <p className={`font-semibold text-sm ${totalUnpaid > 0 ? (hasOverdue ? 'text-red-600' : 'text-amber-600') : 'text-emerald-600'}`}>
              £{totalUnpaid.toLocaleString('en-GB')}
            </p>
          </div>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          }
        </div>
      </button>

      {/* Expanded Invoice List */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border/60">
          {studentInvoices.map(inv => {
            const isOverdue = inv.status !== 'paid' && inv.status !== 'cancelled' &&
              inv.due_date && isPast(parseISO(inv.due_date));
            const cfg = statusConfig[isOverdue && inv.status !== 'paid' ? 'overdue' : inv.status] || statusConfig.draft;
            return (
              <div key={inv.id} className={`flex items-center gap-3 px-4 py-3 text-sm ${isOverdue ? 'bg-red-50/30' : 'bg-muted/20'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-xs">{inv.invoice_number}</span>
                    <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    {isOverdue && <Badge className="bg-red-100 text-red-700 text-xs">Gecikmiş!</Badge>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    {inv.issue_date && <span>Düzenleme: {format(parseISO(inv.issue_date), 'dd.MM.yyyy')}</span>}
                    {inv.due_date && <span>Vade: {format(parseISO(inv.due_date), 'dd.MM.yyyy')}</span>}
                  </div>
                </div>
                <span className="font-semibold whitespace-nowrap">£{(inv.amount || 0).toLocaleString('en-GB')}</span>
                {inv.status !== 'paid' && inv.status !== 'cancelled' && student.email && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-blue-600 hover:text-blue-700"
                    title="E-posta gönder"
                    onClick={() => onSendEmail(inv)}
                    disabled={sendingId === inv.id}
                  >
                    {sendingId === inv.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FinancialStatusSummary({ invoices, students, onSendEmail, sendingId }) {
  const [search, setSearch] = useState('');

  const summary = useMemo(() => {
    const allInvoices = invoices || [];
    const totalBilled = allInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
    const totalPaid = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
    const totalPending = allInvoices
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((s, i) => s + (i.amount || 0), 0);
    const overdueCount = allInvoices.filter(i =>
      i.status !== 'paid' && i.status !== 'cancelled' &&
      i.due_date && isPast(parseISO(i.due_date))
    ).length;
    const overdueAmount = allInvoices
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.due_date && isPast(parseISO(i.due_date)))
      .reduce((s, i) => s + (i.amount || 0), 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    return { totalBilled, totalPaid, totalPending, overdueCount, overdueAmount, collectionRate };
  }, [invoices]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground font-medium">Tahsil Edilen</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">£{summary.totalPaid.toLocaleString('en-GB')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tahsilat Oranı: %{summary.collectionRate}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground font-medium">Bekleyen</span>
            </div>
            <p className="text-xl font-bold text-amber-700">£{summary.totalPending.toLocaleString('en-GB')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ödenmemiş toplam</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-muted-foreground font-medium">Gecikmiş</span>
            </div>
            <p className="text-xl font-bold text-red-700">£{summary.overdueAmount.toLocaleString('en-GB')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.overdueCount} adet fatura</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Toplam Faturalanan</span>
            </div>
            <p className="text-xl font-bold">£{summary.totalBilled.toLocaleString('en-GB')}</p>
            <div className="mt-1.5">
              <Progress value={summary.collectionRate} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student-based breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-sm">Öğrenci Bazlı Finansal Durum</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Öğrenci ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          {filteredStudents.map(student => (
            <StudentFinancialRow
              key={student.id}
              student={student}
              invoices={invoices}
              onSendEmail={onSendEmail}
              sendingId={sendingId}
            />
          ))}
          {filteredStudents.every(s => !invoices.some(inv => inv.student_id === s.id)) && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Fatura bulunamadı
            </div>
          )}
        </div>
      </div>
    </div>
  );
}