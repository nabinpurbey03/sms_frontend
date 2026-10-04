import { z } from 'zod';

export const feeStructureFormSchema = z
  .object({
    fee_level: z.enum(['SCHOOL', 'CLASS', 'STUDENT']),
    class_id: z.string().optional().or(z.literal('')),
    class_ids: z.array(z.string()).optional(),
    is_bulk_class: z.boolean().optional().default(false),
    name: z
      .string()
      .trim()
      .min(2, 'Fee head name must be at least 2 characters')
      .max(100, 'Fee head name cannot exceed 100 characters'),
    fee_category: z.enum([
      'TUITION',
      'ADMISSION',
      'EXAM',
      'TRANSPORT',
      'HOSTEL',
      'CANTEEN',
      'COACHING',
      'LAB',
      'LIBRARY',
      'MANAGEMENT',
      'ACTIVITY',
      'SCHOLARSHIP',
      'MISC',
    ]),
    frequency: z.enum(['ONE_TIME', 'MONTHLY', 'TERMWISE', 'YEARLY']),
    amount: z
      .number({ message: 'Amount is required' })
      .positive('Fee amount must be greater than zero'),
    description: z.string().max(255).optional().or(z.literal('')),
    is_active: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.fee_level === 'CLASS') {
      if (data.is_bulk_class) {
        if (!data.class_ids || data.class_ids.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please select at least one class',
            path: ['class_ids'],
          });
        }
      } else {
        if (!data.class_id || data.class_id.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please select a class for class-level fee structures',
            path: ['class_id'],
          });
        }
      }
    }
  });

export type FeeStructureFormValues = z.infer<typeof feeStructureFormSchema>;
export type FeeStructureInputValues = z.input<typeof feeStructureFormSchema>;

export const studentFeeAssignmentSchema = z.object({
  student_id: z.string().min(1, 'Please select a student'),
  fee_structure_id: z.string().optional().nullable(),
  fee_name: z
    .string()
    .trim()
    .min(1, 'Fee head name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  fee_category: z.enum([
    'TUITION',
    'ADMISSION',
    'EXAM',
    'TRANSPORT',
    'HOSTEL',
    'CANTEEN',
    'COACHING',
    'LAB',
    'LIBRARY',
    'MANAGEMENT',
    'ACTIVITY',
    'SCHOLARSHIP',
    'MISC',
  ]),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'TERMWISE', 'YEARLY']),
  amount: z
    .number({ message: 'Amount is required' })
    .positive('Fee amount must be greater than zero'),
  notes: z.string().max(200).optional().or(z.literal('')),
});

export type StudentFeeAssignmentFormValues = z.infer<typeof studentFeeAssignmentSchema>;

export const bulkStudentFeeAssignmentSchema = z.object({
  student_ids: z.array(z.string()).min(1, 'Please select at least one student'),
  fee_structure_id: z.string().optional().nullable(),
  fee_name: z
    .string()
    .trim()
    .min(1, 'Fee name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  fee_category: z.enum([
    'TUITION',
    'ADMISSION',
    'EXAM',
    'TRANSPORT',
    'HOSTEL',
    'CANTEEN',
    'COACHING',
    'LAB',
    'LIBRARY',
    'MANAGEMENT',
    'ACTIVITY',
    'SCHOLARSHIP',
    'MISC',
  ]),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'TERMWISE', 'YEARLY']),
  amount: z
    .number({ message: 'Amount is required' })
    .positive('Amount must be greater than zero'),
  notes: z.string().max(200).optional().or(z.literal('')),
});

export type BulkStudentFeeAssignmentFormValues = z.infer<typeof bulkStudentFeeAssignmentSchema>;

export const studentTransportSchema = z.object({
  student_id: z.string().min(1, 'Please select a student'),
  is_transport_applicable: z.boolean().default(false),
  transport_fee: z.coerce
    .number()
    .min(0, 'Transport fee cannot be negative')
    .optional()
    .nullable(),
  reason: z
    .string()
    .max(100, 'Reason cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
});

export type StudentTransportFormValues = z.infer<typeof studentTransportSchema>;
export type StudentTransportInputValues = z.input<typeof studentTransportSchema>;

export const batchBillGenerateSchema = z.object({
  class_id: z.string().min(1, 'Please select a target class'),
  section_id: z.string().optional().or(z.literal('')),
  billing_month: z.string().min(1, 'Please select a billing month'),
  quarter: z.string().optional(),
  fee_structure_ids: z
    .array(z.string())
    .min(1, 'Select at least one fee head to invoice'),
  due_date: z.string().min(1, 'Due date is required'),
  notes: z.string().max(255).optional().or(z.literal('')),
  override_30_day_window: z.boolean().default(false),
  override_reason: z.string().optional(),
  ad_hoc_fee_name: z.string().optional().or(z.literal('')),
  ad_hoc_fee_amount: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
      return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(0, 'Amount cannot be negative').optional()),
});

export type BatchBillGenerateFormValues = z.infer<typeof batchBillGenerateSchema>;
export type BatchBillGenerateInputValues = z.input<typeof batchBillGenerateSchema>;

export const singleBillItemSchema = z.object({
  fee_name: z.string().trim().min(1, 'Fee item name is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  fee_structure_id: z.string().optional(),
});

export const singleBillGenerateSchema = z.object({
  student_id: z.string().min(1, 'Please select a student'),
  billing_month: z.string().optional().or(z.literal('')),
  bill_title: z.string().min(2, 'Bill title is required'),
  fee_items: z.array(singleBillItemSchema).min(1, 'At least one fee item is required'),
  due_date: z.string().min(1, 'Due date is required'),
  notes: z.string().max(255).optional().or(z.literal('')),
});

export type SingleBillGenerateFormValues = z.infer<typeof singleBillGenerateSchema>;

export const paymentCollectSchema = z.object({
  bill_id: z.string().min(1, 'Bill reference is required'),
  amount_paid: z
    .number({ message: 'Payment amount is required' })
    .positive('Payment amount must be greater than zero'),
  payment_method: z.enum([
    'CASH',
    'BANK_TRANSFER',
    'CHEQUE',
    'OTHER',
  ]),
  transaction_reference: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),
  payment_date: z.string().optional().or(z.literal('')),
  remarks: z.string().max(255).optional().or(z.literal('')),
  discount_type: z.enum(['NONE', 'PERCENT', 'FIXED']).default('NONE'),
  discount_rate: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
      return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(0).max(100).optional()),
  discount_amount: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
      return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(0).optional()),
  allow_excess_to_wallet: z.boolean().default(true),
  late_fee_paid: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
      return undefined;
    }
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(0).optional()),
  late_fee_waived: z.boolean().optional(),
});

export type PaymentCollectFormValues = z.infer<typeof paymentCollectSchema>;
export type PaymentCollectInputValues = z.input<typeof paymentCollectSchema>;

