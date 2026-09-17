import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileSpreadsheet, X } from 'lucide-react';
import type { AcademicStudent, AcademicSection } from '../types';
import type { ParentMappingDTO } from '@/features/members/types';

interface PrintableRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  section: AcademicSection | null;
  students: AcademicStudent[];
  parentMap: Map<string, ParentMappingDTO>;
}

export const PrintableRosterModal: React.FC<PrintableRosterModalProps> = ({
  isOpen,
  onClose,
  className,
  section,
  students,
  parentMap,
}) => {
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentMonthYear = new Date().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Roll No',
      'Student Name',
      'Gender',
      'Class',
      'Section',
      'Status',
      'Parent / Guardian Name',
      'Parent Contact Phone',
    ];

    const rows = students.map((st, idx) => {
      const fullName = [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ');
      const parent = parentMap.get(st.id);
      return [
        idx + 1,
        `"${fullName.replace(/"/g, '""')}"`,
        st.gender || '',
        `"${className.replace(/"/g, '""')}"`,
        section?.name || '',
        st.status,
        parent?.parent_name ? `"${parent.parent_name.replace(/"/g, '""')}"` : '',
        parent?.parent_phone || '',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${className.replace(/\s+/g, '_')}_Section_${section?.name || 'All'}_Roster.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Print Stylesheet injected into DOM */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-roster-sheet,
          #printable-roster-sheet * {
            visibility: visible !important;
          }
          #printable-roster-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between no-print">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                Section Roster & Attendance Register
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Print 31-day manual roll-call sheet or download spreadsheet for {className} - Section{' '}
                {section?.name || 'A'}.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                className="gap-1.5 text-xs shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Download CSV
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Register
              </Button>
            </div>
          </DialogHeader>

          {/* Sheet Preview / Printable Area */}
          <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950/40">
            <div
              id="printable-roster-sheet"
              className="bg-white text-black p-6 rounded-lg border border-slate-300 shadow-sm mx-auto text-xs min-w-[760px]"
            >
              {/* Header */}
              <div className="text-center pb-4 border-b-2 border-black space-y-1">
                <h2 className="text-lg font-black uppercase tracking-wider">
                  STUDENT ATTENDANCE & ROLL CALL REGISTER
                </h2>
                <div className="flex justify-between items-center text-xs font-semibold px-2 pt-1">
                  <span>
                    Class: <span className="underline font-bold">{className}</span>
                  </span>
                  <span>
                    Section: <span className="underline font-bold">{section?.name || 'All'}</span>
                  </span>
                  <span>
                    Month / Session: <span className="underline font-bold">{currentMonthYear}</span>
                  </span>
                  <span>
                    Total Enrolled: <span className="underline font-bold">{students.length}</span>
                  </span>
                </div>
              </div>

              {/* Roster Table with 31 daily columns */}
              <div className="pt-3 overflow-x-auto">
                <table className="w-full border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold">
                      <th className="border border-black px-1 py-1 w-6 text-center">#</th>
                      <th className="border border-black px-2 py-1 text-left min-w-[140px]">
                        Student Full Name
                      </th>
                      <th className="border border-black px-1 py-1 text-left min-w-[85px]">
                        Parent Phone
                      </th>
                      {daysInMonth.map((day) => (
                        <th
                          key={day}
                          className="border border-black px-0.5 py-1 text-center w-5 font-mono text-[9px]"
                        >
                          {day}
                        </th>
                      ))}
                      <th className="border border-black px-1 py-1 text-center w-7">P</th>
                      <th className="border border-black px-1 py-1 text-center w-7">A</th>
                      <th className="border border-black px-1 py-1 text-left min-w-[70px]">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st, idx) => {
                      const fullName = [st.first_name, st.middle_name, st.last_name]
                        .filter(Boolean)
                        .join(' ');
                      const parent = parentMap.get(st.id);

                      return (
                        <tr key={st.id} className="h-6">
                          <td className="border border-black text-center font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="border border-black px-2 font-medium truncate max-w-[150px]">
                            {fullName}
                          </td>
                          <td className="border border-black px-1 font-mono text-[9px]">
                            {parent?.parent_phone || '—'}
                          </td>
                          {daysInMonth.map((d) => (
                            <td key={d} className="border border-black text-center"></td>
                          ))}
                          <td className="border border-black text-center font-mono"></td>
                          <td className="border border-black text-center font-mono"></td>
                          <td className="border border-black px-1"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signature Footer */}
              <div className="pt-8 flex justify-between items-end text-xs font-semibold px-4">
                <div className="text-center space-y-1">
                  <div className="w-44 border-b border-black"></div>
                  <span>Class Teacher Signature</span>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-32 border-b border-black"></div>
                  <span>Date Verified</span>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-44 border-b border-black"></div>
                  <span>Principal / Head Signature</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-border/60 no-print flex justify-between sm:justify-between items-center">
            <span className="text-[11px] text-muted-foreground">
              Tip: In your browser print dialog, select "Landscape" and "Fit to Page" for best results.
            </span>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
