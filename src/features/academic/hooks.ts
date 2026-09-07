import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicApi } from './api';
import type {
  ClassCreateDTO,
  ClassUpdateDTO,
  StudentCreateDTO,
  SubjectCreateDTO,
  ClassWithDetails,
  AcademicStudent,
  AssignTeacherDTO,
} from './types';

export const CLASSES_QUERY_KEY = 'academic_classes';
export const SECTIONS_QUERY_KEY = 'academic_sections';
export const STUDENTS_QUERY_KEY = 'academic_students';
export const SUBJECTS_QUERY_KEY = 'academic_subjects';
export const SECTION_ELIGIBILITY_KEY = 'section_eligibility';
export const ASSIGNMENTS_QUERY_KEY = 'academic_assignments';
export const MY_TEACHER_ASSIGNMENTS_QUERY_KEY = 'my_teacher_assignments';

export const useClasses = (tenantId: string | null) => {
  return useQuery({
    queryKey: [CLASSES_QUERY_KEY, tenantId],
    queryFn: () => academicApi.getClasses(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });
};

export const useClassSections = (tenantId: string | null, classId: string | null) => {
  return useQuery({
    queryKey: [SECTIONS_QUERY_KEY, tenantId, classId],
    queryFn: () => academicApi.getSections(tenantId!, classId!),
    enabled: !!tenantId && !!classId,
    staleTime: 1000 * 30,
  });
};

export const useClassStudents = (tenantId: string | null, classId: string | null) => {
  return useQuery({
    queryKey: [STUDENTS_QUERY_KEY, tenantId, classId],
    queryFn: () => academicApi.getStudents(tenantId!, classId!),
    enabled: !!tenantId && !!classId,
    staleTime: 1000 * 30,
  });
};

export const useClassSubjects = (tenantId: string | null, classId: string | null) => {
  return useQuery({
    queryKey: [SUBJECTS_QUERY_KEY, tenantId, classId],
    queryFn: () => academicApi.getSubjects(tenantId!, classId!),
    enabled: !!tenantId && !!classId,
    staleTime: 1000 * 30,
  });
};

export const useSectionEligibility = (tenantId: string | null, classId: string | null) => {
  return useQuery({
    queryKey: [SECTION_ELIGIBILITY_KEY, tenantId, classId],
    queryFn: () => academicApi.checkSectionEligibility(tenantId!, classId!),
    enabled: !!tenantId && !!classId,
  });
};

/**
 * Hook to fetch a single class with full details for the dedicated detail page.
 */
export const useClassWithDetails = (tenantId: string | null, classId: string | null) => {
  return useQuery<ClassWithDetails | null>({
    queryKey: ['academic_class_with_details', tenantId, classId],
    queryFn: async () => {
      const data = await academicApi.getClassWithDetails(tenantId!, classId!);
      return data;
    },
    enabled: !!tenantId && !!classId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to aggregate all classes with their sections and students.
 */
export const useAllClassesWithDetails = (tenantId: string | null) => {
  return useQuery({
    queryKey: [CLASSES_QUERY_KEY, 'detailed', tenantId],
    queryFn: async (): Promise<ClassWithDetails[]> => {
      if (!tenantId) return [];
      const classes = await academicApi.getClasses(tenantId);

      const detailed = await Promise.all(
        classes.map(async (cls) => {
          const [sections, students, subjects] = await Promise.all([
            academicApi.getSections(tenantId, cls.id),
            academicApi.getStudents(tenantId, cls.id),
            academicApi.getSubjects(tenantId, cls.id),
          ]);

          // Compute section student counts
          const sectionsWithCounts = sections.map((sec) => ({
            ...sec,
            student_count: students.filter((s) => s.section_id === sec.id && s.status === 'ACTIVE').length,
          }));

          return {
            ...cls,
            sections: sectionsWithCounts,
            students,
            subjects,
          };
        })
      );

      return detailed;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 20,
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: ClassCreateDTO }) =>
      academicApi.createClass(tenantId, data),
    onSuccess: (newClass) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      toast.success('Class Created', {
        description: `${newClass.name} provisioned with default Section A.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Create Class', {
        description: error.message || 'Could not create class.',
      });
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      data,
    }: {
      tenantId: string;
      classId: string;
      data: ClassUpdateDTO;
    }) => academicApi.updateClass(tenantId, classId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      toast.success('Class Renamed', {
        description: `Class is now '${updated.name}'.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Rename Class', {
        description: error.message || 'Could not update class.',
      });
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      hard = false,
    }: {
      tenantId: string;
      classId: string;
      hard?: boolean;
    }) => academicApi.deleteClass(tenantId, classId, hard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      toast.success('Class Deleted', {
        description: 'The class and associated sections have been removed.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Delete Class', {
        description: error.message || 'Could not delete class.',
      });
    },
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, classId }: { tenantId: string; classId: string }) =>
      academicApi.createSection(tenantId, classId),
    onSuccess: (newSection) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTION_ELIGIBILITY_KEY] });
      toast.success('Section Added', {
        description: `Section ${newSection.name} has been sequentially provisioned.`,
      });
    },
    onError: (error: any) => {
      toast.error('Cannot Add Section', {
        description: error.message || 'Eligibility criteria not met (20 students rule).',
      });
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      sectionId,
      hard = false,
    }: {
      tenantId: string;
      classId: string;
      sectionId: string;
      hard?: boolean;
    }) => academicApi.deleteSection(tenantId, classId, sectionId, hard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTION_ELIGIBILITY_KEY] });
      toast.success('Section Removed');
    },
    onError: (error: any) => {
      toast.error('Failed to Remove Section', {
        description: error.message || 'Could not delete section.',
      });
    },
  });
};

