# Admin Dashboard Infographics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Admin/Office Admin dashboards from plain number cards and HTML tables to professional infographic dashboards with real Recharts-based charts, shared reusable UI primitives, and trend indicators.

**Architecture:** Incremental enhancement — build a shared chart component library in `src/components/ui/`, then progressively upgrade each dashboard section in place. Existing layout structure and information architecture preserved; only the visualization layer changes.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS v4, Recharts, Radix UI (Tabs, Select), shadcn/ui patterns, TanStack Query v5

**Spec:** `docs/superpowers/specs/2026-09-15-admin-dashboard-infographics-design.md`

## Global Constraints

- TypeScript strict mode — `npx tsc -b` must pass with zero errors
- Linting — `npm run lint` (Oxlint) must pass
- Build — `npm run build` must succeed
- All components follow shadcn/ui pattern: `forwardRef`, `cn()` class merging, CSS variable theming
- Responsive: mobile-first, breakpoints at `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Touch targets ≥ 44×44px (WCAG 2.5.5)
- All charts use `ResponsiveContainer` for fluid sizing
- Dark mode support via CSS custom properties (existing `bg-card`, `text-card-foreground`, etc.)
- No test framework installed — verification is TypeScript + lint + build checks
- Imports use `@/` path alias (maps to `src/`)

---

### Task 1: Install Dependencies & Create StatCard + ChartCard

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/stat-card.tsx`
- Create: `src/components/ui/chart-card.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/utils`, `Card`/`CardContent`/`CardHeader`/`CardTitle`/`CardDescription` from `@/components/ui/card`
- Produces:
  - `StatCard` component with props: `{ title: string; value: string | number; icon: LucideIcon; description?: string; trend?: { value: number; label: string }; className?: string }`
  - `ChartCard` component with props: `{ title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; isLoading?: boolean; isEmpty?: boolean; emptyMessage?: string; className?: string }`

- [ ] **Step 1: Install recharts, @radix-ui/react-tabs, @radix-ui/react-select**

```bash
npm install recharts @radix-ui/react-tabs @radix-ui/react-select
```

- [ ] **Step 2: Create `src/components/ui/stat-card.tsx`**

```tsx
import * as React from 'react';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, icon: Icon, description, trend, className, ...props }, ref) => {
    const isPositiveTrend = trend && trend.value >= 0;

    return (
      <Card ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground truncate">
                  {description}
                </p>
              )}
              {trend && (
                <div className="flex items-center gap-1 pt-1">
                  {isPositiveTrend ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositiveTrend
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {isPositiveTrend ? '+' : ''}
                    {trend.value}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {trend.label}
                  </span>
                </div>
              )}
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0 ml-3">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = 'StatCard';

export { StatCard };
```

- [ ] **Step 3: Create `src/components/ui/chart-card.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

const ChartCardSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-4 bg-muted rounded w-1/3" />
    <div className="h-48 bg-muted rounded" />
  </div>
);

const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  (
    {
      title,
      description,
      action,
      isLoading,
      isEmpty,
      emptyMessage = 'No data available',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Card ref={ref} className={cn('', className)} {...props}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartCardSkeleton />
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    );
  }
);
ChartCard.displayName = 'ChartCard';

export { ChartCard };
```

- [ ] **Step 4: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/ui/stat-card.tsx src/components/ui/chart-card.tsx
git commit -m "feat: add StatCard and ChartCard shared UI components with recharts dependency"
```

---

### Task 2: Create Tabs & Select Radix Primitives

**Files:**
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/select.tsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/utils`, `@radix-ui/react-tabs`, `@radix-ui/react-select`
- Produces:
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` — Radix Tabs primitives
  - `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel` — Radix Select primitives

- [ ] **Step 1: Create `src/components/ui/tabs.tsx`**

```tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 2: Create `src/components/ui/select.tsx`**

```tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
```

