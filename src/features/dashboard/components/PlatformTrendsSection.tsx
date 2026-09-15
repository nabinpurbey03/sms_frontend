import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Building2,
  Users,
  CalendarCheck,
  Calendar,
  Activity,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformTrends } from '../hooks';
import { PlatformTrendPointDTO } from '../api';

const TIMEFRAMES: Array<{ label: string; days: number }> = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export const PlatformTrendsSection: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [hoveredPoint, setHoveredPoint] = useState<PlatformTrendPointDTO | null>(null);

  const { data, isLoading, isError, refetch } = usePlatformTrends(days);

  const dailyMetrics = useMemo(() => data?.daily_metrics || [], [data]);
  const summary = data?.summary;

  // Active / focused day defaults to hovered point or the latest day in the list
  const activePoint = useMemo(() => {
    if (hoveredPoint) return hoveredPoint;
    if (dailyMetrics.length > 0) {
      return dailyMetrics[dailyMetrics.length - 1];
    }
    return null;
  }, [hoveredPoint, dailyMetrics]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string, total: number) => {
    try {
      const d = new Date(dateStr);
      if (total <= 7) {
        return d.toLocaleDateString(undefined, { weekday: 'narrow', day: 'numeric' });
      }
      if (total <= 14) {
        return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      }
      return d.getDate().toString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl flex flex-col h-full">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <span>Platform Telemetry & Trends</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Platform-wide adoption velocity and daily attendance patterns ({days} days)
            </CardDescription>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border shrink-0 self-start sm:self-auto">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.days}
                type="button"
                onClick={() => {
                  setDays(tf.days);
                  setHoveredPoint(null);
                }}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                  days === tf.days
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-5">
        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-44 bg-muted/30 animate-pulse rounded-xl flex items-center justify-center text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading telemetry trend stream...</span>
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 text-center space-y-3 my-auto border border-dashed rounded-xl">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Failed to load telemetry trends</p>
              <p className="text-[11px] text-muted-foreground">Unable to fetch metrics for this timeframe</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-8">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Row (3 mini cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Period New Schools */}
              <div className="p-3 bg-muted/30 dark:bg-muted/15 rounded-xl border border-border/50 transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span className="truncate">Period New Schools</span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  +{summary?.total_new_tenants ?? 0}
                </div>
              </div>

              {/* Period New Users */}
              <div className="p-3 bg-muted/30 dark:bg-muted/15 rounded-xl border border-border/50 transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Period New Users</span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  +{(summary?.total_new_users ?? 0).toLocaleString()}
                </div>
              </div>

              {/* Period Avg Attendance Rate */}
              <div className="p-3 bg-muted/30 dark:bg-muted/15 rounded-xl border border-border/50 transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Period Avg Attendance</span>
                </div>
                <div className="text-xl font-bold text-foreground">
                  {summary?.period_average_attendance_rate !== null &&
                  summary?.period_average_attendance_rate !== undefined
                    ? `${summary.period_average_attendance_rate}%`
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Active / Focused Day Inspector Banner */}
            {activePoint && (
              <div className="px-3 py-2.5 bg-primary/5 border border-primary/15 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">
                    {formatDate(activePoint.date)}
                  </span>
                  {hoveredPoint && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                      Inspecting
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Attendance:</span>
                    <span className="font-bold text-foreground">
                      {activePoint.platform_attendance_rate !== null &&
                      activePoint.platform_attendance_rate !== undefined
                        ? `${activePoint.platform_attendance_rate}%`
                        : 'None'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({activePoint.total_attendance_records.toLocaleString()} marked)
                    </span>
                  </span>

                  <span className="hidden sm:inline-flex items-center gap-1.5 text-muted-foreground">
                    <span>
                      <strong className="text-foreground">+{activePoint.new_users}</strong> users
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-foreground">+{activePoint.new_tenants}</strong> schools
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Telemetry Daily Bars Visualizer */}
            {dailyMetrics.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No telemetry daily records logged for this {days}-day window.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-emerald-500" />
                    <span>Platform Daily Attendance Rate % (Hover to inspect)</span>
                  </span>
                  <span>100% Target</span>
                </div>

                {/* Bar chart area with horizontal scroll if needed */}
                <div className="w-full overflow-x-auto pb-1">
                  <div
                    className="flex items-end gap-1.5 sm:gap-2 h-40 pt-6 px-1 border-b border-border/70"
                    style={{ minWidth: dailyMetrics.length > 14 ? `${dailyMetrics.length * 28}px` : 'auto' }}
                  >
                    {dailyMetrics.map((point) => {
                      const rate = point.platform_attendance_rate;
                      const hasData = rate !== null && point.total_attendance_records > 0;
                      const heightPercent = hasData ? Math.max(8, Math.min(100, rate!)) : 4;
                      const isHovered = hoveredPoint?.date === point.date;

                      return (
                        <div
                          key={point.date}
                          className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(point)}
                          onClick={() => setHoveredPoint(point)}
                        >
                          {/* Rate badge on top of bar on hover */}
                          <div
                            className={cn(
                              'text-[10px] font-mono font-bold mb-1 transition-opacity',
                              isHovered
                                ? 'opacity-100 text-foreground scale-110'
                                : 'opacity-0 group-hover:opacity-100 text-muted-foreground'
                            )}
                          >
                            {hasData ? `${Math.round(rate!)}%` : '0%'}
                          </div>

                          {/* Bar background container */}
                          <div className="w-full max-w-[32px] h-full flex items-end justify-center rounded-t-md bg-muted/20 relative">
                            {/* Bar fill */}
                            <div
                              className={cn(
                                'w-full rounded-t transition-all duration-300',
                                !hasData
                                  ? 'bg-muted-foreground/20 border-t border-dashed border-muted-foreground/40'
                                  : rate! >= 80
                                  ? 'bg-emerald-500 group-hover:bg-emerald-400'
                                  : rate! >= 60
                                  ? 'bg-blue-500 group-hover:bg-blue-400'
                                  : 'bg-amber-500 group-hover:bg-amber-400',
                                isHovered && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                              )}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>

                          {/* Date label */}
                          <span
                            className={cn(
                              'text-[10px] text-muted-foreground mt-1.5 transition-colors font-mono truncate max-w-full text-center',
                              isHovered && 'text-primary font-bold'
                            )}
                          >
                            {formatShortDate(point.date, dailyMetrics.length)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span>Earliest: {dailyMetrics[0]?.date}</span>
                  <span>Latest: {dailyMetrics[dailyMetrics.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
