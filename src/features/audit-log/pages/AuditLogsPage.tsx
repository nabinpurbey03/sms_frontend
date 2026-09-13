import React, { useState } from 'react';
import { useAuditLogs } from '../hooks';
import { AuditLogDetailDrawer } from '../components/AuditLogDetailDrawer';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AuditLog } from '../schema';
import { Button } from '@/components/ui/button';

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: response, isLoading, isError } = useAuditLogs({
    page,
    page_size: 20,
    action: actionFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
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
      cell: (item) => <span className="text-sm">{new Date(item.created_at).toLocaleString()}</span>,
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
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
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
              data={response?.data || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              onRowClick={(item) => setSelectedLog(item)}
              emptyMessage="No audit logs found matching the criteria."
            />
          )}
        </div>
        {response?.meta && response.meta.total_pages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Page {response.meta.page} of {response.meta.total_pages}
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= response.meta.total_pages}
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