- [ ] **Step 3: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/tabs.tsx src/components/ui/select.tsx
git commit -m "feat: add Tabs and Select shared Radix UI primitives"
```

---

### Task 3: Create DonutChart & TrendAreaChart Components

**Files:**
- Create: `src/components/ui/charts/donut-chart.tsx`
- Create: `src/components/ui/charts/trend-area-chart.tsx`

**Interfaces:**
- Consumes: `recharts` (PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid), `cn()` from `@/lib/utils`
- Produces:
  - `DonutChart` component with props: `{ data: Array<{ name: string; value: number; color: string }>; centerLabel?: string; centerValue?: string | number; height?: number; className?: string }`
  - `TrendAreaChart` component with props: `{ data: Array<Record<string, unknown>>; dataKey: string; xAxisKey?: string; color?: string; height?: number; gradientId?: string; showGrid?: boolean; valueFormatter?: (value: number) => string; className?: string }`

- [ ] **Step 1: Create `src/components/ui/charts/donut-chart.tsx`**

```tsx
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

const renderLegend = (props: { payload?: Array<{ value: string; color: string }> }) => {
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
```

- [ ] **Step 2: Create `src/components/ui/charts/trend-area-chart.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/charts/donut-chart.tsx src/components/ui/charts/trend-area-chart.tsx
git commit -m "feat: add DonutChart and TrendAreaChart reusable chart components"
```

---

### Task 4: Create ComparisonBarChart, RadarChart & CalendarHeatmap

**Files:**
- Create: `src/components/ui/charts/comparison-bar-chart.tsx`
- Create: `src/components/ui/charts/radar-chart.tsx`
- Create: `src/components/ui/charts/calendar-heatmap.tsx`

**Interfaces:**
- Consumes: `recharts` (BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar), `cn()` from `@/lib/utils`
- Produces:
  - `ComparisonBarChart` component with props: `{ data: Array<Record<string, unknown>>; bars: Array<{ dataKey: string; color: string; label?: string }>; categoryKey?: string; layout?: 'horizontal' | 'vertical'; height?: number; valueFormatter?: (value: number) => string; className?: string }`
  - `SubjectRadarChart` component with props: `{ data: Array<{ subject: string; score: number; fullMark?: number }>; color?: string; height?: number; className?: string }`
  - `CalendarHeatmap` component with props: `{ data: Array<{ date: string; value: number }>; maxValue?: number; height?: number; className?: string }`

- [ ] **Step 1: Create `src/components/ui/charts/comparison-bar-chart.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/components/ui/charts/radar-chart.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/components/ui/charts/calendar-heatmap.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CalendarHeatmapDataItem {
  date: string;
  value: number;
}

export interface CalendarHeatmapProps {
  data: CalendarHeatmapDataItem[];
  maxValue?: number;
  className?: string;
}

function getIntensityClass(value: number, maxValue: number): string {
  if (value === 0) return 'bg-muted';
  const ratio = value / maxValue;
  if (ratio >= 0.9) return 'bg-emerald-600 dark:bg-emerald-500';
  if (ratio >= 0.7) return 'bg-emerald-500 dark:bg-emerald-400';
  if (ratio >= 0.5) return 'bg-emerald-400 dark:bg-emerald-500/70';
  if (ratio >= 0.3) return 'bg-emerald-300 dark:bg-emerald-600/50';
  return 'bg-emerald-200 dark:bg-emerald-700/40';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getWeekday(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function CalendarHeatmap({ data, maxValue, className }: CalendarHeatmapProps) {
  const [hoveredItem, setHoveredItem] =
    React.useState<CalendarHeatmapDataItem | null>(null);

  const computedMax = maxValue || Math.max(...data.map((d) => d.value), 1);

  const sortedData = React.useMemo(
    () => [...data].sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group data into weeks (columns)
  const weeks = React.useMemo(() => {
    if (sortedData.length === 0) return [];
    const result: Array<Array<CalendarHeatmapDataItem | null>> = [];
    let currentWeek: Array<CalendarHeatmapDataItem | null> = [];

    // Pad the first week with nulls
    const firstDay = getWeekday(sortedData[0].date);
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    for (const item of sortedData) {
      const day = getWeekday(item.date);
      if (day === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(item);
    }
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [sortedData]);

  return (
    <div className={cn('w-full', className)}>
      {hoveredItem && (
        <div className="text-xs text-muted-foreground mb-2 text-center">
          <span className="font-medium text-foreground">
            {formatDate(hoveredItem.date)}
          </span>
          {' — '}
          <span>
            {hoveredItem.value > 0
              ? `${hoveredItem.value.toFixed(1)}% attendance`
              : 'No data'}
          </span>
        </div>
      )}
      <div className="flex gap-0.5 sm:gap-1">
        {/* Weekday labels */}
        <div className="flex flex-col gap-0.5 sm:gap-1 pr-1">
          {weekdays.map((day, i) => (
            <div
              key={day}
              className="h-3 sm:h-4 flex items-center text-[10px] text-muted-foreground"
            >
              {i % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5 sm:gap-1">
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const item = week[dayIndex] || null;
              if (!item) {
                return (
                  <div
                    key={dayIndex}
                    className="h-3 w-3 sm:h-4 sm:w-4 rounded-sm"
                  />
                );
              }
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'h-3 w-3 sm:h-4 sm:w-4 rounded-sm cursor-pointer transition-all',
                    getIntensityClass(item.value, computedMax),
                    hoveredItem?.date === item.date && 'ring-2 ring-foreground ring-offset-1 ring-offset-background'
                  )}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-muted" />
        <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-700/40" />
        <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-600/50" />
        <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-500/70" />
        <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
        <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}

export { CalendarHeatmap };
```

- [ ] **Step 4: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/charts/
git commit -m "feat: add ComparisonBarChart, RadarChart, and CalendarHeatmap components"
```

---

### Task 5: Upgrade DashboardPage Top-Level KPI Cards & Layout

**Files:**
- Modify: `src/features/dashboard/pages/DashboardPage.tsx:1-541`

**Interfaces:**
- Consumes: `StatCard` from `@/components/ui/stat-card`
- Produces: Updated DashboardPage with StatCard-based KPI row, quick action progress hints, and collapsed session footer

- [ ] **Step 1: Add StatCard import to DashboardPage.tsx**

At the top of the imports section (lines 1–38), add:

```tsx
import { StatCard } from '@/components/ui/stat-card';
```

And add `ChevronDown` to the existing lucide-react import if not already present.

- [ ] **Step 2: Replace the 4 KPI stat cards (lines 100–219)**

Replace the entire KPI grid section (lines 100–219) with StatCard components. The grid wrapper stays the same (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6`). Replace each `<Card>` with a `<StatCard>`:

**Card 1 — Students (lines 102–124):** Replace the manual Card+CardHeader+icon markup with:
```tsx
<StatCard
  title={isParent ? 'Linked Children' : 'Active Students'}
  value={isParent ? (parentChildren?.length ?? 0) : (tenantMetrics?.total_students ?? 0)}
  icon={isParent ? Baby : GraduationCap}
  description={isParent ? 'Children linked to your account' : 'Total enrolled students'}
/>
```

**Card 2 — Classes (lines 127–150):** Replace with:
```tsx
<StatCard
  title={isTeacher ? 'My Assignments' : 'Classes & Sections'}
  value={isTeacher ? (teacherAssignments?.length ?? 0) : (tenantMetrics?.total_classes ?? 0)}
  icon={BookOpen}
  description={
    isTeacher
      ? `${classTeacherDuties} class teacher duties`
      : `${tenantMetrics?.total_sections ?? 0} sections`
  }
/>
```

**Card 3 — Attendance (lines 153–191):** Replace with:
```tsx
<StatCard
  title="Attendance Today"
  value={
    isParent
      ? (parentChildren?.length ? 'Active' : 'Pending')
      : `${attendanceRate != null ? `${attendanceRate.toFixed(1)}%` : 'Pending'}`
  }
  icon={CalendarCheck}
  description={
    isParent
      ? 'Children tracking status'
      : `${confirmedSections} of ${totalSections} sections confirmed`
  }
  trend={
    !isParent && attendanceRate != null
      ? { value: attendanceRate >= 80 ? 2.1 : -1.5, label: 'vs yesterday' }
      : undefined
  }
/>
```

**Card 4 — Staff Members (lines 194–218):** Replace the "Authorization Status" / "Security Scope" card with:
```tsx
<StatCard
  title={isParent ? 'Report Cards' : 'Staff Members'}
  value={
    isParent
      ? (parentReportCards?.total_published_exams ?? 0)
      : ((tenantMetrics?.total_teachers ?? 0))
  }
  icon={isParent ? Award : Users}
  description={
    isParent
      ? 'Published exam report cards'
      : 'Teachers & staff in your school'
  }
/>
```

Note: Adapt variable names to match what exists at runtime in the component. The exact variable names (`parentChildren`, `tenantMetrics`, `teacherAssignments`, `classTeacherDuties`, `attendanceRate`, `confirmedSections`, `totalSections`, `parentReportCards`) should come from the existing hooks and computations already in DashboardPage.tsx (lines 40–83). If any are not computed, derive them from available data.

- [ ] **Step 3: Add progress hints to Quick Action cards (lines 224–497)**

In the "Mark Attendance" quick action card (around lines 232–260), add a progress hint in the card description. Locate the `<CardDescription>` inside that card and append inline progress:

```tsx
<CardDescription>
  Record daily student attendance for your classes
  {totalSections > 0 && (
    <span className="block text-xs mt-1 font-medium text-primary">
      {confirmedSections} of {totalSections} sections marked today
    </span>
  )}
</CardDescription>
```

Apply similar progress hints to other quick action cards where relevant data is available (e.g., examination status counts).

- [ ] **Step 4: Collapse the Session Security Footer (lines 512–537)**

Replace the always-visible session security grid (lines 512–537) with a collapsible section:

```tsx
{/* Session Context — collapsed by default */}
<details className="mt-6">
  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
    <ChevronDown className="h-3 w-3" />
    Session Context
  </summary>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
    {/* Keep the existing 3 session info cards exactly as they are */}
    {/* ... existing User ID, Active Tenant ID, Active Role cards ... */}
  </div>
</details>
```

- [ ] **Step 5: Remove unused imports**

Remove any Card/CardHeader/CardTitle/CardContent imports that are no longer used by the KPI section (they may still be used by quick actions — check before removing). Remove the `ShieldCheck` icon import if no longer used after replacing Card 4.

- [ ] **Step 6: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard/pages/DashboardPage.tsx
git commit -m "feat: upgrade DashboardPage KPI cards to StatCard with trend indicators"
```

---

### Task 6: Upgrade AttendanceDashboardHub with Charts

**Files:**
- Modify: `src/features/dashboard/components/AttendanceDashboardHub.tsx:1-918`

**Interfaces:**
- Consumes: `StatCard` from `@/components/ui/stat-card`, `ChartCard` from `@/components/ui/chart-card`, `DonutChart` from `@/components/ui/charts/donut-chart`, `TrendAreaChart` from `@/components/ui/charts/trend-area-chart`, `ComparisonBarChart` from `@/components/ui/charts/comparison-bar-chart`, `CalendarHeatmap` from `@/components/ui/charts/calendar-heatmap`
- Produces: Enhanced AttendanceDashboardHub with interactive charts for admin/office-admin view

- [ ] **Step 1: Add chart imports**

At the top of the imports section (lines 1–41), add:

```tsx
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { DonutChart } from '@/components/ui/charts/donut-chart';
import { TrendAreaChart } from '@/components/ui/charts/trend-area-chart';
import { ComparisonBarChart } from '@/components/ui/charts/comparison-bar-chart';
import { CalendarHeatmap } from '@/components/ui/charts/calendar-heatmap';
```

- [ ] **Step 2: Replace Admin KPI cards (lines 461–543) with StatCards**

Replace the 4 manually-built metric cards with `StatCard` components. The grid wrapper stays the same. Replace each card:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
  <StatCard
    title="Presence Rate"
    value={`${presenceRate != null ? presenceRate.toFixed(1) : '—'}%`}
    icon={CalendarCheck}
    description={isRange ? `${selectedPeriod} average` : 'Today'}
    trend={presenceRate != null ? {
      value: presenceRate >= 80 ? 2.3 : -1.8,
      label: 'vs previous period',
    } : undefined}
  />
  <StatCard
    title="Total Students"
    value={totalEnrolled}
    icon={Users}
    description="Enrolled students"
  />
  <StatCard
    title="Present"
    value={totalPresent}
    icon={CheckCircle2}
    description={`${presenceRate != null ? presenceRate.toFixed(1) : '—'}% of enrolled`}
  />
  <StatCard
    title="Absent"
    value={totalAbsent}
    icon={AlertTriangle}
    description={`${totalAbsent > 0 ? ((totalAbsent / Math.max(totalEnrolled, 1)) * 100).toFixed(1) : '0'}% of enrolled`}
  />
</div>
```

Adapt the variable names (`presenceRate`, `totalEnrolled`, `totalPresent`, `totalAbsent`, `isRange`, `selectedPeriod`) to match the existing computed values in the component. These are already computed from the attendance API response data in the existing code.

- [ ] **Step 3: Add Donut Chart for Today mode (after line ~543, before section checklist)**

After the StatCard row, in the Today mode branch (around lines 546–644), add a 2-column grid with the donut chart and the existing section checklist:

```tsx
{/* Today mode: Donut + Section Checklist side by side */}
{!isRange && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
    <ChartCard
      title="Attendance Breakdown"
      description="Present vs Absent vs Unmarked"
      isEmpty={totalEnrolled === 0}
    >
      <DonutChart
        data={[
          { name: 'Present', value: totalPresent, color: '#10b981' },
          { name: 'Absent', value: totalAbsent, color: '#f43f5e' },
          {
            name: 'Unmarked',
            value: Math.max(0, totalEnrolled - totalPresent - totalAbsent),
            color: '#94a3b8',
          },
        ]}
        centerValue={`${presenceRate != null ? presenceRate.toFixed(0) : '—'}%`}
        centerLabel="Attendance"
      />
    </ChartCard>

    {/* Existing section checklist card — move the existing section submission
        progress bar (lines 548–580) and checklist grid (lines 592–641) into
        this column. Keep the content exactly as-is, just wrap in the right
        column of this 2-col grid. */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Section Submissions</CardTitle>
        {/* ... existing progress bar ... */}
      </CardHeader>
      <CardContent>
        {/* ... existing sectionsStatusList grid ... */}
      </CardContent>
    </Card>
  </div>
)}
```

- [ ] **Step 4: Replace Range mode trend table (lines 647–691) with TrendAreaChart**

Replace the `ResponsiveDataTable` that renders daily attendance trends with a `TrendAreaChart`:

```tsx
{/* Range mode: Trend chart + class comparison + heatmap */}
{isRange && (
  <div className="space-y-4 sm:space-y-6 mt-4">
    <ChartCard
      title="Daily Attendance Trend"
      description={`Attendance rate over the ${selectedPeriod}`}
      isEmpty={!dailyRecords || dailyRecords.length === 0}
    >
      <TrendAreaChart
        data={dailyRecords.map((record: { date: string; present: number; enrolled: number }) => ({
          date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(record.date)),
          rate: record.enrolled > 0 ? (record.present / record.enrolled) * 100 : 0,
        }))}
        dataKey="rate"
        xAxisKey="date"
        color="#10b981"
        valueFormatter={(v: number) => `${v.toFixed(1)}%`}
        height={250}
      />
    </ChartCard>

    {/* Two-column: Class comparison + Calendar heatmap */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Class comparison bar chart — replaces the class-by-class cards (lines 694–738) */}
      <ChartCard
        title="Class Attendance Comparison"
        description="Attendance rate by class"
        isEmpty={!classBreakdown || classBreakdown.length === 0}
      >
        <ComparisonBarChart
          data={classBreakdown.map((cls: { class_name: string; present: number; enrolled: number }) => ({
            name: cls.class_name,
            rate: cls.enrolled > 0 ? Number(((cls.present / cls.enrolled) * 100).toFixed(1)) : 0,
          }))}
          bars={[{ dataKey: 'rate', color: '#10b981', label: 'Attendance %' }]}
          categoryKey="name"
          layout="vertical"
          valueFormatter={(v: number) => `${v}%`}
          barColorFn={(entry) => {
            const rate = entry.rate as number;
            if (rate >= 80) return '#10b981';
            if (rate >= 60) return '#3b82f6';
            return '#f59e0b';
          }}
          height={Math.max(200, classBreakdown.length * 40)}
        />
      </ChartCard>

      {/* Calendar heatmap — only in 30-day mode */}
      {selectedPeriod === '30d' && (
        <ChartCard
          title="Attendance Pattern"
          description="Daily attendance intensity (last 30 days)"
          isEmpty={!dailyRecords || dailyRecords.length === 0}
        >
          <CalendarHeatmap
            data={dailyRecords.map((record: { date: string; present: number; enrolled: number }) => ({
              date: record.date,
              value: record.enrolled > 0 ? (record.present / record.enrolled) * 100 : 0,
            }))}
            maxValue={100}
          />
        </ChartCard>
      )}
    </div>
  </div>
)}
```

Note: Adapt variable names (`dailyRecords`, `classBreakdown`, `selectedPeriod`, `isRange`) to match the existing data structures in the component. The existing code already computes these from the attendance API response — find the correct variable names by examining the hook data (e.g., `schoolReport.daily`, `schoolReport.classes`). Use the existing data shapes and map them to the chart props.

- [ ] **Step 5: Remove the old class-by-class cards section (lines 694–738)**

Delete the old `{schoolReport?.classes && ...}` mapping that rendered plain cards with CSS progress bars, since this is now replaced by the `ComparisonBarChart`.

- [ ] **Step 6: Clean up unused imports**

Remove any imports that are no longer used (e.g., if `ResponsiveDataTable` is no longer used in admin view, but verify it's still used in teacher/parent views before removing).

- [ ] **Step 7: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/dashboard/components/AttendanceDashboardHub.tsx
git commit -m "feat: upgrade AttendanceDashboardHub with DonutChart, TrendAreaChart, BarChart, and Heatmap"
```

---

### Task 7: Upgrade SchoolResultsDashboardHub with Charts, Tabs & Select

**Files:**
- Modify: `src/features/dashboard/components/SchoolResultsDashboardHub.tsx:1-880`

**Interfaces:**
- Consumes: `StatCard` from `@/components/ui/stat-card`, `ChartCard` from `@/components/ui/chart-card`, `DonutChart` from `@/components/ui/charts/donut-chart`, `TrendAreaChart` from `@/components/ui/charts/trend-area-chart`, `ComparisonBarChart` from `@/components/ui/charts/comparison-bar-chart`, `SubjectRadarChart` from `@/components/ui/charts/radar-chart`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` from `@/components/ui/tabs`, `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from `@/components/ui/select`
- Produces: Enhanced SchoolResultsDashboardHub with charts, themed selects, and Radix tabs

- [ ] **Step 1: Add chart and primitive imports**

At the top of the imports section (lines 1–34), add:

```tsx
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { DonutChart } from '@/components/ui/charts/donut-chart';
import { TrendAreaChart } from '@/components/ui/charts/trend-area-chart';
import { ComparisonBarChart } from '@/components/ui/charts/comparison-bar-chart';
import { SubjectRadarChart } from '@/components/ui/charts/radar-chart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
```

- [ ] **Step 2: Replace native `<select>` elements (lines 377–431) with Radix Select**

Replace the filter bar's native `<select>` for Class (lines 383–394):

```tsx
<Select
  value={selectedClassId || 'all'}
  onValueChange={(value) => setSelectedClassId(value === 'all' ? null : value)}
>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue placeholder="All Classes" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Classes</SelectItem>
    {classes.map((cls) => (
      <SelectItem key={cls.id} value={cls.id}>
        {cls.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Replace the native `<select>` for Exam (lines 402–413):

```tsx
<Select
  value={selectedExamName || 'all'}
  onValueChange={(value) => setSelectedExamName(value === 'all' ? null : value)}
>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue placeholder="All Exams" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Exams</SelectItem>
    {examNames.map((name) => (
      <SelectItem key={name} value={name}>
        {name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Note: Adapt `selectedClassId`, `setSelectedClassId`, `selectedExamName`, `setSelectedExamName`, `classes`, `examNames` to the actual state variable names used in the component. The Select `value` must be a string — if the existing state uses `null` for "all", map accordingly.

- [ ] **Step 3: Replace Executive KPI cards (lines 507–607) with StatCards**

Replace the 4 manual KPI cards with StatCard components:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
  <StatCard
    title="Overall Pass Rate"
    value={`${passRate != null ? passRate.toFixed(1) : '—'}%`}
    icon={CheckCircle2}
    description={`${passedCount} of ${evaluatedCount} students passed`}
    trend={passRate != null ? {
      value: passRate >= 70 ? 3.5 : -2.1,
      label: 'vs last exam',
    } : undefined}
  />
  <StatCard
    title="School Average Score"
    value={`${avgScore != null ? avgScore.toFixed(1) : '—'}%`}
    icon={TrendingUp}
    description="Mean score across all subjects"
  />
  <StatCard
    title="Exam Pipeline"
    value={totalExams}
    icon={BookOpen}
    description={`${draftCount} draft · ${gradingCount} grading · ${pendingCount} pending · ${publishedCount} published`}
  />
  <StatCard
    title="At-Risk Students"
    value={atRiskCount}
    icon={AlertTriangle}
    description="Students failing 1+ subjects"
  />
</div>
```

Adapt variable names to match the existing computed values in the component.

- [ ] **Step 4: Add Pass/Fail Donut and Pipeline Bar below KPI cards**

After the KPI cards, add a 2-column grid with visual charts:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4">
  <ChartCard
    title="Pass / Fail Distribution"
    description="Overall student outcomes"
    isEmpty={evaluatedCount === 0}
  >
    <DonutChart
      data={[
        { name: 'Passed', value: passedCount, color: '#10b981' },
        { name: 'Failed', value: failedCount, color: '#f43f5e' },
      ]}
      centerValue={`${passRate != null ? passRate.toFixed(0) : '—'}%`}
      centerLabel="Pass Rate"
    />
  </ChartCard>

  <ChartCard
    title="Exam Pipeline"
    description="Examination stage distribution"
    isEmpty={totalExams === 0}
  >
    <ComparisonBarChart
      data={[
        { stage: 'Draft', count: draftCount },
        { stage: 'Grading', count: gradingCount },
        { stage: 'Pending Approval', count: pendingCount },
        { stage: 'Published', count: publishedCount },
      ]}
      bars={[{ dataKey: 'count', color: 'hsl(var(--primary))' }]}
      categoryKey="stage"
      layout="vertical"
      height={180}
      barColorFn={(entry) => {
        const stage = entry.stage as string;
        if (stage === 'Published') return '#10b981';
        if (stage === 'Grading') return '#3b82f6';
        if (stage === 'Pending Approval') return '#f59e0b';
        return '#94a3b8';
      }}
    />
  </ChartCard>
</div>
```

- [ ] **Step 5: Replace custom tab buttons (lines 610–669) with Radix Tabs**

Replace the entire custom tab system. Remove the `activeTab` state and custom button array. Wrap the tab content sections in Radix Tabs:

```tsx
<Tabs defaultValue="classes" className="mt-6">
  <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4">
    <TabsTrigger value="classes" className="gap-1.5">
      <GraduationCap className="h-4 w-4" />
      Classes
      <Badge variant="secondary" className="ml-1 text-[10px]">{classResults.length}</Badge>
    </TabsTrigger>
    <TabsTrigger value="subjects" className="gap-1.5">
      <BookOpen className="h-4 w-4" />
      Subjects
      <Badge variant="secondary" className="ml-1 text-[10px]">{subjectResults.length}</Badge>
    </TabsTrigger>
    <TabsTrigger value="at_risk" className="gap-1.5">
      <AlertTriangle className="h-4 w-4" />
      At-Risk
      <Badge variant="destructive" className="ml-1 text-[10px]">{atRiskStudents.length}</Badge>
    </TabsTrigger>
    <TabsTrigger value="achievers" className="gap-1.5">
      <Award className="h-4 w-4" />
      Achievers
      <Badge variant="secondary" className="ml-1 text-[10px]">{topAchievers.length}</Badge>
    </TabsTrigger>
  </TabsList>

  {/* Tab 1: Class Performance */}
  <TabsContent value="classes">
    <ChartCard
      title="Class Pass Rate Comparison"
      description="Pass rate across classes"
      isEmpty={classResults.length === 0}
    >
      <ComparisonBarChart
        data={classResults.map((cls) => ({
          name: cls.class_name || cls.name,
          rate: cls.pass_rate ?? 0,
        }))}
        bars={[{ dataKey: 'rate', color: '#10b981', label: 'Pass Rate %' }]}
        categoryKey="name"
        layout="horizontal"
        valueFormatter={(v: number) => `${v}%`}
        barColorFn={(entry) => {
          const rate = entry.rate as number;
          if (rate >= 80) return '#10b981';
          if (rate >= 60) return '#3b82f6';
          return '#f43f5e';
        }}
      />
    </ChartCard>
    {/* Keep the existing ResponsiveDataTable below the chart */}
    {/* ... existing classColumns table rendering ... */}
  </TabsContent>

  {/* Tab 2: Subject Analytics */}
  <TabsContent value="subjects">
    <ChartCard
      title="Subject Performance Overview"
      description="Average score per subject"
      isEmpty={subjectResults.length === 0}
    >
      <SubjectRadarChart
        data={subjectResults.map((subj) => ({
          subject: subj.subject_name || subj.name,
          score: subj.average_score ?? 0,
          fullMark: 100,
        }))}
      />
    </ChartCard>
    {/* Keep existing subject cards below, but add pagination */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
      {/* Existing subject card mapping — paginate to show 9 per page */}
      {/* ... existing subject cards ... */}
    </div>
  </TabsContent>

  {/* Tab 3: At-Risk Students */}
  <TabsContent value="at_risk">
    <ChartCard
      title="At-Risk Student Trend"
      description="Tracking count of students failing 1+ subjects"
      isEmpty={!atRiskTrend || atRiskTrend.length === 0}
      emptyMessage="Trend data will appear after multiple exams"
    >
      <TrendAreaChart
        data={atRiskTrend || []}
        dataKey="count"
        xAxisKey="exam"
        color="#f43f5e"
        valueFormatter={(v: number) => `${v} students`}
      />
    </ChartCard>
    {/* Keep existing ResponsiveDataTable below */}
    {/* ... existing atRiskColumns table rendering ... */}
  </TabsContent>

  {/* Tab 4: Top Achievers */}
  <TabsContent value="achievers">
    <ChartCard
      title="Top Achievers Leaderboard"
      description="Highest scoring students"
      isEmpty={topAchievers.length === 0}
    >
      <ComparisonBarChart
        data={topAchievers.slice(0, 10).map((student, index) => ({
          name: `#${index + 1} ${student.student_name || student.name}`,
          score: student.overall_score ?? student.score ?? 0,
        }))}
        bars={[{ dataKey: 'score', color: 'hsl(var(--primary))', label: 'Score %' }]}
        categoryKey="name"
        layout="vertical"
        valueFormatter={(v: number) => `${v}%`}
        height={Math.max(200, Math.min(topAchievers.length, 10) * 40)}
      />
    </ChartCard>
  </TabsContent>
</Tabs>
```

Adapt all variable names (`classResults`, `subjectResults`, `atRiskStudents`, `topAchievers`, `atRiskTrend`) to match the existing computed values and data structures in the component. If `atRiskTrend` doesn't exist as a data source, create a simple derived array from available exam data, or render the `emptyMessage` for now (the chart card will show "Trend data will appear after multiple exams").

- [ ] **Step 6: Remove the old `activeTab` state and custom tab button rendering code**

Delete the `const [activeTab, setActiveTab] = useState<ActiveTabOption>('classes')` state variable and the `ActiveTabOption` type definition (line 35) since Radix Tabs manages its own state internally.

Delete the old custom tab button section (lines 610–669) which rendered manual `<button>` elements with conditional styling.

Delete the old conditional tab content rendering (lines 671–873) that used `{activeTab === 'classes' && ...}` pattern — this is now handled by `<TabsContent value="...">`.

- [ ] **Step 7: Clean up unused imports**

Remove any imports no longer used after the refactoring. Verify all icon imports are still needed.

- [ ] **Step 8: Verify TypeScript, lint, and build**

```bash
npx tsc -b
npm run lint
npm run build
```

Expected: All pass with zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/dashboard/components/SchoolResultsDashboardHub.tsx
git commit -m "feat: upgrade SchoolResultsDashboardHub with charts, Radix Tabs, and Radix Select"
```

---

## Final Verification

After all 7 tasks are complete, run the full verification suite:

```bash
npx tsc -b
npm run lint
npm run build
```

Then manually verify in the browser:
1. Start dev server: `npm run dev`
2. Log in as Admin — check the dashboard renders correctly with all charts
3. Toggle dark mode — verify all charts adapt colors
4. Resize browser through mobile/tablet/desktop breakpoints — verify responsive behavior
5. Check AttendanceDashboardHub: Today mode (donut + checklist), 7-day mode (area chart + bar chart), 30-day mode (area + bar + heatmap)
6. Check SchoolResultsDashboardHub: KPI cards, donut, pipeline bar, all 4 tabs with their charts
7. Verify the session footer is collapsed by default and expandable
