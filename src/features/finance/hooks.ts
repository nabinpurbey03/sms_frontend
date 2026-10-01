import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { financeApi } from './api';
import type {
  FeeStructureCreateDTO,
  FeeStructureUpdateDTO,
  StudentTransportCreateDTO,
  BatchBillGenerateDTO,
  SingleBillGenerateDTO,
  FeeBillFilters,
  FeePaymentCreateDTO,
  FeePaymentFilters,
} from './types';

import { academicApi } from '@/features/academic/api';
import type { ClassWithDetails } from '@/features/academic/types';

export const FINANCE_DASHBOARD_KEY = 'finance_dashboard';
export const FEE_STRUCTURES_KEY = 'fee_structures';
export const STUDENT_TRANSPORTS_KEY = 'student-transports';
export const STUDENT_TRANSPORT_KEY = 'student-transport';
export const BILLS_KEY = 'finance_bills';
export const BILL_KEY = 'finance_bill';
export const PAYMENTS_KEY = 'finance_payments';
export const RECEIPT_KEY = 'finance_receipt';
export const STUDENT_LEDGER_KEY = 'student_ledger';
export const FINANCE_CLASS_OVERVIEW_KEY = 'finance_class_overview';
export const PARENT_CHILDREN_FEES_KEY = 'parent_children_fees';

// --- Query Hooks ---

/**
 * Hook to fetch aggregated class finance overview in a single call,
 * completely eliminating N+1 API cascades across classes, sections, and students.
 */
export const useFinanceClassOverview = (tenantId: string | null) => {
  return useQuery({
    queryKey: [FINANCE_CLASS_OVERVIEW_KEY, tenantId],
    queryFn: () => financeApi.getClassOverview(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook for parent read-only fee portal: fetches children's billing and dues summary.
 */
export const useParentChildrenFees = (tenantId: string | null) => {
  return useQuery({
    queryKey: [PARENT_CHILDREN_FEES_KEY, tenantId],
    queryFn: () => financeApi.getParentChildrenFees(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to fetch a single class with sections and students for finance class fee management
 * without querying curriculum subjects.
 */
export const useFinanceClassRoster = (tenantId: string | null, classId: string | null, academicYearId?: string | null) => {
  return useQuery<ClassWithDetails | null>({
    queryKey: ['finance_class_roster', tenantId, classId, academicYearId],
    queryFn: async () => {
      if (!tenantId || !classId) return null;
      const [classes, sections, students] = await Promise.all([
        academicApi.getClasses(tenantId, academicYearId),
        academicApi.getSections(tenantId, classId, academicYearId),
        academicApi.getStudents(tenantId, classId, academicYearId),
      ]);

      const cls = classes.find((c) => c.id === classId);
      if (!cls) return null;

      const sectionsWithCounts = sections.map((sec) => ({
        ...sec,
        student_count: students.filter((s) => s.section_id === sec.id && s.status === 'ACTIVE').length,
      }));

      return {
        ...cls,
        sections: sectionsWithCounts,
        students,
        subjects: [],
      };
    },
    enabled: !!tenantId && !!classId,
    staleTime: 1000 * 30,
  });
};

export const useFinanceDashboardSummary = (tenantId: string | null) => {
  return useQuery({
    queryKey: [FINANCE_DASHBOARD_KEY, tenantId],
    queryFn: () => financeApi.getDashboardSummary(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 30,
  });
};

export const useFeeStructures = (
  tenantId: string | null,
  params?: { class_id?: string; frequency?: string; is_active?: boolean }
) => {
  return useQuery({
    queryKey: [FEE_STRUCTURES_KEY, tenantId, params?.class_id, params?.frequency, params?.is_active],
    queryFn: () => financeApi.listFeeStructures(tenantId!, params),
    enabled: !!tenantId,
  });
};

export const useStudentTransports = (tenantId: string | null) => {
  return useQuery({
    queryKey: [STUDENT_TRANSPORTS_KEY, tenantId],
    queryFn: () => financeApi.listStudentTransports(tenantId!),
    enabled: !!tenantId,
  });
};

export const useStudentTransport = (tenantId: string | null, studentId: string | null) => {
  return useQuery({
    queryKey: [STUDENT_TRANSPORT_KEY, tenantId, studentId],
    queryFn: () => financeApi.getStudentTransport(tenantId!, studentId!),
    enabled: !!tenantId && !!studentId,
  });
};

export const useBills = (tenantId: string | null, params?: FeeBillFilters) => {
  return useQuery({
    queryKey: [
      BILLS_KEY,
      tenantId,
      params?.class_id,
      params?.student_id,
      params?.status,
      params?.billing_month,
      params?.search,
      params?.page,
      params?.page_size,
    ],
    queryFn: () => financeApi.listBills(tenantId!, params),
    enabled: !!tenantId,
  });
};

export const useBill = (tenantId: string | null, billId: string | null) => {
  return useQuery({
    queryKey: [BILL_KEY, tenantId, billId],
    queryFn: () => financeApi.getBill(tenantId!, billId!),
    enabled: !!tenantId && !!billId,
  });
};

export const usePayments = (tenantId: string | null, params?: FeePaymentFilters) => {
  return useQuery({
    queryKey: [
      PAYMENTS_KEY,
      tenantId,
      params?.student_id,
      params?.payment_method,
      params?.search,
      params?.page,
      params?.page_size,
    ],
    queryFn: () => financeApi.listPayments(tenantId!, params),
    enabled: !!tenantId,
  });
};

export const useReceiptDocument = (tenantId: string | null, paymentId: string | null) => {
  return useQuery({
    queryKey: [RECEIPT_KEY, tenantId, paymentId],
    queryFn: () => financeApi.getReceiptDocument(tenantId!, paymentId!),
    enabled: !!tenantId && !!paymentId,
  });
};

export const useStudentLedger = (tenantId: string | null, studentId: string | null) => {
  return useQuery({
    queryKey: [STUDENT_LEDGER_KEY, tenantId, studentId],
    queryFn: () => financeApi.getStudentLedger(tenantId!, studentId!),
    enabled: !!tenantId && !!studentId,
  });
};

// --- Mutation Hooks ---

export const useCreateFeeStructure = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FeeStructureCreateDTO) =>
      financeApi.createFeeStructure(tenantId!, data),
    onSuccess: () => {
      toast.success('Fee structure added successfully');
      queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [FINANCE_DASHBOARD_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create fee structure');
    },
  });
};

export const useUpdateFeeStructure = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      structureId,
      data,
    }: {
      structureId: string;
      data: FeeStructureUpdateDTO;
    }) => financeApi.updateFeeStructure(tenantId!, structureId, data),
    onSuccess: () => {
      toast.success('Fee structure updated successfully');
      queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to update fee structure');
    },
  });
};

export const useDeleteFeeStructure = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (structureId: string) =>
      financeApi.deleteFeeStructure(tenantId!, structureId),
    onSuccess: () => {
      toast.success('Fee structure deactivated');
      queryClient.invalidateQueries({ queryKey: [FEE_STRUCTURES_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to deactivate fee structure');
    },
  });
};

export const useSetStudentTransport = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StudentTransportCreateDTO) =>
      financeApi.setStudentTransport(tenantId!, data),
    onSuccess: () => {
      toast.success('Student transport profile updated');
      queryClient.invalidateQueries({ queryKey: [STUDENT_TRANSPORTS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_TRANSPORT_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_LEDGER_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save student transport profile');
    },
  });
};

