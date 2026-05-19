import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, BarChart3, Printer, TrendingUp, Users, BookOpen, PieChart as PieChartIcon, Activity, Scale } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line } from 'recharts';
import ProtectedRoute from '@/components/ProtectedRoute';

const COLORS = ['hsl(221,83%,53%)', 'hsl(160,60%,45%)', 'hsl(43,96%,56%)', 'hsl(0,84%,60%)', 'hsl(262,83%,58%)', 'hsl(15,80%,55%)'];

function StatBox({ label, value, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-emerald-50 text-emerald-700',
    red:    'bg-red-50 text-red-700',
    amber:  'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`p-4 rounded-xl ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list() });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: () => base44.entities.Teacher.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => base44.entities.Expense.list() });
  const { data: attendances = [] } = useQuery({ queryKey: ['attendances'], queryFn: () => base44.entities.Attendance.list() });
  const { data: payrollRecords = [] } = useQuery({ queryKey: ['payroll_records'], queryFn: () => base44.entities.PayrollRecord.list() });

  // --- Financial stats ---
  const paidPayments = payments.filter(p => p.status === 'paid');
  const totalRevenue = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPayroll = payrollRecords.filter(r => !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses - totalPayroll;
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

  // --- Student stats ---
  const srcMap = { website: 'Website', whatsapp: 'WhatsApp', email: 'E-posta', referral: 'Referans', walk_in: 'Yüz Yüze', social_media: 'Sosyal Medya' };
  const sourceData = Object.entries(
    students.reduce((acc, s) => { acc[s.source || 'other'] = (acc[s.source || 'other'] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: srcMap[name] || name, value }));

  const statusData = [
    { name: 'Aktif', value: students.filter(s => s.status === 'active').length },
    { name: 'Kayıtlı', value: students.filter(s => s.status === 'enrolled').length },
    { name: 'Görüşme', value: students.filter(s => s.status === 'prospect').length },
    { name: 'Tamamladı', value: students.filter(s => s.status === 'completed').length },
    { name: 'Pasif', value: students.filter(s => s.status === 'inactive').length },
  ].filter(d => d.value > 0);

  // --- Revenue trend (last 7 days) ---
  const revenueTrend = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const total = paidPayments.filter(p => p.payment_date === dayStr).reduce((s, p) => s + (p.amount || 0), 0);
    return { day: format(day, 'EEE'), total };
  });

  // --- Profitability (last 6 months) ---
  const profitabilityData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStr = format(month, 'yyyy-MM');
    const income = paidPayments.filter(p => p.payment_date?.startsWith(monthStr)).reduce((s, p) => s + (p.amount || 0), 0);
    const opExp = expenses.filter(e => e.date?.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0);
    const payroll = payrollRecords.filter(r => !r.is_deduction && r.payment_date?.startsWith(monthStr)).reduce((s, r) => s + (r.amount || 0), 0);
    return { label: format(month, 'MMM yy'), income, opExpenses: opExp, payroll, profit: income - opExp - payroll };
  });

  // --- Attendance stats ---
  const attendanceReport = {
    total: attendances.length,
    present: attendances.filter(a => a.status === 'present').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    late: attendances.filter(a => a.status === 'late').length,
  };

  return (
    <ProtectedRoute requiredPermission="canViewReports">
      <div className="space-y-6 pb-24 sm:pb-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Raporlar & İstatistikler</h1>
            <p className="text-muted-foreground mt-1 text-sm">Tüm veriler ve analizler</p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = format(d, 'yyyy-MM');
                return <SelectItem key={val} value={val}>{format(d, 'MMMM yyyy')}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="financial">Mali</TabsTrigger>
            <TabsTrigger value="students">Öğrenciler</TabsTrigger>
            <TabsTrigger value="attendance">Yoklama</TabsTrigger>
          </TabsList>

          {/* ── FINANCIAL ── */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="Toplam Gelir" value={`£${totalRevenue.toLocaleString('en-GB')}`} color="green" />
              <StatBox label="Toplam Gider" value={`£${(totalExpenses + totalPayroll).toLocaleString('en-GB')}`} color="red" />
              <StatBox label="Net Kâr/Zarar" value={`£${netProfit.toLocaleString('en-GB')}`} color={netProfit >= 0 ? 'blue' : 'red'} />
              <StatBox label="Bekleyen Ödemeler" value={`£${pendingPayments.toLocaleString('en-GB')}`} color="amber" />
            </div>

            {/* Revenue trend chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Gelir Trendi (Son 7 Gün)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221,83%,53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                    <XAxis dataKey="day" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} formatter={v => [`£${v}`, 'Gelir']} />
                    <Area type="monotone" dataKey="total" stroke="hsl(221,83%,53%)" strokeWidth={2.5} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profitability chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" /> Kârlılık Analizi (Son 6 Ay)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-3 flex-wrap">
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-blue-600 font-medium">6 Aylık Gelir</p>
                    <p className="text-sm font-black text-blue-700">£{profitabilityData.reduce((s, d) => s + d.income, 0).toLocaleString('en-GB')}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-red-600 font-medium">6 Aylık Gider</p>
                    <p className="text-sm font-black text-red-700">£{profitabilityData.reduce((s, d) => s + d.opExpenses + d.payroll, 0).toLocaleString('en-GB')}</p>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-center ${profitabilityData.reduce((s, d) => s + d.profit, 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <p className={`text-xs font-medium ${profitabilityData.reduce((s, d) => s + d.profit, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Net Kâr</p>
                    <p className={`text-sm font-black ${profitabilityData.reduce((s, d) => s + d.profit, 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      £{profitabilityData.reduce((s, d) => s + d.profit, 0).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={profitabilityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={v => `£${v >= 1000 ? Math.round(v / 1000) + 'k' : v}`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} formatter={(v, name) => {
                      const labels = { income: 'Gelir', opExpenses: 'Op. Gider', payroll: 'Bordro', profit: 'Net Kâr' };
                      return [`£${Number(v).toLocaleString('en-GB')}`, labels[name] || name];
                    }} />
                    <Bar dataKey="income" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} opacity={0.9} />
                    <Bar dataKey="opExpenses" fill="hsl(0,80%,65%)" radius={[4, 4, 0, 0]} opacity={0.85} stackId="cost" />
                    <Bar dataKey="payroll" fill="hsl(30,85%,60%)" radius={[4, 4, 0, 0]} opacity={0.85} stackId="cost" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(160,60%,40%)" strokeWidth={2.5} dot={{ fill: 'hsl(160,60%,40%)', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Yazdır
              </Button>
            </div>
          </TabsContent>

          {/* ── STUDENTS ── */}
          <TabsContent value="students" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="Toplam Öğrenci" value={students.length} color="blue" />
              <StatBox label="Aktif Öğrenci" value={students.filter(s => s.status === 'active').length} color="green" />
              <StatBox label="Aktif Kurs" value={courses.filter(c => c.status === 'active').length} color="purple" />
              <StatBox label="Aktif Öğretmen" value={teachers.filter(t => t.status === 'active').length} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sources pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" /> Öğrenci Kaynakları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sourceData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={200}>
                        <PieChart>
                          <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={44}>
                            {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {sourceData.map((item, i) => (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-muted-foreground">{item.name}</span>
                            </div>
                            <span className="font-bold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-muted-foreground text-sm py-8 text-center">Veri yok</p>}
                </CardContent>
              </Card>

              {/* Status pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Öğrenci Durumları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={200}>
                        <PieChart>
                          <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={44}>
                            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 flex-1">
                        {statusData.map((item, i) => (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-muted-foreground">{item.name}</span>
                            </div>
                            <span className="font-bold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-muted-foreground text-sm py-8 text-center">Veri yok</p>}
                </CardContent>
              </Card>
            </div>

            {/* Courses bar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Kurs Doluluk Oranı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {courses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={courses.filter(c => c.status === 'active').slice(0, 10).map(c => ({
                      name: c.name?.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
                      enrolled: (c.enrolled_students || []).length,
                      max: c.max_students || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                      <Bar dataKey="enrolled" fill="hsl(221,83%,53%)" radius={[4, 4, 0, 0]} name="Kayıtlı" />
                      <Bar dataKey="max" fill="hsl(220,13%,87%)" radius={[4, 4, 0, 0]} name="Kapasite" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">Veri yok</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ATTENDANCE ── */}
          <TabsContent value="attendance" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBox label="Toplam Kayıt" value={attendanceReport.total} color="blue" />
              <StatBox label="Var" value={attendanceReport.present} color="green" sub={`${attendanceReport.total ? Math.round(attendanceReport.present / attendanceReport.total * 100) : 0}%`} />
              <StatBox label="Yok" value={attendanceReport.absent} color="red" sub={`${attendanceReport.total ? Math.round(attendanceReport.absent / attendanceReport.total * 100) : 0}%`} />
              <StatBox label="Geç" value={attendanceReport.late} color="amber" sub={`${attendanceReport.total ? Math.round(attendanceReport.late / attendanceReport.total * 100) : 0}%`} />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Yoklama Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceReport.total > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Var', value: attendanceReport.present },
                          { name: 'Yok', value: attendanceReport.absent },
                          { name: 'Geç', value: attendanceReport.late },
                        ].filter(d => d.value > 0)}
                        dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50}
                      >
                        <Cell fill="hsl(160,60%,45%)" />
                        <Cell fill="hsl(0,84%,60%)" />
                        <Cell fill="hsl(43,96%,56%)" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm py-8 text-center">Yoklama kaydı yok</p>}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Yazdır
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}