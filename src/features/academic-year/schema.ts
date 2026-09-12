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
