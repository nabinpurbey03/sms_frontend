import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Bus,
  Building2,
  Utensils,
  Trophy,
  GraduationCap,
  Tag,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { FeeCategory } from '../types';

interface StudentFacilityBadgeProps {
  category: FeeCategory | string;
  name: string;
  amount?: number | string | null;
  frequency?: string;
  onClick?: () => void;
  className?: string;
}

export const StudentFacilityBadge: React.FC<StudentFacilityBadgeProps> = ({
  category,
  name,
  amount,
  frequency,
  onClick,
  className = '',
}) => {
  const cat = String(category).toUpperCase();

  // Category specific styles and icons
  let icon = <Layers className="w-3 h-3" />;
  let colorClasses = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';

  if (cat === 'TRANSPORT') {
    icon = <Bus className="w-3 h-3" />;
    colorClasses = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  } else if (cat === 'HOSTEL') {
    icon = <Building2 className="w-3 h-3" />;
    colorClasses = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20';
  } else if (cat === 'CANTEEN') {
    icon = <Utensils className="w-3 h-3" />;
    colorClasses = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
  } else if (cat === 'COACHING' || cat === 'ACTIVITY') {
    icon = <Trophy className="w-3 h-3" />;
    colorClasses = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
  } else if (cat === 'SCHOLARSHIP') {
    icon = <Tag className="w-3 h-3" />;
    colorClasses = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
  } else if (cat === 'TUITION') {
    icon = <GraduationCap className="w-3 h-3" />;
    colorClasses = 'bg-blue-600/10 text-blue-800 dark:text-blue-300 border-blue-600/20';
  }

  const amtNum = amount !== undefined && amount !== null ? Number(amount) : null;
  const isClickable = Boolean(onClick);

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-lg border transition-all ${colorClasses} ${
        isClickable ? 'cursor-pointer hover:shadow-xs hover:brightness-95 active:scale-95 select-none' : ''
      } ${className}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate max-w-[130px]">{name}</span>
      {amtNum !== null && (
        <span className="font-mono text-[11px] font-bold opacity-90 shrink-0">
          NPR {amtNum.toLocaleString()}
          {frequency === 'MONTHLY' ? '/mo' : ''}
        </span>
      )}
    </Badge>
  );
};
