# Teacher-Scoped Class Visibility & Class Teacher Today's Attendance Marking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope class visibility so teachers only see classes where they are assigned as a Class Teacher or Subject Teacher, and empower Class Teachers to mark today's attendance directly from class cards and the attendance page under backend ReBAC & ABAC rules.

**Architecture:** 
- Integrate the backend `GET /academic/tenants/{tenant_id}/teachers/my-assignments` endpoint to fetch the authenticated teacher's assigned classes, sections, and subjects.
- Filter `ClassesPage` and `ClassDetailPage` by teacher assignment IDs when `activeRole === 'TEACHER'`, annotating `ClassCard` with role badges (Class Teacher vs Subject Teacher).
- Provide a direct "Mark Today's Attendance" action on `ClassCard` and `ClassDetailPage` linking to `/attendance/mark?classId={id}&sectionId={id}`.
- Restructure `MarkAttendancePage` so teachers can only pick classes/sections where they are the designated Class Teacher, pre-selecting URL query parameters and restricting date selection to today (`record_date <= today`).

**Tech Stack:** React 19, TypeScript, TanStack Router, TanStack Query, Tailwind CSS v4, Lucide React, Axios, shadcn/ui.

**Spec:** Defined in user prompt, aligned with [BACKEND_ARCHITECTURE.md](file:///E:/PBAC/frontend/BACKEND_ARCHITECTURE.md) (ReBAC & ABAC attendance rules and teacher assignment endpoints).

## Global Constraints

- Never break existing Admin or Office Admin capabilities — Admins and Office Admins must continue seeing all classes, sections, and full school management controls.
- Strictly adhere to backend ReBAC: Teachers can only mark attendance if `is_class_teacher === true` for that section.
- Strictly adhere to backend ABAC: `record_date <= today` (future dates strictly rejected by backend; maximum past edit window 7 days).
- Never make unauthorized calls to `GET /academic/tenants/{tenant_id}/assignments` as a teacher (which throws 403 Forbidden). Use `GET /academic/tenants/{tenant_id}/teachers/my-assignments` for teachers.
- Keep TypeScript strictness intact and ensure `npm run lint` and `npm run build` pass with 0 errors.

---

### Task 1: API & React Query Hooks for Teacher-Scoped Assignments

**Files:**
- Modify: `src/features/academic/api.ts:215-257`
- Modify: `src/features/academic/hooks.ts:480-490`
- Modify: `src/features/attendance/api.ts:8-20`
- Modify: `src/features/attendance/hooks.ts:51-82`

**Interfaces:**
- Consumes: Backend endpoint `GET /api/v1/academic/tenants/{tenant_id}/teachers/my-assignments`
- Produces: 
  - `academicApi.getMyTeacherAssignments(tenantId: string): Promise<TeacherAssignment[]>`
  - `useMyTeacherAssignments(tenantId: string | null, options?: { enabled?: boolean })`
  - Fixed `attendanceApi.markSectionAttendance` return signature `{ total_marked_present: number; total_marked_absent: number; date: string }`
  - Fixed toast message in `useMarkAttendance` hook

- [ ] **Step 1: Add `getMyTeacherAssignments` in `academicApi` (`src/features/academic/api.ts`)**

Add method to `academicApi`:
```typescript
  // Get assignments for currently authenticated teacher
  getMyTeacherAssignments: async (
    tenantId: string
  ): Promise<TeacherAssignment[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/teachers/my-assignments`);
  },
```

- [ ] **Step 2: Add `useMyTeacherAssignments` query hook in `src/features/academic/hooks.ts`**

Export the query key and hook:
```typescript
export const MY_TEACHER_ASSIGNMENTS_QUERY_KEY = 'my_teacher_assignments';

export const useMyTeacherAssignments = (
  tenantId: string | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [MY_TEACHER_ASSIGNMENTS_QUERY_KEY, tenantId],
    queryFn: () => academicApi.getMyTeacherAssignments(tenantId!),
    enabled: !!tenantId && (options?.enabled ?? true),
    staleTime: 1000 * 30,
  });
};
```

- [ ] **Step 3: Update `attendanceApi.markSectionAttendance` and `useMarkAttendance`**

In `src/features/attendance/api.ts`:
```typescript
  markSectionAttendance: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    recordDate: string,
    presentStudentIds: string[]
  ): Promise<{ total_marked_present: number; total_marked_absent: number; date: string }> => {
    return apiClient.post(
      `/attendance/tenants/${tenantId}/classes/${classId}/sections/${sectionId}`,
      { present_student_ids: presentStudentIds },
      { params: { record_date: recordDate } }
    );
  },
