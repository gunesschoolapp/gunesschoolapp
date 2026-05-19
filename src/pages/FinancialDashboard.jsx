import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import OverduePaymentsWidget from '@/components/finance/OverduePaymentsWidget';

export default function FinancialDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  // Calculate monthly data for the last 12 months
  const monthlyData = useMemo(() => {
    const last12Months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });

    return last12Months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const monthlyPayments = payments.filter(p => {
        const payDate = p.payment_date || p.due_date || '';
        return payDate.startsWith(monthStr) && p.status === 'paid';
      });
      const monthlyExpenses = expenses.filter(e => {
        const expDate = e.date || '';
        return expDate.startsWith(monthStr);
      });

      return {
        month: format(month, 'MMM'),
        fullMonth: monthStr,
        income: monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        expense: monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        paid: monthlyPayments.length,
        pending: payments.filter(p => {
          const payDate = p.payment_date || p.due_date || '';
          return payDate.startsWith(monthStr) && p.status === 'pending';
        }).length,
        overdue: payments.filter(p => {
          const payDate = p.payment_date || p.due_date || '';
          return payDate.startsWith(monthStr) && p.status === 'overdue';
        }).length,
      };
    });
  }, [payments, expenses]);

  // Current month data
  const currentMonthData = useMemo(() => {
    const monthStr = `${selectedYear}-${selectedMonth}`;
    const monthPayments = payments.filter(p => {
      const payDate = p.payment_date || p.due_date || '';
      return payDate.startsWith(monthStr);
    });

    const paidAmount = monthPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = monthPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdueAmount = monthPayments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return { paidAmount, pendingAmount, overdueAmount, monthPayments };
  }, [payments, selectedYear, selectedMonth]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const currentMonthStr = `${selectedYear}-${selectedMonth}`;
    const monthPayments = payments.filter(p => {
      const payDate = p.payment_date || p.due_date || '';
      return payDate.startsWith(currentMonthStr);
    });

    return [
      {
        name: 'Tahsil Edilen',
        value: monthPayments.filter(p => p.status === 'paid').length,
        color: '#10b981',
      },
      {
        name: 'Bekleyen',
        value: monthPayments.filter(p => p.status === 'pending').length,
        color: '#f59e0b',
      },
      {
        name: 'Gecikmiş',
        value: monthPayments.filter(p => p.status === 'overdue').length,
        color: '#ef4444',
      },
    ];
  }, [payments, selectedYear, selectedMonth]);

  const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);
  const totalProfit = totalIncome - totalExpense;

  const years = Array.from({ length: 5 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  const months = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, '0')
  );

  const monthLabels = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finansal Dashboard</h1>
        <p className="text-muted-foreground mt-1">Aylık gelir, gider ve dönemlik raporlar</p>
      </div>

      {/* Unpaid Payments Alert */}
      <OverduePaymentsWidget />

      {/* Period Selector */}
      <div className="flex gap-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Yıl</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Ay</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => <SelectItem key={m} value={m}>{monthLabels[i]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tahsil Edilen (Bu Ay)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">£{currentMonthData.paidAmount.toLocaleString()}</p>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Gün içinde tahsilat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen Ödemeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">£{currentMonthData.pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> Beklemede
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gecikmiş Ödemeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">£{currentMonthData.overdueAmount.toLocaleString()}</p>
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3" /> Gözlemde tutulması gereken
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Kar (12 Ay)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              £{totalProfit.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Gelir: £{totalIncome.toLocaleString()} | Gider: £{totalExpense.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aylık Gelir ve Gider Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={value => `£${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" name="Gelir" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Gider" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ödeme Durumu Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Comparison - Payment Counts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ödeme Sayıları Karşılaştırması</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="paid" fill="#10b981" name="Tahsil Edilen" />
                <Bar dataKey="pending" fill="#f59e0b" name="Bekleyen" />
                <Bar dataKey="overdue" fill="#ef4444" name="Gecikmiş" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income vs Expense Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gelir-Gider Karşılaştırması (12 Ay)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={value => `£${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="income" fill="#3b82f6" name="Gelir" />
                <Bar dataKey="expense" fill="#f97316" name="Gider" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Period Income Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dönemlik Özet ({monthLabels[parseInt(selectedMonth) - 1]} {selectedYear})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm font-medium">Toplam Tahsil</span>
                <span className="font-bold text-emerald-700">£{currentMonthData.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <span className="text-sm font-medium">Toplam Bekleyen</span>
                <span className="font-bold text-amber-700">£{currentMonthData.pendingAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium">Toplam Gecikmiş</span>
                <span className="font-bold text-red-700">£{currentMonthData.overdueAmount.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Beklenen Toplam</span>
                  <span className="text-lg font-bold">
                    £{(currentMonthData.paidAmount + currentMonthData.pendingAmount + currentMonthData.overdueAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Students by Payment */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold mb-3">En Çok Ödeme Yapan Öğrenciler</p>
              <div className="space-y-2">
                {currentMonthData.monthPayments
                  .filter(p => p.status === 'paid')
                  .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                  .slice(0, 5)
                  .map(payment => {
                    const student = students.find(s => s.id === payment.student_id);
                    return (
                      <div key={payment.id} className="flex justify-between items-center text-sm">
                        <span>{student?.full_name || 'Bilinmeyen'}</span>
                        <Badge variant="secondary">£{payment.amount?.toLocaleString()}</Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}