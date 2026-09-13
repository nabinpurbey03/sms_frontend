import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string;
  renderCard?: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  keyExtractor,
  renderCard,
  emptyMessage = 'No records found.',
  className,
  onRowClick,
}: ResponsiveDataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-dashed p-8 text-center bg-muted/20 border-border/60">
        <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile Stacked Card View (< md) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          if (renderCard) {
            return <React.Fragment key={key}>{renderCard(item, index)}</React.Fragment>;
          }

          // Fallback auto-stacked card renderer if custom card is not supplied
          return (
            <Card 
              key={key} 
              className={cn("border-border/60 shadow-sm transition-shadow overflow-hidden", onRowClick ? "cursor-pointer hover:shadow-md" : "hover:shadow-sm")}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              <CardContent className="p-4 space-y-3">
                {columns.map((col, colIdx) => (
                  <div
                    key={colIdx}
                    className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0 text-sm"
                  >
                    <span className="font-medium text-muted-foreground">
                      {typeof col.header === 'string' ? col.header : `Field ${colIdx + 1}`}
                    </span>
                    <div className="text-right font-medium text-foreground">
                      {col.cell
                        ? col.cell(item, index)
                        : col.accessorKey
                        ? String(item[col.accessorKey] ?? '')
                        : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop / Tablet Landscape Table View (md+) */}
      <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b border-border/60">
              {columns.map((col, colIdx) => (
                <TableHead key={colIdx} className={cn("font-semibold text-muted-foreground h-11", col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow 
                key={keyExtractor(item, index)}
                className={cn("transition-colors border-b border-border/40 last:border-0", onRowClick ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/40")}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col, colIdx) => (
                  <TableCell key={colIdx} className={cn("py-3", col.className)}>
                    {col.cell
                      ? col.cell(item, index)
                      : col.accessorKey
                      ? String(item[col.accessorKey] ?? '')
                      : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
