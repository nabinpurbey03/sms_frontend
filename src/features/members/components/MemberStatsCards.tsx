import React from 'react';
import { Users, GraduationCap, ShieldCheck, HeartHandshake } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
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
      title: 'Total Members',
      value: stats.total,
      description: `${stats.active} active · ${stats.inactive} inactive`,
      icon: Users,
      variant: 'default' as const,
    },
    {
      id: 'TEACHER' as const,
      title: 'Teaching Faculty',
      value: stats.teachers,
      description: 'Class & Subject Teachers',
      icon: GraduationCap,
      variant: 'emerald' as const,
    },
    {
      id: 'OFFICE_ADMIN' as const,
      title: 'Staff & Admins',
      value: stats.officeAdmins + stats.admins,
      description: `${stats.admins} Admins · ${stats.officeAdmins} Office Staff`,
      icon: ShieldCheck,
      variant: 'blue' as const,
    },
    {
      id: 'PARENT' as const,
      title: 'Parents & Guardians',
      value: stats.parents,
      description: 'Linked to enrolled students',
      icon: HeartHandshake,
      variant: 'amber' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <StatCard
          key={card.id}
          title={card.title}
          value={card.value}
          description={card.description}
          icon={card.icon}
          variant={card.variant}
          selected={selectedRole === card.id}
          onClick={() => onSelectRole?.(card.id)}
          loading={isLoading}
        />
      ))}
    </div>
  );
};
