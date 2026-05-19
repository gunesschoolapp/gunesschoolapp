import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Circle, Plus, Trash2, Wand2 } from 'lucide-react';
import { format } from 'date-fns';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function InstallmentPlanDialog({ open, onOpenChange, invoice, onSave }) {
  const [plan, setPlan] = useState([]);
  const [autoCount, setAutoCount] = useState(2);

  const totalAmount = invoice?.amount || 0;

  useEffect(() => {
    if (open) {
      setPlan(invoice?.installment_plan?.length ? invoice.installment_plan : []);
    }
  }, [open, invoice]);

  const amountPaid = plan.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0);
  const amountRemaining = totalAmount - amountPaid;
  const planTotal = plan.reduce((s, p) => s + (p.amount || 0), 0);
  const planDiff = totalAmount - planTotal;

  const addInstallment = () => {
    const remaining = totalAmount - plan.reduce((s, p) => s + (p.amount || 0), 0);
    setPlan(prev => [...prev, {
      id: genId(),
      installment_no: prev.length + 1,
      amount: remaining > 0 ? remaining : 0,
      due_date: '',
      paid: false,
      paid_date: '',
      payment_method: '',
      collected_by: '',
      notes: ''
    }]);
  };

  const autoGenerate = () => {
    const perInstallment = Math.round((totalAmount / autoCount) * 100) / 100;
    const newPlan = [];
    for (let i = 0; i < autoCount; i++) {
      const isLast = i === autoCount - 1;
      const amt = isLast ? Math.round((totalAmount - perInstallment * (autoCount - 1)) * 100) / 100 : perInstallment;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      newPlan.push({
        id: genId(),
        installment_no: i + 1,
        amount: amt,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        paid: false,
        paid_date: '',
        payment_method: '',
        collected_by: '',
        notes: ''
      });
    }
    setPlan(newPlan);
  };

  const updateInstallment = (id, field, value) => {
    setPlan(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeInstallment = (id) => {
    setPlan(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, installment_no: i + 1 })));
  };

  const markPaid = (id) => {
    setPlan(prev => prev.map(p => p.id === id ? {
      ...p,
      paid: !p.paid,
      paid_date: !p.paid ? format(new Date(), 'yyyy-MM-dd') : ''
    } : p));
  };

  const handleSave = () => {
    const totalPaid = plan.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0);
    const paymentStatus = totalPaid === 0 ? 'unpaid' : totalPaid >= totalAmount ? 'paid' : 'partially_paid';
    const status = paymentStatus === 'paid' ? 'paid' : invoice.status === 'paid' ? 'sent' : invoice.status;
    onSave({
      installment_plan: plan,
      amount_paid: totalPaid,
      payment_status: paymentStatus,
      status
    });
    onOpenChange(false);
  };

  const paymentMethodLabel = { cash: 'Nakit', credit_card: 'Kart', bank_transfer: 'Havale', other: 'Diğer' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Taksit Planı — {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl text-center">
          <div>
            <p className="text-xs text-muted-foreground">Toplam Fatura</p>
            <p className="font-bold text-base">£{totalAmount.toLocaleString('en-GB')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ödenen</p>
            <p className="font-bold text-base text-emerald-600">£{amountPaid.toLocaleString('en-GB')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kalan</p>
            <p className={`font-bold text-base ${amountRemaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              £{amountRemaining.toLocaleString('en-GB')}
            </p>
          </div>
        </div>

        {/* Auto-generate */}
        <div className="flex items-center gap-2 p-3 border rounded-xl bg-blue-50/50">
          <Wand2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">Otomatik taksit oluştur:</span>
          <Input
            type="number"
            min={1}
            max={24}
            value={autoCount}
            onChange={e => setAutoCount(parseInt(e.target.value) || 1)}
            className="w-16 h-8 text-center"
          />
          <span className="text-sm">taksit</span>
          <Button size="sm" variant="outline" onClick={autoGenerate} className="shrink-0">Oluştur</Button>
        </div>

        {/* Plan items */}
        <div className="space-y-2">
          {plan.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Henüz taksit eklenmedi</p>
          )}
          {plan.map((p) => (
            <div key={p.id} className={`border rounded-xl p-3 space-y-2 ${p.paid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-card'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => markPaid(p.id)} className="flex-shrink-0">
                    {p.paid
                      ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                      : <Circle className="w-5 h-5 text-muted-foreground" />
                    }
                  </button>
                  <span className="text-sm font-semibold">{p.installment_no}. Taksit</span>
                  {p.paid && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Ödendi</Badge>}
                  {p.paid && p.paid_date && <span className="text-xs text-muted-foreground">{p.paid_date}</span>}
                  {p.paid && p.collected_by && <span className="text-xs text-muted-foreground">· {p.collected_by}</span>}
                </div>
                <button onClick={() => removeInstallment(p.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tutar (£)</Label>
                  <Input
                    type="number"
                    className="h-8 mt-0.5"
                    value={p.amount}
                    onChange={e => updateInstallment(p.id, 'amount', parseFloat(e.target.value) || 0)}
                    disabled={p.paid}
                  />
                </div>
                <div>
                  <Label className="text-xs">Vade Tarihi</Label>
                  <Input
                    type="date"
                    className="h-8 mt-0.5"
                    value={p.due_date}
                    onChange={e => updateInstallment(p.id, 'due_date', e.target.value)}
                  />
                </div>
              </div>
              {p.paid && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Ödeme Tarihi</Label>
                      <Input
                        type="date"
                        className="h-8 mt-0.5"
                        value={p.paid_date}
                        onChange={e => updateInstallment(p.id, 'paid_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ödeme Yöntemi</Label>
                      <Select value={p.payment_method} onValueChange={v => updateInstallment(p.id, 'payment_method', v)}>
                        <SelectTrigger className="h-8 mt-0.5"><SelectValue placeholder="Seçin..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Nakit</SelectItem>
                          <SelectItem value="credit_card">Kart</SelectItem>
                          <SelectItem value="bank_transfer">Havale</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Teslim Alan</Label>
                    <Input
                      className="h-8 mt-0.5"
                      placeholder="Personel adı..."
                      value={p.collected_by || ''}
                      onChange={e => updateInstallment(p.id, 'collected_by', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Plan total warning */}
        {plan.length > 0 && Math.abs(planDiff) > 0.01 && (
          <div className={`text-xs rounded-lg px-3 py-2 ${planDiff > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            ⚠️ Taksit toplamı (£{planTotal.toLocaleString('en-GB')}) fatura tutarından £{Math.abs(planDiff).toLocaleString('en-GB')} {planDiff > 0 ? 'az' : 'fazla'}.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={addInstallment} className="gap-1">
            <Plus className="w-4 h-4" /> Taksit Ekle
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleSave}>Kaydet</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}