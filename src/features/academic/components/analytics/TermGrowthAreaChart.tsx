import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Users, Award, BookOpen } from 'lucide-react';
import type { TermGrowthPoint } from '../../types';

interface TermGrowthAreaChartProps {
  trajectory: TermGrowthPoint[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: TermGrowthPoint;
  }>;
  label?: string;
}

const CustomGrowthTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  const formattedDate = item.exam_date
    ? new Date(item.exam_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3.5 shadow-xl text-popover-foreground text-xs min-w-[220px] space-y-2 border-border/80">
      <div className="flex items-center justify-between border-b pb-1.5 gap-3">
        <span className="font-bold text-sm text-foreground">{label}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
          {item.average_percentage.toFixed(1)}% Avg
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5">
        {formattedDate && (
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              Exam Date:
            </span>
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="flex items-center gap-1">
            <Award className="w-3 h-3 text-indigo-500" />
            Session GPA:
          </span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {item.average_gpa.toFixed(2)} / 4.00
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-500" />
            Students Assessed:
          </span>
          <span className="font-semibold text-foreground">
            {item.total_students_assessed.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TermGrowthAreaChart: React.FC<TermGrowthAreaChartProps> = ({
  trajectory,
  className,
}) => {
  // Momentum calculation comparing first and latest term
  const momentum = React.useMemo(() => {
    if (!trajectory || trajectory.length < 2) return null;
    const first = trajectory[0];
    const latest = trajectory[trajectory.length - 1];
    const diff = latest.average_percentage - first.average_percentage;
    return {
      diff,
      isPositive: diff >= 0,
      firstTerm: first.term_name,
      latestTerm: latest.term_name,
    };
  }, [trajectory]);

  if (!trajectory || trajectory.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Term-Over-Term Academic Growth Trajectory
          </CardTitle>
          <CardDescription>
            Monitors institutional performance trajectory and score momentum across sequential examination periods.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex flex-col items-center justify-center text-sm text-muted-foreground">
          <BookOpen className="w-10 h-10 text-muted-foreground/50 mb-2" />
          <p className="font-medium text-foreground">No exam evaluations recorded</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No exam evaluations recorded for this academic year yet.
          </p>
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
              <TrendingUp className="w-4 h-4 text-primary" />
              Term-Over-Term Academic Growth Trajectory
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Longitudinal tracking of average examination score percentages across evaluation periods.
            </CardDescription>
          </div>
          {momentum && (
            <Badge
              variant="outline"
              className={`self-start sm:self-auto text-xs px-2.5 py-1 gap-1 ${
                momentum.isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300'
              }`}
            >
              {momentum.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {momentum.isPositive ? '+' : ''}
                {momentum.diff.toFixed(1)}% momentum ({momentum.firstTerm} &rarr; {momentum.latestTerm})
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="w-full h-[300px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trajectory}
              margin={{ top: 15, right: 15, left: -10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="termGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
              <XAxis
                dataKey="term_name"
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
              <Tooltip content={<CustomGrowthTooltip />} />
              <Area
                type="monotone"
                dataKey="average_percentage"
                name="Average Score"
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#termGrowthGradient)"
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
