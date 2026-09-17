import React from 'react';
import { useAuth } from '@/auth/useAuth';
import { GraduatedStudentsTable } from '../components/GraduatedStudentsTable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, GraduationCap } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const AlumniPage: React.FC = () => {
  const { activeTenantId } = useAuth();

  if (!activeTenantId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Select a School Portal</h2>
          <p className="text-sm text-muted-foreground">
            You must switch to an active school tenant in order to view graduated student records.
          </p>
        </div>
        <Button asChild>
          <Link to="/tenants">View All Schools</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
              <Link to="/academic/students">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Student Roster
              </Link>
            </Button>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-xs font-medium text-muted-foreground">Alumni Directory</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Graduated Students & Alumni
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Historical records, graduation batches, and enrollment transcripts of graduated students.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Component */}
      <GraduatedStudentsTable tenantId={activeTenantId} />
    </div>
  );
};