```

In `src/features/attendance/hooks.ts`:
Update the `onSuccess` toast in `useMarkAttendance`:
```typescript
    onSuccess: (data, { recordDate, presentStudentIds }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      const count = data?.total_marked_present ?? presentStudentIds.length;
      toast.success('Attendance Recorded', {
        description: `${count} student(s) marked present for ${recordDate}`,
      });
    },
```

- [ ] **Step 4: Verify build with TypeScript compiler**

Run: `npm run build`
Expected: Passes with 0 errors.

---

### Task 2: ClassCard & ClassesPage Teacher-Scoped Visibility & Action

**Files:**
- Modify: `src/features/academic/components/ClassCard.tsx`
- Modify: `src/features/academic/pages/ClassesPage.tsx`

**Interfaces:**
- Consumes:
  - `useMyTeacherAssignments(activeTenantId, { enabled: isTeacherOnly })`
  - `useAllClassesWithDetails(activeTenantId)`
  - `activeRole` from `useAuth()`
- Produces:
  - Filtered class list when `activeRole === 'TEACHER'` and not admin
  - Role badges on `ClassCard`: "Class Teacher (Sec A)" and/or "Subject Teacher (Math, Science)"
  - Direct "Mark Today's Attendance" button on `ClassCard` for Class Teachers
  - Scoped KPI stats reflecting teacher's classes

- [ ] **Step 1: Enhance `ClassCardProps` and render role badges and attendance action in `ClassCard.tsx`**

In `src/features/academic/components/ClassCard.tsx`:
Add props to `ClassCardProps`:
```typescript
export interface TeacherClassScope {
  isClassTeacher: boolean;
  classTeacherSections: { id: string; name: string }[];
  isSubjectTeacher: boolean;
  subjectNames: string[];
}

