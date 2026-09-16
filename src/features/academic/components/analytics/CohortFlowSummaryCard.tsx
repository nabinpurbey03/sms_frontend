import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  UserCheck,
  GraduationCap,
  UserMinus,
  Info,
  CalendarCheck2,
} from 'lucide-react';
import type { AcademicYearRetentionResponse } from '../../types';

interface CohortFlowSummaryCardProps {
  data: AcademicYearRetentionResponse;
  className?: string;
}

export const CohortFlowSummaryCard: React.FC<CohortFlowSummaryCardProps> = ({
  data,
  className,
}) => {
  const {
    overall_retention_rate,
    total_starting_enrolled,
    total_retained,
    total_graduated,
    total_transferred_out,
    academic_year_name,
    next_academic_year_name,
  } = data;

  const getRetentionBadge = (rate: number) => {
    if (rate >= 80) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
          High Retention
        </Badge>
      );
    }
    if (rate >= 60) {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
          Moderate
        </Badge>
      );
    }
    return (
      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20">
        Needs Attention
      </Badge>
    );
  };

  const calculatePct = (count: number) => {
    if (!total_starting_enrolled || total_starting_enrolled === 0) return '0%';
    return `${((count / total_starting_enrolled) * 100).toFixed(1)}%`;
  };

  // Circular progress SVG values
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(Math.max(overall_retention_rate, 0), 100) / 100) * circumference;

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* 5-Column / Responsive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Retention Rate KPI Card */}
        <Card className="sm:col-span-2 lg:col-span-1 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-muted/40"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-primary transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-foreground tracking-tight">
                  {overall_retention_rate.toFixed(1)}%
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Overall Retention
            </span>
            <div className="mt-1.5">{getRetentionBadge(overall_retention_rate)}</div>
          </CardContent>
        </Card>

        {/* Total Starting Enrolled */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Starting Enrolled</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-foreground">
                {total_starting_enrolled.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active in {academic_year_name}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retained in Next Session */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Retained Students</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {total_retained.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {calculatePct(total_retained)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Rolled over to {next_academic_year_name || 'subsequent session'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Graduated Cohort */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Graduated Cohort</span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {total_graduated.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  {calculatePct(total_graduated)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Completed highest terminal grade
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transferred / Left */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Transferred / Left</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {total_transferred_out.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {calculatePct(total_transferred_out)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Inactive or transferred out
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Explanatory note banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border/70 bg-muted/30 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Computation Method:</span> Computed by
          comparing active enrollments in target academic year (
          <span className="text-foreground font-medium">{academic_year_name}</span>) against the
          subsequent session (
          <span className="text-foreground font-medium">
            {next_academic_year_name || 'Next Academic Year'}
          </span>
          ). Students who completed terminal classes are recognized as graduated, while active
          promotions count towards retention.
        </div>
      </div>
    </div>
  );
};
