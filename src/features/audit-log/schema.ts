export interface AuditLog {
  id: string;
  user_id: string;
  tenant_id: string;
  action: string;
  status: string;
  resource_type: string;
  ip_address: string;
  created_at: string;
  details: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total_records?: number;
    total?: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

export interface AuditLogQueryParams {
  page?: number;
  page_size?: number;
  action?: string;
  date_from?: string;
  date_to?: string;
}
