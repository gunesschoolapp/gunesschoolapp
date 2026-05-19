import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Handshake } from 'lucide-react';

function PersonCard({ name, type, owed, deductions, paid, remaining }) {
  const pct = owed > 0 ? Math.min(100, Math.round((paid / owed) * 100)) : 0;
  return (
    <Card className="border border-border hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type === 'teacher' ? 'bg-blue-100' : 'bg-violet-100'}`}>
              {type === 'teacher'
                ? <GraduationCap className="w-4 h-4 text-blue-600" />
                : <Handshake className="w-4 h-4 text-violet-600" />
              }
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">{name}</p>
              <Badge variant="outline" className={`text-[10px] mt-1 ${type === 'teacher' ? 'border-blue-200 text-blue-600' : 'border-violet-200 text-violet-600'}`}>
                {type === 'teacher' ? 'Öğretmen' : 'Ortak'}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Kalan</p>
            <p className={`font-bold text-sm ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              £{(remaining || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Ödendi %{pct}</span>
            <span>Toplam £{(owed || 0).toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-1.5">
            <p className="text-[10px] text-muted-foreground">Hak Ediş</p>
            <p className="text-xs font-bold text-primary">£{(owed || 0).toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-1.5">
            <p className="text-[10px] text-muted-foreground">Avans</p>
            <p className="text-xs font-bold text-orange-600">-£{(deductions || 0).toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-1.5">
            <p className="text-[10px] text-muted-foreground">Ödendi</p>
            <p className="text-xs font-bold text-emerald-600">£{(paid || 0).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PersonSummaryCards({ records, teachers, partners }) {
  const people = [
    ...teachers.map(t => ({ id: t.id, name: t.full_name, type: 'teacher' })),
    ...partners.map(p => ({ id: p.id, name: p.full_name, type: 'partner' })),
  ];

  const summaries = people.map(person => {
    const personRecords = records.filter(r => r.person_id === person.id);
    const owed = personRecords.filter(r => !r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
    const deductions = personRecords.filter(r => r.is_deduction).reduce((s, r) => s + (r.amount || 0), 0);
    const paidViaStatus = personRecords.filter(r => !r.is_deduction && r.status === 'paid').reduce((s, r) => s + (r.amount || 0), 0);
    const paid = paidViaStatus + deductions;
    const remaining = owed - paid;
    return { ...person, owed, deductions, paid, remaining };
  }).filter(p => p.owed > 0 || p.deductions > 0);

  if (summaries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {summaries.map(p => <PersonCard key={p.id} {...p} />)}
    </div>
  );
}