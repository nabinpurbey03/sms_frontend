import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { CohortRetentionMetric } from '../../types';

interface CohortRetentionBarChartProps {
  metrics: CohortRetentionMetric[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: CohortRetentionMetric;
  }>;
  label?: string;
}

const CustomRetentionTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3.5 shadow-xl text-popover-foreground text-xs min-w-[210px] space-y-2 border-border/80">
      <div className="flex items-center justify-between border-b pb-1.5 gap-3">
        <span className="font-bold text-sm text-foreground">{label}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
          {item.retention_rate.toFixed(1)}% Retention
        </span>
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Starting Enrolled:</span>
          <span className="font-semibold text-foreground">{item.starting_enrolled}</span>
        </div>
        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Retained Next Year:
          </span>
          <span>{item.retained_next_year}</span>
        </div>
        <div className="flex justify-between items-center text-sky-600 dark:text-sky-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Graduated:
          </span>
          <span>{item.graduated}</span>
        </div>
        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Transferred / Left:
          </span>
          <span>{item.transferred_out}</span>
        </div>
      </div>
    </div>
  );
};

export const CohortRetentionBarChart: React.FC<CohortRetentionBarChartProps> = ({
  metrics,
  className,
}) => {
  const chartData = React.useMemo(() => {
    return [...metrics].sort((a, b) => a.sequence_order - b.sequence_order);
  }, [metrics]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Cohort Progression by Grade
          </CardTitle>
          <CardDescription>
            Comparison of retained, graduated, and transferred students across cohorts.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
          No grade breakdown data available for this academic year.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Cohort Progression by Grade
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Breakdown of retained, graduated, and transferred students across classes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[340px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
              <XAxis
                dataKey="class_name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomRetentionTooltip />}
                cursor={{ fill: 'rgba(100, 116, 139, 0.08)' }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
              />
              <Bar
                name="Retained Next Year"
                dataKey="retained_next_year"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                name="Graduated"
                dataKey="graduated"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                name="Transferred / Left"
                dataKey="transferred_out"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
