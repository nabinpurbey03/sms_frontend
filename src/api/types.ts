export interface ApiSuccessResponse<T> {
  status: true;
  message: string;
  data: T;
  error: null;
}

export interface ApiErrorDetail {
  code: string;
  message?: string;
  details?: Record<string, unknown> | Array<unknown>;
  request_id?: string;
}

export interface ApiErrorResponse {
  status: false;
  message: string;
  data: null;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserMembershipDTO {
  tenant_id: string;
  tenant_name: string;
  roles: string[];
}

export interface UserProfileDTO {
  id: string;
  email: string;
  phone?: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  is_super_admin: boolean;
  is_active: boolean;
  memberships: UserMembershipDTO[];
}

export interface RegisterPayload {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  phone: string;
  email: string;
  password: string;
}
