import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { membersApi } from './api';
import type {
  TenantMember,
  TenantMemberCreateDTO,
  MemberRole,
  MemberStats,
  AssignMemberPayload,
  ParentStudentLinkPayload,
  ParentMappingFilters,
} from './types';

export const MEMBERS_QUERY_KEY = 'members';
export const TEACHER_ASSIGNMENTS_QUERY_KEY = 'teacher_assignments';
export const PARENT_CHILDREN_QUERY_KEY = 'parent_children';
export const STUDENT_PARENTS_QUERY_KEY = 'student_parents';
export const PARENT_MAPPINGS_QUERY_KEY = 'parent_mappings';

export const useMembers = (
  tenantId: string | null,
  roleFilter?: MemberRole | 'ALL'
) => {
  return useQuery({
    queryKey: [MEMBERS_QUERY_KEY, tenantId, roleFilter],
    queryFn: () => membersApi.getMembers(tenantId!, roleFilter),
    enabled: !!tenantId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useMemberStats = (members: TenantMember[] = []): MemberStats => {
  return useMemo(() => {
    let teachers = 0;
    let officeAdmins = 0;
    let parents = 0;
    let admins = 0;
    let active = 0;
    let inactive = 0;

    for (const m of members) {
      if (m.is_active) active++;
      else inactive++;

      if (m.roles.includes('TEACHER')) teachers++;
      if (m.roles.includes('OFFICE_ADMIN')) officeAdmins++;
      if (m.roles.includes('PARENT')) parents++;
      if (m.roles.includes('ADMIN')) admins++;
    }

    return {
      total: members.length,
      teachers,
      officeAdmins,
      parents,
      admins,
      active,
      inactive,
    };
  }, [members]);
};

const checkIsForbidden = (error: any): boolean => {
  return (
    error?.statusCode === 403 ||
    error?.isForbidden ||
    error?.code === 'FORBIDDEN' ||
    (typeof error?.message === 'string' &&
      (error.message.toLowerCase().includes('access denied') ||
        error.message.toLowerCase().includes('requires one of the following roles') ||
        error.message.toLowerCase().includes('forbidden')))
  );
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      data,
    }: {
      tenantId: string;
      data: TenantMemberCreateDTO;
    }) => membersApi.createMember(tenantId, data),
    onSuccess: (newMember, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
      toast.success('Member Added Successfully', {
        description: `${newMember.first_name} ${newMember.last_name} (${newMember.email}) has been enrolled as ${variables.data.role.replace('_', ' ')}.`,
      });
    },
    onError: (error: any) => {
      if (checkIsForbidden(error)) {
        toast.error('Permission Denied: School Admin Required', {
          description:
            'Only School Administrators (Principal) have permission to onboard Office Admin accounts. Office Admins can only onboard Teachers.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to Add Member', {
          description: error?.message || 'An unexpected error occurred while adding the school member.',
        });
      }
    },
  });
};

export const useAssignRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      role,
    }: {
      tenantId: string;
      userId: string;
      role: MemberRole;
    }) => membersApi.assignRole(tenantId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
      toast.success('Role Assigned', {
        description: `Role '${variables.role.replace('_', ' ')}' was granted successfully.`,
      });
    },
    onError: (error: any) => {
      if (checkIsForbidden(error)) {
        toast.error('Permission Denied: School Admin Required', {
          description:
            'Only School Administrators (Principal) have permission to grant or modify member roles. Office Admins cannot alter roles.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to Assign Role', {
          description: error?.message || 'Could not assign role to this member.',
        });
      }
    },
  });
};

export const useRevokeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      role,
    }: {
      tenantId: string;
      userId: string;
      role: MemberRole;
    }) => membersApi.revokeRole(tenantId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
      toast.success('Role Revoked', {
        description: `Role '${variables.role.replace('_', ' ')}' was revoked successfully.`,
      });
    },
    onError: (error: any) => {
      if (checkIsForbidden(error)) {
        toast.error('Permission Denied: School Admin Required', {
          description:
            'Only School Administrators (Principal) have permission to revoke member roles. Office Admins cannot alter roles.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to Revoke Role', {
          description: error?.message || 'Could not revoke role from this member.',
        });
      }
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      roles,
    }: {
      tenantId: string;
      userId: string;
      roles: MemberRole[];
    }) => membersApi.deleteMember(tenantId, userId, roles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
      toast.success('Member Removed', {
        description: 'User has been removed from this school tenant.',
      });
    },
    onError: (error: any) => {
      if (checkIsForbidden(error)) {
        toast.error('Permission Denied: School Admin Required', {
          description:
            'Only School Administrators (Principal) have permission to remove members. Office Admins cannot delete member accounts.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to Remove Member', {
          description: error?.message || 'Could not remove member from this school tenant.',
        });
      }
    },
  });
};

