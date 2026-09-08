import type { SchoolResultsAnalyticsResponse } from '../types';

export function exportSchoolResultsCsv(
  analytics: SchoolResultsAnalyticsResponse,
  schoolName: string = 'School',
  filters?: { term?: string; className?: string }
) {
  const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${safeName}_Academic_Results_${todayStr}.csv`;

  const rows: string[][] = [];

  // 1. Header & Metadata
  rows.push(['School Academic Results & Examination Performance Report']);
  rows.push(['School Name', schoolName]);
  rows.push(['Generated On', todayStr]);
  if (filters?.term) {
    rows.push(['Term Filter', filters.term]);
  }
  if (filters?.className) {
    rows.push(['Class Filter', filters.className]);
  }
  rows.push([]);

  // 2. Executive Academic KPIs
  rows.push(['Executive Academic KPIs']);
  rows.push(['Metric', 'Value']);
  rows.push(['Overall School Pass Rate', `${analytics.kpis.school_pass_rate}%`]);
  rows.push(['School Average Marks', `${analytics.kpis.school_average_percentage}%`]);
  rows.push(['Total Students Evaluated', String(analytics.kpis.total_students_evaluated)]);
  rows.push(['Total Passed', String(analytics.kpis.total_passed)]);
  rows.push(['Total Needing Support (Failed)', String(analytics.kpis.total_failed)]);
  rows.push(['Total Exams Conducted', String(analytics.pipeline.total_exams)]);
  rows.push(['Exams in Progress (Grading)', String(analytics.pipeline.in_progress_count)]);
  rows.push(['Exams Awaiting Admin Approval', String(analytics.pipeline.pending_approval_count)]);
  rows.push(['Exams Approved & Published', String(analytics.pipeline.approved_count)]);
  rows.push([]);

  // 3. Class-by-Class Results
  rows.push(['Class-by-Class Performance Breakdown']);
  rows.push([
    'Class Name',
    'Examination Name',
    'Academic Term',
    'Status',
    'Evaluated Students',
    'Passed Students',
    'Failed Students',
    'Pass Rate (%)',
    'Class Average Score (%)',
  ]);
  analytics.class_summaries.forEach((c) => {
    rows.push([
      c.class_name,
      c.exam_name,
      c.academic_term || 'N/A',
      c.status,
      String(c.total_students),
      String(c.passed_students),
      String(c.failed_students),
      `${c.pass_rate}%`,
      `${c.average_percentage}%`,
    ]);
  });
  rows.push([]);

  // 4. Subject Performance
  rows.push(['Subject Performance Analytics']);
  rows.push([
    'Subject Name',
    'Class Name',
    'Examination Name',
    'Students Evaluated',
    'Attendance Rate (%)',
    'Absent Count',
    'Passed Count',
    'Pass Rate (%)',
    'Attended Average Score',
    'Full Mark',
  ]);
  analytics.subject_summaries.forEach((s) => {
    rows.push([
      s.subject_name,
      s.class_name,
      s.exam_name,
      String(s.students_evaluated),
      s.attendance_rate !== undefined ? `${s.attendance_rate}%` : '100%',
      String(s.absent_count ?? 0),
      String(s.passed_count),
      `${s.pass_rate}%`,
      String(s.average_score),
      String(s.full_mark),
    ]);
  });
  rows.push([]);

  // 5. At-Risk Students (Failed one or more subjects)
  if (analytics.at_risk_students && analytics.at_risk_students.length > 0) {
    rows.push(['Academic Attention: Students Needing Academic Intervention']);
    rows.push([
      'Student Name',
      'Class Name',
      'Section Name',
      'Examination Name',
      'Failed Subjects Count',
      'Failed Subjects List',
      'Overall Percentage (%)',
    ]);
    analytics.at_risk_students.forEach((s) => {
      rows.push([
        s.student_name,
        s.class_name,
        s.section_name || 'N/A',
        s.exam_name,
        String(s.failed_subjects_count),
        s.failed_subject_names.join('; '),
        `${s.overall_percentage}%`,
      ]);
    });
    rows.push([]);
  }

  // 6. Top Academic Achievers
  if (analytics.top_achievers && analytics.top_achievers.length > 0) {
    rows.push(['Top Academic Achievers / Honor Roll']);
    rows.push(['Rank', 'Student Name', 'Class Name', 'Section Name', 'Examination Name', 'Overall Percentage (%)']);
    analytics.top_achievers.forEach((a) => {
      rows.push([
        `#${a.rank}`,
        a.student_name,
        a.class_name,
        a.section_name || 'N/A',
        a.exam_name,
        `${a.overall_percentage}%`,
      ]);
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
