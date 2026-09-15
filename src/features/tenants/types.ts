import { z } from 'zod';

export interface TenantAddress {
  id?: string;
  province: string;
  district: string;
  municipality: string;
  ward: number;
  tole?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain_name: string;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  address?: TenantAddress | null;
  created_at: string;
  updated_at: string;
}

export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TenantFilterParams {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  search?: string;
}

// Zod Validation Schemas
export const addressSchema = z.object({
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  ward: z.number().int().min(1, 'Ward must be a positive integer'),
  tole: z.string().optional().nullable(),
});

export const tenantFormSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters'),
  domain_name: z
    .string()
    .min(2, 'Domain slug must be at least 2 characters')
    .max(50, 'Domain slug must be at most 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Domain slug must contain only lowercase letters, numbers, and hyphens (e.g., springfield-high)'
    ),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(7, 'Invalid phone number format').optional().or(z.literal('')),
  is_active: z.boolean(),
  address: addressSchema.optional().nullable(),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;

export type TenantOnboardPayload =
  | {
      name: string;
      domain_name: string;
      email?: string | null;
      phone?: string | null;
      is_active?: boolean;
      address?: AddressFormData | null;
      admin_phone?: string | null;
    }
  | {
      tenant: TenantFormData;
      admin_phone?: string;
    };

export interface TenantOnboardResponse {
  tenant: Tenant;
  admin_assignment_status?: 'assigned' | 'pending_registration' | 'not_requested' | string;
  status?: string;
  invite_link?: string;
  admin_phone?: string;
}
