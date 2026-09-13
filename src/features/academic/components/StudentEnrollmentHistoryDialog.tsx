import React from 'react';
import { useAuth } from '@/auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, History } from 'lucide-react';
import type { AcademicStudent } from '../types';

interface StudentEnrollmentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: AcademicStudent | null;
}

interface EnrollmentHistoryItem {
  id: string;
  academic_year_id: string;
  academic_year_name: string;
  class_name: string;
  section_name?: string;
  status: 'PROMOTED' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN' | 'ACTIVE';
  date: string;
}

export const StudentEnrollmentHistoryDialog: React.FC<StudentEnrollmentHistoryDialogProps> = ({
  open,
  onOpenChange,
  student,
}) => {
  const { activeTenantId } = useAuth();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['student_enrollment_history', activeTenantId, student?.id],
    queryFn: async (): Promise<EnrollmentHistoryItem[]> => {
      if (!activeTenantId || !student) return [];
      const res = await apiClient.get(`/academic/tenants/${activeTenantId}/students/${student.id}/enrollments`);
      return res as unknown as EnrollmentHistoryItem[]; // Adjust this if there is a data envelope
    },
    enabled: !!activeTenantId && !!student && open,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PROMOTED': return 'success';
      case 'RETAINED': return 'warning';
      case 'TRANSFERRED': return 'info';
      case 'WITHDRAWN': return 'destructive';
      case 'ACTIVE': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Enrollment History
          </DialogTitle>
          <DialogDescription>
            Historical record for {student?.first_name} {student?.last_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <div className="py-8 flex justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
              No history found for this student.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {history.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg bg-card shadow-xs flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{item.academic_year_name}</span>
                    <Badge variant={getStatusBadgeVariant(item.status) as any} className="text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Class: {item.class_name} {item.section_name ? `(Sec ${item.section_name})` : ''}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 text-right">
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
