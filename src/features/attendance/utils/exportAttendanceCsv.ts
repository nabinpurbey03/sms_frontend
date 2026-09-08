import type { SchoolAttendanceReportResponse } from '../types';

export function exportSchoolAttendanceCsv(
  report: SchoolAttendanceReportResponse,
  schoolName: string = 'School'
) {
  const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_Attendance_Report_${report.from_date}_to_${report.to_date}.csv`;

  const rows: string[][] = [];

  // Metadata
  rows.push(['School Attendance Summary Report']);
  rows.push(['School Name', schoolName]);
  rows.push(['Date Range', `${report.from_date} to ${report.to_date}`]);
  rows.push(['Total School Days Logged', String(report.total_school_days)]);
  rows.push(['Total Enrolled Students', String(report.total_students)]);
  rows.push(['Overall Attendance Rate', `${report.overall_attendance_percentage}%`]);
  rows.push(['Total Present (Student-Days)', String(report.total_present)]);
  rows.push(['Total Absent (Student-Days)', String(report.total_absent)]);
  rows.push(['Chronic Absenteeism Rate (<85%)', `${report.chronic_absentee_rate}% (${report.chronic_absentee_count} students)`]);
  rows.push([]);

  // Class Breakdown
  rows.push(['Class Breakdown']);
  rows.push(['Class Name', 'Total Students', 'Present Days', 'Absent Days', 'Attendance Rate (%)']);
  report.classes.forEach((c) => {
    rows.push([c.class_name, String(c.total_students), String(c.total_present), String(c.total_absent), `${c.attendance_percentage}%`]);
  });
  rows.push([]);

  // At-Risk Students
  if (report.at_risk_students && report.at_risk_students.length > 0) {
    rows.push(['At-Risk Students (< 85% Attendance)']);
    rows.push(['Student Name', 'Class', 'Section', 'Days Enrolled', 'Days Present', 'Days Missed', 'Attendance Rate (%)']);
    report.at_risk_students.forEach((s) => {
      const name = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
      rows.push([name, s.class_name, s.section_name || 'N/A', String(s.total_days), String(s.total_present), String(s.total_absent), `${s.attendance_percentage}%`]);
    });
  }

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
