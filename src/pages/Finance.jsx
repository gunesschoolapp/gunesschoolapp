import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Edit2, Save, X, PieChart, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Finance() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedMonthYear, setSelectedMonthYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const selectedPeriod = format(new Date(selectedMonthYear, selectedMonth - 1), 'MMMM yyyy');
  const setSelectedPeriod = (period) => {
    try {
      const d = new Date(period);
      if (!isNaN(d)) { setSelectedMonth(d.getMonth() + 1); setSelectedMonthYear(d.getFullYear()); }
    } catch {}
  };
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new_payment') {
      setShowPaymentDialog(true);
      // clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const [paymentForm, setPaymentForm] = useState({ student_id: '', amount: '', status: 'pending', payment_date: format(new Date(), 'yyyy-MM-dd') });
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'other', description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), paid: false });
  const queryClient = useQueryClient();

  const { mutate: updatePayment } = useMutation({
    mutationFn: (data) => base44.entities.Payment.update(data.id, { amount: data.amount, status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-payments'] });
      setEditingId(null);
    }
  });

  const { mutate: updateExpense } = useMutation({
    mutationFn: (data) => base44.entities.Expense.update(data.id, { amount: data.amount, paid: data.paid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setEditingId(null);
    }
  });

  const { mutate: createPayment } = useMutation({
    mutationFn: (data) => base44.entities.Payment.create({ ...data, amount: Number(data.amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-payments'] });
      setPaymentForm({ student_id: '', amount: '', status: 'pending', payment_date: format(new Date(), 'yyyy-MM-dd') });
      setStudentSearch('');
      setShowStudentDropdown(false);
      setShowPaymentDialog(false);
    }
  });

  const { mutate: createExpense } = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({ ...data, amount: Number(data.amount), period: selectedPeriod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseForm({ category: 'other', description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), paid: false });
      setShowExpenseDialog(false);
    }
  });

  const { mutate: deletePayment } = useMutation({
    mutationFn: (id) => base44.entities.Payment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-payments'] })
  });

  const { mutate: deleteExpense } = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] })
  });

  const { data: salaries = [] } = useQuery({
    queryKey: ['teacher-salaries'],
    queryFn: () => base44.entities.TeacherSalary.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['student-payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-finance'],
    queryFn: () => base44.entities.Student.list(),
  });

  // Filter by period
  const getFilteredData = (data, dateField) => {
    return data.filter(item => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      if (isNaN(itemDate.getTime())) return false;
      
      const itemYear = itemDate.getFullYear();
      
      if (reportType === 'yearly') {
        return itemYear === selectedYear;
      } else {
        return format(itemDate, 'MMMM yyyy') === selectedPeriod;
      }
    });
  };

  const filteredPayments = getFilteredData(payments, 'payment_date');
  const filteredExpenses = getFilteredData(expenses, 'date');
  const filteredSalaries = getFilteredData(salaries, 'period');

  // Calculate totals
  const studentPaymentTotal = filteredPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const teacherSalaryTotal = filteredSalaries.reduce((s, s_) => s + (s_.total_paid || 0), 0);
  const expensesTotal = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = studentPaymentTotal - teacherSalaryTotal - expensesTotal;

  // Potansiyel satış hesaplaması
  const potentialSalesAmount = students.reduce((s, student) => s + (student.potential_sale_amount || 0), 0);
  const lostSalesAmount = potentialSalesAmount - studentPaymentTotal;
  const conversionRate = potentialSalesAmount > 0 ? ((studentPaymentTotal / potentialSalesAmount) * 100).toFixed(1) : 0;

  const paymentBreakdown = {
    paid: filteredPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
    pending: filteredPayments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
    overdue: filteredPayments.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.amount || 0), 0),
  };

  const expensesByCategory = {};
  filteredExpenses.forEach(e => {
    if (!expensesByCategory[e.category]) expensesByCategory[e.category] = 0;
    expensesByCategory[e.category] += e.amount || 0;
  });

  // Chart data
  const categoryChartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value)
  }));

  const paymentStatusData = [
    { name: 'Ödendi', value: paymentBreakdown.paid, fill: '#10b981' },
    { name: 'Bekleyen', value: paymentBreakdown.pending, fill: '#f59e0b' },
    { name: 'Gecikmiş', value: paymentBreakdown.overdue, fill: '#ef4444' }
  ];

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  const categoryColors = categoryChartData.map((_, idx) => colors[idx % colors.length]);

  return (
    <ProtectedRoute requiredPermission="canViewFinance">
      <div className="space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Finans Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gelir, gider ve maaş özeti</p>
        </div>

        {/* Report Period Selector */}
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Rapor Türü</label>
                <div className="flex gap-2">
                  {['monthly', 'yearly'].map(type => (
                    <button
                      key={type}
                      onClick={() => setReportType(type)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        reportType === type
                          ? 'bg-primary text-white shadow-lg'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {type === 'monthly' ? '📅 Aylık' : '📈 Yıllık'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 items-end flex-1">
                {reportType === 'yearly' && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Yıl</label>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                
                {reportType === 'monthly' && (
                   <div className="flex gap-2 items-end flex-1">
                     <div>
                       <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Yıl</label>
                       <select
                         value={selectedMonthYear}
                         onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                         className="px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                       >
                         {Array.from({length: 11}, (_, i) => {
                           const y = new Date().getFullYear() - 5 + i;
                           return <option key={y} value={y}>{y}</option>;
                         })}
                       </select>
                     </div>
                     <div className="flex-1">
                       <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Ay</label>
                       <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 text-muted-foreground" />
                         <select
                           value={selectedMonth}
                           onChange={(e) => setSelectedMonth(Number(e.target.value))}
                           className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
                         >
                           {Array.from({length: 12}, (_, i) => {
                             const d = new Date(2024, i);
                             return <option key={i + 1} value={i + 1}>{format(d, 'MMMM')}</option>;
                           })}
                         </select>
                       </div>
                     </div>
                   </div>
                 )}


              </div>
            </div>
          </CardContent>
        </Card>

      {/* Sales Comparison */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
        <CardHeader>
          <CardTitle className="text-base">Potansiyel vs Gerçek Satış</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Potansiyel</p>
              <p className="text-2xl font-bold text-primary mt-1">£{potentialSalesAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gerçek Satış</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">£{studentPaymentTotal.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Kayıp</p>
              <p className={`text-2xl font-bold mt-1 ${lostSalesAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>£{lostSalesAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Dönüşüm</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{conversionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Öğrenci Gelirleri</p>
            <p className="text-3xl font-black mt-2 text-emerald-600">£{studentPaymentTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">{filteredPayments.filter(p => p.status === 'paid').length} ödeme</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden hover:shadow-lg transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-red-600" />
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Öğretmen Maaşları</p>
            <p className="text-3xl font-black mt-2 text-red-600">£{teacherSalaryTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">{teachers.filter(t => t.fixed_salary > 0).length} öğretmen</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden hover:shadow-lg transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-600" />
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">İşletme Giderleri</p>
            <p className="text-3xl font-black mt-2 text-amber-600">£{expensesTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">{filteredExpenses.length} işlem</p>
          </CardContent>
        </Card>
        <Card className={`relative overflow-hidden hover:shadow-lg transition-all ${netProfit < 0 ? 'border-red-200' : ''}`}>
          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${netProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'}`} />
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Kar/Zarar</p>
            <p className={`text-3xl font-black mt-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>£{netProfit.toLocaleString()}</p>
            <p className={`text-xs mt-2 flex items-center gap-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {netProfit >= 0 ? '✓ Kar' : <AlertCircle className="w-3 h-3" />}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs px-1 sm:px-3">Özet</TabsTrigger>
          <TabsTrigger value="income" className="text-xs px-1 sm:px-3">Gelir</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs px-1 sm:px-3">Gider</TabsTrigger>
          <TabsTrigger value="salaries" className="text-xs px-1 sm:px-3">Maaş</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ödeme Durumu Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentStatusData.every(d => d.value === 0) ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Ödeme kaydı yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPie data={paymentStatusData}>
                      <Pie dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expense Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gider Kategorileri</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Gider kaydı yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={categoryColors[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Tahsil Edilen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">£{paymentBreakdown.paid.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen/Gecikmiş</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">£{(paymentBreakdown.pending + paymentBreakdown.overdue).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Gider</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">£{expensesTotal.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowPaymentDialog(true)} className="gap-2"><Plus className="w-4 h-4" /> Yeni Ödeme</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Öğrenci Ödeme Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Öğrenci</TableHead>
                      <TableHead>Kurs</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Ödeme kaydı yok</TableCell></TableRow>
                    ) : (
                      filteredPayments.map(payment => (
                        <TableRow key={payment.id} className={editingId === payment.id ? 'bg-blue-50' : ''}>
                          <TableCell className="font-medium text-xs">Öğrenci {payment.student_id?.slice(0, 6)}</TableCell>
                          <TableCell className="text-xs">Kurs</TableCell>
                          <TableCell className="text-right">
                            {editingId === payment.id ? (
                              <input 
                                type="number" 
                                value={editingData.amount || payment.amount} 
                                onChange={(e) => setEditingData({...editingData, amount: Number(e.target.value)})}
                                className="w-20 px-2 py-1 border rounded text-xs"
                              />
                            ) : (
                              <span className="font-semibold">£{payment.amount?.toLocaleString()}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{payment.payment_date || payment.due_date}</TableCell>
                          <TableCell>
                            {editingId === payment.id ? (
                              <select 
                                value={editingData.status || payment.status} 
                                onChange={(e) => setEditingData({...editingData, status: e.target.value})}
                                className="text-xs px-2 py-1 border rounded"
                              >
                                <option value="paid">Ödendi</option>
                                <option value="pending">Bekleyen</option>
                                <option value="overdue">Gecikmiş</option>
                              </select>
                            ) : (
                              <Badge className={payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : payment.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} variant="outline">
                                {payment.status === 'paid' ? 'Ödendi' : payment.status === 'pending' ? 'Bekleyen' : 'Gecikmiş'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === payment.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => updatePayment({id: payment.id, ...editingData})} className="h-6"><Save className="w-3 h-3" /></Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-6"><X className="w-3 h-3" /></Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => {setEditingId(payment.id); setEditingData(payment);}} className="h-6"><Edit2 className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => deletePayment(payment.id)} className="h-6"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                              </div>
                            )}
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

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowExpenseDialog(true)} className="gap-2"><Plus className="w-4 h-4" /> Yeni Gider</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gider Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Gider kaydı yok</TableCell></TableRow>
                    ) : (
                      filteredExpenses.map(expense => (
                        <TableRow key={expense.id} className={editingId === expense.id ? 'bg-blue-50' : ''}>
                          <TableCell className="text-xs capitalize">{expense.category}</TableCell>
                          <TableCell className="font-medium text-xs">{expense.description}</TableCell>
                          <TableCell className="text-xs">{expense.date && !isNaN(new Date(expense.date)) ? format(new Date(expense.date), 'dd MMM yyyy') : expense.date || '-'}</TableCell>
                          <TableCell className="text-right">
                            {editingId === expense.id ? (
                              <input 
                                type="number" 
                                value={editingData.amount || expense.amount} 
                                onChange={(e) => setEditingData({...editingData, amount: Number(e.target.value)})}
                                className="w-20 px-2 py-1 border rounded text-xs"
                              />
                            ) : (
                              <span className="font-semibold">£{expense.amount?.toLocaleString()}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === expense.id ? (
                              <select 
                                value={editingData.paid ? 'true' : 'false'} 
                                onChange={(e) => setEditingData({...editingData, paid: e.target.value === 'true'})}
                                className="text-xs px-2 py-1 border rounded"
                              >
                                <option value="true">Ödendi</option>
                                <option value="false">Beklemede</option>
                              </select>
                            ) : (
                              <Badge className={expense.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} variant="outline">
                                {expense.paid ? 'Ödendi' : 'Beklemede'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === expense.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => updateExpense({id: expense.id, ...editingData})} className="h-6"><Save className="w-3 h-3" /></Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-6"><X className="w-3 h-3" /></Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => {setEditingId(expense.id); setEditingData(expense);}} className="h-6"><Edit2 className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteExpense(expense.id)} className="h-6"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                              </div>
                            )}
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

        {/* Salaries Tab */}
        <TabsContent value="salaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Öğretmen Maaş Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Öğretmen</TableHead>
                      <TableHead className="text-right">Sabit Maaş</TableHead>
                      <TableHead className="text-right">Toplam Hak</TableHead>
                      <TableHead className="text-right">Ödenen</TableHead>
                      <TableHead className="text-right">Bakiye</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.filter(t => t.fixed_salary > 0).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sabit maaş kaydı yok</TableCell></TableRow>
                    ) : (
                      teachers.filter(t => t.fixed_salary > 0).map(teacher => (
                        <TableRow key={teacher.id} className={editingId === teacher.id ? 'bg-blue-50' : ''}>
                          <TableCell className="font-medium text-xs">{teacher.full_name}</TableCell>
                          <TableCell className="text-right">£{teacher.fixed_salary?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">£{teacher.fixed_salary?.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {editingId === teacher.id ? (
                              <input 
                                type="number" 
                                value={editingData.paid || 0} 
                                onChange={(e) => setEditingData({...editingData, paid: Number(e.target.value)})}
                                className="w-20 px-2 py-1 border rounded text-xs"
                              />
                            ) : '£0'}
                          </TableCell>
                          <TableCell className="text-right text-amber-600 font-semibold">£{teacher.fixed_salary?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Beklemede</Badge>
                          </TableCell>
                          <TableCell>
                            {editingId === teacher.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6"><Save className="w-3 h-3" /></Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-6"><X className="w-3 h-3" /></Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => {setEditingId(teacher.id); setEditingData({});}} className="h-6"><Edit2 className="w-3 h-3" /></Button>
                            )}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(v) => { setShowPaymentDialog(v); if (!v) { setStudentSearch(''); setShowStudentDropdown(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Ödeme Kaydı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium">Öğrenci</label>
              <Input
                className="mt-1"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowStudentDropdown(true);
                  if (!e.target.value) setPaymentForm({...paymentForm, student_id: ''});
                }}
                placeholder="Öğrenci adı veya telefon ara..."
              />
              {showStudentDropdown && studentSearch.length > 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {students
                    .filter(s => 
                      s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.phone?.includes(studentSearch) ||
                      s.email?.toLowerCase().includes(studentSearch.toLowerCase())
                    )
                    .slice(0, 8)
                    .map(s => (
                      <button
                        key={s.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex flex-col"
                        onClick={() => {
                          setPaymentForm({...paymentForm, student_id: s.id});
                          setStudentSearch(s.full_name);
                          setShowStudentDropdown(false);
                        }}
                      >
                        <span className="font-medium">{s.full_name}</span>
                        {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                      </button>
                    ))
                  }
                  {students.filter(s =>
                    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.phone?.includes(studentSearch) ||
                    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Öğrenci bulunamadı</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Tutar (£)</label>
              <Input 
                type="number" 
                value={paymentForm.amount} 
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tarih</label>
              <Input 
                type="date" 
                value={paymentForm.payment_date} 
                onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Durum</label>
              <select 
                value={paymentForm.status} 
                onChange={(e) => setPaymentForm({...paymentForm, status: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="pending">Bekleyen</option>
                <option value="paid">Ödendi</option>
                <option value="overdue">Gecikmiş</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>İptal</Button>
            <Button onClick={() => createPayment(paymentForm)}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Gider Kaydı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Kategori</label>
              <select 
                value={expenseForm.category} 
                onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="rent">Kira</option>
                <option value="utilities">Elektrik/Su</option>
                <option value="internet">İnternet</option>
                <option value="maintenance">Bakım</option>
                <option value="supplies">Malzeme</option>
                <option value="equipment">Ekipman</option>
                <option value="insurance">Sigorta</option>
                <option value="marketing">Pazarlama</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Açıklama</label>
              <Input 
                value={expenseForm.description} 
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="Gider açıklaması"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tutar (£)</label>
              <Input 
                type="number" 
                value={expenseForm.amount} 
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tarih</label>
              <Input 
                type="date" 
                value={expenseForm.date} 
                onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={expenseForm.paid} 
                onChange={(e) => setExpenseForm({...expenseForm, paid: e.target.checked})}
                className="rounded border-input"
              />
              <label className="text-sm font-medium">Ödendi</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>İptal</Button>
            <Button onClick={() => createExpense(expenseForm)}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ProtectedRoute>
  );
}