export const useTeacherAssignments = (tenantId: string | null, teacherId: string | null) => {
  return useQuery({
    queryKey: [TEACHER_ASSIGNMENTS_QUERY_KEY, tenantId, teacherId],
    queryFn: () => membersApi.getTeacherAssignments(tenantId!, teacherId!),
    enabled: !!tenantId && !!teacherId,
  });
};

export const ALL_MY_CHILDREN_QUERY_KEY = 'all_my_children';

export const useAllMyChildren = (enabled: boolean = true) => {
  return useQuery({
    queryKey: [ALL_MY_CHILDREN_QUERY_KEY],
    queryFn: () => membersApi.getAllMyChildren(),
    enabled,
  });
};

export const useParentChildren = (tenantId: string | null, parentId: string | null) => {
  return useQuery({
    queryKey: [PARENT_CHILDREN_QUERY_KEY, tenantId, parentId],
    queryFn: () => membersApi.getParentChildren(tenantId!, parentId!),
    enabled: !!tenantId && !!parentId,
  });
};

export const useSearchUserByPhone = () => {
  return useMutation({
    mutationFn: ({ tenantId, phone }: { tenantId: string; phone: string }) =>
      membersApi.searchUserByPhone(tenantId, phone),
  });
};

export const useAssignMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: AssignMemberPayload;
    }) => membersApi.assignMemberRole(tenantId, payload),
    onSuccess: (newMember, variables) => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
      const roleLabel = variables.payload.role.replace('_', ' ');
      toast.success('Member Role Assigned', {
        description: `${newMember.first_name} ${newMember.last_name} is now assigned as ${roleLabel} in this school.`,
      });
    },
    onError: (error: any) => {
      if (checkIsForbidden(error)) {
        toast.error('Permission Denied: Insufficient Privileges', {
          description:
            'You do not have permission to assign this role. Principal privileges required for Admin/Office Admin.',
          duration: 6000,
        });
      } else {
        toast.error('Role Assignment Failed', {
          description: error?.message || 'Could not assign role to user in this school.',
        });
      }
    },
  });
};

export const useLinkParentToStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: ParentStudentLinkPayload;
    }) => membersApi.linkParentToStudent(tenantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PARENT_CHILDREN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MEMBERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_PARENTS_QUERY_KEY] });
      toast.success('Parent-Student Link Established', {
        description: 'The student has been successfully linked to the parent guardian.',
      });
    },
    onError: (error: any) => {
      // 409 CONFLICT: student already has a linked parent (strict single-parent enforcement)
      if (error?.statusCode === 409 || error?.code === 'CONFLICT') {
        toast.error('Student Already Has a Linked Parent', {
          description: error?.message || 'Only one parent can be linked per student. Unlink the existing parent first.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to Link Student', {
          description: error?.message || 'An error occurred while creating parent-student mapping.',
        });
      }
    },
  });
};

export const useUnlinkParentFromStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      parentId,
      studentId,
    }: {
      tenantId: string;
      parentId: string;
      studentId: string;
    }) => membersApi.unlinkParentFromStudent(tenantId, parentId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PARENT_CHILDREN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_PARENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PARENT_MAPPINGS_QUERY_KEY] });
      toast.success('Student Unlinked', {
        description: 'The student has been unlinked from this parent.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Unlink Student', {
        description: error?.message || 'An error occurred while unlinking student.',
      });
    },
  });
};

/**
 * Unlink parent by student_id only (don't need parent_id).
 * The backend resolves and unlinks the active parent.
 */
export const useUnlinkStudentParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      studentId,
    }: {
      tenantId: string;
      studentId: string;
    }) => membersApi.unlinkStudentParent(tenantId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PARENT_CHILDREN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_PARENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PARENT_MAPPINGS_QUERY_KEY] });
      toast.success('Parent Unlinked', {
        description: 'The parent has been removed from this student.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Unlink Parent', {
        description: error?.message || 'An error occurred while unlinking the parent.',
      });
    },
  });
};

/**
 * Hook to fetch the single parent currently linked to a specific student.
 * Returns null when no parent is linked (strict single-parent model).
 * Used to display the existing parent in the Associate Parent dialog.
 */
export const useStudentParent = (tenantId: string | null, studentId: string | null) => {
  return useQuery({
    queryKey: [STUDENT_PARENTS_QUERY_KEY, tenantId, studentId],
    queryFn: () => membersApi.getStudentParent(tenantId!, studentId!),
    enabled: !!tenantId && !!studentId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to fetch all student-parent mappings in a school with optional filters.
 * Powers the school-wide Parent Mappings management table.
 */
export const useParentMappings = (
  tenantId: string | null,
  filters?: ParentMappingFilters
) => {
  return useQuery({
    queryKey: [PARENT_MAPPINGS_QUERY_KEY, tenantId, filters],
    queryFn: () => membersApi.getParentMappings(tenantId!, filters),
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });
};
