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

