import { z } from 'zod';

export const studentScoreItemSchema = z
  .object({
    student_id: z.string().min(1, 'Student ID is required'),
    score: z
      .union([
        z.number().min(0, 'Score cannot be negative'),
        z.nan(),
        z.null(),
        z.undefined(),
      ])
      .optional()
      .nullable(),
    is_absent: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.is_absent) {
        return data.score === null || data.score === undefined || Number.isNaN(data.score);
      }
      return data.score !== null && data.score !== undefined && !Number.isNaN(data.score);
    },
    {
      message: 'Score must be empty when student is absent, and a valid number when present',
      path: ['score'],
    }
  );

export const examSubjectConfigSchema = z
  .object({
    subject_id: z.string().min(1, 'Subject is required'),
    full_mark: z
      .number({ message: 'Full mark is required' })
      .positive('Full mark must be positive')
      .max(1000, 'Full mark cannot exceed 1000'),
    pass_mark: z
      .number({ message: 'Pass mark is required' })
      .nonnegative('Pass mark cannot be negative'),
    assigned_teacher_id: z.string().optional().nullable(),
  })
  .refine((data) => data.pass_mark <= data.full_mark, {
    message: 'Pass mark cannot be greater than full mark',
    path: ['pass_mark'],
  });

export const examCreateSchema = z.object({
  name: z.string().trim().min(2, 'Exam name must be at least 2 characters').max(100, 'Exam name is too long'),
  class_id: z.string().min(1, 'Class selection is required'),
  academic_term: z.string().trim().max(50).optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  subjects: z.array(examSubjectConfigSchema).min(1, 'At least one subject must be configured for the exam'),
});

export type StudentScoreItemForm = z.infer<typeof studentScoreItemSchema>;
export type ExamSubjectConfigForm = z.infer<typeof examSubjectConfigSchema>;
export type ExamCreateForm = z.infer<typeof examCreateSchema>;
