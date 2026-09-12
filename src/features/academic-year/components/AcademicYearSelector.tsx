import React from 'react';
import { useSelectedAcademicYear } from '../hooks/useSelectedAcademicYear';
import { useAuth } from '@/auth/useAuth';
import { CalendarDays, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const AcademicYearSelector: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { years, selectedYearId, selectedYear, setSelectedYearId, isLoading } = useSelectedAcademicYear();

  if (!activeTenantId || isLoading || years.length === 0) {
    return null; // hide if not applicable
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 flex items-center gap-2 rounded-full px-3 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground truncate max-w-[120px]">
            {selectedYear?.name || 'Select Year'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl">
        <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 text-muted-foreground flex justify-between items-center">
          <span>Academic Year</span>
          {selectedYear?.is_closed && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">Read-Only</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {years.map((y) => (
          <DropdownMenuItem
            key={y.id}
            onClick={() => setSelectedYearId(y.id)}
            className={`cursor-pointer text-xs rounded-lg p-2 flex items-center justify-between ${
              y.id === selectedYearId ? 'bg-primary/10 font-bold text-primary' : ''
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="truncate">{y.name}</span>
              <span className="text-[10px] text-muted-foreground opacity-80">
                {y.is_current ? 'Current Active Year' : y.is_closed ? 'Closed (Read-Only)' : 'Inactive'}
              </span>
            </div>
            {y.id === selectedYearId && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
