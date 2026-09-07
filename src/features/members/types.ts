export type MemberRole = 'ADMIN' | 'OFFICE_ADMIN' | 'TEACHER' | 'PARENT' | 'SUPER_ADMIN';

export interface TenantMember {
  user_id: string;
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  roles: MemberRole[];
  is_active: boolean;
  created_at?: string;
  phone?: string | null;
}

export interface RegisteredUserSearchResult {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  is_active: boolean;
}

export interface AssignMemberPayload {
  phone?: string;
  user_id?: string;
  role: 'ADMIN' | 'OFFICE_ADMIN' | 'TEACHER' | 'PARENT';
}

export interface ParentStudentLinkPayload {
  parent_phone?: string;
  parent_id?: string;
  student_id: string;
  relationship_type: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER' | string;
  is_primary_contact?: boolean;
}

export interface TenantMemberCreateDTO {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  phone?: string;
  user_id?: string;
  role: 'ADMIN' | 'OFFICE_ADMIN' | 'TEACHER' | 'PARENT';
}

export interface TenantRoleAssignDTO {
  role: MemberRole;
}

export interface MemberFilterParams {
  search?: string;
  role?: MemberRole | 'ALL';
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
}

export interface MemberStats {
  total: number;
  teachers: number;
  officeAdmins: number;
  parents: number;
  admins: number;
  active: number;
  inactive: number;
}

export interface TeacherAssignmentDTO {
  id: string;
  tenant_id: string;
  teacher_id: string;
  class_id: string;
  class_name?: string;
  section_id?: string | null;
  section_name?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  is_class_teacher: boolean;
  created_at?: string;
}

export interface ParentChildDTO {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  class_id: string;
  class_name?: string;
  section_id?: string | null;
  section_name?: string | null;
  relationship_type: string;
  status: string;
}

/**
 * Represents the single parent linked to a student.
 *
 * With strict single-parent enforcement (uq_tenant_student_mapping_active),
 * each student can have at most ONE active parent mapping. This is the
 * single-object return type for `GET /students/{id}/parent`. The field is
 * `null` when the student has no linked parent.
 */
export interface StudentParentDTO {
  parent_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  relationship_type: string;
  is_primary_contact: boolean;
  linked_at?: string;
}

/**
 * Query filters for the bulk parent-mappings listing endpoint.
 * `GET /academic/tenants/{tenant_id}/parents/mappings`
 */
export interface ParentMappingFilters {
  class_id?: string;
  section_id?: string;
  student_id?: string;
  parent_id?: string;
}

/**
 * A single row in the parent-mappings table.
 * Used by the school-wide parent mapping management page.
 */
export interface ParentMappingDTO {
  id: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  class_name?: string;
  section_id?: string | null;
  section_name?: string | null;
  parent_id: string;
  parent_name: string;
  parent_phone?: string | null;
  parent_email?: string | null;
  relationship_type: string;
  is_primary_contact: boolean;
  linked_at?: string;
}
