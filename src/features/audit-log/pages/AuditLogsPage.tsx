import React, { useState } from 'react';
import { useAuditLogs } from '../hooks';
import { AuditLogDetailDrawer } from '../components/AuditLogDetailDrawer';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AuditLog } from '../schema';
import { Button } from '@/components/ui/button';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

export const AuditLogsPage: React.FC = () => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [debouncedActionFilter, setDebouncedActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedActionFilter(actionFilter);
    }, 500);
    return () => clearTimeout(handler);
  }, [actionFilter]);

  const { data: response, isLoading, isError } = useAuditLogs({
    page,
    page_size: 20,
    action: debouncedActionFilter || undefined,
    date_from: startDate || undefined,
    date_to: endDate || undefined,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const columns: Column<AuditLog>[] = [
    {
      header: 'ID',
      accessorKey: 'id',
      cell: (item) => <span className="font-mono text-xs">{item.id.substring(0, 8)}...</span>,
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (item) => <span className="font-medium">{item.action}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => (
        <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
          {item.status}
        </Badge>
      ),
    },
    {
      header: 'Resource',
      accessorKey: 'resource_type',
    },
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: (item) => {
        const adDateStr = item.created_at.slice(0, 10);
        const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <span className="text-sm">
            {formatDualDate(adDateStr, calendarSystem)} {timeStr}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and monitor system activities.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Action</label>
              <Input
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <NepaliDatePicker
                id="audit-start-date"
                label="Start Date"
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <NepaliDatePicker
                id="audit-end-date"
                label="End Date"
                value={endDate}
                minDate={startDate}
                onChange={(val) => {
                  setEndDate(val);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="p-0 sm:p-1">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading audit logs...</div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-red-500">Failed to load audit logs.</div>
          ) : (
            <ResponsiveDataTable
              data={(response?.data as any) || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              onRowClick={(item) => setSelectedLog(item)}
              emptyMessage="No audit logs found matching the criteria."
            />
          )}
        </div>
        {(response as any)?.meta && (response as any)?.meta.total_pages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Page {(response as any)?.meta.page} of {(response as any)?.meta.total_pages}
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= ((response as any)?.meta?.total_pages || 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AuditLogDetailDrawer
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        auditLog={selectedLog}
      />
    </div>
  );
};
