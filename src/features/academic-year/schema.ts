import { z } from 'zod';

export const academicYearSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
}).refine((data) => {
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: "End date cannot be before start date",
  path: ["end_date"]
});

export type AcademicYearForm = z.infer<typeof academicYearSchema>;

export type RolloverAction = 'PROMOTE' | 'RETAIN' | 'TRANSFER' | 'GRADUATE';

export interface StudentRolloverOverride {
  student_id: string;
  action: RolloverAction;
}

export interface StudentPreviewItem {
  student_id: string;
  name: string;
  current_class_id: string;
  current_class_name: string;
  current_section_id?: string | null;
  current_section_name?: string | null;
  target_class_id?: string | null;
  target_class_name?: string | null;
  default_action: RolloverAction;
}

export interface ClassRolloverPreviewItem {
  class_id: string;
  class_name: string;
  sequence_order: number;
  target_class_id?: string | null;
  target_class_name?: string | null;
  total_students: number;
  students: StudentPreviewItem[];
}

export interface RolloverPreviewResponse {
  current_academic_year_id: string;
  current_academic_year_name: string;
  total_students: number;
  default_promoted: number;
  default_graduated: number;
  teacher_assignments_count: number;
  classes: ClassRolloverPreviewItem[];
}

export interface TenantAcademicYearRolloverRequest {
  name: string;
  start_date: string;
  end_date: string;
  copy_teacher_assignments: boolean;
  copy_student_facilities?: boolean;
  student_overrides?: StudentRolloverOverride[];
}

export interface TenantRolloverSummaryResponse {
  tenant_id: string;
  academic_year_id: string;
  academic_year_name: string;
  total_students_promoted: number;
  total_students_retained: number;
  total_students_transferred: number;
  total_students_graduated: number;
  teacher_assignments_copied: number;
  transport_profiles_carried_forward?: number;
  student_facilities_carried_forward?: number;
  empty_sections_count?: number;
  empty_sections?: Array<{
    section_id: string;
    section_name: string;
    class_name: string;
  }>;
}

export const tenantRolloverSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  copy_teacher_assignments: z.boolean(),
  copy_student_facilities: z.boolean(),
}).refine((data) => {
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: "End date cannot be before start date",
  path: ["end_date"]
});

export type TenantRolloverForm = z.infer<typeof tenantRolloverSchema>;
