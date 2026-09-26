import React, { useState, useMemo, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
} from 'lucide-react';
import {
  NEPALI_MONTHS,
  NEPALI_DAYS_OF_WEEK,
  adToBs,
  bsToAd,
  getNepaliDateFromAd,
  getBsDaysInMonth,
  getBsMonthStartDayOfWeek,
  formatDualDate,
} from '../utils/nepaliDate';

export interface NepaliDatePickerProps {
  id?: string;
  label?: string;
  value: string; // ISO YYYY-MM-DD Gregorian
  onChange: (adDateStr: string) => void;
  minDate?: string; // ISO YYYY-MM-DD Gregorian
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  minDate,
  error,
  disabled = false,
  placeholder = 'Select date (BS / AD)',
}) => {
  const [open, setOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'BS' | 'AD'>('BS');

  // Currently viewed BS year and month in the picker
  const [viewBsYear, setViewBsYear] = useState<number>(() => {
    if (value) {
      const bsStr = adToBs(value);
      if (bsStr) return Number(bsStr.split('-')[0]);
    }
    // Default to current BS year
    const today = new Date();
    const todayBs = adToBs(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`
    );
    return todayBs ? Number(todayBs.split('-')[0]) : 2082;
  });

  const [viewBsMonth, setViewBsMonth] = useState<number>(() => {
    if (value) {
      const bsStr = adToBs(value);
      if (bsStr) return Number(bsStr.split('-')[1]) - 1;
    }
    const today = new Date();
    const todayBs = adToBs(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate()
      ).padStart(2, '0')}`
    );
    return todayBs ? Number(todayBs.split('-')[1]) - 1 : 5; // Ashwin default
  });

  // Sync viewed month/year when popover opens or value changes
  useEffect(() => {
    if (value) {
      const bsStr = adToBs(value);
      if (bsStr) {
        const [y, m] = bsStr.split('-').map(Number);
        setViewBsYear(y);
        setViewBsMonth(m - 1);
      }
    }
  }, [value, open]);

  // Selected date info
  const selectedInfo = useMemo(() => {
    if (!value) return null;
    return getNepaliDateFromAd(value);
  }, [value]);

  // Days calculations for current view
  const daysInMonth = useMemo(() => {
    return getBsDaysInMonth(viewBsYear, viewBsMonth);
  }, [viewBsYear, viewBsMonth]);

  const startDayOfWeek = useMemo(() => {
    return getBsMonthStartDayOfWeek(viewBsYear, viewBsMonth);
  }, [viewBsYear, viewBsMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewBsMonth === 0) {
      setViewBsYear((y) => y - 1);
      setViewBsMonth(11);
    } else {
      setViewBsMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewBsMonth === 11) {
      setViewBsYear((y) => y + 1);
      setViewBsMonth(0);
    } else {
      setViewBsMonth((m) => m + 1);
    }
  };

  // Select day handler
  const handleSelectBsDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const bsDateStr = `${viewBsYear}-${pad(viewBsMonth + 1)}-${pad(day)}`;
    const adDateStr = bsToAd(bsDateStr);
    if (adDateStr) {
      onChange(adDateStr);
      setOpen(false);
    }
  };

  // Quick "Today" handler
  const handleSelectToday = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayAdStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(todayAdStr);
    setOpen(false);
  };

  // Available BS years dropdown (2070 - 2090)
  const bsYears = useMemo(() => {
    const years: number[] = [];
    for (let y = 2070; y <= 2090; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Gregorian today
  const todayAdStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={`w-full min-h-[44px] rounded-lg border text-left px-3.5 py-2 transition-all flex items-center justify-between gap-2 shadow-xs outline-none focus:ring-2 focus:ring-primary/20 ${
              error
                ? 'border-destructive bg-destructive/5'
                : 'border-input bg-background hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex flex-col items-start leading-snug">
              {selectedInfo ? (
                <>
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {selectedInfo.monthNameEn} {selectedInfo.date}, {selectedInfo.year}
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                      BS
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {value} (Gregorian AD)
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">{placeholder}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[320px] sm:w-[350px] p-3 shadow-xl rounded-2xl border border-border bg-card"
          align="start"
        >
          {/* Header Controls */}
          <div className="space-y-3 pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-1">
              {/* Calendar Mode Toggle */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setCalendarMode('BS')}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    calendarMode === 'BS'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bikram Sambat (BS)
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('AD')}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    calendarMode === 'AD'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Gregorian (AD)
                </button>
              </div>

              {/* Today Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectToday}
                className="h-7 text-xs px-2 text-primary font-medium"
              >
                Today
              </Button>
            </div>

            {/* Month & Year Selectors with Chevrons */}
            {calendarMode === 'BS' ? (
              <div className="flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 p-0"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  {/* Month Dropdown */}
                  <select
                    value={viewBsMonth}
                    onChange={(e) => setViewBsMonth(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.index} value={m.index}>
                        {m.nameEn} ({m.nameNp})
                      </option>
                    ))}
                  </select>

                  {/* Year Dropdown */}
                  <select
                    value={viewBsYear}
                    onChange={(e) => setViewBsYear(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {bsYears.map((y) => (
                      <option key={y} value={y}>
                        {y} BS
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-8 w-8 p-0"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              /* AD Direct Date Input Fallback within Popover */
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={value || ''}
                  onChange={(e) => {
                    onChange(e.target.value);
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Gregorian date will automatically convert to Bikram Sambat (BS).
                </p>
              </div>
            )}
          </div>

          {/* Month Calendar Grid (BS) */}
          {calendarMode === 'BS' && (
            <div className="pt-2">
              {/* Day of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {NEPALI_DAYS_OF_WEEK.map((d) => (
                  <span
                    key={d.index}
                    className={`text-[11px] font-semibold py-1 ${
                      d.index === 6 ? 'text-destructive font-bold' : 'text-muted-foreground'
                    }`}
                    title={d.nepaliShort}
                  >
                    {d.short}
                  </span>
                ))}
              </div>

              {/* Days Cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty padding slots before 1st of month */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-full" />
                ))}

                {/* Day Buttons */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const currentBsStr = `${viewBsYear}-${pad(viewBsMonth + 1)}-${pad(dayNum)}`;
                  const currentAdStr = bsToAd(currentBsStr);

                  const isSelected =
                    selectedInfo?.year === viewBsYear &&
                    selectedInfo?.month === viewBsMonth &&
                    selectedInfo?.date === dayNum;

                  const isToday = currentAdStr === todayAdStr;
                  const isSaturday = (startDayOfWeek + i) % 7 === 6;

                  const isBeforeMin = minDate ? currentAdStr < minDate : false;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isBeforeMin}
                      onClick={() => handleSelectBsDay(dayNum)}
                      className={`h-9 w-full rounded-md flex flex-col items-center justify-center text-xs transition-colors cursor-pointer relative ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : isToday
                          ? 'border border-primary text-primary font-semibold hover:bg-muted'
                          : isSaturday
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-foreground hover:bg-muted'
                      } ${isBeforeMin ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
                    >
                      <span>{dayNum}</span>
                      {isSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 bg-primary-foreground rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Preview */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Selected:</span>
            <span className="font-medium text-foreground">
              {value ? formatDualDate(value) : 'None'}
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};
