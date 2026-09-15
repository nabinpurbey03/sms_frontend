import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

const ChartCardSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-4 bg-muted rounded w-1/3" />
    <div className="h-48 bg-muted rounded" />
  </div>
);

const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  (
    {
      title,
      description,
      action,
      isLoading,
      isEmpty,
      emptyMessage = 'No data available',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Card ref={ref} className={cn('', className)} {...props}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartCardSkeleton />
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    );
  }
);
ChartCard.displayName = 'ChartCard';

export { ChartCard };
