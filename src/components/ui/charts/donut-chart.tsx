import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface DonutChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutChartDataItem[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  className?: string;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DonutChartDataItem }>;
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="font-medium">{item.name}</span>
      </div>
      <p className="mt-1 text-muted-foreground">
        {item.value.toLocaleString()}
      </p>
    </div>
  );
};

const renderLegend = (props: { payload?: ReadonlyArray<{ value?: any; color?: string }> }) => {
  const { payload } = props;
  if (!payload) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 220,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
          {(centerLabel || centerValue !== undefined) && (
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground"
            >
              <tspan
                x="50%"
                dy="-0.5em"
                className="text-2xl font-bold fill-foreground"
              >
                {centerValue !== undefined
                  ? typeof centerValue === 'number'
                    ? centerValue.toLocaleString()
                    : centerValue
                  : total.toLocaleString()}
              </tspan>
              {centerLabel && (
                <tspan
                  x="50%"
                  dy="1.5em"
                  className="text-xs fill-muted-foreground"
                >
                  {centerLabel}
                </tspan>
              )}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export { DonutChart };
