import { apiClient } from '@/api/client';
import type {
  FeeStructure,
  FeeStructureCreateDTO,
  FeeStructureUpdateDTO,
  FeeStructureBulkClassCreateDTO,
  FeeStructureBulkClassResponseDTO,
  FeeStructureCloneRequestDTO,
  FeeStructureCloneResponseDTO,
  StudentFeeAssignment,
  StudentFeeAssignmentCreateDTO,
  BulkStudentFeeAssignmentDTO,
  BulkStudentFeeAssignmentResponse,
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
  PaymentFilterParams,
  ReceiptDocument,
  ConsolidatedReceiptDocument,
  StudentLedgerResponse,
  FinanceDashboardSummary,
  FinanceClassOverview,
  ParentChildFeeSummary,
  QuarterlyWindowStatus,
  StudentWallet,
  StudentDuesBreakdown,
  LateFeeCalculation,
  AlumniClearanceItem,
  AlumniClearanceResponse,
  AlumniClearanceParams,
  RolloverFinancialAudit,
} from './types';

export type { PaymentFilterParams };


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
    params?: { class_id?: string; fee_level?: string; frequency?: string; is_active?: boolean }
  ): Promise<FeeStructure[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/fee-structures`, { params });
  },

  listStudentFeeAssignments: async (
    tenantId: string,
    params?: { student_id?: string; class_id?: string }
  ): Promise<StudentFeeAssignment[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/student-fees`, { params });
  },

  assignStudentFee: async (
    tenantId: string,
    data: StudentFeeAssignmentCreateDTO
  ): Promise<StudentFeeAssignment> => {
    return apiClient.post(`/finance/tenants/${tenantId}/student-fees`, data);
  },

  bulkAssignStudentFees: async (
    tenantId: string,
    data: BulkStudentFeeAssignmentDTO
  ): Promise<BulkStudentFeeAssignmentResponse> => {
    return apiClient.post(`/finance/tenants/${tenantId}/student-fees/bulk`, data);
  },

  removeStudentFee: async (tenantId: string, assignmentId: string): Promise<boolean> => {
    return apiClient.delete(`/finance/tenants/${tenantId}/student-fees/${assignmentId}`);
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

  bulkCreateClassFeeStructures: async (
    tenantId: string,
    data: FeeStructureBulkClassCreateDTO
  ): Promise<FeeStructureBulkClassResponseDTO> => {
    return apiClient.post(`/finance/tenants/${tenantId}/fee-structures/bulk-classes`, data);
  },

  cloneFeeStructures: async (
    tenantId: string,
    data: FeeStructureCloneRequestDTO
  ): Promise<FeeStructureCloneResponseDTO> => {
    return apiClient.post(`/finance/tenants/${tenantId}/fee-structures/clone-from-year`, data);
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

  getGeneratedMonths: async (tenantId: string, classId?: string | null): Promise<string[]> => {
    const params = classId ? { class_id: classId } : undefined;
    const res = (await apiClient.get(`/finance/tenants/${tenantId}/bills/generated-months`, { params })) as any;
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data)) return res.data;
    return [];
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

  getBillLateFee: async (
    tenantId: string,
    billId: string,
    asOfDate?: string
  ): Promise<LateFeeCalculation> => {
    return apiClient.get(`/finance/tenants/${tenantId}/bills/${billId}/late-fee`, {
      params: asOfDate ? { as_of_date: asOfDate } : undefined,
    });
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
    const queryParams: Record<string, any> = { ...params };
    if (params?.has_discount !== undefined) {
      queryParams.has_discount = params.has_discount ? 'true' : 'false';
    }
    const res = (await apiClient.get(`/finance/tenants/${tenantId}/payments`, { params: queryParams })) as any;
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

  getConsolidatedReceiptDocument: async (
    tenantId: string,
    identifier: string
  ): Promise<ConsolidatedReceiptDocument> => {
    return apiClient.get(`/finance/tenants/${tenantId}/receipts/consolidated/${identifier}`);
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

  getQuarterWindowStatus: async (
    tenantId: string,
    quarter: string
  ): Promise<QuarterlyWindowStatus> => {
    return apiClient.get(`/finance/tenants/${tenantId}/quarter-window-status`, {
      params: { quarter },
    });
  },

  getStudentWallet: async (
    tenantId: string,
    studentId: string
  ): Promise<StudentWallet> => {
    return apiClient.get(`/finance/tenants/${tenantId}/students/${studentId}/wallet`);
  },

  getStudentDuesBreakdown: async (
    tenantId: string,
    studentId: string,
    asOfDate?: string
  ): Promise<StudentDuesBreakdown> => {
    return apiClient.get(`/finance/tenants/${tenantId}/students/${studentId}/dues-breakdown`, {
      params: asOfDate ? { as_of_date: asOfDate } : undefined,
    });
  },

  getAlumniClearance: async (
    tenantId: string,
    params?: AlumniClearanceParams
  ): Promise<AlumniClearanceResponse> => {
    return apiClient.get(`/finance/tenants/${tenantId}/alumni-clearance`, { params });
  },

  getRolloverFinancialAudit: async (tenantId: string): Promise<RolloverFinancialAudit> => {
    return apiClient.get(`/finance/tenants/${tenantId}/rollover-financial-audit`);
  },
};

export const getRolloverFinancialAudit = financeApi.getRolloverFinancialAudit;

