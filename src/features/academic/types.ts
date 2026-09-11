export interface AcademicClass {
  id: string;
  tenant_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSection {
  id: string;
  tenant_id: string;
  class_id: string;
  name: string; // 'A', 'B', 'C'...
  created_at?: string;
  updated_at?: string;
  student_count?: number;
}

export interface AcademicStudent {
  id: string;
  tenant_id: string;
  class_id: string;
  section_id?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'GRADUATED' | 'SUSPENDED';
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSubject {
  id: string;
  tenant_id: string;
  class_id: string;
  name: string;
  code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SectionAddEligibility {
  can_add: boolean;
  next_section_name?: string | null;
  reason: string;
  current_students?: number;
  required_students?: number;
}

export interface ClassCreateDTO {
  name: string;
}

export interface ClassUpdateDTO {
  name: string;
}

export interface StudentCreateDTO {
  first_name: string;
  middle_name?: string;
  last_name: string;
}

export interface SubjectCreateDTO {
  name: string;
  code?: string;
}

export interface ClassWithDetails extends AcademicClass {
  sections: AcademicSection[];
  students: AcademicStudent[];
  subjects: AcademicSubject[];
}

export interface AcademicStats {
  totalClasses: number;
  totalSections: number;
  totalStudents: number;
  avgStudentsPerSection: number;
}

export interface TeacherAssignment {
  id: string;
  tenant_id: string;
  teacher_id: string;
  class_id: string;
  section_id?: string | null;
  subject_id?: string | null;
  is_class_teacher: boolean;
  teacher_name?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  subject_name?: string | null;
  created_at?: string;
}

export interface AssignTeacherDTO {
  teacher_id?: string;
  teacher_phone?: string;
  section_id?: string;
}


// ==========================================
// Parent-Teacher Link Interfaces
// ==========================================
export interface TeacherContactInfo {
  teacher_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface SubjectTeacherContactInfo {
  subject_id: string;
  subject_name: string;
  subject_code?: string | null;
  teacher_id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ChildTeachersResponse {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  relationship_type: string;
  class_teacher?: TeacherContactInfo | null;
  subject_teachers: SubjectTeacherContactInfo[];
}

export interface StudentParentContactInfo {
  parent_id: string;
  name: string;
  relationship_type: string;
  phone?: string | null;
  email?: string | null;
  is_primary_contact: boolean;
}

export interface TeacherStudentParentItem {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  status: string;
  is_class_teacher_for_student: boolean;
  subjects_taught: string[];
  parent?: StudentParentContactInfo | null;
}

export interface TeacherAssignedClassOption {
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  is_class_teacher: boolean;
  subjects: string[];
}

export interface TeacherStudentsParentsResponse {
  assigned_classes: TeacherAssignedClassOption[];
  students: TeacherStudentParentItem[];
  total_students: number;
  total_linked_parents: number;
}
