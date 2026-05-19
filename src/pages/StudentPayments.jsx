import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CreditCard, CheckCircle, Clock, AlertCircle, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  paid: { label: 'Ödendi', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending: { label: 'Bekliyor', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  overdue: { label: 'Gecikmiş', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  cancelled: { label: 'İptal', icon: TrendingDown, color: 'text-gray-500', bg: 'bg-gray-50' },
};

const methodLabel = {
  cash: 'Nakit',
  credit_card: 'Kredi Kartı',
  bank_transfer: 'Banka Transferi',
  other: 'Diğer',
};

export default function StudentPayments() {
  const { student } = useOutletContext();
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;
    Promise.all([
      base44.entities.Payment.filter({ student_id: student.id }, '-payment_date', 50),
      base44.entities.Course.list(),
    ]).then(([p, c]) => {
      setPayments(p);
      setCourses(c);
    }).finally(() => setLoading(false));
  }, [student?.id]);

  const getCourse = id => courses.find(c => c.id === id);
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);

  if (loading) return (
    <div className="p-6 flex justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-xl font-bold">Ödemelerim</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">£{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Toplam</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">£{paid.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Ödendi</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-700">£{pending.toLocaleString()}</p>
          <p className="text-xs text-amber-600 mt-0.5">Bekleyen</p>
        </div>
      </div>

      {/* Payments list */}
      <div className="space-y-3">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz ödeme kaydı yok</p>
          </div>
        ) : (
          payments.map(p => {
            const s = statusConfig[p.status] || statusConfig.pending;
            const Icon = s.icon;
            const course = getCourse(p.course_id);
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{course?.name || 'Kurs'}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : (p.due_date ? `Vade: ${format(new Date(p.due_date), 'dd MMM yyyy')}` : '-')}
                    {p.total_installments > 1 && ` · Taksit ${p.installment_number}/${p.total_installments}`}
                    {p.payment_method && ` · ${methodLabel[p.payment_method] || p.payment_method}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm">£{(p.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}