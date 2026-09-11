import React, { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useMyTeacherAssignments } from '@/features/academic/hooks';
import { useDailyAttendanceStatus } from '../hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  UserCheck,
  GraduationCap,
  CalendarCheck,
  Edit3,
  CheckCircle2,
} from 'lucide-react';

export const MyAssignmentsPage: React.FC = () => {
  const { activeTenantId, user } = useAuth();
  const navigate = useNavigate();

  const { data: assignments = [], isLoading } = useMyTeacherAssignments(activeTenantId);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: dailyStatus } = useDailyAttendanceStatus(activeTenantId, todayStr, undefined, {
    enabled: !!activeTenantId,
  });
  const markedSectionIds = useMemo(() => {
    return new Set(dailyStatus?.marked_section_ids || []);
  }, [dailyStatus]);

  // Get class teacher assignments
  const classTeacherAssignments = assignments.filter(a => a.is_class_teacher);

  // Get subject teacher assignments
  const subjectTeacherAssignments = assignments.filter(a => !a.is_class_teacher);

  // Group subject assignments by class and section
  const subjectAssignmentsByClass = subjectTeacherAssignments.reduce((acc, assignment) => {
    const classId = assignment.class_id;
    if (!acc[classId]) {
      acc[classId] = {
        className: assignment.class_name || 'Unknown Class',
        classId,
        assignments: [],
      };
    }
    acc[classId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { className: string; classId: string; assignments: typeof assignments }>);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl border bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasNoAssignments = assignments.length === 0;

  return (
    <div className="space-y-6 pb-12">
      {hasNoAssignments ? (
        <Card className="border-dashed p-12 text-center space-y-3 bg-card/60">
          <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <div>
            <p className="text-base font-bold text-foreground">No Teaching Assignments</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              You haven't been assigned as a Class Teacher or Subject Teacher for any class yet.
              Contact your school administrator to assign your teaching duties.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 bg-card shadow-xs border-border/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Class Teacher Roles
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {classTeacherAssignments.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {classTeacherAssignments.length === 0
                      ? 'No class sections assigned'
                      : classTeacherAssignments.length === 1
                      ? '1 class section'
                      : `${classTeacherAssignments.length} class sections`}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-card shadow-xs border-border/70">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Subject Assignments
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {subjectTeacherAssignments.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {subjectTeacherAssignments.length === 0
                      ? 'No subjects assigned'
                      : subjectTeacherAssignments.length === 1
                      ? '1 subject'
                      : `${subjectTeacherAssignments.length} subjects`}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>

          {/* Class Teacher Sections */}
          {classTeacherAssignments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Class Teacher Duties
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {classTeacherAssignments.map(assignment => {
                  const isMarkedToday = assignment.section_id
                    ? markedSectionIds.has(assignment.section_id)
                    : false;

                  return (
                    <Card
                      key={assignment.id}
                      className={`p-4 bg-card shadow-xs flex flex-col justify-between ${
                        isMarkedToday ? 'border-emerald-500/20' : 'border-purple-500/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 rounded-lg ${
                                isMarkedToday ? 'bg-emerald-500/10' : 'bg-purple-500/10'
                              }`}
                            >
                              <UserCheck
                                className={`w-4 h-4 ${
                                  isMarkedToday
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-purple-600 dark:text-purple-400'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">
                                {assignment.class_name || 'Class'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {assignment.section_name
                                  ? `Section ${assignment.section_name}`
                                  : 'All Sections'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Badge
                            variant={isMarkedToday ? 'outline' : 'purple'}
                            className={`text-[10px] gap-1 ${
                              isMarkedToday
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                                : 'bg-purple-500/10 text-purple-700 border-purple-500/30'
                            }`}
                          >
                            {isMarkedToday ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <CalendarCheck className="w-3 h-3" />
                            )}
                            {isMarkedToday ? "Today's Attendance Recorded" : 'Can Mark Attendance'}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground">
                            {isMarkedToday
                              ? "Today's attendance has been submitted and can be updated anytime."
                              : 'You are the primary class teacher for this section.'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate({
                              to: '/attendance/mark',
                              search: {
                                classId: assignment.class_id,
                                sectionId: assignment.section_id,
                              } as any,
                            })
                          }
                          className={`w-full text-xs gap-1.5 cursor-pointer ${
                            isMarkedToday
                              ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10'
                              : 'border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10'
                          }`}
                        >
                          {isMarkedToday ? (
                            <Edit3 className="w-3.5 h-3.5" />
                          ) : (
                            <CalendarCheck className="w-3.5 h-3.5" />
                          )}
                          <span>{isMarkedToday ? "Update Today's Attendance" : "Mark Today's Attendance"}</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subject Assignments by Class */}
          {Object.keys(subjectAssignmentsByClass).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Subject Teaching Duties
                </h2>
              </div>
              <div className="space-y-4">
                {Object.values(subjectAssignmentsByClass).map(({ className, classId, assignments }) => (
                  <Card key={classId} className="p-4 bg-card shadow-xs border-border/70">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">{className}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignments.map(assignment => (
                        <Badge
                          key={assignment.id}
                          variant="default"
                          className="text-xs gap-1 px-2.5 py-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          {assignment.subject_name || 'Subject'}
                          {assignment.section_name && (
                            <span className="text-muted-foreground">
                              {' '}• Section {assignment.section_name}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Info Card */}
          <Card className="p-4 bg-muted/40 border-border/60">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <CalendarCheck className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Attendance Access</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  As a Class Teacher, you can mark daily attendance for your assigned sections.
                  Go to <strong>Mark Attendance</strong> to record student attendance.
                  Subject-only assignments do not grant attendance marking privileges.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
