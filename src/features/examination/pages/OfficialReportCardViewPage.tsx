import React, { useRef } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, Printer, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfficialReportCardDocument } from '../components/OfficialReportCardDocument';
import { useStudentReportCard } from '../hooks';

export const OfficialReportCardViewPage: React.FC = () => {
  const { tenantId, examId, studentId } = useParams({ strict: false }) as any;
  const printRef = useRef<HTMLDivElement>(null);

  const { data: reportCard, isLoading, isError } = useStudentReportCard(tenantId, examId, studentId);

  const handlePrint = () => {
    if (!reportCard) return;

    const studentName = reportCard.student.name.trim().replace(/\s+/g, '_');
    const examName = reportCard.exam.name.trim().replace(/\s+/g, '_');
    const pdfTitle = `${studentName}_${examName}_Report_Card`;

    const originalTitle = document.title;
    document.title = pdfTitle;
    window.print();
    // Restore after a tick — browsers read title asynchronously
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !reportCard) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p>Failed to load the official report card. Please try again later.</p>
        </div>
        <Button variant="outline" asChild className="mt-4">
          <Link to="..">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top action bar - Hidden during print */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40 p-4 print:hidden flex justify-between items-center shadow-sm">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="..">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="gap-2 cursor-pointer">
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Report Card Document Container */}
      <div className="flex-1 p-4 md:p-8 flex justify-center overflow-auto print:p-0 print:block">
        <div ref={printRef} className="w-full max-w-4xl bg-white shadow-xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:w-full print:max-w-none">
          <OfficialReportCardDocument
            reportCard={reportCard}
          />
        </div>
      </div>
    </div>
  );
};
