import * as React from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface RadarDataItem {
  subject: string;
  score: number;
  fullMark?: number;
}

export interface SubjectRadarChartProps {
  data: RadarDataItem[];
  color?: string;
  height?: number;
  className?: string;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RadarDataItem }>;
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{item.subject}</p>
      <p className="text-muted-foreground mt-0.5">
        Score: {item.score}
        {item.fullMark ? ` / ${item.fullMark}` : '%'}
      </p>
    </div>
  );
};

function SubjectRadarChart({
  data,
  color = 'hsl(var(--primary))',
  height = 280,
  className,
}: SubjectRadarChartProps) {
  const maxMark = Math.max(...data.map((d) => d.fullMark || 100));

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid className="stroke-muted" />
          <PolarAngleAxis
            dataKey="subject"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxMark]}
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 10 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { SubjectRadarChart };
