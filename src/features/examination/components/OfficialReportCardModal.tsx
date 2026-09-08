import React from 'react';
import { useStudentReportCard } from '../hooks';
import type { OfficialReportCardDTO } from '../types';
import { OfficialReportCardDocument } from './OfficialReportCardDocument';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, AlertCircle, RotateCcw } from 'lucide-react';

export interface OfficialReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  examId: string | null;
  studentId: string | null;
  preloadedReportCard?: OfficialReportCardDTO | null;
}

export const OfficialReportCardModal: React.FC<OfficialReportCardModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  examId,
  studentId,
  preloadedReportCard,
}) => {
  const shouldFetch = isOpen && !preloadedReportCard && !!examId && !!studentId;

  const {
    data: fetchedReportCard,
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentReportCard(tenantId, examId, studentId, {
    enabled: shouldFetch,
  });

  const reportCard = preloadedReportCard || fetchedReportCard;
  const isReportLoading = !preloadedReportCard && isLoading;
  const isReportError = !preloadedReportCard && isError;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        {/* Header & Top Action Bar */}
        <DialogHeader className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Official Academic Report Card
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Verified academic transcript & institutional evaluation
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 pr-8 sm:pr-6">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              disabled={!reportCard || isReportLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs min-h-[36px]"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body State Machine */}
        {isReportLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Generating official report card transcript...
            </p>
          </div>
        )}

        {isReportError && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 min-h-[300px]">
            <AlertCircle className="w-10 h-10 text-destructive/80" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                Failed to Load Report Card
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {error instanceof Error
                  ? error.message
                  : 'An error occurred while fetching the official transcript.'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {!isReportLoading && !isReportError && reportCard && (
          <div className="pt-2">
            <OfficialReportCardDocument reportCard={reportCard} />
          </div>
        )}

        {!isReportLoading && !isReportError && !reportCard && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground min-h-[200px]">
            <p className="text-sm">No report card data found for this student.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
