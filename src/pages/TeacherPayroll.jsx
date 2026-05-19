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
import { Separator } from '@/components/ui/separator';
import { Plus, DollarSign, AlertCircle, CheckCircle, TrendingDown, Eye } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { format } from 'date-fns';

export default function TeacherPayroll() {
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const qc = useQueryClient();

  const [salaryForm, setSalaryForm] = useState({
    teacher_id: '', base_salary: 0, extra_earnings: 0, notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    salary_id: '', payment_type: 'statutory', amount: 0, payment_method: 'bank_transfer', reference: '', notes: ''
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: salaries = [] } = useQuery({
    queryKey: ['teacher-salaries', selectedPeriod],
    queryFn: () => base44.entities.TeacherSalary.filter({ period: selectedPeriod }),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['teacher-payments', selectedPeriod],
    queryFn: () => base44.entities.TeacherPaymentRecord.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['teacher-expenses', selectedPeriod],
    queryFn: () => base44.entities.TeacherExpense.filter({ period: selectedPeriod }),
  });

  const createSalaryMutation = useMutation({
    mutationFn: (data) => base44.entities.TeacherSalary.create({
      ...data,
      period: selectedPeriod,
      total_earned: data.base_salary + (data.extra_earnings || 0),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-salaries', selectedPeriod] });
      setShowSalaryForm(false);
      setSalaryForm({ teacher_id: '', base_salary: 0, extra_earnings: 0, notes: '' });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data) => base44.entities.TeacherPaymentRecord.create(data),
    onSuccess: async () => {
      // Update salary record
      const salary = salaries.find(s => s.id === paymentForm.salary_id);
      if (salary) {
        const newTotal = (salary.total_paid || 0) + paymentForm.amount;
        await base44.entities.TeacherSalary.update(salary.id, {
          [`${paymentForm.payment_type === 'statutory' ? 'status_amount' : 'cash_payment'}`]: 
            paymentForm.payment_type === 'statutory' 
              ? (salary.status_amount || 0) + paymentForm.amount
              : (salary.cash_payment || 0) + paymentForm.amount,
          total_paid: newTotal,
          balance: salary.total_earned - newTotal,
          status_payment: newTotal >= salary.total_earned ? 'paid' : newTotal > 0 ? 'partial' : 'pending',
        });
      }
      qc.invalidateQueries({ queryKey: ['teacher-payments', selectedPeriod] });
      qc.invalidateQueries({ queryKey: ['teacher-salaries', selectedPeriod] });
      setShowPaymentForm(false);
      setPaymentForm({ salary_id: '', payment_type: 'statutory', amount: 0, payment_method: 'bank_transfer', reference: '', notes: '' });
    },
  });

  const currentSalary = selectedTeacher ? salaries.find(s => s.teacher_id === selectedTeacher) : null;
  const currentPayments = currentSalary ? payments.filter(p => p.salary_id === currentSalary.id) : [];
  const currentExpenses = selectedTeacher ? expenses.filter(e => e.teacher_id === selectedTeacher) : [];

  const payrollSummary = useMemo(() => {
    const total = {
      earned: salaries.reduce((s, sal) => s + (sal.total_earned || 0), 0),
      paid: salaries.reduce((s, sal) => s + (sal.total_paid || 0), 0),
      balance: salaries.reduce((s, sal) => s + (sal.balance || 0), 0),
      expenses: expenses.reduce((s, exp) => s + (exp.allocated_to_teacher || exp.amount || 0), 0),
    };
    return total;
  }, [salaries, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Öğretmen Maaş Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Sabit maaş, ekstra dersler ve giderleri yönetin</p>
        </div>
      </div>

      {/* Period & Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Dönem Seçimi</CardTitle>
              <p className="text-sm text-muted-foreground">Raporlamak istediğiniz ayı seçin</p>
            </div>
            <Input
              type="month"
              value={selectedPeriod.split(' ')[1] && `${selectedPeriod.split(' ')[1]}-${selectedPeriod.split(' ')[0]}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                const date = new Date(year, parseInt(month) - 1);
                setSelectedPeriod(format(date, 'MMMM yyyy'));
              }}
              className="w-40"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Toplam Hak</p>
            <p className="text-2xl font-bold text-primary">£{payrollSummary.earned.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Ödenen</p>
            <p className="text-2xl font-bold text-emerald-600">£{payrollSummary.paid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Bakiye</p>
            <p className="text-2xl font-bold text-amber-600">£{payrollSummary.balance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Giderler</p>
            <p className="text-2xl font-bold text-red-600">£{payrollSummary.expenses.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="salaries" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="salaries">Maaşlar</TabsTrigger>
          <TabsTrigger value="payments">Ödemeler</TabsTrigger>
          <TabsTrigger value="expenses">Giderler</TabsTrigger>
        </TabsList>

        {/* Salaries Tab */}
        <TabsContent value="salaries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Maaş Kayıtları</h3>
            <Dialog open={showSalaryForm} onOpenChange={setShowSalaryForm}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Yeni Maaş Kaydı</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Yeni Maaş Kaydı</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Öğretmen</Label>
                    <SearchableSelect
                      value={salaryForm.teacher_id}
                      onValueChange={v => setSalaryForm({...salaryForm, teacher_id: v})}
                      placeholder="Öğretmen seçin..."
                      options={teachers.map(t => ({ value: t.id, label: t.full_name, subtitle: t.branch || '' }))}
                    />
                  </div>
                  <div>
                    <Label>Sabit Maaş (£)</Label>
                    <Input type="number" value={salaryForm.base_salary} onChange={e => setSalaryForm({...salaryForm, base_salary: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Ekstra Dersler (£)</Label>
                    <Input type="number" value={salaryForm.extra_earnings} onChange={e => setSalaryForm({...salaryForm, extra_earnings: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <Label>Notlar</Label>
                    <Input value={salaryForm.notes} onChange={e => setSalaryForm({...salaryForm, notes: e.target.value})} placeholder="İsteğe bağlı notlar..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowSalaryForm(false)}>İptal</Button>
                    <Button onClick={() => createSalaryMutation.mutate(salaryForm)} disabled={!salaryForm.teacher_id || !salaryForm.base_salary}>Kaydet</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Öğretmen</TableHead>
                      <TableHead className="text-right">Sabit Maaş</TableHead>
                      <TableHead className="text-right">Ekstra</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead className="text-right">Ödenen</TableHead>
                      <TableHead className="text-right">Bakiye</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Maaş kaydı yok</TableCell></TableRow>
                    ) : (
                      salaries.map(salary => {
                        const teacher = teachers.find(t => t.id === salary.teacher_id);
                        return (
                          <TableRow key={salary.id}>
                            <TableCell className="font-medium">{teacher?.full_name || '-'}</TableCell>
                            <TableCell className="text-right">£{salary.base_salary?.toLocaleString()}</TableCell>
                            <TableCell className="text-right">£{(salary.extra_earnings || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">£{(salary.total_earned || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-emerald-600">£{(salary.total_paid || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-amber-600 font-semibold">£{(salary.balance || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={salary.status_payment === 'paid' ? 'bg-emerald-100 text-emerald-700' : salary.status_payment === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                                {salary.status_payment === 'paid' ? 'Ödendi' : salary.status_payment === 'partial' ? 'Kısmi' : 'Bekleniyor'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTeacher(salary.teacher_id);
                                  setShowDetailView(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Ödeme Kayıtları</h3>
            <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!selectedTeacher || !currentSalary}><Plus className="w-4 h-4 mr-2" /> Ödeme Ekle</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Ödeme Kaydı</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Maaş Kaydı</Label>
                    <Select value={paymentForm.salary_id} onValueChange={v => setPaymentForm({...paymentForm, salary_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {salaries.map(s => {
                          const t = teachers.find(tc => tc.id === s.teacher_id);
                          return <SelectItem key={s.id} value={s.id}>{t?.full_name} - £{s.total_earned}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ödeme Türü</Label>
                      <Select value={paymentForm.payment_type} onValueChange={v => setPaymentForm({...paymentForm, payment_type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="statutory">Yasal Sistem</SelectItem>
                          <SelectItem value="cash">Elden Ödeme</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tutar (£)</Label>
                      <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div>
                    <Label>Ödeme Yöntemi</Label>
                    <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm({...paymentForm, payment_method: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Banka Transferi</SelectItem>
                        <SelectItem value="cash">Nakit</SelectItem>
                        <SelectItem value="check">Çek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Referans</Label>
                    <Input value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="Ödeme referansı..." />
                  </div>
                  <div>
                    <Label>Notlar</Label>
                    <Input value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="İsteğe bağlı notlar..." />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowPaymentForm(false)}>İptal</Button>
                    <Button onClick={() => createPaymentMutation.mutate(paymentForm)} disabled={!paymentForm.salary_id || !paymentForm.amount}>Kaydet</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Öğretmen</TableHead>
                      <TableHead>Ödeme Tarihi</TableHead>
                      <TableHead>Türü</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Yöntemi</TableHead>
                      <TableHead>Referans</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Ödeme kaydı yok</TableCell></TableRow>
                    ) : (
                      payments.map(payment => {
                        const salary = salaries.find(s => s.id === payment.salary_id);
                        const teacher = teachers.find(t => t.id === salary?.teacher_id);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{teacher?.full_name || '-'}</TableCell>
                            <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {payment.payment_type === 'statutory' ? 'Yasal' : payment.payment_type === 'cash' ? 'Elden' : 'Transfer'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">£{payment.amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{payment.payment_method === 'bank_transfer' ? 'Banka' : payment.payment_method === 'cash' ? 'Nakit' : 'Çek'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{payment.reference || '-'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Paylaşılan giderler (kira, elektrik, internet vb.)</p>
                {expenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Gider kaydı yok</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategorisi</TableHead>
                          <TableHead>Açıklama</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead className="text-right">Toplam</TableHead>
                          <TableHead className="text-right">Öğretmene</TableHead>
                          <TableHead>Dağıtım</TableHead>
                          <TableHead>Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map(exp => (
                          <TableRow key={exp.id}>
                            <TableCell className="text-xs">{exp.category}</TableCell>
                            <TableCell className="text-sm">{exp.description}</TableCell>
                            <TableCell className="text-xs">{format(new Date(exp.date), 'dd MMM')}</TableCell>
                            <TableCell className="text-right">£{exp.amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">£{(exp.allocated_to_teacher || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{exp.split_method}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{exp.paid ? 'Ödendi' : 'Beklemede'}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail View Modal */}
      {showDetailView && currentSalary && (
        <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{teachers.find(t => t.id === currentSalary.teacher_id)?.full_name} - {selectedPeriod}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Salary Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Sabit Maaş</p>
                  <p className="text-2xl font-bold">£{currentSalary.base_salary?.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Ekstra Dersler</p>
                  <p className="text-2xl font-bold">£{(currentSalary.extra_earnings || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-600">Toplam Hak</p>
                  <p className="text-2xl font-bold text-emerald-700">£{(currentSalary.total_earned || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-4">
                  <p className="text-xs text-amber-600">Bakiye</p>
                  <p className="text-2xl font-bold text-amber-700">£{(currentSalary.balance || 0).toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              {/* Payment Breakdown */}
              <div>
                <h4 className="font-semibold mb-3">Ödeme Detayları</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span className="text-sm">Yasal Sistem Ödemesi</span>
                    <span className="font-semibold">£{(currentSalary.status_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded">
                    <span className="text-sm">Elden Ödenen</span>
                    <span className="font-semibold">£{(currentSalary.cash_payment || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded font-semibold">
                    <span className="text-sm">Toplam Ödenen</span>
                    <span className="text-emerald-700">£{(currentSalary.total_paid || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Individual Payments */}
              {currentPayments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Ödeme Geçmişi</h4>
                    <div className="space-y-2">
                      {currentPayments.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-2 text-sm border rounded">
                          <div>
                            <p className="font-medium">{format(new Date(p.payment_date), 'dd MMM yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{p.payment_type === 'statutory' ? 'Yasal' : 'Elden'} • {p.payment_method}</p>
                          </div>
                          <span className="font-semibold">£{p.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Related Expenses */}
              {currentExpenses.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Bağlantılı Giderler</h4>
                    <div className="space-y-2">
                      {currentExpenses.map(e => (
                        <div key={e.id} className="flex justify-between items-center p-2 text-sm border rounded">
                          <div>
                            <p className="font-medium">{e.description}</p>
                            <p className="text-xs text-muted-foreground">{e.category}</p>
                          </div>
                          <span className="font-semibold text-red-600">-£{(e.allocated_to_teacher || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}