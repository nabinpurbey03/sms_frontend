import type { FeeBill, FeePayment } from '../types';
import { formatStudentFullName } from './cashierUtils';

/**
 * Escapes a cell value according to RFC 4180 standards:
 * - Null or undefined values produce an empty string.
 * - Values containing double quotes, commas, or line breaks are enclosed in quotes.
 * - Double quotes inside values are escaped by doubling them ("").
 */
export function escapeCsvCell(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) {
    return '';
  }
  const str = String(cell);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats monetary amounts as a fixed decimal string with 2 decimal places (e.g. 1500.00).
 */
export function formatAmount(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') {
    return '0.00';
  }
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

/**
 * Creates an RFC 4180 CSV blob with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility,
 * creates a temporary anchor, triggers browser download, and revokes the object URL.
 */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const csvBody = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports FeeBill records to a client-side CSV file.
 */
export function exportBillsToCsv(bills: FeeBill[], filename?: string): void {
  const exportFilename = filename || `bills-export-${new Date().toISOString().split('T')[0]}`;
  const headers = [
    'Bill Number',
    'Student Name',
    'Class',
    'Billing Month',
    'Bill Title',
    'Issue Date',
    'Due Date',
    'Subtotal (NPR)',
    'Previous Due (NPR)',
    'Total Payable (NPR)',
    'Paid Amount (NPR)',
    'Discount (NPR)',
    'Due Amount (NPR)',
    'Status',
  ];

  const rows: (string | number)[][] = bills.map((b) => {
    const studentDisplayName =
      formatStudentFullName(b) !== 'Student'
        ? formatStudentFullName(b)
        : (b.student_name?.trim() || 'Student');

    const totalPayable = Number(b.total_payable || 0);
    const paidAmount = Number(b.paid_amount || 0);
    const dueAmount = Number(b.due_amount || 0);
    const discount =
      b.discount_amount != null
        ? Number(b.discount_amount)
        : Math.max(0, totalPayable - paidAmount - dueAmount);

    return [
      b.bill_number ?? '',
      studentDisplayName,
      b.class_name ?? '',
      b.billing_month ?? '',
      b.bill_title ?? '',
      b.issue_date ?? '',
      b.due_date ?? '',
      formatAmount(b.subtotal_amount),
      formatAmount(b.previous_due_amount),
      formatAmount(b.total_payable),
      formatAmount(b.paid_amount),
      formatAmount(discount),
      formatAmount(b.due_amount),
      b.status ?? '',
    ];
  });

  downloadCsv(exportFilename, [headers, ...rows]);
}

/**
 * Exports FeePayment transaction records to a client-side CSV file.
 */
export function exportPaymentsToCsv(payments: FeePayment[], filename?: string): void {
  const exportFilename = filename || `transactions-export-${new Date().toISOString().split('T')[0]}`;
  const headers = [
    'Receipt Number',
    'Payment Date',
    'Student Name',
    'Bill Number',
    'Amount Paid (NPR)',
    'Discount (NPR)',
    'Discount Type',
    'Late Fee (NPR)',
    'Payment Method',
    'Transaction Reference',
    'Received By',
    'Remarks',
  ];

  const rows: (string | number)[][] = payments.map((p) => {
    return [
      p.receipt_number ?? '',
      p.payment_date ?? '',
      p.student_name?.trim() || 'Student',
      p.bill_number ?? '',
      formatAmount(p.amount_paid),
      formatAmount(p.discount_amount),
      p.discount_type ?? '',
      formatAmount(p.late_fee_amount),
      p.payment_method ?? '',
      p.transaction_reference ?? '',
      p.received_by_name ?? '',
      p.remarks ?? '',
    ];
  });

  downloadCsv(exportFilename, [headers, ...rows]);
}
