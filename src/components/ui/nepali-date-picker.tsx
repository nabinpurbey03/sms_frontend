import React, { useState, useMemo, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
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
} from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';

export interface NepaliDatePickerProps {
  id?: string;
  label?: string;
  value: string; // ISO YYYY-MM-DD Gregorian
  onChange: (adDateStr: string) => void;
  minDate?: string; // ISO YYYY-MM-DD Gregorian
  maxDate?: string; // ISO YYYY-MM-DD Gregorian
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  size?: 'default' | 'sm';
  className?: string;
}

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  error,
  disabled = false,
  placeholder = 'Select date',
  size = 'default',
  className = '',
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const [open, setOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'BS' | 'AD'>(calendarSystem);

  useEffect(() => {
    setCalendarMode(calendarSystem);
  }, [calendarSystem]);

  // Viewed BS year and month
  const [viewBsYear, setViewBsYear] = useState<number>(() => {
    if (value) {
      const bsStr = adToBs(value);
      if (bsStr) return Number(bsStr.split('-')[0]);
    }
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayBs = adToBs(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    return todayBs ? Number(todayBs.split('-')[0]) : 2082;
  });

  const [viewBsMonth, setViewBsMonth] = useState<number>(() => {
    if (value) {
      const bsStr = adToBs(value);
      if (bsStr) return Number(bsStr.split('-')[1]) - 1;
    }
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayBs = adToBs(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    return todayBs ? Number(todayBs.split('-')[1]) - 1 : 5;
  });

  // Viewed AD year and month
  const [viewAdYear, setViewAdYear] = useState<number>(() => {
    if (value) {
      const [y] = value.split('-').map(Number);
      return y || new Date().getFullYear();
    }
    return new Date().getFullYear();
  });

  const [viewAdMonth, setViewAdMonth] = useState<number>(() => {
    if (value) {
      const [, m] = value.split('-').map(Number);
      return m ? m - 1 : new Date().getMonth();
    }
    return new Date().getMonth();
  });

  useEffect(() => {
    if (value) {
      const bsStr = adToBs(value);
      if (bsStr) {
        const [y, m] = bsStr.split('-').map(Number);
        setViewBsYear(y);
        setViewBsMonth(m - 1);
      }
      const [ay, am] = value.split('-').map(Number);
      if (ay && am) {
        setViewAdYear(ay);
        setViewAdMonth(am - 1);
      }
    }
  }, [value, open]);

  const selectedInfo = useMemo(() => {
    if (!value) return null;
    return getNepaliDateFromAd(value);
  }, [value]);

  const daysInMonth = useMemo(() => {
    return getBsDaysInMonth(viewBsYear, viewBsMonth);
  }, [viewBsYear, viewBsMonth]);

  const startDayOfWeek = useMemo(() => {
    return getBsMonthStartDayOfWeek(viewBsYear, viewBsMonth);
  }, [viewBsYear, viewBsMonth]);

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

  const handleSelectBsDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const bsDateStr = `${viewBsYear}-${pad(viewBsMonth + 1)}-${pad(day)}`;
    const adDateStr = bsToAd(bsDateStr);
    if (adDateStr) {
      onChange(adDateStr);
      setOpen(false);
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayAdStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(todayAdStr);
    setOpen(false);
  };

  const bsYears = useMemo(() => {
    const years: number[] = [];
    for (let y = 2070; y <= 2090; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const todayAdStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const heightClass = size === 'sm' ? 'h-8 text-xs py-1 px-2.5' : 'min-h-[44px] text-sm py-2 px-3.5';

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
            className={`w-full rounded-lg border text-left transition-all flex items-center justify-between gap-2 shadow-xs outline-none focus:ring-2 focus:ring-primary/20 ${heightClass} ${
              error
                ? 'border-destructive bg-destructive/5'
                : 'border-input bg-background hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
          >
            <div className="flex flex-col items-start leading-snug min-w-0 truncate">
              {selectedInfo ? (
                calendarMode === 'BS' ? (
                  <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                    {selectedInfo.monthNameEn} {selectedInfo.date}, {selectedInfo.year}
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                      BS
                    </Badge>
                  </span>
                ) : (
                  <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                    {value}
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                      AD
                    </Badge>
                  </span>
                )
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>

            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[320px] sm:w-[350px] p-3 shadow-xl rounded-2xl border border-border bg-card z-50"
          align="start"
        >
          {/* Header Controls */}
          <div className="space-y-3 pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setCalendarMode('BS')}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    calendarMode === 'BS'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  BS
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('AD')}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    calendarMode === 'AD'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  AD
                </button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectToday}
                className="h-7 text-xs px-2 text-primary font-medium cursor-pointer"
              >
                Today
              </Button>
            </div>

            {calendarMode === 'BS' ? (
              <div className="flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <select
                    value={viewBsMonth}
                    onChange={(e) => setViewBsMonth(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.index} value={m.index}>
                        {m.nameEn} ({m.nameNp})
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewBsYear}
                    onChange={(e) => setViewBsYear(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs cursor-pointer"
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
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewAdMonth === 0) {
                      setViewAdYear((y) => y - 1);
                      setViewAdMonth(11);
                    } else {
                      setViewAdMonth((m) => m - 1);
                    }
                  }}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <select
                    value={viewAdMonth}
                    onChange={(e) => setViewAdMonth(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewAdYear}
                    onChange={(e) => setViewAdYear(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {Array.from({ length: 21 }, (_, i) => 2015 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewAdMonth === 11) {
                      setViewAdYear((y) => y + 1);
                      setViewAdMonth(0);
                    } else {
                      setViewAdMonth((m) => m + 1);
                    }
                  }}
                  className="h-8 w-8 p-0 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Month Calendar Grid (BS) */}
          {calendarMode === 'BS' && (
            <div className="pt-2">
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {NEPALI_DAYS_OF_WEEK.map((d) => (
                  <span
                    key={d.index}
                    className={`text-[11px] font-semibold py-1 ${
                      d.index === 6 ? 'text-destructive font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {d.short}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-full" />
                ))}

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
                  const isAfterMax = maxDate ? currentAdStr > maxDate : false;
                  const isDisabledDate = isBeforeMin || isAfterMax;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isDisabledDate}
                      onClick={() => handleSelectBsDay(dayNum)}
                      className={`h-9 w-full rounded-md flex flex-col items-center justify-center text-xs transition-colors cursor-pointer relative ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : isToday
                          ? 'border border-primary text-primary font-semibold hover:bg-muted'
                          : isSaturday
                          ? 'text-destructive hover:bg-destructive/10'
                          : 'text-foreground hover:bg-muted'
                      } ${isDisabledDate ? 'opacity-25 cursor-not-allowed hover:bg-transparent pointer-events-none' : ''}`}
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

          {/* Month Calendar Grid (AD) */}
          {calendarMode === 'AD' && (
            <div className="pt-2">
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <span
                    key={d}
                    className={`text-[11px] font-semibold py-1 ${
                      i === 6 ? 'text-destructive font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const firstDay = new Date(viewAdYear, viewAdMonth, 1).getDay();
                  const daysInAdMonth = new Date(viewAdYear, viewAdMonth + 1, 0).getDate();
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const cells = [];

                  for (let i = 0; i < firstDay; i++) {
                    cells.push(<div key={`empty-ad-${i}`} className="h-9 w-full" />);
                  }

                  for (let d = 1; d <= daysInAdMonth; d++) {
                    const adStr = `${viewAdYear}-${pad(viewAdMonth + 1)}-${pad(d)}`;
                    const isSelected = value === adStr;
                    const isToday = adStr === todayAdStr;
                    const isSaturday = (firstDay + d - 1) % 7 === 6;
                    const isBeforeMin = minDate ? adStr < minDate : false;
                    const isAfterMax = maxDate ? adStr > maxDate : false;
                    const isDisabled = isBeforeMin || isAfterMax;

                    cells.push(
                      <button
                        key={d}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          onChange(adStr);
                          setOpen(false);
                        }}
                        className={`h-9 w-full rounded-md flex flex-col items-center justify-center text-xs transition-colors cursor-pointer relative ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                            : isToday
                            ? 'border border-primary text-primary font-semibold hover:bg-muted'
                            : isSaturday
                            ? 'text-destructive hover:bg-destructive/10'
                            : 'text-foreground hover:bg-muted'
                        } ${isDisabled ? 'opacity-25 cursor-not-allowed hover:bg-transparent pointer-events-none' : ''}`}
                      >
                        <span>{d}</span>
                        {isSelected && (
                          <span className="absolute bottom-0.5 w-1 h-1 bg-primary-foreground rounded-full" />
                        )}
                      </button>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>
          )}

          {/* Footer Preview */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Selected:</span>
            <span className="font-medium text-foreground">
              {value ? formatDualDate(value, calendarMode) : 'None'}
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};
