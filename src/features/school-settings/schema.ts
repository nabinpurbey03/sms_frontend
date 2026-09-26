import { z } from 'zod';

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const academicDaysSchema = z.object({
  academic_days: z
    .array(z.enum(WEEKDAYS))
    .min(1, 'Please select at least one academic day.'),
});

export type AcademicDaysFormData = z.infer<typeof academicDaysSchema>;

export const CALENDAR_EVENT_TYPES = [
  'HOLIDAY',
  'EXAM',
  'EVENT',
  'VACATION',
  'OTHER',
] as const;

export const calendarEventFormSchema = z
  .object({
    academic_year_id: z.string().min(1, 'Academic year is required'),
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    event_type: z.enum(CALENDAR_EVENT_TYPES),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date (YYYY-MM-DD) required'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date (YYYY-MM-DD) required'),
    is_holiday: z.boolean(),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .nullable(),
  })
  .refine((data) => data.start_date <= data.end_date, {
    message: 'Start date cannot be after end date',
    path: ['end_date'],
  });

export type CalendarEventFormData = z.infer<typeof calendarEventFormSchema>;
