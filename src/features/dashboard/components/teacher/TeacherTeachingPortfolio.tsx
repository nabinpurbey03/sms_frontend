import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  UserCheck,
  CalendarCheck,
  Users,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import type { TeacherAssignmentResponse } from '@/features/academic/types';

export interface TeacherTeachingPortfolioProps {
  teacherAssignments: TeacherAssignmentResponse[];
  tenantId: string;
}

interface GroupedClassAssignment {
  classId: string;
  className: string;
  sectionId?: string | null;
  sectionName?: string | null;
  isClassTeacher: boolean;
  subjects: { id?: string | null; name: string }[];
}

export const TeacherTeachingPortfolio: React.FC<TeacherTeachingPortfolioProps> = ({
  teacherAssignments,
}) => {
  // Group assignments by class_id and section_id
  const groupedClasses = useMemo(() => {
    const map = new Map<string, GroupedClassAssignment>();

    for (const assignment of teacherAssignments) {
      if (!assignment.class_id) continue;
      const groupKey = `${assignment.class_id}_${assignment.section_id || 'all'}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          classId: assignment.class_id,
          className: assignment.class_name || 'Class',
          sectionId: assignment.section_id || null,
          sectionName: assignment.section_name || null,
          isClassTeacher: false,
          subjects: [],
        });
      }

      const item = map.get(groupKey)!;
      if (assignment.is_class_teacher) {
        item.isClassTeacher = true;
      }
      if (assignment.subject_name) {
        if (!item.subjects.some((s) => s.name.toLowerCase() === assignment.subject_name!.toLowerCase())) {
          item.subjects.push({
            id: assignment.subject_id,
            name: assignment.subject_name,
          });
        }
      }
    }

    // Sort so Class Teacher assignments come first, then sort by class name
    return Array.from(map.values()).sort((a, b) => {
      if (a.isClassTeacher && !b.isClassTeacher) return -1;
      if (!a.isClassTeacher && b.isClassTeacher) return 1;
      return a.className.localeCompare(b.className);
    });
  }, [teacherAssignments]);

  const totalSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const a of teacherAssignments) {
      if (a.subject_name) {
        set.add(a.subject_name.trim().toLowerCase());
      } else if (a.subject_id) {
        set.add(a.subject_id);
      }
    }
    return set.size;
  }, [teacherAssignments]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                My Teaching Portfolio & Classes
              </h2>
              <Badge variant="secondary" className="text-xs font-semibold">
                {groupedClasses.length} {groupedClasses.length === 1 ? 'Class' : 'Classes'} • {totalSubjects}{' '}
                {totalSubjects === 1 ? 'Subject' : 'Subjects'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Classes and curriculum subjects assigned to your teaching schedule
            </p>
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {groupedClasses.length === 0 ? (
        <Card className="border-dashed p-8 text-center bg-card/60 flex flex-col items-center justify-center space-y-3 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No Teaching Duties Assigned</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              You are not currently assigned to any classes or curriculum subjects. Check back once school administration assigns your teaching duties.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedClasses.map((group) => {
            const sectionDisplay = group.sectionName
              ? group.sectionName.toLowerCase().startsWith('section')
                ? group.sectionName
                : `Section ${group.sectionName}`
              : group.sectionId
                ? 'Assigned Section'
                : 'Class-wide';

            return (
              <Card
                key={`${group.classId}_${group.sectionId || 'all'}`}
                className="border-border/60 hover:border-purple-500/30 transition-all rounded-xl shadow-xs flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Class & Badges header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-bold text-foreground truncate">
                        {group.className}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground">
                        {sectionDisplay}
                      </p>
                    </div>

                    {group.isClassTeacher && (
                      <Badge variant="purple" className="text-xs font-semibold gap-1 shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                        Class Teacher
                      </Badge>
                    )}
                  </div>

                  {/* Subject Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>Curriculum Subjects</span>
                    </div>

                    {group.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {group.subjects.map((sub, idx) => (
                          <Badge
                            key={sub.id || idx}
                            variant="outline"
                            className="text-xs font-medium bg-muted/30 text-foreground gap-1 py-1 px-2.5"
                          >
                            <BookOpen className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            {sub.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Classroom supervision & pastoral duty
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                    {group.isClassTeacher && (
                      <Button
                        asChild
                        size="sm"
                        className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      >
                        <Link
                          to="/attendance/mark"
                          search={
                            {
                              classId: group.classId,
                              sectionId: group.sectionId || undefined,
                            } as any
                          }
                        >
                          <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                          Mark Attendance
                        </Link>
                      </Button>
                    )}

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium cursor-pointer"
                    >
                      <Link
                        to="/academic/classes/$classId"
                        params={{ classId: group.classId }}
                      >
                        <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        View Roster
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer ml-auto"
                    >
                      <Link to="/academic/subjects">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                        Curriculum Subjects
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