export const useBatchGenerateBills = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchBillGenerateDTO) =>
      financeApi.generateBatchBills(tenantId!, data),
    onSuccess: (res) => {
      toast.success(`Generated ${res.generated_count} fee bills successfully!`);
      queryClient.invalidateQueries({ queryKey: [BILLS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [FINANCE_DASHBOARD_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate batch bills');
    },
  });
};

export const useSingleGenerateBill = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SingleBillGenerateDTO) =>
      financeApi.generateSingleBill(tenantId!, data),
    onSuccess: (bill) => {
      toast.success(`Bill ${bill.bill_number} generated successfully`);
      queryClient.invalidateQueries({ queryKey: [BILLS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [FINANCE_DASHBOARD_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_LEDGER_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate bill');
    },
  });
};

export const useCancelBill = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (billId: string) => financeApi.cancelBill(tenantId!, billId),
    onSuccess: () => {
      toast.success('Bill cancelled');
      queryClient.invalidateQueries({ queryKey: [BILLS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [FINANCE_DASHBOARD_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_LEDGER_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel bill');
    },
  });
};

export const useRecordPayment = (tenantId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FeePaymentCreateDTO) =>
      financeApi.recordPayment(tenantId!, data),
    onSuccess: (payment) => {
      toast.success(`Payment recorded! Receipt #${payment.receipt_number}`);
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [BILLS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [FINANCE_DASHBOARD_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [STUDENT_LEDGER_KEY, tenantId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to record payment');
    },
  });
};
