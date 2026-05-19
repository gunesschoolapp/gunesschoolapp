import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { User, BookOpen, CreditCard, Phone, Mail } from 'lucide-react';

const levelColors = {
  A1: 'bg-emerald-100 text-emerald-700', A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700', B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-violet-100 text-violet-700', C2: 'bg-purple-100 text-purple-700',
};

export default function StudentContextPanel({ studentId }) {
  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => base44.entities.Student.filter({ id: studentId }).then(r => r[0]),
    enabled: !!studentId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments-student', studentId],
    queryFn: () => base44.entities.Payment.filter({ student_id: studentId }, '-payment_date', 5),
    enabled: !!studentId,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  if (!studentId) {
    return (
      <div className="h-full border-l border-border bg-card flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">Select a conversation to see student details</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-full border-l border-border bg-card flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">No linked student profile</p>
      </div>
    );
  }

  const enrolledCourses = courses.filter(c => (c.enrolled_students || []).includes(studentId));
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="h-full border-l border-border bg-card overflow-y-auto">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{student.full_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[student.cefr_level] || 'bg-gray-100 text-gray-700'}`}>
              {student.cefr_level || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="p-4 border-b border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
        {student.phone && (
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            {student.phone}
          </div>
        )}
        {student.email && (
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            {student.email}
          </div>
        )}
      </div>

      {/* Courses */}
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Courses</p>
        {enrolledCourses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No courses</p>
        ) : (
          <div className="space-y-1">
            {enrolledCourses.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{c.name}</span>
                <span className="text-muted-foreground">{c.cefr_level}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financials */}
      <div className="p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Payments</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-emerald-50 rounded-lg p-2 text-center">
            <p className="text-xs text-emerald-600 font-medium">Paid</p>
            <p className="text-sm font-bold text-emerald-700">£{totalPaid.toFixed(0)}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-xs text-amber-600 font-medium">Pending</p>
            <p className="text-sm font-bold text-amber-700">£{totalPending.toFixed(0)}</p>
          </div>
        </div>
        {payments.slice(0, 3).map(p => (
          <div key={p.id} className="flex items-center justify-between py-1 text-xs border-b border-border last:border-0">
            <span className="text-foreground">£{p.amount}</span>
            <Badge variant="outline" className={`text-xs ${p.status === 'paid' ? 'text-emerald-600' : p.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
              {p.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}