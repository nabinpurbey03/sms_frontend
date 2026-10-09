import React from 'react';
import { useAuth } from '@/auth/useAuth';
import { useAcademicYears } from '@/features/academic/hooks';
import { Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SessionArchiveSelectProps {
  value?: string;
  onChange: (academicYearId: string | undefined) => void;
  className?: string;
}

export const SessionArchiveSelect: React.FC<SessionArchiveSelectProps> = ({
  value,
  onChange,
  className,
}) => {
  const { activeTenantId } = useAuth();
  const { data: academicYears = [], isLoading } = useAcademicYears(activeTenantId);

  const activeYear = academicYears.find((y) => y.is_current) || academicYears[0];
  const archivedYears = academicYears.filter((y) => y.id !== activeYear?.id);

  // If value is set and does not equal activeYear.id, it is an archived session
  const isArchived = Boolean(value && activeYear && value !== activeYear.id);

  // Default to active academic year id if value is undefined
  const currentSelectValue = value ?? activeYear?.id ?? '';

  const handleValueChange = (selectedId: string) => {
    if (activeYear && selectedId === activeYear.id) {
      onChange(undefined);
    } else {
      onChange(selectedId);
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-input bg-background/50 px-3 text-xs text-muted-foreground',
          className
        )}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span>Loading sessions...</span>
      </div>
    );
  }

  if (academicYears.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <Select value={currentSelectValue} onValueChange={handleValueChange}>
        <SelectTrigger
          className={cn(
            'h-9 min-w-[210px] text-xs font-medium gap-2 transition-colors',
            isArchived
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15'
              : 'border-border/60 hover:bg-accent/50'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Archive
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                isArchived
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
              )}
            />
            <SelectValue placeholder="Select Session" />
          </div>
        </SelectTrigger>
        <SelectContent align="end" className="w-[260px] text-xs">
          {activeYear && (
            <SelectGroup>
              <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Active Session
              </SelectLabel>
              <SelectItem value={activeYear.id} className="text-xs font-semibold cursor-pointer">
                {activeYear.name} (Active Session)
              </SelectItem>
            </SelectGroup>
          )}

          {archivedYears.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 mt-1 border-t border-border/40 pt-1.5">
                Archived Past Sessions
              </SelectLabel>
              {archivedYears.map((year) => (
                <SelectItem
                  key={year.id}
                  value={year.id}
                  className="text-xs cursor-pointer text-muted-foreground data-[state=checked]:text-foreground"
                >
                  {year.name} (Archived - Read Only)
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