export const useAddStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      sectionId,
      data,
    }: {
      tenantId: string;
      classId: string;
      sectionId: string;
      data: StudentCreateDTO;
    }) => academicApi.addStudent(tenantId, classId, sectionId, data),
    onSuccess: (newStudent) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTION_ELIGIBILITY_KEY] });
      toast.success('Student Enrolled', {
        description: `${newStudent.first_name} ${newStudent.last_name} enrolled successfully.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Enroll Student', {
        description: error.message || 'Could not add student.',
      });
    },
  });
};

export const useBulkAddStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      sectionId,
      students,
    }: {
      tenantId: string;
      classId: string;
      sectionId: string;
      students: StudentCreateDTO[];
    }) => academicApi.bulkAddStudents(tenantId, classId, sectionId, students),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTION_ELIGIBILITY_KEY] });
      toast.success('Bulk Import Successful', {
        description: `Successfully enrolled ${res.count} student(s).`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Import Students', {
        description: error.message || 'Bulk import failed.',
      });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      studentId,
    }: {
      tenantId: string;
      classId: string;
      studentId: string;
    }) => academicApi.deleteStudent(tenantId, classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SECTION_ELIGIBILITY_KEY] });
      toast.success('Student Removed', {
        description: 'Student record has been removed from the roster.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Remove Student', {
        description: error.message || 'Could not delete student.',
      });
    },
  });
};

export const useUpdateStudentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      studentId,
      status,
    }: {
      tenantId: string;
      classId: string;
      studentId: string;
      status: AcademicStudent['status'];
    }) => academicApi.updateStudentStatus(tenantId, classId, studentId, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENTS_QUERY_KEY] });
      toast.success('Student Status Updated', {
        description: `Status changed to ${updated.status}.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Update Status', {
        description: error.message || 'Could not update student status.',
      });
    },
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      data,
    }: {
      tenantId: string;
      classId: string;
      data: SubjectCreateDTO;
    }) => academicApi.createSubject(tenantId, classId, data),
    onSuccess: (newSubject) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      toast.success('Subject Added', {
        description: `${newSubject.name} registered for this class.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Add Subject', {
        description: error.message || 'Could not register subject.',
      });
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      subjectId,
      hard = false,
    }: {
      tenantId: string;
      classId: string;
      subjectId: string;
      hard?: boolean;
    }) => academicApi.deleteSubject(tenantId, classId, subjectId, hard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      toast.success('Subject Deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to Delete Subject', {
        description: error.message || 'Could not delete subject.',
      });
    },
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      subjectId,
      data,
    }: {
      tenantId: string;
      classId: string;
      subjectId: string;
      data: { name?: string; code?: string };
    }) => academicApi.updateSubject(tenantId, classId, subjectId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      toast.success('Subject Updated', {
        description: `${updated.name} has been updated.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Update Subject', {
        description: error.message || 'Could not update subject.',
      });
    },
  });
};

export const useBulkCreateSubjects = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      subjects,
    }: {
      tenantId: string;
      classId: string;
      subjects: SubjectCreateDTO[];
    }) => academicApi.bulkCreateSubjects(tenantId, classId, subjects),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] });
      toast.success('Curriculum Imported', {
        description: `Successfully added ${res.count} subject(s).`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Import Subjects', {
        description: error.message || 'Could not import subjects.',
      });
    },
  });
};

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

export const useAssignments = (
  tenantId: string | null,
  params?: { teacher_id?: string; class_id?: string }
) => {
  return useQuery({
    queryKey: [ASSIGNMENTS_QUERY_KEY, tenantId, params],
    queryFn: () => academicApi.getAssignments(tenantId!, params),
    enabled: !!tenantId,
  });
};

export const useAssignClassTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      data,
    }: {
      tenantId: string;
      classId: string;
      data: AssignTeacherDTO;
    }) => academicApi.assignClassTeacher(tenantId, classId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY, tenantId] });
      toast.success('Class teacher appointed successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to appoint class teacher');
    },
  });
};

export const useAssignSubjectTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      subjectId,
      data,
    }: {
      tenantId: string;
      classId: string;
      subjectId: string;
      data: AssignTeacherDTO;
    }) => academicApi.assignSubjectTeacher(tenantId, classId, subjectId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY, tenantId] });
      toast.success('Subject teacher assigned successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to assign subject teacher');
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      assignmentId,
    }: {
      tenantId: string;
      assignmentId: string;
    }) => academicApi.deleteAssignment(tenantId, assignmentId),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [ASSIGNMENTS_QUERY_KEY, tenantId] });
      toast.success('Teacher assignment removed');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove assignment');
    },
  });
};

