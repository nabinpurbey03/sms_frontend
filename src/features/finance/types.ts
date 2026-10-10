export type FeeCategory =
  | 'TUITION'
  | 'ADMISSION'
  | 'EXAM'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'CANTEEN'
  | 'COACHING'
  | 'LAB'
  | 'LIBRARY'
  | 'MANAGEMENT'
  | 'ACTIVITY'
  | 'SCHOLARSHIP'
  | 'MISC';

export type FeeLevel = 'SCHOOL' | 'CLASS' | 'STUDENT';

export type FeeFrequency = 'ONE_TIME' | 'MONTHLY' | 'TERMWISE' | 'YEARLY';

export type BillStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface FeeStructure {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  fee_level: FeeLevel;
  class_id?: string | null;
  class_name?: string | null;
  name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number | string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeeStructureCreateDTO {
  fee_level?: FeeLevel;
  class_id?: string | null;
  name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  description?: string;
}

export interface FeeStructureUpdateDTO {
  fee_level?: FeeLevel;
  class_id?: string | null;
  name?: string;
  fee_category?: FeeCategory;
  frequency?: FeeFrequency;
  amount?: number;
  description?: string;
  is_active?: boolean;
}

export interface FeeStructureBulkClassCreateDTO {
  class_ids: string[];
  name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  description?: string;
}

export interface FeeStructureBulkClassResponseDTO {
  total_processed: number;
  created_count: number;
  updated_count: number;
  reactivated_count: number;
  items: FeeStructure[];
}

export interface FeeStructureCloneRequestDTO {
  source_academic_year_id: string;
  target_academic_year_id?: string;
  percentage_increase?: number;
  round_to_nearest?: number;
  include_school_fees?: boolean;
  include_class_fees?: boolean;
  include_student_presets?: boolean;
}

export interface FeeStructureCloneResponseDTO {
  total_cloned: number;
  school_fees_cloned: number;
  class_fees_cloned: number;
  student_presets_cloned: number;
  skipped_existing: number;
  skipped_unmatched_classes: string[];
}


export interface StudentFeeAssignment {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  student_id: string;
  student_name?: string | null;
  class_name?: string | null;
  fee_structure_id?: string | null;
  fee_name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number | string;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StudentFeeAssignmentCreateDTO {
  student_id: string;
  fee_structure_id?: string | null;
  fee_name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  notes?: string | null;
}

export interface BulkStudentFeeAssignmentDTO {
  student_ids: string[];
  fee_structure_id?: string | null;
  fee_name: string;
  fee_category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  notes?: string | null;
}

export interface BulkStudentFeeAssignmentResponse {
  assigned_count: number;
  assignments: StudentFeeAssignment[];
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

export interface StudentTransportCreateDTO {
  student_id: string;
  is_transport_applicable?: boolean;
  transport_fee?: number | null;
  reason?: string;
}

export interface FeeItemInputDTO {
  fee_name: string;
  amount: number;
  fee_structure_id?: string;
}

export interface BatchBillGenerateDTO {
  class_id: string;
  section_id?: string;
  billing_month?: string;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | string;
  fee_structure_ids: string[];
  due_date: string;
  notes?: string;
  override_30_day_window?: boolean;
  override_reason?: string;
  ad_hoc_fee_name?: string;
  ad_hoc_fee_amount?: number;
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

export interface FeeBillPaymentSummary {
  id: string;
  receipt_number: string;
  amount_paid: number | string;
  payment_date: string;
  payment_method: string;
  transaction_reference?: string | null;
  created_at: string;
}

export interface PriorMonthDue {
  bill_id: string;
  bill_number: string;
  billing_month?: string;
  academic_year_name: string;
  due_amount: number | string;
}

export interface FeeBill {
  id: string;
  tenant_id: string;
  bill_number: string;
  student_id: string;
  student_name?: string;
  student_first_name?: string;
  student_middle_name?: string | null;
  student_last_name?: string;
  class_id: string;
  class_name?: string;
  academic_year_id: string;
  bill_title: string;
  billing_month?: string | null;
  quarter?: string | null;
  issue_date: string;
  due_date: string;
  subtotal_amount: number | string;
  previous_due_amount: number | string;
  advance_applied_amount?: number | string;
  total_payable: number | string;
  paid_amount: number | string;
  due_amount: number | string;
  discount_amount?: number | string;
  status: BillStatus;
  notes?: string | null;
  items: FeeBillItem[];
  payments?: FeeBillPaymentSummary[];
  prior_unpaid_months?: PriorMonthDue[];
  created_at: string;
}

export interface BatchBillGenerateResponseDTO {
  generated_count: number;
  total_amount: number | string;
  bills: FeeBill[];
}

export interface QuarterlyWindowStatus {
  quarter: string;
  quarter_name: string;
  start_date: string;
  end_date: string;
  window_open_date: string;
  days_until_window_open: number;
  is_window_open: boolean;
  can_generate: boolean;
}

export interface StudentWallet {
  student_id: string;
  academic_year_id: string;
  advance_balance: number | string;
}

export interface FeeBillSummaryItem {
  id: string;
  bill_number: string;
  bill_title: string;
  quarter?: string | null;
  academic_year_name: string;
  is_past_academic_year: boolean;
  is_past_quarter: boolean;
  total_payable: number | string;
  paid_amount: number | string;
  due_amount: number | string;
  status: string;
  issue_date: string;
  due_date: string;
}

export interface StudentDuesBreakdown {
  student_id: string;
  student_name: string;
  class_name?: string | null;
  past_academic_years_due: number | string;
  past_quarters_due: number | string;
  current_quarter_due: number | string;
  total_due: number | string;
  advance_wallet_balance: number | string;
  net_payable: number | string;
  unpaid_bills: FeeBillSummaryItem[];
}

export interface LateFeeCalculation {
  late_fee: number | string;
  overdue_days: number;
  grace_days: number;
  is_overdue: boolean;
  fee_type: string;
}

export interface FeePaymentCreateDTO {
  bill_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  payment_date?: string;
  remarks?: string;
  apply_waterfall?: boolean;
  discount_type?: 'NONE' | 'PERCENT' | 'FIXED' | string;
  discount_rate?: number;
  discount_amount?: number;
  allow_excess_to_wallet?: boolean;
  late_fee_paid?: number;
  late_fee_waived?: boolean;
}

export interface PaymentAllocation {
  payment_id: string;
  receipt_number: string;
  bill_id: string;
  bill_number: string;
  billing_month?: string | null;
  bill_title: string;
  amount_allocated: number | string;
  discount_amount?: number | string;
  remaining_due_after: number | string;
  status: string;
}

export interface FeePayment {
  id: string;
  tenant_id: string;
  receipt_number: string;
  payment_group_id?: string | null;
  bill_id: string;
  bill_number?: string;
  student_id: string;
  student_name?: string;
  academic_year_id: string;
  amount_paid: number | string;
  discount_type?: string;
  discount_rate?: number;
  discount_amount?: number;
  excess_amount?: number;
  late_fee_amount?: number | string;
  late_fee_waived?: boolean;
  advance_wallet_balance_after?: number;
  payment_method: PaymentMethod;
  transaction_reference?: string | null;
  payment_date: string;
  received_by_name?: string | null;
  remarks?: string | null;
  allocations?: PaymentAllocation[];
  is_consolidated?: boolean;
  total_transaction_amount?: number | string | null;
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
  billing_month?: string | null;
  items: FeeBillItem[];
  subtotal_amount: number | string;
  previous_due_amount: number | string;
  total_payable: number | string;
  amount_paid: number | string;
  discount_amount?: number | string;
  remaining_due: number | string;
  late_fee_amount?: number | string;
  late_fee_waived?: boolean;
  net_received?: number | string;
  payment_method: string;
  transaction_reference?: string | null;
  received_by_name?: string | null;
  amount_in_words: string;
  remarks?: string | null;
}

export interface ConsolidatedReceiptDocument {
  consolidated_receipt_number: string;
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
  payment_method: string;
  transaction_reference?: string | null;
  remarks?: string | null;
  received_by_name?: string | null;
  allocations: PaymentAllocation[];
  total_amount_paid: number | string;
  total_discount_amount?: number | string;
  amount_in_words: string;
  total_account_balance_remaining: number | string;
}

export interface StudentLedgerResponse {
  student_id: string;
  student_name: string;
  class_name?: string | null;
  total_billed: number | string;
  total_paid: number | string;
  total_due: number | string;
  total_discount?: number | string;
  bills: FeeBill[];
  payments: FeePayment[];
}

export interface FinanceDashboardSummary {
  total_collected_month: number | string;
  total_collected_year: number | string;
  total_outstanding_dues: number | string;
  total_opening_arrears?: number | string;
  total_alumni_dues?: number | string;
  is_new_session_unbilled?: boolean;
  collection_rate_percent: number;
  total_defaulters_count: number;
  recent_payments: FeePayment[];
  total_discount_year?: number | string;
  total_discount_month?: number | string;
  total_discounted_students_count?: number;
}

export interface FeeBillFilters {
  class_id?: string;
  student_id?: string;
  status?: string;
  billing_month?: string;
  search?: string;
  academic_year_id?: string;
  page?: number;
  page_size?: number;
}

export interface FeePaymentFilters {
  student_id?: string;
  payment_method?: string;
  has_discount?: boolean;
  search?: string;
  academic_year_id?: string;
  page?: number;
  page_size?: number;
}

export type PaymentFilterParams = FeePaymentFilters;


export interface FinanceClassSection {
  section_id: string;
  section_name: string;
  students_count: number;
}

export interface FinanceClassOverview {
  class_id: string;
  class_name: string;
  sequence_order: number;
  sections: FinanceClassSection[];
  students_count: number;
  fee_heads_count: number;
  monthly_tuition_total: number | string;
  transport_users_count: number;
}

export interface ParentChildFeeSummary {
  student_id: string;
  student_name: string;
  class_name: string;
  section_name?: string | null;
  total_payable: number | string;
  total_paid: number | string;
  outstanding_due: number | string;
  bills: FeeBill[];
}

export interface AlumniClearanceItem {
  student_id: string;
  admission_number?: string | null;
  roll_number?: string | null;
  first_name: string;
  last_name: string;
  graduation_academic_year_id?: string | null;
  graduation_academic_year_name?: string | null;
  graduation_class_id?: string | null;
  graduation_class_name?: string | null;
  total_billed: number | string;
  total_paid: number | string;
  total_due: number | string;
  clearance_status: 'CLEARED' | 'PENDING_CLEARANCE' | string;
  last_payment_date?: string | null;
}

export interface AlumniClearanceResponse {
  items: AlumniClearanceItem[];
  total_count: number;
  total_alumni_dues: number | string;
  cleared_count: number;
  pending_count: number;
}

export interface AlumniClearanceParams {
  search?: string;
  clearance_status?: string;
  academic_year_id?: string;
  page?: number;
  page_size?: number;
}

export interface RolloverFinancialAudit {
  outgoing_academic_year_id: string;
  outgoing_academic_year_name: string;
  total_billed: number | string;
  total_collected: number | string;
  total_outstanding_dues: number | string;
  collection_rate_percent: number;
  total_advance_wallet_balance: number | string;
  advance_wallet_students_count: number;
  chronic_defaulters_count: number;
  chronic_defaulters_due_amount: number | string;
  cancelled_bills_count: number;
  total_cancelled_amount: number | string;
  unreconciled_cheques_count: number;
  warnings: string[];
}