interface ClassCardProps {
  cls: ClassWithDetails;
  canManage: boolean;
  teacherScope?: TeacherClassScope;
  onOpenDetails: (cls: ClassWithDetails) => void;
  onOpenDetailsPage: (clsId: string) => void;
  onAddSection: (cls: ClassWithDetails) => void;
  onEditClass: (cls: ClassWithDetails) => void;
  onDeleteClass: (cls: ClassWithDetails) => void;
  onMarkAttendance?: (clsId: string, sectionId?: string) => void;
}
```

In `ClassCard.tsx`:
1. If `teacherScope` is provided:
   - Render role badges beneath the class title:
     ```tsx
     {teacherScope && (
       <div className="flex flex-wrap items-center gap-1.5 pt-1">
         {teacherScope.isClassTeacher && (
           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
             <UserCheck className="w-3 h-3" />
             Class Teacher ({teacherScope.classTeacherSections.map(s => `Sec ${s.name}`).join(', ') || 'Class-wide'})
           </span>
         )}
         {teacherScope.isSubjectTeacher && teacherScope.subjectNames.length > 0 && (
           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
             <BookOpen className="w-3 h-3" />
             Subject: {teacherScope.subjectNames.slice(0, 2).join(', ')}
             {teacherScope.subjectNames.length > 2 && ` +${teacherScope.subjectNames.length - 2}`}
           </span>
         )}
       </div>
     )}
     ```
2. In the Card Footer (bottom):
   - If `teacherScope?.isClassTeacher`:
     ```tsx
     <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between gap-2">
       <Button
         size="sm"
         onClick={() => {
           const targetSecId = teacherScope.classTeacherSections[0]?.id;
           onMarkAttendance?.(cls.id, targetSecId);
         }}
         className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer h-8"
       >
         <CalendarCheck className="w-3.5 h-3.5" />
         <span>Mark Today's Attendance</span>
       </Button>

       <Button
         variant="ghost"
         size="sm"
         onClick={() => onOpenDetailsPage(cls.id)}
         className="text-xs gap-1 text-muted-foreground hover:text-foreground h-8"
       >
         <span>View Roster</span>
         <ArrowRight className="w-3.5 h-3.5" />
       </Button>
     </div>
     ```
   - If not class teacher, keep standard right-aligned "View Sections & Roster" button.

- [ ] **Step 2: Update `ClassesPage.tsx` to filter classes for teachers and pass scope**

In `src/features/academic/pages/ClassesPage.tsx`:
1. Import `useMyTeacherAssignments`:
   ```typescript
   import { useMyTeacherAssignments } from '../hooks';
   import { CalendarCheck, ShieldCheck } from 'lucide-react';
   ```
2. Determine `isTeacherOnly`:
   ```typescript
   const isTeacherOnly = activeRole === 'TEACHER' && !canManage;
   const { data: myTeacherAssignments = [], isLoading: isAssignmentsLoading } = useMyTeacherAssignments(
     activeTenantId,
     { enabled: isTeacherOnly }
   );
   ```
3. Compute assigned class IDs and class scopes:
   ```typescript
   const assignedClassIds = useMemo(() => {
     if (!isTeacherOnly) return null;
     return new Set(myTeacherAssignments.map((a) => a.class_id));
   }, [isTeacherOnly, myTeacherAssignments]);

   // Build per-class teacher scope lookup
   const teacherScopeByClassId = useMemo(() => {
     if (!isTeacherOnly) return new Map();
     const map = new Map();
     for (const a of myTeacherAssignments) {
       if (!map.has(a.class_id)) {
         map.set(a.class_id, {
           isClassTeacher: false,
           classTeacherSections: [],
           isSubjectTeacher: false,
           subjectNames: [],
         });
       }
       const scope = map.get(a.class_id);
       if (a.is_class_teacher) {
         scope.isClassTeacher = true;
         if (a.section_id) {
           scope.classTeacherSections.push({ id: a.section_id, name: a.section_name || 'A' });
         }
       } else if (a.subject_name) {
         scope.isSubjectTeacher = true;
         if (!scope.subjectNames.includes(a.subject_name)) {
           scope.subjectNames.push(a.subject_name);
         }
       }
     }
     return map;
   }, [isTeacherOnly, myTeacherAssignments]);
   ```
4. Filter classes:
   ```typescript
   const scopedClasses = useMemo(() => {
     if (!isTeacherOnly || !assignedClassIds) return classesWithDetails;
     return classesWithDetails.filter((c) => assignedClassIds.has(c.id));
   }, [classesWithDetails, isTeacherOnly, assignedClassIds]);

   // Compute Stats from scoped classes
   const stats: AcademicStats = useMemo(() => {
     const totalClasses = scopedClasses.length;
     let totalSections = 0;
     let totalStudents = 0;
     for (const c of scopedClasses) {
       totalSections += c.sections.length;
       totalStudents += c.students.length;
     }
     const avgStudentsPerSection =
       totalSections > 0 ? Math.round(totalStudents / totalSections) : 0;
     return { totalClasses, totalSections, totalStudents, avgStudentsPerSection };
   }, [scopedClasses]);

   // Filtered with search
   const filteredClasses = useMemo(() => {
     if (!searchQuery.trim()) return scopedClasses;
     const q = searchQuery.toLowerCase();
     return scopedClasses.filter(
       (c) =>
         c.name.toLowerCase().includes(q) ||
         c.sections.some((s) => s.name.toLowerCase().includes(q))
     );
   }, [scopedClasses, searchQuery]);
   ```
5. Add banner for teacher mode:
   If `isTeacherOnly`:
   ```tsx
   <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs">
     <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
     <span>
       <strong>Teacher View:</strong> Displaying only classes where you are assigned as a Class Teacher or Subject Teacher.
     </span>
   </div>
   ```
6. In `ClassCard` mapping:
   Pass `teacherScope={teacherScopeByClassId.get(cls.id)}` and `onMarkAttendance={(clsId, secId) => navigate({ to: '/attendance/mark', search: { classId: clsId, sectionId: secId } as any })}`.

- [ ] **Step 3: Verify with `npm run build`**

Run: `npm run build`
Expected: Passes with 0 errors.

---

### Task 3: ClassDetailPage Teacher Guard, Tab Restrictions & Attendance Action

**Files:**
- Modify: `src/features/academic/pages/ClassDetailPage.tsx`

**Interfaces:**
- Consumes:
  - `useMyTeacherAssignments(tenantId, { enabled: isTeacherOnly })`
  - `canManage`
  - `cls` from `useClassWithDetails`
- Produces:
  - Guard: If teacher is not assigned to this class, render an unauthorized/not-assigned message with a "Back to Classes" button.
  - Guard `useAssignments`: Only fetch `useAssignments` when `canManage` is true (prevents 403 Forbidden errors).
  - Prominent "Mark Today's Attendance" button in header if teacher is designated Class Teacher for this class.
  - Hide/restrict `assignments` and `expansion` tabs for non-admin teachers.

- [ ] **Step 1: Update `ClassDetailPage.tsx`**

1. Import `useMyTeacherAssignments` and `CalendarCheck`.
2. Determine teacher status:
   ```typescript
   const isTeacherOnly = activeRole === 'TEACHER' && !canManage;
   const { data: myAssignments = [] } = useMyTeacherAssignments(tenantId, { enabled: isTeacherOnly });
   ```
3. Guard `useAssignments`:
   Change:
   ```typescript
   const { data: classAssignments = [] } = useAssignments(tenantId, { class_id: classId });
   ```
   To only run if `canManage`:
   `useAssignments(canManage ? tenantId : null, { class_id: classId })` so it is disabled for teachers.
4. Verify if teacher is assigned to this class:
   ```typescript
   const isTeacherAssignedToThisClass = useMemo(() => {
     if (!isTeacherOnly) return true;
     return myAssignments.some((a) => a.class_id === classId);
   }, [isTeacherOnly, myAssignments, classId]);

   // Check if teacher is Class Teacher for the current section or class
   const isClassTeacherForThisClass = useMemo(() => {
     if (!isTeacherOnly) return false;
     return myAssignments.some(
       (a) => a.class_id === classId && a.is_class_teacher && (!a.section_id || a.section_id === currentSection?.id)
     );
   }, [isTeacherOnly, myAssignments, classId, currentSection]);
   ```
5. If `isTeacherOnly && !isTeacherAssignedToThisClass && !isLoading`:
   Render:
   ```tsx
   <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
     <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
       <Lock className="w-7 h-7" />
     </div>
     <div className="space-y-1 max-w-md">
       <h2 className="text-xl font-bold text-foreground">Restricted Class Access</h2>
       <p className="text-xs sm:text-sm text-muted-foreground">
         You are not assigned as a Class Teacher or Subject Teacher for <strong>{cls?.name || 'this class'}</strong>.
       </p>
     </div>
     <Button onClick={handleBack} variant="outline" className="gap-2 text-xs">
       <ArrowLeft className="w-4 h-4" />
       Return to My Classes
     </Button>
   </div>
   ```
6. In Header:
   If `isClassTeacherForThisClass`:
   Render a prominent button:
   ```tsx
   <Button
     onClick={() => navigate({ to: '/attendance/mark', search: { classId: cls.id, sectionId: currentSection?.id } as any })}
     className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer text-xs"
   >
     <CalendarCheck className="w-4 h-4" />
     <span>Mark Today's Attendance {currentSection ? `(Sec ${currentSection.name})` : ''}</span>
   </Button>
   ```
7. In Navigation Tabs:
   Only render `assignments` tab if `canManage`.
   Only render `expansion` tab if `canManage`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Passes with 0 errors.

---

### Task 4: MarkAttendancePage ReBAC & ABAC Restructuring

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx`
- Modify: `src/features/attendance/pages/MyAssignmentsPage.tsx`

