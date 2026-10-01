export type FeeCategory =
  | 'TUITION'
  | 'ADMISSION'
  | 'EXAM'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'LAB'
  | 'LIBRARY'
  | 'MISC';

export type FeeFrequency = 'ONE_TIME' | 'MONTHLY' | 'TERMWISE' | 'YEARLY';

export type BillStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'ESEWA'
  | 'KHALTI'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'POS_CARD'
  | 'OTHER';

export interface FeeStructure {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  class_id: string;
  class_name?: string;
  name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number | string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeeStructureCreateDTO {
  class_id: string;
  name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  description?: string;
}

export interface FeeStructureUpdateDTO {
  name?: string;
  fee_category?: FeeCategory;
  frequency?: FeeFrequency;
  amount?: number;
  description?: string;
  is_active?: boolean;
}

export interface StudentTransportProfile {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  student_id: string;
  student_name?: string;
  is_transport_applicable?: boolean;
  transport_fee?: number | string | null;
  reason?: string | null;
  is_active: boolean;
}

export type StudentDiscount = StudentTransportProfile;

export interface StudentTransportCreateDTO {
  student_id: string;
  is_transport_applicable?: boolean;
  transport_fee?: number | null;
  reason?: string;
}

export type StudentDiscountCreateDTO = StudentTransportCreateDTO;

export interface FeeItemInputDTO {
  fee_name: string;
  amount: number;
  fee_structure_id?: string;
}

export interface BatchBillGenerateDTO {
  class_id: string;
  section_id?: string;
  billing_month?: string;
  fee_structure_ids: string[];
  due_date: string;
  notes?: string;
}

export interface SingleBillGenerateDTO {
  student_id: string;
  billing_month?: string;
  bill_title?: string;
  fee_items: FeeItemInputDTO[];
  due_date: string;
  notes?: string;
}

export interface FeeBillItem {
  id: string;
  fee_structure_id?: string | null;
  fee_name: string;
  amount: number | string;
}

export interface FeeBill {
  id: string;
  tenant_id: string;
  bill_number: string;
  student_id: string;
  student_name?: string;
  class_id: string;
  class_name?: string;
  academic_year_id: string;
  bill_title: string;
  billing_month?: string | null;
  issue_date: string;
  due_date: string;
  subtotal_amount: number | string;
  previous_due_amount: number | string;
  total_payable: number | string;
  paid_amount: number | string;
  due_amount: number | string;
  status: BillStatus;
  notes?: string | null;
  items: FeeBillItem[];
  created_at: string;
}

export interface BatchBillGenerateResponseDTO {
  generated_count: number;
  total_amount: number | string;
  bills: FeeBill[];
}

export interface FeePaymentCreateDTO {
  bill_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  payment_date?: string;
  remarks?: string;
}

export interface FeePayment {
  id: string;
  tenant_id: string;
  receipt_number: string;
  bill_id: string;
  bill_number?: string;
  student_id: string;
  student_name?: string;
  academic_year_id: string;
  amount_paid: number | string;
  payment_method: PaymentMethod;
  transaction_reference?: string | null;
  payment_date: string;
  received_by_name?: string | null;
  remarks?: string | null;
  created_at: string;
}

export interface ReceiptDocument {
  receipt_number: string;
  school_name: string;
  school_address?: string | null;
  school_phone?: string | null;
  school_email?: string | null;
  school_logo_url?: string | null;
  payment_date: string;
  student_name: string;
  class_name: string;
  section_name?: string | null;
  roll_number?: number | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  bill_title: string;
  bill_number: string;
  items: FeeBillItem[];
  subtotal_amount: number | string;
  previous_due_amount: number | string;
  total_payable: number | string;
  amount_paid: number | string;
  remaining_due: number | string;
  payment_method: string;
  transaction_reference?: string | null;
  received_by_name?: string | null;
  amount_in_words: string;
  remarks?: string | null;
}

export interface StudentLedgerResponse {
  student_id: string;
  student_name: string;
  class_name?: string;
  total_billed: number | string;
  total_paid: number | string;
  total_due: number | string;
  bills: FeeBill[];
  payments: FeePayment[];
}

export interface FinanceDashboardSummary {
  total_collected_month: number | string;
  total_collected_year: number | string;
  total_outstanding_dues: number | string;
  collection_rate_percent: number;
  total_defaulters_count: number;
  recent_payments: FeePayment[];
}

export interface FeeBillFilters {
  class_id?: string;
  student_id?: string;
  status?: string;
  billing_month?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface FeePaymentFilters {
  student_id?: string;
  payment_method?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
