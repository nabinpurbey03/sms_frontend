import React from 'react';
import { BookOpen, Layers, Users, TrendingUp } from 'lucide-react';
import type { AcademicStats } from '../types';

interface AcademicStatsCardsProps {
  stats: AcademicStats;
  isLoading?: boolean;
}

export const AcademicStatsCards: React.FC<AcademicStatsCardsProps> = ({
  stats,
  isLoading = false,
}) => {
  const cards = [
    {
      label: 'Active Classes',
      value: stats.totalClasses,
      subtext: 'Configured academic levels',
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      label: 'Total Sections',
      value: stats.totalSections,
      subtext: 'Auto & sequentially provisioned',
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Enrolled Students',
      value: stats.totalStudents,
      subtext: 'Active across all sections',
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Avg Section Size',
      value: stats.avgStudentsPerSection,
      subtext: 'Target: ≥ 20 for expansion',
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="flex items-start justify-between p-4 rounded-xl border border-border/60 bg-card shadow-xs transition-all duration-200"
          >
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? '—' : card.value}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">{card.subtext}</p>
            </div>
            <div className={`p-2.5 rounded-lg border ${card.bg} ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
