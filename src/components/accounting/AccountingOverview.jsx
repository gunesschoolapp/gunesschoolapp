import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, AlertCircle, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AccountingOverview() {
  const { data: payments = [] } = useQuery({ queryKey: ['payments-all'], queryFn: () => base44.entities.Payment.list('-payment_date', 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses-all'], queryFn: () => base44.entities.Expense.list('-date', 500) });

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const label = format(d, 'MMM yy');
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');

      const income = payments
        .filter(p => p.status === 'paid' && p.payment_date >= start && p.payment_date <= end)
        .reduce((s, p) => s + (p.amount || 0), 0);

      const expense = expenses
        .filter(e => e.date >= start && e.date <= end)
        .reduce((s, e) => s + (e.amount || 0), 0);

      months.push({ label, income, expense, profit: income - expense });
    }
    return months;
  }, [payments, expenses]);

  const currentMonth = monthlyData[monthlyData.length - 1] || {};
  const prevMonth = monthlyData[monthlyData.length - 2] || {};

  const totalIncome = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalProfit = totalIncome - totalExpense;

  const pendingIncome = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0);

  const expenseByCategory = useMemo(() => {
    const cats = {};
    expenses.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({ cat, amount }));
  }, [expenses]);

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

  const pctChange = (curr, prev) => {
    if (!prev) return null;
    const diff = ((curr - prev) / prev) * 100;
    return diff.toFixed(1);
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Bu Ay Gelir',
            value: `£${(currentMonth.income || 0).toLocaleString()}`,
            sub: `Önceki ay: £${(prevMonth.income || 0).toLocaleString()}`,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            change: pctChange(currentMonth.income, prevMonth.income),
            positive: true,
          },
          {
            label: 'Bu Ay Gider',
            value: `£${(currentMonth.expense || 0).toLocaleString()}`,
            sub: `Önceki ay: £${(prevMonth.expense || 0).toLocaleString()}`,
            icon: TrendingDown,
            color: 'text-red-600',
            bg: 'bg-red-50',
            change: pctChange(currentMonth.expense, prevMonth.expense),
            positive: false,
          },
          {
            label: 'Bu Ay Net Kâr',
            value: `£${(currentMonth.profit || 0).toLocaleString()}`,
            sub: currentMonth.profit >= 0 ? 'Kârlı ay ✅' : 'Zararlı ay ⚠️',
            icon: PiggyBank,
            color: currentMonth.profit >= 0 ? 'text-primary' : 'text-destructive',
            bg: currentMonth.profit >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
          },
          {
            label: 'Tahsil Edilmemiş',
            value: `£${pendingIncome.toLocaleString()}`,
            sub: 'Bekleyen + Gecikmiş',
            icon: AlertCircle,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              {kpi.change != null && (
                <span className={`text-xs font-medium mt-1 inline-block ${
                  (kpi.positive ? parseFloat(kpi.change) > 0 : parseFloat(kpi.change) < 0) ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {kpi.change > 0 ? '▲' : '▼'} {Math.abs(kpi.change)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">Son 6 Ay Gelir/Gider</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
              <Tooltip formatter={v => `£${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="income" name="Gelir" fill="hsl(var(--chart-2))" radius={[4,4,0,0]} />
              <Bar dataKey="expense" name="Gider" fill="hsl(var(--chart-4))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-4">Net Kâr/Zarar Trendi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${v}`} />
              <Tooltip formatter={v => `£${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="profit" name="Net Kâr" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense breakdown + Totals */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Gider Dağılımı</h3>
          <div className="space-y-2">
            {expenseByCategory.slice(0, 6).map(({ cat, amount }) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{catLabels[cat] || cat}</span>
                  <span className="font-medium">£{amount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive/60 rounded-full"
                    style={{ width: `${totalExpense ? (amount / totalExpense) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {expenseByCategory.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Henüz gider kaydı yok</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3">Genel Özet</h3>
          <div className="space-y-3">
            {[
              { label: 'Toplam Tahsil Edilen Gelir', value: `£${totalIncome.toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Toplam Gider', value: `£${totalExpense.toLocaleString()}`, color: 'text-red-600' },
              { label: 'Net Kâr / Zarar', value: `£${totalProfit.toLocaleString()}`, color: totalProfit >= 0 ? 'text-primary' : 'text-destructive', bold: true },
            ].map(row => (
              <div key={row.label} className={`flex justify-between items-center py-2 border-b border-border last:border-0 ${row.bold ? 'font-bold' : ''}`}>
                <span className="text-sm text-foreground">{row.label}</span>
                <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}