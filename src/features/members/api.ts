import { apiClient } from '@/api/client';
import type {
  TenantMember,
  TenantMemberCreateDTO,
  MemberRole,
  TeacherAssignmentDTO,
  ParentChildDTO,
  RegisteredUserSearchResult,
  AssignMemberPayload,
  ParentStudentLinkPayload,
  StudentParentDTO,
  ParentMappingDTO,
  ParentMappingFilters,
} from './types';

const ENDPOINT_BY_ROLE: Record<MemberRole, string> = {
  TEACHER: 'teacher',
  OFFICE_ADMIN: 'office-admin',
  PARENT: 'parent',
  ADMIN: 'admin/assign',
  SUPER_ADMIN: 'admin/assign',
};

export const membersApi = {
  getMembers: async (
    tenantId: string,
    roleFilter?: MemberRole | 'ALL'
  ): Promise<TenantMember[]> => {
    const params: Record<string, string> = {};
    if (roleFilter && roleFilter !== 'ALL') {
      params.role = roleFilter;
    }
    return apiClient.get(`/tenants/${tenantId}/members`, { params });
  },

  searchUserByPhone: async (
    tenantId: string,
    phone: string
  ): Promise<RegisteredUserSearchResult> => {
    return apiClient.get(`/tenants/${tenantId}/members/search-by-phone`, {
      params: { phone },
    });
  },

  assignMemberRole: async (
    tenantId: string,
    payload: AssignMemberPayload
  ): Promise<TenantMember> => {
    const segment = ENDPOINT_BY_ROLE[payload.role];
    const body: Record<string, string> = {};
    if (payload.phone) body.phone = payload.phone;
    if (payload.user_id) body.user_id = payload.user_id;

    return apiClient.post(`/tenants/${tenantId}/members/${segment}`, body);
  },

  createMember: async (
    tenantId: string,
    data: TenantMemberCreateDTO
  ): Promise<TenantMember> => {
    if (data.phone || data.user_id) {
      return membersApi.assignMemberRole(tenantId, {
        phone: data.phone,
        user_id: data.user_id,
        role: data.role,
      });
    }

    const segment = ENDPOINT_BY_ROLE[data.role];
    const payload = {
      first_name: data.first_name,
      middle_name: data.middle_name || null,
      last_name: data.last_name,
      email: data.email,
      ...(data.password ? { password: data.password } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
    };

    return apiClient.post(`/tenants/${tenantId}/members/${segment}`, payload);
  },

  assignRole: async (
    tenantId: string,
    userId: string,
    role: MemberRole
  ): Promise<TenantMember> => {
    return apiClient.post(`/tenants/${tenantId}/members/${userId}/role`, { role });
  },

  revokeRole: async (
    tenantId: string,
    userId: string,
    role: MemberRole
  ): Promise<boolean> => {
    await apiClient.delete(`/tenants/${tenantId}/members/${userId}/roles/${role}`);
    return true;
  },

  deleteMember: async (
    tenantId: string,
    userId: string,
    roles: MemberRole[]
  ): Promise<boolean> => {
    try {
      await apiClient.delete(`/tenants/${tenantId}/members/${userId}`);
      return true;
    } catch {
      await Promise.all(
        roles.map((r) =>
          apiClient.delete(`/tenants/${tenantId}/members/${userId}/roles/${r}`)
        )
      );
      return true;
    }
  },

  getTeacherAssignments: async (
    tenantId: string,
    teacherId: string
  ): Promise<TeacherAssignmentDTO[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/assignments`, {
      params: { teacher_id: teacherId },
    });
  },

  getParentChildren: async (
    tenantId: string,
    parentId: string
  ): Promise<ParentChildDTO[]> => {
    return apiClient.get(
      `/academic/tenants/${tenantId}/parents/${parentId}/children`
    );
  },

  linkParentToStudent: async (
    tenantId: string,
    payload: ParentStudentLinkPayload
  ): Promise<any> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/parents/link`,
      payload
    );
  },

  unlinkParentFromStudent: async (
    tenantId: string,
    parentId: string,
    studentId: string
  ): Promise<boolean> => {
    await apiClient.delete(
      `/academic/tenants/${tenantId}/parents/${parentId}/students/${studentId}`
    );
    return true;
  },

  /**
   * Unlink whichever parent is currently linked to a student — by student ID only.
   * Use this when you don't know or don't care about the parent_id.
   * Endpoint: DELETE /academic/tenants/{tenant_id}/students/{student_id}/parent
   */
  unlinkStudentParent: async (
    tenantId: string,
    studentId: string
  ): Promise<boolean> => {
    await apiClient.delete(
      `/academic/tenants/${tenantId}/students/${studentId}/parent`
    );
    return true;
  },

  /**
   * Fetch the single parent linked to a specific student.
   * Returns null when no parent is linked (strict single-parent model).
   * Endpoint: GET /academic/tenants/{tenant_id}/students/{student_id}/parent
   */
  getStudentParent: async (
    tenantId: string,
    studentId: string
  ): Promise<StudentParentDTO | null> => {
    try {
      return await apiClient.get<any, StudentParentDTO>(
        `/academic/tenants/${tenantId}/students/${studentId}/parent`
      );
    } catch {
      // Gracefully handle 404 (no parent linked) or missing endpoint
      return null;
    }
  },

  /**
   * List all student-parent mappings in the school with optional filters.
   * Used by the school-wide Parent Mappings management page.
   * Endpoint: GET /academic/tenants/{tenant_id}/parents/mappings
   */
  getParentMappings: async (
    tenantId: string,
    filters?: ParentMappingFilters
  ): Promise<ParentMappingDTO[]> => {
    const params: Record<string, string> = {};
    if (filters?.class_id) params.class_id = filters.class_id;
    if (filters?.section_id) params.section_id = filters.section_id;
    if (filters?.student_id) params.student_id = filters.student_id;
    if (filters?.parent_id) params.parent_id = filters.parent_id;
    try {
      return await apiClient.get<any, ParentMappingDTO[]>(
        `/academic/tenants/${tenantId}/parents/mappings`,
        { params }
      );
    } catch {
      return [];
    }
  },
};

