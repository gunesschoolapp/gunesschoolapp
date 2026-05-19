import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DollarSign, Paperclip, ExternalLink, Loader2, Check } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import StatCard from '@/components/dashboard/StatCard';
import ProtectedRoute from '@/components/ProtectedRoute';

const categoryIcons = {
  rent: '🏠',
  utilities: '💡',
  internet: '🌐',
  maintenance: '🔧',
  supplies: '📦',
  equipment: '⚙️',
  insurance: '🛡️',
  marketing: '📢',
  other: '📝'
};

const categoryLabels = {
  rent: 'Kira',
  utilities: 'Elektrik/Su',
  internet: 'İnternet',
  maintenance: 'Bakım',
  supplies: 'Malzeme',
  equipment: 'Ekipman',
  insurance: 'Sigorta',
  marketing: 'Pazarlama',
  other: 'Diğer'
};

export default function Expenses() {
  const [showForm, setShowForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      window.history.replaceState({}, '', window.location.pathname);
      return true;
    }
    return false;
  });
  const [form, setForm] = useState({
    category: 'rent', description: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'),
    period: format(new Date(), 'MMMM yyyy'), paid: false, payment_method: 'bank_transfer', notes: '', document_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('list');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const qc = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
  });

  const { data: teacherExpenses = [] } = useQuery({
    queryKey: ['teacher-expenses'],
    queryFn: () => base44.entities.TeacherExpense.list('-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (!data.description || data.amount <= 0) {
        throw new Error('Açıklama ve tutar gerekli');
      }
      return base44.entities.Expense.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setShowForm(false);
      setForm({ category: 'rent', description: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), period: format(new Date(), 'MMMM yyyy'), paid: false, payment_method: 'bank_transfer', notes: '', document_url: '' });
    },
    onError: (error) => alert(error.message || 'Gider eklenirken hata oluştu')
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, document_url: file_url }));
    setUploading(false);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(Array.from(selectedIds).map(id => base44.entities.Expense.delete(id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setSelectedIds(new Set());
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const toUpdate = filtered.filter(e => selectedIds.has(e.id));
      await Promise.all(toUpdate.map(e => base44.entities.Expense.update(e.id, { paid: true })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setSelectedIds(new Set());
    },
  });

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const filtered = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory);
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const paid = filtered.filter(e => e.paid).reduce((s, e) => s + (e.amount || 0), 0);
  const pending = total - paid;

  const reportData = useMemo(() => {
    const now = new Date();
    
    if (reportPeriod === 'daily') {
      const last30Days = eachDayOfInterval({ start: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000), end: now });
      return last30Days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayExpenses = filtered.filter(e => {
          const eDate = new Date(e.date);
          return isWithinInterval(eDate, { start: dayStart, end: dayEnd });
        });
        return {
          period: format(day, 'dd MMM'),
          amount: dayExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          count: dayExpenses.length,
        };
      });
    } else if (reportPeriod === 'weekly') {
      const last12Weeks = eachWeekOfInterval({ start: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000), end: now });
      return last12Weeks.map(week => {
        const weekStart = startOfWeek(week);
        const weekEnd = endOfWeek(week);
        const weekExpenses = filtered.filter(e => {
          const eDate = new Date(e.date);
          return isWithinInterval(eDate, { start: weekStart, end: weekEnd });
        });
        return {
          period: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`,
          amount: weekExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          count: weekExpenses.length,
        };
      });
    } else if (reportPeriod === 'monthly') {
      const last12Months = eachMonthOfInterval({ start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end: now });
      return last12Months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthExpenses = filtered.filter(e => {
          const eDate = new Date(e.date);
          return isWithinInterval(eDate, { start: monthStart, end: monthEnd });
        });
        return {
          period: format(month, 'MMM yyyy'),
          amount: monthExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          count: monthExpenses.length,
        };
      });
    } else {
      const thisYear = now.getFullYear();
      return [thisYear - 2, thisYear - 1, thisYear].map(year => {
        const yearStart = startOfYear(new Date(year, 0, 1));
        const yearEnd = endOfYear(new Date(year, 11, 31));
        const yearExpenses = filtered.filter(e => {
          const eDate = new Date(e.date);
          return isWithinInterval(eDate, { start: yearStart, end: yearEnd });
        });
        return {
          period: year.toString(),
          amount: yearExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          count: yearExpenses.length,
        };
      });
    }
  }, [filtered, reportPeriod]);

  const allExpenses = [...filtered, ...teacherExpenses];

  return (
    <ProtectedRoute requiredPermission="canManageExpenses">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Giderler Yönetimi</h1>
            <p className="text-muted-foreground mt-1">Tüm işletme giderlerini takip edin</p>
          </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Gider Ekle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Yeni Gider Kaydı</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{categoryIcons[key]} {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Gider açıklaması" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tutar (£)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <Label>Tarih</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ödeme Yöntemi</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm({...form, payment_method: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Banka Transferi</SelectItem>
                      <SelectItem value="cash">Nakit</SelectItem>
                      <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.paid} onChange={e => setForm({...form, paid: e.target.checked})} />
                    <span className="text-sm">Ödenmiş</span>
                  </label>
                </div>
              </div>
              <div>
                <Label>Notlar</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="İsteğe bağlı notlar" />
              </div>
              <div>
                <Label>Belge / Fiş (PDF veya Resim)</Label>
                <div className="mt-1 space-y-2">
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-input rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploading
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : <Paperclip className="w-4 h-4 text-muted-foreground" />
                    }
                    <span className="text-sm text-muted-foreground">
                      {uploading ? 'Yükleniyor...' : form.document_url ? 'Dosya değiştir' : 'Dosya seç (PDF, JPG, PNG)'}
                    </span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {form.document_url && (
                    <a href={form.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> Yüklenen belgeyi görüntüle
                    </a>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
                <Button onClick={() => createMutation.mutate(form)} disabled={uploading || createMutation.isPending}>
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Toplam Gider" value={`£${total.toLocaleString()}`} icon={DollarSign} color="red" />
        <StatCard title="Ödenen" value={`£${paid.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard title="Bekleyen" value={`£${pending.toLocaleString()}`} icon={DollarSign} color="amber" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="list">Listesi</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Gider Listesi</CardTitle>
              <div className="mt-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kategoriler</SelectItem>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{categoryIcons[key]} {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size} seçili</span>
                <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}>
                  <Check className="w-4 h-4 mr-1" /> Ödendi Olarak İşaretle
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (confirm(`${selectedIds.size} gideri silmek istediğinize emin misiniz?`)) {
                    deleteSelectedMutation.mutate();
                  }
                }} disabled={deleteSelectedMutation.isPending}>
                  <Trash2 className="w-4 h-4 mr-1" /> Sil
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input 
                      type="checkbox" 
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Belge</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Gider kaydı yok</TableCell></TableRow>
                ) : (
                   filtered.map(expense => (
                     <TableRow key={expense.id} className={selectedIds.has(expense.id) ? 'bg-muted/50' : ''}>
                       <TableCell>
                         <input 
                           type="checkbox" 
                           checked={selectedIds.has(expense.id)}
                           onChange={() => toggleSelect(expense.id)}
                           className="cursor-pointer"
                         />
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline" className="text-xs">
                           {categoryIcons[expense.category]} {categoryLabels[expense.category]}
                         </Badge>
                       </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell className="text-xs">{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right font-semibold">£{expense.amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={expense.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} variant="outline">
                          {expense.paid ? 'Ödendi' : 'Beklemede'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.document_url ? (
                          <a href={expense.document_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" title="Belgeyi görüntüle">
                              <Paperclip className="w-4 h-4 text-primary" />
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(expense.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
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

          <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gider Raporları</CardTitle>
              <div className="mt-2">
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Günlük (Son 30 Gün)</SelectItem>
                    <SelectItem value="weekly">Haftalık (Son 12 Hafta)</SelectItem>
                    <SelectItem value="monthly">Aylık (Son 12 Ay)</SelectItem>
                    <SelectItem value="yearly">Yıllık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dönem</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead className="text-right">Kayıt Sayısı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.period}</TableCell>
                        <TableCell className="text-right font-semibold">£{row.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </TabsContent>
          </Tabs>

          {teacherExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Öğretmen Maaş Giderleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Dönem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherExpenses.map(exp => (
                    <TableRow key={exp.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {categoryIcons[exp.category]} {categoryLabels[exp.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>{exp.description}</TableCell>
                      <TableCell className="text-right font-semibold">£{(exp.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{exp.period}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </ProtectedRoute>
  );
}