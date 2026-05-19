import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  present: { label: 'Katıldı', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  absent: { label: 'Katılmadı', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  late: { label: 'Geç Kaldı', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  excused: { label: 'Mazeretli', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
};

export default function StudentAttendance() {
  const { student } = useOutletContext();
  const [attendance, setAttendance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!student?.id) return;
    Promise.all([
      base44.entities.Attendance.filter({ student_id: student.id }, '-date', 100),
      base44.entities.Course.list(),
    ]).then(([a, c]) => {
      setAttendance(a);
      setCourses(c);
    }).finally(() => setLoading(false));
  }, [student?.id]);

  const getCourse = id => courses.find(c => c.id === id);

  const present = attendance.filter(a => a.status === 'present').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.status === 'late').length;
  const rate = attendance.length > 0 ? Math.round(((present + late) / attendance.length) * 100) : 0;

  const filtered = filter === 'all' ? attendance : attendance.filter(a => a.status === filter);

  if (loading) return (
    <div className="p-6 flex justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-xl font-bold">Devam Durumum</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Katıldı', count: present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Katılmadı', count: absent, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Geç', count: late, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Oran', count: `%${rate}`, color: 'text-primary', bg: 'bg-primary/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Genel Devam Oranı</span>
          <span className="font-bold text-primary">%{rate}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {rate >= 80 ? '✅ Devam oranınız iyi durumda' : rate >= 60 ? '⚠️ Devam oranınız düşüyor' : '❌ Devam oranınız kritik seviyede'}
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: 'all', label: 'Tümü' },
          { val: 'present', label: 'Katıldı' },
          { val: 'absent', label: 'Katılmadı' },
          { val: 'late', label: 'Geç' },
          { val: 'excused', label: 'Mazeretli' },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setFilter(f.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.val ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Kayıt bulunamadı</p>
          </div>
        ) : (
          filtered.map(a => {
            const s = statusConfig[a.status] || statusConfig.present;
            const Icon = s.icon;
            const course = getCourse(a.course_id);
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{course?.name || 'Ders'}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.date ? format(new Date(a.date), 'dd MMM yyyy') : '-'}
                    {a.teacher_comment && ` · ${a.teacher_comment}`}
                  </p>
                </div>
                <span className={`text-xs font-medium ${s.color} flex-shrink-0`}>{s.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}