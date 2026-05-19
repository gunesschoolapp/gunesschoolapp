import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bell, CheckCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function OverduePaymentsWidget() {
  const queryClient = useQueryClient();
  const [expandedPayments, setExpandedPayments] = useState(new Set());

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

  // Mark payment as paid
  const markAsPaidMutation = useMutation({
    mutationFn: (paymentId) =>
      base44.entities.Payment.update(paymentId, { status: 'paid', payment_date: format(new Date(), 'yyyy-MM-dd') }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  // Get overdue and pending payments grouped by student
  const unpaidPayments = useMemo(() => {
    const today = new Date();
    const unpaid = payments.filter(p => ['pending', 'overdue'].includes(p.status));

    return unpaid.map(payment => {
      const student = students.find(s => s.id === payment.student_id);
      const course = courses.find(c => c.id === payment.course_id);
      const dueDate = payment.due_date ? parseISO(payment.due_date) : null;
      const daysOverdue = dueDate ? Math.max(0, differenceInDays(today, dueDate)) : 0;
      const isOverdue = dueDate && today > dueDate;

      return {
        ...payment,
        student,
        course,
        dueDate,
        daysOverdue,
        isOverdue,
      };
    })
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return (b.daysOverdue || 0) - (a.daysOverdue || 0);
    });
  }, [payments, students, courses]);

  const stats = useMemo(() => {
    const overdue = unpaidPayments.filter(p => p.isOverdue);
    const pending = unpaidPayments.filter(p => !p.isOverdue);
    return {
      totalUnpaid: unpaidPayments.length,
      totalOverdue: overdue.length,
      totalPending: pending.length,
      overdueAmount: overdue.reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingAmount: pending.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  }, [unpaidPayments]);

  const toggleExpand = (paymentId) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Ödenmemiş
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              £{(stats.overdueAmount + stats.pendingAmount).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalUnpaid} ödeme
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
            <p className="text-2xl font-bold text-red-600">
              £{stats.overdueAmount.toLocaleString()}
            </p>
            <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" /> {stats.totalOverdue} ödeme
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yaklaşan Ödemeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              £{stats.pendingAmount.toLocaleString()}
            </p>
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <Bell className="w-3 h-3" /> {stats.totalPending} ödeme
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Payments List */}
      {unpaidPayments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Ödenmemiş Taksitler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unpaidPayments.map((payment) => (
                <div
                  key={payment.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    payment.isOverdue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">
                          {payment.student?.full_name || 'Bilinmeyen Öğrenci'}
                        </p>
                        {payment.isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            {payment.daysOverdue} gün geç
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {payment.course?.name || 'Kurs'} · Taksit {payment.installment_number}/{payment.total_installments}
                      </p>
                      {expandedPayments.has(payment.id) && (
                        <div className="text-xs text-muted-foreground space-y-1 mb-3 pt-2 border-t border-current/10">
                          <p>Vade: <span className="font-medium">{payment.dueDate ? format(payment.dueDate, 'dd MMM yyyy') : '-'}</span></p>
                          {payment.notes && <p>Not: {payment.notes}</p>}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold">£{payment.amount?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_method ? (payment.payment_method === 'cash' ? 'Nakit' : payment.payment_method === 'credit_card' ? 'Kredi Kartı' : 'Havale') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
                    <button
                      onClick={() => toggleExpand(payment.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {expandedPayments.has(payment.id) ? 'Gizle' : 'Detaylar'}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsPaidMutation.mutate(payment.id)}
                      disabled={markAsPaidMutation.isPending}
                      className="ml-auto"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ödendi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Tüm ödemeler güncel. Harika! 🎉</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}