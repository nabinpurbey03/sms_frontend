import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, AlertTriangle, Info } from 'lucide-react';
import type { DayOfWeekAttendancePoint } from '../../types';

interface DayOfWeekAttendanceChartProps {
  trends: DayOfWeekAttendancePoint[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: DayOfWeekAttendancePoint;
  }>;
  label?: string;
  lowestDayIndex?: number;
}

const CustomDayTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, lowestDayIndex }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  const isLowest = lowestDayIndex !== undefined && item.day_index === lowestDayIndex && item.total_count > 0;

  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3.5 shadow-xl text-popover-foreground text-xs min-w-[210px] space-y-2 border-border/80">
      <div className="flex items-center justify-between border-b pb-1.5 gap-3">
        <span className="font-bold text-sm text-foreground">{label}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isLowest
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
          }`}
        >
          {item.attendance_rate.toFixed(1)}% Rate
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Present Records:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {item.present_count}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Total Records:</span>
          <span className="font-semibold text-foreground">{item.total_count}</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Absent Records:</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {Math.max(item.total_count - item.present_count, 0)}
          </span>
        </div>
        {isLowest && (
          <div className="pt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Lowest attendance weekday
          </div>
        )}
      </div>
    </div>
  );
};

export const DayOfWeekAttendanceChart: React.FC<DayOfWeekAttendanceChartProps> = ({
  trends,
  className,
}) => {
  const sortedTrends = React.useMemo(() => {
    return [...trends].sort((a, b) => a.day_index - b.day_index);
  }, [trends]);

  const lowestDay = React.useMemo(() => {
    const valid = sortedTrends.filter((t) => t.total_count > 0);
    if (valid.length === 0) return null;
    return valid.reduce(
      (min, cur) => (cur.attendance_rate < min.attendance_rate ? cur : min),
      valid[0]
    );
  }, [sortedTrends]);

  if (!sortedTrends || sortedTrends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Day-of-Week Attendance Patterns
          </CardTitle>
          <CardDescription>
            Weekly pattern analysis showing present rate distribution across days.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
          No day-of-week attendance data available for this session.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Day-of-Week Attendance Patterns
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Identifies day-specific absentee trends and weekly operational rhythms.
            </CardDescription>
          </div>
          {lowestDay && (
            <div className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 font-medium self-start sm:self-auto flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Lowest: <strong>{lowestDay.day_name}</strong> ({lowestDay.attendance_rate.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="w-full h-[280px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedTrends}
              margin={{ top: 15, right: 15, left: -10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
              <XAxis
                dataKey="day_name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={<CustomDayTooltip lowestDayIndex={lowestDay?.day_index} />}
                cursor={{ fill: 'rgba(100, 116, 139, 0.08)' }}
              />
              <Bar dataKey="attendance_rate" radius={[6, 6, 0, 0]} maxBarSize={52}>
                {sortedTrends.map((entry) => {
                  const isLowest = lowestDay && entry.day_index === lowestDay.day_index && entry.total_count > 0;
                  return (
                    <Cell
                      key={`cell-${entry.day_index}`}
                      fill={isLowest ? '#f43f5e' : '#3b82f6'}
                      className="transition-colors"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {lowestDay ? (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Weekly Pattern Insight:</span>
              <p className="text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                {lowestDay.day_name}s have the lowest attendance at{' '}
                <span className="font-bold">{lowestDay.attendance_rate.toFixed(1)}%</span>{' '}
                ({lowestDay.present_count} present out of {lowestDay.total_count} recorded sessions).
                Consider investigating scheduling, transport, or tests on this day.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-2 p-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Attendance rates are evenly distributed or no sessions have been logged yet.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
