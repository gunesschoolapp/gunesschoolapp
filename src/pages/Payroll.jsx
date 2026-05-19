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
import { Plus, Trash2, Users, GraduationCap, Handshake, CheckCircle, BarChart2, TrendingDown } from 'lucide-react';
import { format, getMonth, getYear, startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import PersonSummaryCards from '@/components/payroll/PersonSummaryCards';
import { MonthlyBarChart, PaymentTypePieChart } from '@/components/payroll/PayrollCharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const paymentTypeLabels = {
  salary: 'Maaş', statutory: 'Yasal Sistem', cash: 'Elden',
  transfer: 'Transfer', dividend: 'Kâr Payı', bonus: 'Prim',
  advance: 'Avans', deduction: 'Kesinti', other: 'Diğer'
};
const paymentMethodLabels = { bank_transfer: 'Banka', cash: 'Nakit', check: 'Çek' };

const statusBadge = (status) =>
  status === 'paid'
    ? <Badge className="bg-emerald-100 text-emerald-700">Ödendi</Badge>
    : <Badge className="bg-amber-100 text-amber-700">Bekliyor</Badge>;

function periodToDate(period) {
  try { return new Date(period); } catch { return null; }
}

export default function Payroll() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    try {
      return format(new Date(), 'MMMM yyyy');
    } catch {
      return 'March 2026';
    }
  });
  const [viewYear, setViewYear] = useState(currentYear);
  const [showForm, setShowForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('monthly');

  const emptyForm = {
    person_type: 'teacher', person_id: '', person_name: '',
    period: selectedPeriod, amount: '', payment_type: 'salary',
    is_deduction: false,
    payment_method: 'bank_transfer', payment_date: format(new Date(), 'yyyy-MM-dd'),
    reference: '', status: 'pending', notes: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [partnerForm, setPartnerForm] = useState({ full_name: '', email: '', phone: '', role_title: '', notes: '' });

  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => base44.entities.Teacher.list() });
  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: () => base44.entities.Partner.list() });

  // Seçili döneme göre filtrelenmiş kayıtlar
  const { data: monthRecords = [] } = useQuery({
    queryKey: ['payroll', selectedPeriod, viewMode],
    queryFn: async () => {
      const allRecords = await base44.entities.PayrollRecord.list();
      
      if (viewMode === 'monthly') {
        return allRecords.filter(r => r.period === selectedPeriod);
      } else if (viewMode === 'daily') {
        const targetDate = new Date(selectedPeriod);
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);
        return allRecords.filter(r => {
          const payDate = r.payment_date ? new Date(r.payment_date) : null;
          return payDate && isWithinInterval(payDate, { start: dayStart, end: dayEnd });
        });
      } else if (viewMode === 'weekly') {
        const [year, week] = selectedPeriod.split('-W');
        const weekStart = startOfWeek(new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7));
        const weekEnd = endOfWeek(weekStart);
        return allRecords.filter(r => {
          const payDate = r.payment_date ? new Date(r.payment_date) : null;
          return payDate && isWithinInterval(payDate, { start: weekStart, end: weekEnd });
        });
      } else {
        return allRecords.filter(r => {
          const d = periodToDate(r.period);
          return d && getYear(d) === parseInt(selectedPeriod);
        });
      }
    }
  });

  // Yıllık tüm kayıtlar (grafik için)
  const { data: allRecords = [] } = useQuery({
    queryKey: ['payroll-all'],
    queryFn: () => base44.entities.PayrollRecord.list(),
  });

  const createRecord = useMutation({
    mutationFn: (data) => base44.entities.PayrollRecord.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', selectedPeriod] });
      qc.invalidateQueries({ queryKey: ['payroll-all'] });
      setShowForm(false); setForm(emptyForm);
    }
  });

  const deleteRecord = useMutation({
    mutationFn: (id) => base44.entities.PayrollRecord.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll', selectedPeriod] });
      qc.invalidateQueries({ queryKey: ['payroll-all'] });
    }
  });

  const markPaid = useMutation({
    mutationFn: (id) => base44.entities.PayrollRecord.update(id, { status: 'paid' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', selectedPeriod] })
  });

  const createPartner = useMutation({
    mutationFn: (data) => base44.entities.Partner.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); setShowPartnerForm(false); setPartnerForm({ full_name: '', email: '', phone: '', role_title: '', notes: '' }); }
  });

  const deletePartner = useMutation({
    mutationFn: (id) => base44.entities.Partner.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] })
  });

  const people = useMemo(() => [
    ...teachers.map(t => ({ id: t.id, name: t.full_name, type: 'teacher' })),
    ...partners.map(p => ({ id: p.id, name: p.full_name, type: 'partner' })),
  ], [teachers, partners]);

  // Aylık özet (seçili dönem)
  const monthSummary = useMemo(() => {
    const totalOwed = monthRecords.filter(r => !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
    const totalDeductions = monthRecords.filter(r => r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
    const paidViaStatus = monthRecords.filter(r => !r.is_deduction && r.status === 'paid').reduce((s, r) => s + (r.amount || 0), 0);
    const totalPaid = paidViaStatus + totalDeductions;
    const remaining = totalOwed - totalPaid;
    const teacherTotal = monthRecords.filter(r => r.person_type === 'teacher' && !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
    const partnerTotal = monthRecords.filter(r => r.person_type === 'partner' && !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
    return { totalOwed, totalDeductions, totalPaid, remaining, teacherTotal, partnerTotal };
  }, [monthRecords]);

  // Yıllık aylık bar chart verisi
  const monthlyChartData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const yearRecords = allRecords.filter(r => {
        const d = periodToDate(r.period);
        return d && getYear(d) === viewYear && getMonth(d) === idx;
      });
      return {
        month,
        teachers: yearRecords.filter(r => r.person_type === 'teacher' && !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0),
        partners: yearRecords.filter(r => r.person_type === 'partner' && !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0),
      };
    });
  }, [allRecords, viewYear]);

  // Yıllık toplam
  const yearlyTotal = useMemo(() => {
    return allRecords.filter(r => {
      const d = periodToDate(r.period);
      return d && getYear(d) === viewYear && !r.is_deduction;
    }).reduce((s, r) => s + (r.amount || 0), 0);
  }, [allRecords, viewYear]);

  // Ödeme türü pasta
  const pieData = useMemo(() => {
    const map = {};
    monthRecords.filter(r => !r.is_deduction).forEach(r => {
      const label = paymentTypeLabels[r.payment_type] || r.payment_type;
      map[label] = (map[label] || 0) + (r.amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [monthRecords]);

  const handlePersonChange = (personId) => {
    const person = people.find(p => p.id === personId);
    if (person) setForm(f => ({ ...f, person_id: personId, person_name: person.name, person_type: person.type }));
  };

  const monthInputValue = useMemo(() => {
    if (viewMode !== 'monthly') return '';
    try {
      const d = new Date(selectedPeriod);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch { return ''; }
  }, [selectedPeriod, viewMode]);

  const dayInputValue = useMemo(() => {
    if (viewMode !== 'daily') return '';
    try {
      return selectedPeriod;
    } catch { return ''; }
  }, [selectedPeriod, viewMode]);

  const weekInputValue = useMemo(() => {
    if (viewMode !== 'weekly') return '';
    try {
      return selectedPeriod;
    } catch { return ''; }
  }, [selectedPeriod, viewMode]);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Personel Ödemeleri</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Öğretmen ve ortak ödemeleri</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPartnerForm(true)}>
              <Handshake className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Ortak Ekle</span>
            </Button>
            <Button size="sm" onClick={() => { setForm({ ...emptyForm, period: selectedPeriod }); setShowForm(true); }}>
              <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Ödeme Ekle</span>
            </Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {['daily', 'weekly', 'monthly', 'yearly'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${viewMode === mode ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode === 'daily' ? 'Gün' : mode === 'weekly' ? 'Hafta' : mode === 'monthly' ? 'Ay' : 'Yıl'}
              </button>
            ))}
          </div>
          {viewMode === 'monthly' && (
            <Input type="month" value={monthInputValue} onChange={(e) => { if (!e.target.value) return; const [year, month] = e.target.value.split('-'); setSelectedPeriod(format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy')); }} className="w-36" />
          )}
          {viewMode === 'daily' && (
            <Input type="date" value={dayInputValue} onChange={(e) => { if (!e.target.value) return; setSelectedPeriod(e.target.value); }} className="w-36" />
          )}
          {viewMode === 'weekly' && (
            <Input type="week" value={weekInputValue} onChange={(e) => { if (!e.target.value) return; setSelectedPeriod(e.target.value); }} className="w-36" />
          )}
          {viewMode === 'yearly' && (
            <Input type="number" value={selectedPeriod || currentYear} onChange={(e) => { if (!e.target.value) return; setSelectedPeriod(e.target.value); }} className="w-24" min="2020" />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Hak Ediş', value: monthSummary.totalOwed, color: 'text-primary', bg: 'bg-blue-50' },
          { label: 'Avans/Kesinti', value: monthSummary.totalDeductions, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Ödendi', value: monthSummary.totalPaid, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Kalan', value: monthSummary.remaining, color: monthSummary.remaining > 0 ? 'text-red-600' : 'text-emerald-600', bg: monthSummary.remaining > 0 ? 'bg-red-50' : 'bg-emerald-50' },
          { label: 'Öğretmenler', value: monthSummary.teacherTotal, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ortaklar', value: monthSummary.partnerTotal, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`border-0 ${bg}`}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>£{(value || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{selectedPeriod || 'Seçilmedi'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="text-xs px-1">Genel</TabsTrigger>
          <TabsTrigger value="persons" className="text-xs px-1">Kişiler</TabsTrigger>
          <TabsTrigger value="all" className="text-xs px-1">Tüm</TabsTrigger>
          <TabsTrigger value="teacher" className="text-xs px-1">Öğretmen</TabsTrigger>
          <TabsTrigger value="partner" className="text-xs px-1">Ortak</TabsTrigger>
          <TabsTrigger value="partners_list" className="text-xs px-1">Liste</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Yıllık özet bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Yıl:</span>
              <div className="flex gap-1">
                {[currentYear - 1, currentYear].map(y => (
                  <button
                    key={y}
                    onClick={() => setViewYear(y)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewYear === y ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Yıllık Toplam ({viewYear})</p>
              <p className="text-lg font-bold text-primary">£{yearlyTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MonthlyBarChart data={monthlyChartData} />
            </div>
            <div>
              <PaymentTypePieChart data={pieData.length > 0 ? pieData : [{ name: 'Veri yok', value: 1 }]} />
            </div>
          </div>
        </TabsContent>

        {/* Person Summary Tab */}
        <TabsContent value="persons" className="mt-4">
          <PersonSummaryCards records={monthRecords} teachers={teachers} partners={partners} />
          {monthRecords.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Bu dönemde kayıt yok</div>
          )}
        </TabsContent>

        {/* Transaction tabs */}
        {['all', 'teacher', 'partner'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kişi</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Ödeme Türü</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Yöntem</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Referans</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthRecords.filter(r => tab === 'all' || r.person_type === tab).length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Bu dönemde kayıt yok</TableCell></TableRow>
                      ) : (
                        monthRecords.filter(r => tab === 'all' || r.person_type === tab).map(r => (
                          <TableRow key={r.id} className={r.is_deduction ? 'bg-orange-50/50' : ''}>
                            <TableCell className="font-medium">{r.person_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {r.person_type === 'teacher' ? 'Öğretmen' : 'Ortak'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{paymentTypeLabels[r.payment_type] || r.payment_type}</TableCell>
                            <TableCell className="text-xs">{r.payment_date ? format(new Date(r.payment_date), 'dd MMM yyyy') : '-'}</TableCell>
                            <TableCell className="text-xs">{paymentMethodLabels[r.payment_method] || r.payment_method}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {r.is_deduction
                                ? <span className="text-orange-600">-£{(r.amount || 0).toLocaleString()}</span>
                                : <span>£{(r.amount || 0).toLocaleString()}</span>
                              }
                            </TableCell>
                            <TableCell>
                              {r.is_deduction
                                ? <Badge className="bg-orange-100 text-orange-700">Avans</Badge>
                                : statusBadge(r.status)
                              }
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.reference || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {r.status === 'pending' && !r.is_deduction && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={() => markPaid.mutate(r.id)}>
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteRecord.mutate(r.id)}>
                                  <Trash2 className="w-4 h-4" />
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
        ))}

        {/* Partners List Tab */}
        <TabsContent value="partners_list" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>Unvan</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Henüz ortak kaydı yok</TableCell></TableRow>
                    ) : (
                      partners.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell className="text-xs">{p.role_title || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.email || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.phone || '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deletePartner.mutate(p.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      </Tabs>

      {/* Add Payment Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ödeme Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kişi</Label>
              <Select value={form.person_id} onValueChange={handlePersonChange}>
                <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                <SelectContent>
                  {people.length === 0 && <SelectItem value="_none" disabled>Kayıt yok</SelectItem>}
                  {teachers.length > 0 && <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Öğretmenler</div>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                  </>}
                  {partners.length > 0 && <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Ortaklar</div>
                    {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ödeme Türü</Label>
                <Select value={form.payment_type} onValueChange={v => setForm(f => ({ ...f, payment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tutar (£)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || '' }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ödeme Yöntemi</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Banka Transferi</SelectItem>
                    <SelectItem value="cash">Nakit</SelectItem>
                    <SelectItem value="check">Çek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tarih</Label>
                <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
              <input
                type="checkbox"
                id="is_deduction"
                checked={!!form.is_deduction}
                onChange={e => setForm(f => ({ ...f, is_deduction: e.target.checked, status: e.target.checked ? 'paid' : 'pending' }))}
                className="w-4 h-4 accent-orange-500"
              />
              <label htmlFor="is_deduction" className="text-sm font-medium text-orange-800 cursor-pointer">
                Avans / Kesinti — Hak edişten düşülsün
              </label>
            </div>
            <div>
              <Label>Referans</Label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ödeme referansı..." />
            </div>
            <div>
              <Label>Notlar</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="İsteğe bağlı..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button onClick={() => createRecord.mutate(form)} disabled={!form.person_id || !form.amount}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Partner Dialog */}
      <Dialog open={showPartnerForm} onOpenChange={setShowPartnerForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yeni Ortak Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ad Soyad *</Label>
              <Input value={partnerForm.full_name} onChange={e => setPartnerForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>Unvan</Label>
              <Input value={partnerForm.role_title} onChange={e => setPartnerForm(f => ({ ...f, role_title: e.target.value }))} placeholder="örn: Kurucu Ortak" />
            </div>
            <div>
              <Label>E-posta</Label>
              <Input type="email" value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={partnerForm.phone} onChange={e => setPartnerForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPartnerForm(false)}>İptal</Button>
              <Button onClick={() => createPartner.mutate(partnerForm)} disabled={!partnerForm.full_name}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}