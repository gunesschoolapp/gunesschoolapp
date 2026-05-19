import React from 'react';
import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-violet-50 text-violet-600',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {trendLabel && (
            <p className={`text-xs mt-2 font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}