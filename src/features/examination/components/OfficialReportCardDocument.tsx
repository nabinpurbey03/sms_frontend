import React from 'react';
import type { OfficialReportCardDTO } from '../types';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Award,
  Calendar,
  Hash,
  User,
  BookOpen,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export interface OfficialReportCardDocumentProps {
  reportCard: OfficialReportCardDTO;
  className?: string;
}

const printStyles = `
@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    background: white;
  }
  body * {
    visibility: hidden !important;
  }
  #official-report-card-document,
  #official-report-card-document * {
    visibility: visible !important;
  }
  #official-report-card-document {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    box-shadow: none !important;
    border: none !important;
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    /* Try to fit entirely within one page */
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .no-print {
    display: none !important;
  }
  [data-radix-portal],
  [role="dialog"] {
    position: static !important;
    transform: none !important;
    overflow: visible !important;
    max-height: none !important;
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
  }
}
`;

export const OfficialReportCardDocument: React.FC<OfficialReportCardDocumentProps> = ({
  reportCard,
  className,
}) => {
  const { school, student, exam, subjects, summary, signatories } = reportCard;
  const isPassed =
    summary.is_passed ||
    (summary.final_result_text
      ? summary.final_result_text.toUpperCase().includes('PASS')
      : false);

  return (
    <>
      <style>{printStyles}</style>

      <div
        id="official-report-card-document"
        className={cn(
          'border-2 border-primary/40 rounded-2xl bg-card text-card-foreground p-6 sm:p-8 shadow-md relative',
          className
        )}
      >
        {/* Subtle decorative inner corner borders for formal academic certificate feel */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/30 rounded-tl pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/30 rounded-tr pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/30 rounded-bl pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br pointer-events-none" />

        {/* ========================================================= */}
        {/* OFFICIAL SCHOOL HEADER                                    */}
        {/* ========================================================= */}
        <header className="flex flex-col items-center text-center space-y-2 mb-4">
          {/* Crest / Logo */}
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt={school.name}
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-2xl border border-border shadow-xs"
            />
          ) : (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 p-3 shadow-xs">
              <GraduationCap className="h-9 w-9 sm:h-11 sm:w-11" />
            </div>
          )}

          {/* School Name */}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground text-center uppercase font-serif">
            {school.name}
          </h1>

          {/* Affiliation */}
          <p className="text-xs sm:text-sm font-medium text-muted-foreground text-center tracking-wide">
            Affiliated to National Examination Board • Recognized Academic Institution
          </p>

          {/* Contact Details */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
            {school.address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground/70" />
                {school.address}
              </span>
            )}
            {school.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3 text-muted-foreground/70" />
                {school.phone}
              </span>
            )}
            {school.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3 h-3 text-muted-foreground/70" />
                {school.email}
              </span>
            )}
          </div>

          {/* Divider Line with Center Title Badge */}
          <div className="w-full relative my-5 sm:my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-primary/30" />
            </div>
            <div className="relative px-4 py-1.5 rounded-full bg-background border-2 border-primary/40 shadow-xs">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary">
                OFFICIAL ACADEMIC TRANSCRIPT & REPORT CARD
              </span>
            </div>
          </div>

          {/* Examination Title & Academic Term */}
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {exam.name}
            </h2>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
              {exam.academic_term || 'Annual Academic Session'}
            </p>
          </div>
        </header>

        {/* ========================================================= */}
        {/* STUDENT PROFILE BOX                                       */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-xl bg-muted/30 border border-border/80 text-xs sm:text-sm mb-6">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3 w-3 text-primary" /> Student Name
            </span>
            <p className="font-bold text-foreground text-sm sm:text-base leading-tight">
              {student.name}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="h-3 w-3 text-primary" /> Class & Section
            </span>
            <p className="font-bold text-foreground leading-tight">
              {student.class_name}
              {student.section_name ? ` · Sec ${student.section_name}` : ''}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="h-3 w-3 text-primary" /> Roll / Student ID
            </span>
            <p className="font-mono font-bold text-foreground leading-tight">
              {student.roll_number ||
                (student.id ? student.id.slice(0, 8).toUpperCase() : 'N/A')}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-primary" /> Date of Issue
            </span>
            <p className="font-bold text-foreground leading-tight">
              {exam.issue_date}
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* DETAILED SUBJECT MARKS TABLE                              */}
        {/* ========================================================= */}
        <section className="overflow-x-auto rounded-xl border border-border/80 mb-6">
          <table className="w-full text-[10px] sm:text-xs text-left border-collapse">
            <thead className="bg-muted/60 text-[9px] sm:text-[10px] uppercase font-semibold text-muted-foreground border-b border-border/80">
              <tr>
                <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left font-bold">Subject Name</th>
                <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center font-bold">Full Mark</th>
                <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center font-bold">Pass Mark</th>
                <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-right font-bold">Marks Obtained</th>
                <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center font-bold">Grade</th>
                <th className="px-2 py-1.5 sm:px-3 sm:py-2 text-left font-bold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {subjects.map((sub, index) => {
                const isAbsent = sub.is_absent;
                const isFailing = !isAbsent && !sub.is_pass;

                return (
                  <tr
                    key={sub.subject_id || index}
                    className={cn(
                      'transition-colors hover:bg-muted/20',
                      index % 2 === 1 ? 'bg-muted/10' : ''
                    )}
                  >
                    <td className="px-2 py-1.5 sm:px-3 sm:py-2 font-semibold text-foreground">
                      {sub.subject_name}
                    </td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center font-mono text-muted-foreground">
                      {sub.full_mark}
                    </td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center font-mono text-muted-foreground">
                      {sub.pass_mark}
                    </td>
                    <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-right font-mono font-bold">
                      {isAbsent ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                          0.00 (AB)
                        </span>
                      ) : sub.score !== null && sub.score !== undefined ? (
                        <span
                          className={cn(
                            isFailing
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-foreground'
                          )}
                        >
                          {Number(sub.score).toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[10px] font-black min-w-[24px]',
                          isAbsent || isFailing
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : sub.grade.startsWith('A')
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        {sub.grade || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">
                      {sub.remarks ||
                        (isAbsent
                          ? 'Absent'
                          : sub.is_pass
                          ? 'Passed'
                          : 'Needs Improvement')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 border-t-2 border-border/80 font-bold text-foreground">
              <tr>
                <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-left uppercase text-[10px] sm:text-xs tracking-wider">
                  Grand Total
                </td>
                <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center font-mono">
                  {summary.total_full_mark}
                </td>
                <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-center text-muted-foreground font-normal">
                  -
                </td>
                <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-right font-mono text-primary font-black">
                  {Number(summary.total_obtained).toFixed(2)}
                </td>
                <td
                  colSpan={2}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 text-right text-[10px] sm:text-xs text-muted-foreground font-medium"
                >
                  Obtained {Number(summary.total_obtained).toFixed(2)} / {summary.total_full_mark}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ========================================================= */}
        {/* PERFORMANCE SUMMARY CARDS                                 */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/80 mb-6">
          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              Total Score
            </div>
            <div className="text-xs sm:text-sm font-black text-foreground mt-0.5 font-mono">
              {Number(summary.total_obtained).toFixed(1)} / {summary.total_full_mark}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              Percentage
            </div>
            <div className="text-xs sm:text-sm font-black text-foreground mt-0.5 font-mono">
              {summary.percentage}%
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              Overall Grade
            </div>
            <div className="text-xs sm:text-sm font-black text-primary mt-0.5">
              {summary.overall_grade}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              GPA
            </div>
            <div className="text-xs sm:text-sm font-black text-foreground mt-0.5 font-mono">
              {Number(summary.gpa).toFixed(2)}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              Class Rank
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
              {summary.rank_in_class || 'N/A'}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              Attendance
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
              {summary.exam_attendance_rate}%
              <span className="block text-[10px] text-muted-foreground font-normal">
                {summary.absent_subject_count > 0
                  ? `${summary.absent_subject_count} Absent`
                  : 'All Present'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card border border-border/50 text-center col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-1">
            <div className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase">
              Final Result
            </div>
            <div
              className={cn(
                'text-xs sm:text-sm font-black mt-0.5 uppercase tracking-wide',
                isPassed
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {summary.final_result_text || (isPassed ? 'PASSED' : 'FAILED')}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* GRADING SCALE REFERENCE LEGEND                            */}
        {/* ========================================================= */}
        <div className="p-2.5 sm:p-3 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground text-center mb-8">
          <span className="font-semibold text-foreground mr-1.5 uppercase tracking-wider">
            Grading Scale:
          </span>
          <span>
            A+ (90-100% | 4.0) • A (80-89% | 3.6) • B+ (70-79% | 3.2) • B (60-69% |
            2.8) • C+ (50-59% | 2.4) • C (40-49% | 2.0) • F (&lt;40% | 0.0)
          </span>
        </div>

        {/* ========================================================= */}
        {/* OFFICIAL SIGNATORIES & SECURITY SEALS                     */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 items-end pt-8 pb-4 border-t border-border/80 mb-6">
          {/* Class Teacher */}
          <div className="flex flex-col items-center text-center">
            <div className="w-44 border-b-2 border-foreground/60 mb-2" />
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {signatories.class_teacher_title || 'Class Teacher'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Evaluator Signature
            </p>
          </div>

          {/* School Official Seal */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-primary/50 flex flex-col items-center justify-center p-2 text-primary/80 bg-primary/5 shadow-xs">
              <Award className="w-6 h-6 mb-0.5 opacity-85" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none text-center">
                OFFICIAL SEAL
              </span>
              <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                ( OFFICIAL SEAL )
              </span>
            </div>
          </div>

          {/* Head of School / Principal */}
          <div className="flex flex-col items-center text-center">
            <div className="w-44 border-b-2 border-foreground/60 mb-2" />
            <p className="text-xs sm:text-sm font-bold text-foreground">
              {signatories.principal_title || 'Head of School / Principal'}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Authorized Signature
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* OFFICIAL FOOTER & VERIFICATION                            */}
        {/* ========================================================= */}
        <footer className="pt-4 border-t border-border/60 text-center space-y-1.5">
          {signatories.verification_code && (
            <div className="text-[11px] font-mono font-semibold text-muted-foreground tracking-wider">
              Verification Code:{' '}
              <span className="text-foreground font-bold">
                {signatories.verification_code}
              </span>
            </div>
          )}
          {signatories.disclaimer && (
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
              {signatories.disclaimer}
            </p>
          )}
        </footer>
      </div>
    </>
  );
};
