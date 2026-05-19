import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Plus, Trash2, Search, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const catLabels = {
  teacher_salary: 'Öğretmen Maaşı',
  rent: 'Kira',
  utilities: 'Faturalar',
  marketing: 'Pazarlama',
  supplies: 'Malzeme',
  maintenance: 'Bakım',
  software: 'Yazılım',
  other: 'Diğer',
};

const catColors = {
  teacher_salary: 'bg-violet-100 text-violet-700',
  rent: 'bg-blue-100 text-blue-700',
  utilities: 'bg-amber-100 text-amber-700',
  marketing: 'bg-pink-100 text-pink-700',
  supplies: 'bg-teal-100 text-teal-700',
  maintenance: 'bg-orange-100 text-orange-700',
  software: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

const defaultExpense = { title: '', category: 'other', amount: '', date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'bank_transfer', notes: '', period: format(new Date(), 'MMMM yyyy') };

export default function ExpensesTab() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultExpense);
  const qc = useQueryClient();

  const { data: expenses = [] } = useQuery({ queryKey: ['expenses-all'], queryFn: () => base44.entities.Expense.list('-date', 500) });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => base44.entities.Teacher.list() });

  const createMut = useMutation({
    mutationFn: d => base44.entities.Expense.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses-all'] }); setShowForm(false); setForm(defaultExpense); }
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Expense.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses-all'] })
  });

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || e.category === catFilter;
    return matchSearch && matchCat;
  });

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Gider ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Gider Ekle
        </Button>
      </div>

      <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{filtered.length} kayıt · Toplam Gider</span>
        <span className="font-bold text-destructive text-lg">£{total.toLocaleString()}</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Başlık</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dönem</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tutar</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />Gider kaydı yok
                </td></tr>
              ) : filtered.map((e, i) => (
                <tr key={e.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {e.date ? format(new Date(e.date), 'dd MMM yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${catColors[e.category] || catColors.other}`}>
                      {catLabels[e.category] || e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.period || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-destructive">£{(e.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => deleteMut.mutate(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={4} className="px-4 py-3 font-semibold">TOPLAM</td>
                  <td className="px-4 py-3 text-right font-bold text-destructive">£{total.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Gider Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Başlık *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Gider açıklaması" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(catLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tutar (£) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tarih *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label>Ödeme Yöntemi</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Nakit</SelectItem>
                    <SelectItem value="bank_transfer">Banka</SelectItem>
                    <SelectItem value="credit_card">K.Kartı</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Dönem</Label>
              <Input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} placeholder="March 2026" />
            </div>
            <div>
              <Label>Notlar</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opsiyonel not" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button onClick={() => createMut.mutate({ ...form, amount: parseFloat(form.amount) })} disabled={!form.title || !form.amount || createMut.isPending}>
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}