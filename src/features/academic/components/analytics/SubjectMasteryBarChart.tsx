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
import { Badge } from '@/components/ui/badge';
import { BookMarked, BarChart3 } from 'lucide-react';
import type { SubjectMasteryMetric } from '../../types';

interface SubjectMasteryBarChartProps {
  mastery: SubjectMasteryMetric[];
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: SubjectMasteryMetric;
  }>;
  label?: string;
}

const getDifficultyBadge = (diff: SubjectMasteryMetric['difficulty_classification']) => {
  switch (diff) {
    case 'Rigorous':
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800 text-[10px] font-semibold"
        >
          Rigorous (&lt;60%)
        </Badge>
      );
    case 'Balanced':
      return (
        <Badge
          variant="outline"
          className="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300 dark:border-sky-800 text-[10px] font-medium"
        >
          Balanced (60-85%)
        </Badge>
      );
    case 'High Mastery':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold"
        >
          High Mastery (&gt;85%)
        </Badge>
      );
    default:
      return <Badge variant="outline">{diff}</Badge>;
  }
};

const CustomMasteryTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3.5 shadow-xl text-popover-foreground text-xs min-w-[230px] space-y-2 border-border/80">
      <div className="flex items-center justify-between border-b pb-1.5 gap-2">
        <div className="flex flex-col">
          <span className="font-bold text-sm text-foreground">{item.subject_name}</span>
          {item.class_name && (
            <span className="text-[11px] text-muted-foreground">{item.class_name}</span>
          )}
        </div>
        <div>{getDifficultyBadge(item.difficulty_classification)}</div>
      </div>

      <div className="space-y-1.5 pt-0.5">
        <div className="flex justify-between items-center text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
            Average Score:
          </span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {item.average_score_pct.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between items-center text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            Pass Rate:
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {item.pass_rate_pct.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between items-center text-muted-foreground">
          <span>Score Range:</span>
          <span className="font-medium text-foreground">
            {item.lowest_score}% &ndash; {item.highest_score}%
          </span>
        </div>

        <div className="flex justify-between items-center text-muted-foreground">
          <span>Scores Evaluated:</span>
          <span className="font-semibold text-foreground">
            {item.total_scores_evaluated.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export const SubjectMasteryBarChart: React.FC<SubjectMasteryBarChartProps> = ({
  mastery,
  className,
}) => {
  const chartData = React.useMemo(() => {
    return (mastery || []).map((m) => ({
      ...m,
      display_name: m.class_name ? `${m.subject_name} (${m.class_name})` : m.subject_name,
    }));
  }, [mastery]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Subject Mastery &amp; Pass Rate Comparison
          </CardTitle>
          <CardDescription>
            Compares average student scores and benchmark pass rates across curriculum disciplines.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex flex-col items-center justify-center text-sm text-muted-foreground">
          <BookMarked className="w-10 h-10 text-muted-foreground/50 mb-2" />
          <p className="font-medium text-foreground">No subject mastery data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No subject mastery data available for this academic year yet.
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
              <BarChart3 className="w-4 h-4 text-primary" />
              Subject Mastery &amp; Pass Rate Comparison
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Dual-metric comparison of Average Score % vs. Pass Rate % across subjects.
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            Total Subjects:{' '}
            <strong className="text-foreground font-semibold">{chartData.length}</strong>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="w-full h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/60" />
              <XAxis
                dataKey="display_name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-muted-foreground"
                interval={0}
                angle={chartData.length > 5 ? -25 : 0}
                textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                height={chartData.length > 5 ? 50 : 30}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-muted-foreground"
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomMasteryTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />
              <Bar
                dataKey="average_score_pct"
                name="Average Score %"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="pass_rate_pct"
                name="Pass Rate %"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
