import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useAssignments, useAllClassesWithDetails } from '@/features/academic/hooks';
import { useMarkAttendance } from '../hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarCheck,
  Check,
  X,
  AlertCircle,
  Calendar,
  Search,
  Loader2,
} from 'lucide-react';
import type { AcademicClass, AcademicSection } from '@/features/academic/types';

export const MarkAttendancePage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isTeacher } = usePermission();

  // Fetch all assignments for current user (if teacher, this shows only their assignments)
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useAssignments(activeTenantId);
  const { data: classesWithDetails = [], isLoading: classesLoading } = useAllClassesWithDetails(activeTenantId);

  // State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [recordDate, setRecordDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [presentStudentIds, setPresentStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const markAttendanceMutation = useMarkAttendance();

  // Determine which classes/sections user can mark attendance for
  const myClassTeacherAssignments = useMemo(() => {
    if (isTeacher) {
      // Teachers can only mark attendance for sections they're assigned as class teacher
      return allAssignments.filter(a => a.is_class_teacher);
    }
    // Admins/Office Admins can mark for any section
    return allAssignments; // Will filter by selected class/section
  }, [allAssignments, isTeacher]);

  // For teachers, get only their assigned class/sections
  const myAssignedClassIds = useMemo(() => {
    if (!isTeacher) return null; // Admin/Office Admin can access all
    return new Set(myClassTeacherAssignments.map(a => a.class_id));
  }, [myClassTeacherAssignments, isTeacher]);

  const myAssignedSectionIds = useMemo(() => {
    if (!isTeacher) return null;
    const sectionIds = new Set<string>();
    myClassTeacherAssignments.forEach(a => {
      if (a.section_id) sectionIds.add(a.section_id);
    });
    return sectionIds;
  }, [myClassTeacherAssignments, isTeacher]);

  // Get sections the current user can mark attendance for
  const accessibleSections = useMemo(() => {
    const sections: { class: AcademicClass; section: AcademicSection }[] = [];

    for (const cls of classesWithDetails) {
      // Skip classes not assigned to teacher
      if (isTeacher && myAssignedClassIds && !myAssignedClassIds.has(cls.id)) {
        continue;
      }

      for (const section of cls.sections) {
        // Skip sections not assigned to teacher
        if (isTeacher && myAssignedSectionIds && myAssignedSectionIds.size > 0 && !myAssignedSectionIds.has(section.id)) {
          // If teacher has specific section assignments, check those
          // If teacher has class-wide assignment (no section_id), allow all sections
          const hasSectionSpecific = myClassTeacherAssignments.some(
            a => a.section_id === section.id
          );
          const hasClassWide = myClassTeacherAssignments.some(
            a => a.class_id === cls.id && !a.section_id
          );
          if (!hasSectionSpecific && !hasClassWide) {
            continue;
          }
        }

        sections.push({ class: cls, section });
      }
    }
    return sections;
  }, [classesWithDetails, isTeacher, myAssignedClassIds, myAssignedSectionIds, myClassTeacherAssignments]);

  // Set default selection
  useEffect(() => {
    if (accessibleSections.length > 0 && !selectedSectionId) {
      setSelectedClassId(accessibleSections[0].class.id);
      setSelectedSectionId(accessibleSections[0].section.id);
    }
  }, [accessibleSections, selectedSectionId]);

  // Get selected class/section data
  const selectedClass = classesWithDetails.find(c => c.id === selectedClassId);
  const students = useMemo(() => {
    if (!selectedClass || !selectedSectionId) return [];
    return selectedClass.students.filter(s => s.section_id === selectedSectionId && s.status === 'ACTIVE');
  }, [selectedClass, selectedSectionId]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Check if user is class teacher for selected section
  const isClassTeacherForSelected = useMemo(() => {
    if (!isTeacher) return true; // Admins can always mark
    return myClassTeacherAssignments.some(
      a => a.class_id === selectedClassId &&
           (!a.section_id || a.section_id === selectedSectionId)
    );
  }, [isTeacher, myClassTeacherAssignments, selectedClassId, selectedSectionId]);

  // Handle marking attendance
  const handleMarkAllPresent = () => {
    setPresentStudentIds(new Set(students.map(s => s.id)));
  };

  const handleMarkAllAbsent = () => {
    setPresentStudentIds(new Set());
  };

  const toggleStudent = (studentId: string) => {
    const newSet = new Set(presentStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setPresentStudentIds(newSet);
  };

  const handleSubmit = async () => {
    if (!activeTenantId || !selectedClassId || !selectedSectionId) return;

    if (!recordDate) {
      return;
    }

    // Check future date
    const selectedDate = new Date(recordDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      return;
    }

    await markAttendanceMutation.mutateAsync({
      tenantId: activeTenantId,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      recordDate,
      presentStudentIds: Array.from(presentStudentIds),
    });

    // Reset after success
    setPresentStudentIds(new Set());
  };

  const isLoading = assignmentsLoading || classesLoading;

  // Check if user has any access
  const hasAccess = isTeacher ? myClassTeacherAssignments.length > 0 : can('MARK_ATTENDANCE');

  if (!hasAccess) {
    return (
      <div className="space-y-6 pb-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive/60" />
          <h2 className="text-lg font-bold text-foreground">No Attendance Access</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You don't have permission to mark attendance. Teachers can only mark attendance for sections where they are assigned as Class Teacher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Mark Daily Attendance
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isTeacher
                  ? 'You can only mark attendance for sections where you are the Class Teacher.'
                  : 'Mark student attendance for your school sections.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <Card className="p-4 bg-card shadow-xs border-border/70">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Attendance Date
            </label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-10"
            />
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
              }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="">Select a class...</option>
              {accessibleSections.map(({ class: cls }) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={!selectedClassId || isLoading}
            >
              <option value="">Select a section...</option>
              {accessibleSections
                .filter(({ class: cls }) => cls.id === selectedClassId)
                .map(({ section }) => (
                  <option key={section.id} value={section.id}>
                    Section {section.name} ({section.student_count ?? 0} students)
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Access Notice for Teachers */}
        {isTeacher && selectedClassId && !isClassTeacherForSelected && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You are not the Class Teacher for this section. Only the assigned Class Teacher can mark attendance.</span>
          </div>
        )}
      </Card>

      {/* Attendance Table */}
      {selectedSectionId && (
        <Card className="overflow-hidden bg-card shadow-xs border-border/70">
          {/* Table Header Actions */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {students.length} Active Students
              </span>
              <Badge variant={presentStudentIds.size === students.length ? 'success' : 'secondary'} className="text-xs">
                {presentStudentIds.size} Present
              </Badge>
              <Badge variant={presentStudentIds.size === 0 ? 'destructive' : 'secondary'} className="text-xs">
                {students.length - presentStudentIds.size} Absent
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-48 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                className="h-9 gap-1.5 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAbsent}
                className="h-9 gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                All Absent
              </Button>
            </div>
          </div>

          {/* Students Table */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No students match your search.' : 'No active students in this section.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                    <TableHead className="w-24 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => {
                    const fullName = [student.first_name, student.middle_name, student.last_name]
                      .filter(Boolean)
                      .join(' ');
                    const isPresent = presentStudentIds.has(student.id);

                    return (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {student.first_name[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {fullName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isPresent ? 'success' : 'destructive'}
                            className="text-xs gap-1"
                          >
                            {isPresent ? (
                              <>
                                <Check className="w-3 h-3" />
                                Present
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                Absent
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={isPresent ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleStudent(student.id)}
                            className="h-8 w-20 gap-1 text-xs"
                          >
                            {isPresent ? (
                              <>
                                <Check className="w-3 h-3" />
                                Marked
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                Absent
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Submit Footer */}
          <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {recordDate && (
                <span>
                  Marking attendance for{' '}
                  <span className="font-semibold text-foreground">
                    {new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </span>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={
                markAttendanceMutation.isPending ||
                !selectedSectionId ||
                students.length === 0 ||
                (isTeacher && !isClassTeacherForSelected)
              }
              className="gap-2"
            >
              {markAttendanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarCheck className="w-4 h-4" />
              )}
              Save Attendance
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!selectedSectionId && !isLoading && (
        <Card className="border-dashed p-12 text-center space-y-3 bg-card/60">
          <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <div>
            <p className="text-sm font-bold text-foreground">Select a Section</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose a class and section from the dropdowns above to start marking attendance.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
