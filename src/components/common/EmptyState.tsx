import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-dashed border-border/80 bg-card p-10 sm:p-12 text-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
};
