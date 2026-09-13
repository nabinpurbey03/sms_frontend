import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { AuditLog } from '../schema';

interface AuditLogDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditLog: AuditLog | null;
}

export const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({
  open,
  onOpenChange,
  auditLog,
}) => {
  if (!auditLog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            Detailed information for the selected audit log entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-sm text-gray-500 block">ID</span>
              <span className="text-sm">{auditLog.id}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">Date</span>
              <span className="text-sm">{new Date(auditLog.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">Action</span>
              <span className="text-sm">{auditLog.action}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">Status</span>
              <span className="text-sm">{auditLog.status}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">User ID</span>
              <span className="text-sm">{auditLog.user_id}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">Tenant ID</span>
              <span className="text-sm">{auditLog.tenant_id}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">Resource Type</span>
              <span className="text-sm">{auditLog.resource_type}</span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-500 block">IP Address</span>
              <span className="text-sm">{auditLog.ip_address}</span>
            </div>
          </div>
          <div>
            <span className="font-semibold text-sm text-gray-500 block mb-2">Details (JSON)</span>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
              {JSON.stringify(auditLog.details, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
