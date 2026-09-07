import React from 'react';
import { Baby, Users, AlertCircle, BookOpen, Hash } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useParentChildren } from '../hooks';
import type { ParentChildDTO } from '../types';

const RELATIONSHIP_LABELS: Record<string, string> = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  GUARDIAN: 'Guardian',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: 'Active', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  TRANSFERRED: { label: 'Transferred', class: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  GRADUATED: { label: 'Graduated', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  SUSPENDED: { label: 'Suspended', class: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' },
};

export const MyChildrenPage: React.FC = () => {
  const { user, activeTenantId } = useAuth();
  const { isParent } = usePermission();

  const {
    data: children = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useParentChildren(activeTenantId, user?.id ?? null);

  // Guard: only parents should see this page
  if (!isParent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3 p-6">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-sm font-semibold text-foreground">Access Restricted</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Only parents can view this page. Switch to a parent persona to see your linked children.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Baby className="w-5 h-5 text-primary" />
            My Children
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Students linked to your account through the parent-student ReBAC mapping.
          </p>
        </div>

        {/* Child count badge */}
        {!isLoading && (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            {children.length} {children.length === 1 ? 'Child' : 'Children'}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-destructive/30 bg-destructive/5 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-xs font-semibold text-destructive">Failed to load children</p>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            {(error as any)?.message || 'Could not load your linked children. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !isError && children.length === 0 && (
        <div className="flex flex-col items-center justify-center p-10 rounded-xl border border-dashed border-border bg-muted/20 text-center gap-3">
          <Baby className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-sm font-semibold text-foreground">No Children Linked Yet</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            No students have been linked to your parent account. Please contact your school administrator to link your enrolled children.
          </p>
        </div>
      )}

      {!isLoading && !isError && children.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {children.map((child) => (
            <ChildCard key={child.student_id} child={child} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ChildCardProps {
  child: ParentChildDTO;
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const fullName = [child.first_name, child.middle_name, child.last_name]
    .filter(Boolean)
    .join(' ');

  const classLabel = child.class_name || 'Class';
  const sectionLabel = child.section_name ? ` · Section ${child.section_name}` : '';

  const status = STATUS_LABELS[child.status] ?? {
    label: child.status,
    class: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="group relative rounded-xl border border-border/70 bg-card shadow-xs hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden">
      {/* Colored top accent bar */}
      <div className="h-1 w-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />

      <div className="p-5 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <span className="text-lg font-bold">
              {child.first_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground leading-tight">{fullName}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <BookOpen className="w-3 h-3" />
                {classLabel}{sectionLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Relationship badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
              {RELATIONSHIP_LABELS[child.relationship_type] ?? child.relationship_type}
            </span>

            {/* Student status */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.class}`}>
              ● {status.label}
            </span>
          </div>
        </div>

        {/* ID + info */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Hash className="w-3 h-3" />
            <span className="font-mono">{child.student_id.slice(0, 8)}…</span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            ReBAC-linked to your account
          </p>
        </div>
      </div>
    </div>
  );
};
