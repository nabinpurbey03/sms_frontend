import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface BarConfig {
  dataKey: string;
  color: string;
  label?: string;
}

export interface ComparisonBarChartProps {
  data: Array<Record<string, unknown>>;
  bars: BarConfig[];
  categoryKey?: string;
  layout?: 'horizontal' | 'vertical';
  height?: number;
  valueFormatter?: (value: number) => string;
  barColorFn?: (entry: Record<string, unknown>, index: number) => string;
  className?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  valueFormatter?: (value: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-medium">
            {valueFormatter ? valueFormatter(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

function ComparisonBarChart({
  data,
  bars,
  categoryKey = 'name',
  layout = 'vertical',
  height = 300,
  valueFormatter,
  barColorFn,
  className,
}: ComparisonBarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={
            layout === 'horizontal'
              ? { top: 5, right: 5, left: -20, bottom: 0 }
              : { top: 5, right: 20, left: 0, bottom: 0 }
          }
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            horizontal={layout === 'horizontal'}
            vertical={layout === 'vertical'}
          />
          {layout === 'horizontal' ? (
            <>
              <XAxis
                dataKey={categoryKey}
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={valueFormatter}
                tick={{ fontSize: 11 }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={valueFormatter}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey={categoryKey}
                tickLine={false}
                axisLine={false}
                className="text-xs fill-muted-foreground"
                width={100}
                tick={{ fontSize: 11 }}
              />
            </>
          )}
          <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
          {bars.length > 1 && <Legend />}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.label || bar.dataKey}
              fill={bar.color}
              radius={[4, 4, 4, 4]}
              maxBarSize={40}
            >
              {barColorFn &&
                data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColorFn(entry, index)} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { ComparisonBarChart };
