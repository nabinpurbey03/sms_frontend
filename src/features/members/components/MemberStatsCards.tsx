import React from 'react';
import { Users, GraduationCap, ShieldCheck, HeartHandshake } from 'lucide-react';
import type { MemberStats, MemberRole } from '../types';

interface MemberStatsCardsProps {
  stats: MemberStats;
  selectedRole?: MemberRole | 'ALL';
  onSelectRole?: (role: MemberRole | 'ALL') => void;
  isLoading?: boolean;
}

export const MemberStatsCards: React.FC<MemberStatsCardsProps> = ({
  stats,
  selectedRole = 'ALL',
  onSelectRole,
  isLoading = false,
}) => {
  const cards = [
    {
      id: 'ALL' as const,
      label: 'Total Members',
      count: stats.total,
      subtext: `${stats.active} active · ${stats.inactive} inactive`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
      activeRing: 'ring-2 ring-primary border-primary',
    },
    {
      id: 'TEACHER' as const,
      label: 'Teaching Faculty',
      count: stats.teachers,
      subtext: 'Class & Subject Teachers',
      icon: GraduationCap,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      activeRing: 'ring-2 ring-emerald-500 border-emerald-500',
    },
    {
      id: 'OFFICE_ADMIN' as const,
      label: 'Staff & Admins',
      count: stats.officeAdmins + stats.admins,
      subtext: `${stats.admins} Admins · ${stats.officeAdmins} Office Staff`,
      icon: ShieldCheck,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      activeRing: 'ring-2 ring-indigo-500 border-indigo-500',
    },
    {
      id: 'PARENT' as const,
      label: 'Parents & Guardians',
      count: stats.parents,
      subtext: 'Linked to enrolled students',
      icon: HeartHandshake,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      activeRing: 'ring-2 ring-amber-500 border-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedRole === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectRole?.(card.id)}
            disabled={isLoading}
            className={`flex items-start justify-between p-4 rounded-xl border bg-card text-left transition-all duration-200 hover:shadow-md cursor-pointer ${
              isSelected ? `${card.activeRing} shadow-sm` : 'border-border/60 hover:border-border'
            }`}
          >
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {isLoading ? '—' : card.count}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    Filtered
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{card.subtext}</p>
            </div>
            <div className={`p-2.5 rounded-lg border ${card.bg} ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
