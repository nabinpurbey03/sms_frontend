import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Baby,
  AlertCircle,
  BookOpen,
  Hash,
  Building2,
  GraduationCap,
  Award,
  School,
  RefreshCw,
  Check,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAllMyChildren, useParentChildren } from '../hooks';
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
  const { user, activeTenantId, activeTenantName, switchTenant, refreshProfile } = useAuth();
  const { isParent } = usePermission();
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Cross-school children query (returns all children across all enrolled schools)
  const {
    data: allChildren = [],
    isLoading: isLoadingAll,
    isError: isErrorAll,
    error: errorAll,
    refetch: refetchAll,
  } = useAllMyChildren(isParent);

  // 2. Single-tenant fallback query
  const {
    data: tenantChildren = [],
    isLoading: isLoadingTenant,
    refetch: refetchTenant,
  } = useParentChildren(activeTenantId, user?.id ?? null);

  // Prefer allChildren if available, fallback to single tenant children
  const children: ParentChildDTO[] = useMemo(() => {
    if (allChildren && allChildren.length > 0) return allChildren;
    return tenantChildren;
  }, [allChildren, tenantChildren]);

  const isLoading = isLoadingAll && isLoadingTenant;
  const isError = isErrorAll && children.length === 0;

  // Extract distinct schools from children
  const distinctSchools = useMemo(() => {
    const map = new Map<string, string>();
    children.forEach((c) => {
      const id = c.tenant_id || activeTenantId;
      const name = c.tenant_name || (c.tenant_id === activeTenantId ? activeTenantName : 'School');
      if (id && name) {
        map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [children, activeTenantId, activeTenantName]);

  // Filtered children based on active school filter tab
  const filteredChildren = useMemo(() => {
    if (selectedSchoolFilter === 'ALL') return children;
    return children.filter((c) => (c.tenant_id || activeTenantId) === selectedSchoolFilter);
  }, [children, selectedSchoolFilter, activeTenantId]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      await Promise.all([refetchAll(), refetchTenant()]);
      toast.success('Children Roster Refreshed', {
        description: 'Synchronized latest student records across all schools.',
      });
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

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
      {/* Top Header & Cross-School Refresh Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            <span>My Linked Children</span>
            <Badge variant="secondary" className="text-xs">
              {children.length} {children.length === 1 ? 'Pupil' : 'Pupils'}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground pt-0.5">
            View profiles, teacher directories, and academic performance for your enrolled children.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="gap-1.5 text-xs h-9 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh Links</span>
        </Button>
      </div>

      {/* Multi-School Filter Tabs (if children span multiple schools) */}
      {distinctSchools.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSchoolFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
              selectedSchoolFilter === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                : 'bg-card text-muted-foreground hover:text-foreground border-border'
            }`}
          >
            All Schools ({children.length})
          </button>
          {distinctSchools.map((s) => {
            const count = children.filter((c) => (c.tenant_id || activeTenantId) === s.id).length;
            const isSelected = selectedSchoolFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSchoolFilter(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                    : 'bg-card text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                <School className="h-3.5 w-3.5" />
                <span>{s.name}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Content Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-destructive/30 bg-destructive/5 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-xs font-semibold text-destructive">Failed to load children</p>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            {(errorAll as any)?.message || 'Could not load your linked children. Please try again.'}
          </p>
          <button
            onClick={() => handleRefreshAll()}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredChildren.length === 0 && (
        <div className="flex flex-col items-center justify-center p-10 rounded-xl border border-dashed border-border bg-muted/20 text-center gap-3">
          <Baby className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-sm font-semibold text-foreground">No Children Linked Yet</p>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            No students have been linked to your parent account in this school. If your child is enrolled, please have the school administrator link your registered phone number.
          </p>
        </div>
      )}

      {/* Children Cards Grid */}
      {!isLoading && !isError && filteredChildren.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredChildren.map((child) => (
            <ChildCard
              key={child.student_id}
              child={child}
              activeTenantId={activeTenantId}
              activeTenantName={activeTenantName}
              onSwitchTenant={switchTenant}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ChildCardProps {
  child: ParentChildDTO;
  activeTenantId: string | null;
  activeTenantName: string | null;
  onSwitchTenant: (tenantId: string) => void;
}

const ChildCard: React.FC<ChildCardProps> = ({
  child,
  activeTenantId,
  activeTenantName,
  onSwitchTenant,
}) => {
  const navigate = useNavigate();
  const childTenantId = child.tenant_id || activeTenantId;
  const childSchoolName =
    child.tenant_name ||
    (child.tenant_id === activeTenantId ? activeTenantName : 'Enrolled School') ||
    'School';
  const isCurrentSchool = !child.tenant_id || child.tenant_id === activeTenantId;

  const fullName = [child.first_name, child.middle_name, child.last_name]
    .filter(Boolean)
    .join(' ');

  const classLabel = child.class_name || 'Class';
  const sectionLabel = child.section_name ? ` · Section ${child.section_name}` : '';

  const status = STATUS_LABELS[child.status] ?? {
    label: child.status,
    class: 'bg-muted text-muted-foreground border-border',
  };

  const handleSwitchToSchool = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (childTenantId && !isCurrentSchool) {
      onSwitchTenant(childTenantId);
      toast.success(`Switched to ${childSchoolName}`, {
        description: `Active portal context updated to ${fullName}'s school.`,
      });
    }
  };

  const handleNavigateToTeacher = () => {
    if (childTenantId && !isCurrentSchool) {
      onSwitchTenant(childTenantId);
    }
    navigate({ to: '/academic/my-teachers' });
  };

  const handleNavigateToReports = () => {
    if (childTenantId && !isCurrentSchool) {
      onSwitchTenant(childTenantId);
    }
    navigate({
      to: '/academic/report-cards',
      search: { studentId: child.student_id } as any,
    });
  };

  return (
    <div
      className={`group relative rounded-xl border bg-card shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${
        isCurrentSchool ? 'border-border/80' : 'border-primary/40 bg-primary/[0.02]'
      }`}
    >
      {/* Colored top accent bar */}
      <div
        className={`h-1 w-full ${isCurrentSchool ? 'bg-primary/30' : 'bg-amber-500/50'}`}
      />

      <div className="p-5 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 font-bold text-lg">
            {child.first_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-bold text-foreground leading-tight truncate">{fullName}</p>
              {isCurrentSchool ? (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shrink-0"
                >
                  Active School
                </Badge>
              ) : (
                <button
                  type="button"
                  onClick={handleSwitchToSchool}
                  className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                  title="Switch to this child's school"
                >
                  <span>Switch</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                <BookOpen className="w-3 h-3" />
                {classLabel}{sectionLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                <School className="w-3 h-3 text-primary/70" />
                {childSchoolName}
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
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.class}`}
            >
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
          <p className="text-[10px] text-muted-foreground italic">ReBAC-linked</p>
        </div>

        {/* Action Buttons: Class Teacher & Report Cards */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleNavigateToTeacher}
            className="w-full text-xs font-semibold gap-1.5 hover:border-emerald-600/40 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Teacher</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleNavigateToReports}
            className="w-full text-xs font-semibold gap-1.5 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Reports</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
