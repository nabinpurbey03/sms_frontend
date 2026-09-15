import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface TrendAreaChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  gradientId?: string;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  className?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  valueFormatter,
  dataKey,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  valueFormatter?: (value: number) => string;
  dataKey: string;
}) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold mt-0.5">
        {valueFormatter ? valueFormatter(value) : value.toLocaleString()}
      </p>
    </div>
  );
};

function TrendAreaChart({
  data,
  dataKey,
  xAxisKey = 'date',
  color = 'hsl(var(--primary))',
  height = 220,
  gradientId,
  showGrid = true,
  valueFormatter,
  xAxisFormatter,
  className,
}: TrendAreaChartProps) {
  const id = gradientId || `gradient-${dataKey}`;

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={xAxisFormatter}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={valueFormatter}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            content={
              <CustomTooltip
                valueFormatter={valueFormatter}
                dataKey={dataKey}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, className: 'fill-background' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { TrendAreaChart };
