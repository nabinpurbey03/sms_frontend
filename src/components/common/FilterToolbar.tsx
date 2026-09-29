import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface FilterStatusOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface FilterToolbarProps<T extends string = string> {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  statusOptions?: FilterStatusOption<T>[];
  activeStatus?: T;
  onStatusChange?: (status: T) => void;
  showingCount?: number;
  totalCount?: number;
  unitLabel?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterToolbar<T extends string = string>({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  statusOptions,
  activeStatus,
  onStatusChange,
  showingCount,
  totalCount,
  unitLabel = 'items',
  children,
  actions,
  className,
}: FilterToolbarProps<T>) {
  return (
    <div
      className={cn(
        'p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-3',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-9 text-xs rounded-lg"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        )}

        {/* Children custom selectors (e.g. Class, Section, Academic Year) */}
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}

        {/* Status segmented pills & action buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
          {statusOptions && onStatusChange && (
            <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40">
              {statusOptions.map((opt) => {
                const isActive = activeStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onStatusChange(opt.id)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                      isActive
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span>{opt.label}</span>
                    {typeof opt.count === 'number' && (
                      <span className="ml-1.5 opacity-70 text-[10px]">({opt.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {showingCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-muted-foreground hidden lg:inline mr-1">
              Showing <strong className="text-foreground">{showingCount}</strong> of {totalCount}{' '}
              {unitLabel}
            </span>
          )}

          {actions}
        </div>
      </div>
    </div>
  );
}
