import React, { useState, useMemo } from 'react';
import { usePermission } from '@/auth/usePermission';
import { usePlatformProvisionBsYear } from '../hooks';
import {
  bsToAd,
  getBsDaysInMonth,
  getNepaliDateFromAd,
} from '@/features/school-settings/utils/nepaliDate';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getUpcomingBsYearOptions(currentBsYear: number, count: number = 4): number[] {
  return Array.from({ length: count }, (_, i) => currentBsYear + i);
}

export const TARGET_BS_YEAR_OPTIONS = [2081, 2082, 2083, 2084, 2085];

export interface PlatformBsYearProvisionerProps {
  className?: string;
}

export const PlatformBsYearProvisioner: React.FC<PlatformBsYearProvisionerProps> = ({
  className,
}) => {
  const { isSuperAdmin } = usePermission();
  const provisionMutation = usePlatformProvisionBsYear();

  const detectedCurrentYear = useMemo(() => {
    return getNepaliDateFromAd(new Date())?.year || 2082;
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set(TARGET_BS_YEAR_OPTIONS);
    years.add(detectedCurrentYear);
    return Array.from(years).sort((a, b) => a - b);
  }, [detectedCurrentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return getNepaliDateFromAd(new Date())?.year || 2082;
  });

  // Calculate BS and Gregorian boundaries for the target year
  const daysInChaitra = useMemo(() => getBsDaysInMonth(selectedYear, 11), [selectedYear]);

  const bsStartDate = `${selectedYear}-01-01`;
  const bsEndDate = `${selectedYear}-12-${String(daysInChaitra).padStart(2, '0')}`;

  const adStartDate = useMemo(() => bsToAd(bsStartDate), [bsStartDate]);
  const adEndDate = useMemo(() => bsToAd(bsEndDate), [bsEndDate]);

  const formatAdDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return dateStr;
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Only visible to Super Admins
  if (!isSuperAdmin) {
    return null;
  }

  const handleProvision = async () => {
    try {
      await provisionMutation.mutateAsync({ bs_year: selectedYear });
    } catch {
      // Error is handled with sonner toast inside usePlatformProvisionBsYear mutation
    }
  };

  return (
    <Card className={cn('p-5 border-amber-500/30 bg-card shadow-sm space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
            <h3 className="text-base font-semibold text-foreground">
              Platform Bikram Sambat Academic Year Provisioner
            </h3>
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium"
            >
              Super Admin
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Centrally provision standard Bikram Sambat academic years (1 Baisakh to 30/31 Chaitra) to all tenant schools with 1 click.
          </p>
        </div>

        {/* Target Year Picker */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="space-y-1">
            <Label htmlFor="target-bs-year" className="text-xs font-medium text-muted-foreground">
              Target BS Year
            </Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(Number(val))}
              disabled={provisionMutation.isPending}
            >
              <SelectTrigger id="target-bs-year" className="w-[160px] bg-background h-9 text-sm">
                <SelectValue placeholder="Select BS Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year} BS {year === detectedCurrentYear ? '(Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Live Gregorian & BS Preview */}
      <div className="rounded-lg border bg-muted/40 p-3 sm:p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Calculated Timeline Preview ({selectedYear} BS)</span>
          <span className="text-[11px] font-normal normal-case text-muted-foreground">
            Standard 1 Baisakh – {daysInChaitra} Chaitra
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border bg-background/80 p-2.5">
            <div className="text-xs text-muted-foreground font-medium">Start Date (1 Baisakh)</div>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              1 Baisakh, {selectedYear} BS
            </div>
            <div className="text-xs text-primary font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Gregorian (AD):</span>
              <span className="font-mono">{adStartDate}</span>
              <span className="text-muted-foreground">({formatAdDate(adStartDate)})</span>
            </div>
          </div>

          <div className="rounded-md border bg-background/80 p-2.5">
            <div className="text-xs text-muted-foreground font-medium">End Date ({daysInChaitra} Chaitra)</div>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              {daysInChaitra} Chaitra, {selectedYear} BS
            </div>
            <div className="text-xs text-primary font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Gregorian (AD):</span>
              <span className="font-mono">{adEndDate}</span>
              <span className="text-muted-foreground">({formatAdDate(adEndDate)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
          <span>Automatically skips schools that already have academic year <strong>{selectedYear}</strong> configured.</span>
        </div>

        <Button
          type="button"
          onClick={handleProvision}
          disabled={provisionMutation.isPending}
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shrink-0"
        >
          {provisionMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Provisioning {selectedYear} BS...
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 mr-2" />
              Provision {selectedYear} BS Across All Schools
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
