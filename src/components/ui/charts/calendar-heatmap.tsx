import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CalendarHeatmapDataItem {
  date: string;
  value: number;
}

export interface CalendarHeatmapProps {
  data: CalendarHeatmapDataItem[];
  maxValue?: number;
  className?: string;
}

function getIntensityClass(value: number, maxValue: number): string {
  if (value === 0) return 'bg-muted';
  const ratio = value / maxValue;
  if (ratio >= 0.9) return 'bg-emerald-600 dark:bg-emerald-500';
  if (ratio >= 0.7) return 'bg-emerald-500 dark:bg-emerald-400';
  if (ratio >= 0.5) return 'bg-emerald-400 dark:bg-emerald-500/70';
  if (ratio >= 0.3) return 'bg-emerald-300 dark:bg-emerald-600/50';
  return 'bg-emerald-200 dark:bg-emerald-700/40';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getWeekday(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function CalendarHeatmap({ data, maxValue, className }: CalendarHeatmapProps) {
  const [hoveredItem, setHoveredItem] =
    React.useState<CalendarHeatmapDataItem | null>(null);

  const computedMax = maxValue || Math.max(...data.map((d) => d.value), 1);

  const sortedData = React.useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group data into weeks (columns)
  const weeks = React.useMemo(() => {
    if (sortedData.length === 0) return [];
    const result: Array<Array<CalendarHeatmapDataItem | null>> = [];
    let currentWeek: Array<CalendarHeatmapDataItem | null> = [];

    // Pad the first week with nulls
    const firstDay = getWeekday(sortedData[0].date);
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    for (const item of sortedData) {
      const day = getWeekday(item.date);
      if (day === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(item);
    }
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [sortedData]);

  return (
    <div className={cn('w-full', className)}>
      {hoveredItem && (
        <div className="text-xs text-muted-foreground mb-2 text-center">
          <span className="font-medium text-foreground">
            {formatDate(hoveredItem.date)}
          </span>
          {' — '}
          <span>
            {hoveredItem.value > 0
              ? `${hoveredItem.value.toFixed(1)}% attendance`
              : 'No data'}
          </span>
        </div>
      )}
      <div className="flex gap-0.5 sm:gap-1">
        {/* Weekday labels */}
        <div className="flex flex-col gap-0.5 sm:gap-1 pr-1">
          {weekdays.map((day, i) => (
            <div
              key={day}
              className="h-3 sm:h-4 flex items-center text-[10px] text-muted-foreground"
            >
              {i % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5 sm:gap-1">
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const item = week[dayIndex] || null;
              if (!item) {
                return (
                  <div
                    key={dayIndex}
                    className="h-3 w-3 sm:h-4 sm:w-4 rounded-sm"
                  />
                );
              }
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'h-3 w-3 sm:h-4 sm:w-4 rounded-sm cursor-pointer transition-all',
                    getIntensityClass(item.value, computedMax),
                    hoveredItem?.date === item.date && 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                  )}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-muted" />
        <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-700/40" />
        <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-600/50" />
        <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-500/70" />
        <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
        <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}

export { CalendarHeatmap };
