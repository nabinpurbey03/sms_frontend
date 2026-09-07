import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  Shield,
  GraduationCap,
  HeartHandshake,
  BookOpen,
  Calendar,
  CheckCircle2,
  Users,
  Award,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import {
  useTeacherAssignments,
  useParentChildren,
  useUnlinkParentFromStudent,
} from '../hooks';
import type { TenantMember, ParentChildDTO } from '../types';
import { ParentStudentLinkDialog } from './ParentStudentLinkDialog';

interface MemberDetailDrawerProps {
  member: TenantMember | null;
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  onManageRoles: (member: TenantMember) => void;
}

export const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({
  member,
  isOpen,
  onClose,
  tenantId,
  onManageRoles,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'assignments' | 'children'>('profile');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [unlinkingChild, setUnlinkingChild] = useState<ParentChildDTO | null>(null);

  const isTeacher = member?.roles.includes('TEACHER') ?? false;
  const isParent = member?.roles.includes('PARENT') ?? false;

  const { data: teacherAssignments = [], isLoading: isLoadingAssignments } =
    useTeacherAssignments(tenantId, isTeacher && member ? member.user_id : null);

  const { data: parentChildren = [], isLoading: isLoadingChildren } =
    useParentChildren(tenantId, isParent && member ? member.user_id : null);

  const unlinkParentMutation = useUnlinkParentFromStudent();

  if (!member) return null;

  const fullName = [member.first_name, member.middle_name, member.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto p-0 gap-0">
        {/* Drawer Header */}
        <div className="p-6 border-b border-border/60 bg-muted/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  member.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'
                }`}
              />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Member Profile & ReBAC
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">{fullName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              User ID: <span className="font-mono text-[11px]">{member.user_id}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Quick Stats / Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {member.roles.map((r) => (
              <span
                key={r}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                {r.replace('_', ' ')}
              </span>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-5 border-b border-border/60 -mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>

            {isTeacher && (
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'assignments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Teaching ReBAC ({teacherAssignments.length})
              </button>
            )}

            {isParent && (
              <button
                type="button"
                onClick={() => setActiveTab('children')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'children'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                Children ReBAC ({parentChildren.length})
              </button>
            )}
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tab 1: Profile Overview */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Contact Card */}
              <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{member.phone || 'No phone number provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>
                      Enrolled:{' '}
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString()
                        : 'Active record'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    School Roles & Permissions
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onManageRoles(member);
                    }}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Shield className="w-3 h-3" />
                    Manage
                  </Button>
                </div>
                <div className="space-y-2">
                  {member.roles.map((role) => (
                    <div
                      key={role}
                      className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {role.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active in Tenant
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Teaching Assignments (ReBAC) */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Teacher Class & Subject Assignments
                </h4>
                <p className="text-xs text-muted-foreground">
                  Relationships determining which classes and subjects this teacher can view, grade, and record attendance for.
                </p>
              </div>

              {isLoadingAssignments ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 rounded-xl bg-muted" />
                  <div className="h-16 rounded-xl bg-muted" />
                </div>
              ) : teacherAssignments.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No Classes Assigned Yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    This teacher has not yet been assigned to any specific classes or subjects.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {teacherAssignments.map((asgn) => (
                    <div
                      key={asgn.id}
                      className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {asgn.class_name || 'Class'}{' '}
                            {asgn.section_name ? `· ${asgn.section_name}` : ''}
                          </p>
                          <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-3 h-3" />
                            {asgn.subject_name || 'General Instructor'}
                          </p>
                        </div>
                        {asgn.is_class_teacher && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Award className="w-3 h-3" />
                            Class Teacher
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Linked Children (ReBAC) */}
          {activeTab === 'children' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Linked Enrolled Children
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Parent-student mappings determining attendance and report card visibility.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsLinkDialogOpen(true)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Link Student
                </Button>
              </div>

              {isLoadingChildren ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 rounded-xl bg-muted" />
                </div>
              ) : parentChildren.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-3">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No Linked Children Found</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    No students have been linked to this parent account yet. Link enrolled students so the parent can view reports.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLinkDialogOpen(true)}
                    className="gap-1.5 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Link First Student
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {parentChildren.map((child) => {
                    const childName = [child.first_name, child.middle_name, child.last_name]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={child.student_id}
                        className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground">{childName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {child.class_name || 'Class'}{' '}
                              {child.section_name ? `· ${child.section_name}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              {child.relationship_type || 'Guardian'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setUnlinkingChild(child)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Unlink student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unlink Confirmation Dialog */}
        {unlinkingChild && (
          <Dialog open={!!unlinkingChild} onOpenChange={(open) => !open && setUnlinkingChild(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <DialogTitle className="text-base font-bold">Confirm Unlink Student</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to unlink{' '}
                  <strong className="text-foreground">
                    {[unlinkingChild.first_name, unlinkingChild.middle_name, unlinkingChild.last_name].filter(Boolean).join(' ')}
                  </strong>{' '}
                  from this parent guardian? The parent will immediately lose ReBAC access to this student&apos;s attendance and records.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkingChild(null)}
                  disabled={unlinkParentMutation.isPending}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!tenantId || !unlinkingChild) return;
                    await unlinkParentMutation.mutateAsync({
                      tenantId,
                      parentId: member.user_id,
                      studentId: unlinkingChild.student_id,
                    });
                    setUnlinkingChild(null);
                  }}
                  disabled={unlinkParentMutation.isPending}
                  className="text-xs gap-1.5 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {unlinkParentMutation.isPending ? 'Unlinking...' : 'Confirm Unlink'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Link Student Dialog */}
        <ParentStudentLinkDialog
          isOpen={isLinkDialogOpen}
          onClose={() => setIsLinkDialogOpen(false)}
          tenantId={tenantId}
          parent={{
            id: member.user_id,
            name: fullName,
            phone: member.phone,
          }}
        />

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border/60 bg-card flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
