import React, { useState } from 'react';
import { Clock, Sparkles, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { useAuth } from '@/auth/useAuth';
import { useTimeTravel } from '../TimeTravelContext';
import {
  BS_MONTHS,
  formatDateToIso,
  getBsDateFromGregorian,
  shouldRenderTimeTravelToolbar,
  formatToolbarPillLabel,
} from '../timeTravelUtils';

export const TimeTravelToolbar: React.FC = () => {
  const isEnabled = import.meta.env.VITE_ENABLE_TIME_TRAVEL === 'true';
  const { user } = useAuth();
  const {
    isSimulated,
    effectiveDate,
    addDays,
    addMonths,
    addYears,
    setBsMonth,
    setSimulatedDate,
    resetToLive,
  } = useTimeTravel();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (
    !shouldRenderTimeTravelToolbar({
      isEnabled,
      isSuperAdmin: user?.is_super_admin,
    })
  ) {
    return null;
  }

  const pillLabel = formatToolbarPillLabel({ isSimulated, effectiveDate });
  const bsDate = getBsDateFromGregorian(effectiveDate);
  const adDateIso = formatDateToIso(effectiveDate);

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none">
      {!isExpanded ? (
        // Collapsed View: Compact Pill Button
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full shadow-lg border text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 ${
            isSimulated
              ? 'bg-amber-500 text-amber-950 border-amber-600 ring-2 ring-amber-400/50 font-bold'
              : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted shadow-md'
          }`}
          title="Open Sandbox Time-Travel Toolbar"
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>{pillLabel}</span>
        </button>
      ) : (
        // Expanded View: Full Control Panel
        <div className="w-[340px] sm:w-[380px] bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* 1. Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                Sandbox Time-Travel
              </span>
              <Badge
                variant={isSimulated ? 'default' : 'outline'}
                className={`text-[10px] px-1.5 py-0 ${
                  isSimulated
                    ? 'bg-amber-500 text-amber-950 font-bold border-amber-600'
                    : 'text-muted-foreground'
                }`}
              >
                {isSimulated ? 'Simulated' : 'Live Time'}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="p-3.5 space-y-3.5 max-h-[calc(100vh-140px)] overflow-y-auto">
            {/* 2. Active Date Summary Card */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Active System Date</span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 bg-muted rounded">
                  {isSimulated ? 'SANDBOX SIMULATED' : 'REAL CLOCK'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Bikram Sambat
                  </span>
                  <span className="font-bold font-mono text-foreground text-xs block">
                    {BS_MONTHS[bsDate.month]} {bsDate.day}, {bsDate.year}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({bsDate.formatted})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Gregorian (AD)
                  </span>
                  <span className="font-bold font-mono text-foreground text-xs block">
                    {adDateIso}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {effectiveDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Quick Shift Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Shift Presets
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addDays(15)}
                  className="text-xs h-8 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer"
                >
                  +15 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addMonths(1)}
                  className="text-xs h-8 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer"
                >
                  +1 Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addYears(1)}
                  className="text-xs h-8 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer"
                >
                  +1 Year
                </Button>
              </div>
            </div>

            {/* 4. Bikram Sambat Month Quick Jumper */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  BS Month Quick Jumper
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {bsDate.year} BS
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {BS_MONTHS.map((monthName, idx) => {
                  const isCurrentMonth = bsDate.month === idx;
                  return (
                    <button
                      key={monthName}
                      type="button"
                      onClick={() => setBsMonth(idx)}
                      className={`py-1.5 px-1 rounded-md text-[11px] font-medium border text-center transition-all cursor-pointer ${
                        isCurrentMonth
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border-border/60 hover:border-border'
                      }`}
                      title={`Jump to 1st of ${monthName} ${bsDate.year}`}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Custom Date Selection */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Custom Date Selection
              </Label>
              <NepaliDatePicker
                id="time-travel-custom-date"
                value={adDateIso}
                onChange={(newDateStr) => setSimulatedDate(newDateStr)}
                size="sm"
                placeholder="Pick custom simulated date"
              />
            </div>
          </div>

          {/* 6. Footer Actions */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isSimulated}
              onClick={resetToLive}
              className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset to Real Date
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