**Interfaces:**
- Consumes:
  - `useMyTeacherAssignments(activeTenantId)` when `isTeacher`
  - URL search params `?classId=xxx&sectionId=yyy`
  - `markSectionAttendance`
- Produces:
  - Reliable teacher assignment loading (no 403 Forbidden errors)
  - Class selector filtered to only Class Teacher classes
  - Section selector filtered to only Class Teacher sections
  - Date picker defaulted to today, maxed at today (rejecting future dates)
  - Pre-selection from URL search params

- [ ] **Step 1: Fix assignment fetching and query param handling in `MarkAttendancePage.tsx`**

1. Replace `useAssignments(activeTenantId)`:
   ```typescript
   const { data: adminAssignments = [], isLoading: adminAssignmentsLoading } = useAssignments(
     canManage ? activeTenantId : null
   );
   const { data: myTeacherAssignments = [], isLoading: teacherAssignmentsLoading } = useMyTeacherAssignments(
     activeTenantId,
     { enabled: isTeacher }
   );

   const assignments = isTeacher ? myTeacherAssignments : adminAssignments;
   const assignmentsLoading = isTeacher ? teacherAssignmentsLoading : adminAssignmentsLoading;
   ```
2. Read URL search params:
   ```typescript
   const searchParams = new URLSearchParams(window.location.search);
   const queryClassId = searchParams.get('classId') || '';
   const querySectionId = searchParams.get('sectionId') || '';
   ```
