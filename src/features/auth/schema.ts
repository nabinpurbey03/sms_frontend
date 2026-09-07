import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(50, 'First name must not exceed 50 characters'),
    middle_name: z
      .string()
      .trim()
      .max(50, 'Middle name must not exceed 50 characters')
      .optional()
      .or(z.literal('')),
    last_name: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(50, 'Last name must not exceed 50 characters'),
    phone: z
      .string()
      .trim()
      .min(1, 'Mobile phone number is required')
      .regex(
        /^(98|97)\d{8}$/,
        'Please enter a valid 10-digit mobile number (starting with 98 or 97)'
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
