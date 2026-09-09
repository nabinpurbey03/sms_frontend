import React from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, Download, Loader2, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OfficialReportCardDocument } from '../components/OfficialReportCardDocument';
import { useStudentReportCard, useDownloadReportCard } from '../hooks';

export const OfficialReportCardViewPage: React.FC = () => {
  const { tenantId, examId, studentId } = useParams({ strict: false }) as any;

  const { data: reportCard, isLoading, isError } = useStudentReportCard(tenantId, examId, studentId);
  const downloadMutation = useDownloadReportCard();

  // The download action is gated to approved exams (published_at indicates official approval)
  const isApproved = !!reportCard?.exam?.published_at;

  const handleDownload = () => {
    if (!reportCard || !tenantId || !examId || !studentId) return;

    downloadMutation.mutate({
      tenantId,
      examId,
      studentId,
      studentName: reportCard.student.name,
      examName: reportCard.exam.name,
    });
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
      {/* Top action bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/40 p-4 flex justify-between items-center shadow-sm">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="..">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-semibold gap-1 text-muted-foreground hidden sm:inline-flex">
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </Badge>

          <Button
            onClick={handleDownload}
            disabled={downloadMutation.isPending || !isApproved}
            className="gap-2 cursor-pointer"
          >
            {downloadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Report Card</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Report Card Live Preview Document Container */}
      <div className="flex-1 p-4 md:p-8 flex justify-center overflow-auto">
        <div className="w-full max-w-4xl bg-white shadow-xl ring-1 ring-black/5 rounded-2xl">
          <OfficialReportCardDocument reportCard={reportCard} />
        </div>
      </div>
    </div>
  );
};
