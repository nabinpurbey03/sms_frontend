import { apiClient } from '@/api/client';
import type {
  FeeStructure,
  FeeStructureCreateDTO,
  FeeStructureUpdateDTO,
  StudentTransportProfile,
  StudentTransportCreateDTO,
  BatchBillGenerateDTO,
  BatchBillGenerateResponseDTO,
  SingleBillGenerateDTO,
  FeeBill,
  FeeBillFilters,
  FeePayment,
  FeePaymentCreateDTO,
  FeePaymentFilters,
  ReceiptDocument,
  StudentLedgerResponse,
  FinanceDashboardSummary,
  FinanceClassOverview,
  ParentChildFeeSummary,
} from './types';

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
  };
}

export const financeApi = {
  getDashboardSummary: async (tenantId: string): Promise<FinanceDashboardSummary> => {
    return apiClient.get(`/finance/tenants/${tenantId}/dashboard-summary`);
  },

  listFeeStructures: async (
    tenantId: string,
    params?: { class_id?: string; frequency?: string; is_active?: boolean }
  ): Promise<FeeStructure[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/fee-structures`, { params });
  },

  createFeeStructure: async (
    tenantId: string,
    data: FeeStructureCreateDTO
  ): Promise<FeeStructure> => {
    return apiClient.post(`/finance/tenants/${tenantId}/fee-structures`, data);
  },

  updateFeeStructure: async (
    tenantId: string,
    structureId: string,
    data: FeeStructureUpdateDTO
  ): Promise<FeeStructure> => {
    return apiClient.put(`/finance/tenants/${tenantId}/fee-structures/${structureId}`, data);
  },

  deleteFeeStructure: async (tenantId: string, structureId: string): Promise<boolean> => {
    return apiClient.delete(`/finance/tenants/${tenantId}/fee-structures/${structureId}`);
  },

  setStudentTransport: async (
    tenantId: string,
    data: StudentTransportCreateDTO
  ): Promise<StudentTransportProfile> => {
    return apiClient.post(`/finance/tenants/${tenantId}/transport-profiles`, data);
  },

  listStudentTransports: async (tenantId: string): Promise<StudentTransportProfile[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/transport-profiles`);
  },

  getStudentTransport: async (
    tenantId: string,
    studentId: string
  ): Promise<StudentTransportProfile | null> => {
    return apiClient.get(`/finance/tenants/${tenantId}/students/${studentId}/transport`);
  },

  generateBatchBills: async (
    tenantId: string,
    data: BatchBillGenerateDTO
  ): Promise<BatchBillGenerateResponseDTO> => {
    return apiClient.post(`/finance/tenants/${tenantId}/bills/generate-batch`, data);
  },

  generateSingleBill: async (
    tenantId: string,
    data: SingleBillGenerateDTO
  ): Promise<FeeBill> => {
    return apiClient.post(`/finance/tenants/${tenantId}/bills/generate-single`, data);
  },

  listBills: async (
    tenantId: string,
    params?: FeeBillFilters
  ): Promise<PaginatedResult<FeeBill>> => {
    const res = (await apiClient.get(`/finance/tenants/${tenantId}/bills`, { params })) as any;
    if (res && res.meta) {
      return { items: res.data || [], meta: res.meta };
    }
    return {
      items: Array.isArray(res) ? res : res?.data || [],
      meta: { page: 1, page_size: 50, total_records: Array.isArray(res) ? res.length : 0, total_pages: 1 },
    };
  },

  getBill: async (tenantId: string, billId: string): Promise<FeeBill> => {
    return apiClient.get(`/finance/tenants/${tenantId}/bills/${billId}`);
  },

  cancelBill: async (tenantId: string, billId: string): Promise<boolean> => {
    return apiClient.delete(`/finance/tenants/${tenantId}/bills/${billId}`);
  },

  recordPayment: async (
    tenantId: string,
    data: FeePaymentCreateDTO
  ): Promise<FeePayment> => {
    return apiClient.post(`/finance/tenants/${tenantId}/payments`, data);
  },

  listPayments: async (
    tenantId: string,
    params?: FeePaymentFilters
  ): Promise<PaginatedResult<FeePayment>> => {
    const res = (await apiClient.get(`/finance/tenants/${tenantId}/payments`, { params })) as any;
    if (res && res.meta) {
      return { items: res.data || [], meta: res.meta };
    }
    return {
      items: Array.isArray(res) ? res : res?.data || [],
      meta: { page: 1, page_size: 50, total_records: Array.isArray(res) ? res.length : 0, total_pages: 1 },
    };
  },

  getReceiptDocument: async (
    tenantId: string,
    paymentId: string
  ): Promise<ReceiptDocument> => {
    return apiClient.get(`/finance/tenants/${tenantId}/payments/${paymentId}/receipt`);
  },

  getStudentLedger: async (
    tenantId: string,
    studentId: string
  ): Promise<StudentLedgerResponse> => {
    return apiClient.get(`/finance/tenants/${tenantId}/students/${studentId}/ledger`);
  },

  getClassOverview: async (tenantId: string): Promise<FinanceClassOverview[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/class-overview`);
  },

  getParentChildrenFees: async (tenantId: string): Promise<ParentChildFeeSummary[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/parents/me/children-fees`);
  },
};
