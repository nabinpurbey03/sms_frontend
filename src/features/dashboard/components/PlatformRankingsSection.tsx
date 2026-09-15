import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  GraduationCap,
  CalendarCheck,
  Zap,
  ArrowRight,
  School,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantRankings } from '../hooks';

type RankingTab = 'enrollment' | 'attendance' | 'activity';

export const PlatformRankingsSection: React.FC = () => {
  const [limit, setLimit] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<RankingTab>('enrollment');

  const { data: rankings, isLoading, isError, refetch } = useTenantRankings(limit);

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'No activity recorded';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0) return 'Just now';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span
          className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/30 shrink-0"
          title="Rank 1"
        >
          🥇
        </span>
      );
    }
    if (index === 1) {
      return (
        <span
          className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/30 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-300/40 shrink-0"
          title="Rank 2"
        >
          🥈
        </span>
      );
    }
    if (index === 2) {
      return (
        <span
          className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-bold text-xs border border-amber-700/30 shrink-0"
          title="Rank 3"
        >
          🥉
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground font-semibold text-xs border border-border shrink-0">
        {index + 1}
      </span>
    );
  };

  const tabs: Array<{ id: RankingTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'enrollment', label: 'Enrollment', icon: GraduationCap },
    { id: 'attendance', label: "Today's Attendance", icon: CalendarCheck },
    { id: 'activity', label: '24h Activity', icon: Zap },
  ];

  return (
    <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl flex flex-col h-full">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
              <span>School Leaderboards & Benchmarks</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Top performing tenants across platform telemetry dimensions
            </CardDescription>
          </div>

          {/* Limit Toggle: Top 5 / Top 10 */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setLimit(5)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                limit === 5
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Top 5
            </button>
            <button
              type="button"
              onClick={() => setLimit(10)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                limit === 10
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Top 10
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 border-b border-border/60 pt-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-all',
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 flex-1 flex flex-col justify-between">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className="p-3 bg-muted/30 animate-pulse rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-muted/60" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 bg-muted/60 rounded" />
                    <div className="h-2.5 w-20 bg-muted/40 rounded" />
                  </div>
                </div>
                <div className="h-8 w-20 bg-muted/60 rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center space-y-3 my-auto border border-dashed rounded-xl">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Failed to load platform rankings</p>
              <p className="text-[11px] text-muted-foreground">Unable to fetch leaderboard telemetry</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-8">
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Tab 1: Top by Enrollment */}
            {activeTab === 'enrollment' && (
              <>
                {(!rankings?.top_by_enrollment || rankings.top_by_enrollment.length === 0) ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No school enrollment data available.
                  </div>
                ) : (
                  rankings.top_by_enrollment.map((item, index) => (
                    <div
                      key={item.tenant_id}
                      className="p-3 bg-muted/20 hover:bg-muted/40 border border-border/50 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderRankBadge(index)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {item.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                              {item.domain_name}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="font-medium text-foreground">
                              {item.student_count.toLocaleString()} Students
                            </span>
                            <span>•</span>
                            <span>{item.teacher_count.toLocaleString()} Teachers</span>
                            <span>•</span>
                            <span>
                              Ratio:{' '}
                              {item.student_teacher_ratio !== null &&
                              item.student_teacher_ratio !== undefined
                                ? `${item.student_teacher_ratio}:1`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0 self-end sm:self-center"
                        asChild
                      >
                        <Link
                          to={'/tenants/$tenantId' as any}
                          params={{ tenantId: item.tenant_id } as any}
                        >
                          <span>Deep Dive</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Tab 2: Top Today's Attendance */}
            {activeTab === 'attendance' && (
              <>
                {(!rankings?.top_by_attendance_today || rankings.top_by_attendance_today.length === 0) ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No school attendance records logged today yet.
                  </div>
                ) : (
                  rankings.top_by_attendance_today.map((item, index) => (
                    <div
                      key={item.tenant_id}
                      className="p-3 bg-muted/20 hover:bg-muted/40 border border-border/50 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderRankBadge(index)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {item.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                              {item.domain_name}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <div className="w-20 sm:w-28 bg-muted h-2 rounded-full overflow-hidden shrink-0">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  item.attendance_percentage >= 80
                                    ? 'bg-emerald-500'
                                    : item.attendance_percentage >= 60
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                )}
                                style={{ width: `${Math.min(100, item.attendance_percentage)}%` }}
                              />
                            </div>
                            <span className="font-bold text-foreground">
                              {item.attendance_percentage}%
                            </span>
                            <span>•</span>
                            <span>{item.total_marked.toLocaleString()} records marked</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0 self-end sm:self-center"
                        asChild
                      >
                        <Link
                          to={'/tenants/$tenantId' as any}
                          params={{ tenantId: item.tenant_id } as any}
                        >
                          <span>Deep Dive</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Tab 3: Most Active Schools (24h Activity) */}
            {activeTab === 'activity' && (
              <>
                {(!rankings?.most_active_24h || rankings.most_active_24h.length === 0) ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No activity recorded in the past 24 hours.
                  </div>
                ) : (
                  rankings.most_active_24h.map((item, index) => (
                    <div
                      key={item.tenant_id}
                      className="p-3 bg-muted/20 hover:bg-muted/40 border border-border/50 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {renderRankBadge(index)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {item.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                              {item.domain_name}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="font-mono text-[11px] gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            >
                              <Zap className="h-3 w-3 text-amber-500" />
                              <span>{item.mutation_count_24h.toLocaleString()} mutations</span>
                            </Badge>
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>{formatRelativeTime(item.last_activity_at)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10 shrink-0 self-end sm:self-center"
                        asChild
                      >
                        <Link
                          to={'/tenants/$tenantId' as any}
                          params={{ tenantId: item.tenant_id } as any}
                        >
                          <span>Deep Dive</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
