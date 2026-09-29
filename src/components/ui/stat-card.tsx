import * as React from 'react';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
  variant?: 'default' | 'emerald' | 'amber' | 'blue' | 'purple';
  onClick?: () => void;
  selected?: boolean;
}

const variantStyles = {
  default: {
    iconBg: 'bg-primary/10 text-primary dark:text-cyan-300 border-primary/20',
    selectedRing: 'ring-2 ring-primary border-primary',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    selectedRing: 'ring-2 ring-emerald-500 border-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    selectedRing: 'ring-2 ring-amber-500 border-amber-500',
  },
  blue: {
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    selectedRing: 'ring-2 ring-blue-500 border-blue-500',
  },
  purple: {
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    selectedRing: 'ring-2 ring-purple-500 border-purple-500',
  },
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      icon: Icon,
      description,
      trend,
      loading = false,
      variant = 'default',
      onClick,
      selected = false,
      className,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <Card ref={ref} className={cn('relative overflow-hidden rounded-xl border border-border/60 bg-card', className)} {...props}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-10 w-10 bg-muted animate-pulse rounded-xl shrink-0 ml-3" />
            </div>
          </CardContent>
        </Card>
      );
    }

    const currentVariant = variantStyles[variant] || variantStyles.default;
    const isPositiveTrend = trend && trend.value >= 0;

    return (
      <Card
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-pressed={onClick ? selected : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          'relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 shadow-xs',
          onClick && 'cursor-pointer hover:shadow-md hover:border-border select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          selected && `${currentVariant.selectedRing} shadow-sm`,
          className
        )}
        {...props}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {selected && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    Filtered
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1 pt-0.5">
                  {isPositiveTrend ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositiveTrend
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {isPositiveTrend ? '+' : ''}
                    {trend.value}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </div>
            <div className={cn('p-2.5 rounded-xl border shrink-0 ml-3', currentVariant.iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = 'StatCard';

export { StatCard };
