import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ClassWithDetails, StudentCreateDTO } from '../types';

interface BulkStudentUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassWithDetails[];
  onSubmit: (
    classId: string,
    sectionId: string,
    file: File
  ) => Promise<any>;
  isLoading: boolean;
}

export const BulkStudentUploadDialog: React.FC<BulkStudentUploadDialogProps> = ({
  isOpen,
  onClose,
  classes,
  onSubmit,
  isLoading,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Fallback to active/first valid class and section to prevent desync when classes load asynchronously
  const effectiveClass =
    (selectedClassId && classes.find((c) => c.id === selectedClassId)) ||
    classes[0] ||
    null;
  const effectiveClassId = effectiveClass?.id || '';

  const sections = effectiveClass?.sections || [];
  const effectiveSection =
    (selectedSectionId && sections.find((s) => s.id === selectedSectionId)) ||
    sections[0] ||
    null;
  const effectiveSectionId = effectiveSection?.id || '';

  // Synchronize internal state whenever classes change or dialog opens
  useEffect(() => {
    if (classes.length > 0) {
      if (!selectedClassId || !classes.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(classes[0].id);
      }
    }
  }, [classes, selectedClassId, isOpen]);

  useEffect(() => {
    if (sections.length > 0) {
      if (!selectedSectionId || !sections.some((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(sections[0].id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [sections, selectedSectionId, isOpen]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<StudentCreateDTO[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExcel =
    !!selectedFile &&
    (selectedFile.name.toLowerCase().endsWith('.xlsx') ||
      selectedFile.name.toLowerCase().endsWith('.xls'));
  const canSubmit =
    !isLoading &&
    !!selectedFile &&
    !!effectiveSectionId &&
    (isExcel || parsedStudents.length > 0);

  // Keep section synced when class changes
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'first_name,middle_name,last_name\nAarav,,Sharma\nDiya,Kumari,Adhikari\nRohan,Bahadur,Thapa\nPooja,,Shrestha\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.info('Template Downloaded', {
      description: 'students_upload_template.csv has been saved to your downloads.',
    });
  };

  // Parse CSV file client-side (or prepare Excel file for upload)
  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB size limit.');
      return;
    }

    setSelectedFile(file);
    setParseErrors([]);
    setParsedStudents([]);

    const filename = file.name.toLowerCase();
    const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
    if (isExcel) {
      // Excel files are parsed and validated on the backend via openpyxl
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r\n|\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        setParseErrors(['The file is empty or only contains headers.']);
        setParsedStudents([]);
        return;
      }

      // Check header with robust normalization (strips BOM, quotes, spaces)
      const normalizeHeader = (h: string) =>
        h
          .replace(/^\ufeff/, '')
          .replace(/^["']|["']$/g, '')
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_');

      const rawHeaders = lines[0].split(',').map(normalizeHeader);
      const fnIdx = rawHeaders.findIndex((h) =>
        ['first_name', 'firstname', 'first', 'fname'].includes(h)
      );
      const lnIdx = rawHeaders.findIndex((h) =>
        ['last_name', 'lastname', 'last', 'lname', 'surname'].includes(h)
      );
      const mnIdx = rawHeaders.findIndex((h) =>
        ['middle_name', 'middlename', 'middle', 'mname'].includes(h)
      );

      if (fnIdx === -1 || lnIdx === -1) {
        setParseErrors([
          'Invalid CSV header format. Expected columns: first_name, middle_name, last_name.',
        ]);
        setParsedStudents([]);
        return;
      }

      const validStudents: StudentCreateDTO[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const firstName = cols[fnIdx] || '';
        const lastName = cols[lnIdx] || '';
        const middleName = mnIdx !== -1 ? cols[mnIdx] || '' : '';

        if (!firstName || !lastName) {
          errors.push(`Row ${i + 1}: Missing first_name or last_name`);
          continue;
        }

        validStudents.push({
          first_name: firstName,
          middle_name: middleName || undefined,
          last_name: lastName,
        });
      }

      setParsedStudents(validStudents);
      setParseErrors(errors);
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedStudents([]);
    setParseErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!effectiveClassId || !effectiveSectionId) {
      toast.error('Please choose a class and section for enrollment.');
      return;
    }
    if (!selectedFile) {
      toast.error('Please choose a CSV or Excel file to upload.');
      return;
    }

    const filename = selectedFile.name.toLowerCase();
    const isCsv = filename.endsWith('.csv');
    if (isCsv && parsedStudents.length === 0 && parseErrors.length > 0) {
      toast.error('Please resolve the CSV validation issues before uploading.');
      return;
    }

    await onSubmit(effectiveClassId, effectiveSectionId, selectedFile);
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] shadow-2xl rounded-2xl border border-border/80 bg-background">
        {/* Header - Fixed & Sticky at Top */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-border/70 bg-muted/20">
          <DialogHeader className="space-y-1 pr-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                  Bulk Student Upload
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Import cohorts of up to 1,000 students via CSV or Excel into an academic section.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content Body - Smooth Scrollable Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 min-h-0">
          {/* Target Class & Section Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Target Class <span className="text-destructive">*</span>
              </Label>
              <select
                value={effectiveClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={isLoading}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students.length} students)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Target Section <span className="text-destructive">*</span>
              </Label>
              <select
                value={effectiveSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={isLoading || sections.length === 0}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {sections.length === 0 ? (
                  <option value="">No sections available</option>
                ) : (
                  sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} ({sec.student_count ?? 0} students)
                    </option>
                  ))
                )}
              </select>
            </div>

            {sections.length === 0 && (
              <div className="col-span-1 sm:col-span-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>This class currently has no sections. Please create a section first before enrolling students.</span>
              </div>
            )}
          </div>

          {/* Download Template Action */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground">Download Sample Template</span>
              <p className="text-[11px] text-muted-foreground">
                Formatted with <code className="font-mono text-[10px] bg-primary/10 px-1 py-0.5 rounded">first_name</code>, <code className="font-mono text-[10px] bg-primary/10 px-1 py-0.5 rounded">middle_name</code>, and <code className="font-mono text-[10px] bg-primary/10 px-1 py-0.5 rounded">last_name</code> headers.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs h-8 shadow-2xs font-semibold cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </Button>
          </div>

          {/* Upload Area */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Upload CSV or Excel File
            </Label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className="rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    Click to browse or drop file here
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Accepts .csv or .xlsx format (Max 5MB / 1,000 rows)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileSpreadsheet className="w-6 h-6 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {isExcel ? 'Excel Workbook' : `${parsedStudents.length} valid student(s)`}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Validation Status */}
                {isExcel ? (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                    <span>
                      Excel workbook ready to enroll into{' '}
                      <strong>{effectiveClass?.name} - Section {effectiveSection?.name}</strong>.
                      The server will parse and validate records on import.
                    </span>
                  </div>
                ) : parsedStudents.length > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Ready to enroll <strong>{parsedStudents.length}</strong> student(s) into{' '}
                      <strong>{effectiveClass?.name} - Section {effectiveSection?.name}</strong>.
                    </span>
                  </div>
                ) : null}

                {parseErrors.length > 0 && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Validation Issues Found ({parseErrors.length})</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                      {parseErrors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {parseErrors.length > 5 && (
                        <li>...and {parseErrors.length - 5} more issue(s).</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Parsed Preview Table */}
                {parsedStudents.length > 0 && (
                  <div className="border rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-muted/40 px-3 py-2 border-b text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                      <span>Roster Preview (First {Math.min(5, parsedStudents.length)} records)</span>
                      <span className="font-mono text-primary font-bold">
                        {parsedStudents.length} total
                      </span>
                    </div>
                    <div className="divide-y divide-border/60 max-h-36 overflow-y-auto text-xs">
                      {parsedStudents.slice(0, 5).map((st, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {st.first_name} {st.middle_name ? `${st.middle_name} ` : ''}{st.last_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            Row #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Pinned & Sticky at Bottom */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-border/70 bg-card/90 backdrop-blur-xs flex flex-row items-center justify-end gap-3 mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs h-9 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUploadSubmit}
            disabled={!canSubmit}
            className="text-xs h-9 gap-1.5 cursor-pointer shadow-xs font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enrolling Students...</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" />
                <span>
                  {isExcel
                    ? 'Import Students from Excel'
                    : parsedStudents.length > 0
                    ? `Enroll ${parsedStudents.length} Student(s)`
                    : 'Enroll Students'}
                </span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