3. Initialize `selectedClassId` and `selectedSectionId` with URL query params or first accessible section.
4. Restrict accessible sections for Teachers:
   - Only include classes and sections where `is_class_teacher === true`!
   ```typescript
   const accessibleSections = useMemo(() => {
     const list: { class: AcademicClass; section: AcademicSection }[] = [];
     for (const cls of classesWithDetails) {
       for (const section of cls.sections) {
         if (isTeacher) {
           const isAssignedClassTeacher = myTeacherAssignments.some(
             (a) => a.class_id === cls.id && a.is_class_teacher && (!a.section_id || a.section_id === section.id)
           );
           if (!isAssignedClassTeacher) continue;
         }
         list.push({ class: cls, section });
       }
     }
     return list;
   }, [classesWithDetails, isTeacher, myTeacherAssignments]);
   ```
5. Enforce ABAC date constraints:
   - Default `recordDate`: `new Date().toISOString().split('T')[0]` (today in YYYY-MM-DD).
   - Input `max={new Date().toISOString().split('T')[0]}`.
   - Show a "Today" badge and quick "Reset to Today" button when another date is chosen.
   - If `recordDate > todayStr`, disable Submit button and display error.
6. Fix the react compiler / oxlint warning on line 108 by avoiding synchronous setState inside effect or deriving selection safely.

- [ ] **Step 2: Update `MyAssignmentsPage.tsx` to use `useMyTeacherAssignments`**

In `src/features/attendance/pages/MyAssignmentsPage.tsx`:
1. Use `useMyTeacherAssignments(activeTenantId)` instead of `useAssignments(activeTenantId)`.
2. In Class Teacher cards, add a direct button:
   ```tsx
   <Button
     size="sm"
     variant="outline"
     onClick={() => navigate({ to: '/attendance/mark', search: { classId: assignment.class_id, sectionId: assignment.section_id } as any })}
     className="text-xs gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 cursor-pointer"
   >
     <CalendarCheck className="w-3.5 h-3.5" />
     <span>Mark Today's Attendance</span>
   </Button>
   ```

- [ ] **Step 3: Verify build and lint**

Run: `npm run lint` and `npm run build`
Expected: 0 errors and reduced warnings.

---

### Task 5: End-to-End Verification & Walkthrough

**Files:**
- Output: `walkthrough.md`

- [ ] **Step 1: Run comprehensive build & lint validation**

Run: `npm run lint && npm run build`
Ensure no compilation errors, TypeScript errors, or regressions.

- [ ] **Step 2: Verify role matrix scenarios**

1. **Teacher with Class Teacher assignment**:
   - `ClassesPage`: Only shows classes assigned to them.
   - `ClassCard`: Shows "Class Teacher (Sec X)" badge and "Mark Today's Attendance" button.
   - Clicking "Mark Today's Attendance" opens `/attendance/mark?classId=...&sectionId=...` pre-selected with today's date.
2. **Teacher with Subject Teacher only assignment**:
   - `ClassesPage`: Only shows their subject classes.
   - `ClassCard`: Shows "Subject Teacher (Math)" badge without "Mark Today's Attendance" button.
   - `MarkAttendancePage`: Shows informative notice that only Class Teachers can mark attendance.
3. **Admin / Office Admin**:
   - `ClassesPage`: Shows ALL school classes and full management actions ("Create Class", "Add Section", "Rename", "Delete").
   - `MarkAttendancePage`: Can mark attendance for any class and section.

- [ ] **Step 3: Document walkthrough artifact**

Document changes, component flows, and verification evidence.
