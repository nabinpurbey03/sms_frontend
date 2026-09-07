import React, { useState, useRef } from 'react';
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
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ClassWithDetails, SubjectCreateDTO } from '../types';

interface BulkSubjectUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassWithDetails[];
  onSubmit: (classId: string, subjects: SubjectCreateDTO[]) => Promise<any>;
  isLoading: boolean;
}

export const BulkSubjectUploadDialog: React.FC<BulkSubjectUploadDialogProps> = ({
  isOpen,
  onClose,
  classes,
  onSubmit,
  isLoading,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedSubjects, setParsedSubjects] = useState<SubjectCreateDTO[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'name,code\nMathematics,MTH-10\nEnglish Literature,ENG-10\nScience & Technology,SCI-10\nSocial Studies,SOC-10\nComputer Science,CS-10\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'subjects_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.info('Template Downloaded', {
      description: 'subjects_upload_template.csv has been saved to your downloads.',
    });
  };

  // Parse CSV file client-side
  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB size limit.');
      return;
    }

    setSelectedFile(file);
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
        setParsedSubjects([]);
        return;
      }

      // Check header
      const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const nameIdx = header.indexOf('name');
      const codeIdx = header.indexOf('code');

      if (nameIdx === -1) {
        setParseErrors(['Invalid CSV header format. Expected at least a "name" column.']);
        setParsedSubjects([]);
        return;
      }

      const validSubjects: SubjectCreateDTO[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const name = cols[nameIdx];
        const code = codeIdx !== -1 ? cols[codeIdx] : undefined;

        if (!name) {
          errors.push(`Row ${i + 1}: Missing subject name`);
          continue;
        }

        validSubjects.push({
          name,
          code: code ? code.toUpperCase() : undefined,
        });
      }

      setParsedSubjects(validSubjects);
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
    setParsedSubjects([]);
    setParseErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!selectedClassId) {
      toast.error('Please choose a class to register these subjects.');
      return;
    }
    if (parsedSubjects.length === 0) {
      toast.error('No valid subjects found in the uploaded file.');
      return;
    }

    await onSubmit(selectedClassId, parsedSubjects);
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Bulk Subjects Upload
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Import curriculum subjects in bulk via CSV or Excel into an academic class.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Target Class Selector */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Target Academic Class <span className="text-destructive">*</span>
            </Label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={isLoading}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (currently {cls.subjects.length} subjects)
                </option>
              ))}
            </select>
          </div>

          {/* Download Template Action */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground">Download Sample Template</span>
              <p className="text-[11px] text-muted-foreground">
                Formatted with `name` and optional `code` columns.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs h-8 shadow-2xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </Button>
          </div>

          {/* Upload Area */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Upload CSV File
            </Label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    Click to browse or drop CSV file here
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Accepts .csv or .xlsx format (Max 5MB)
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
                        {(selectedFile.size / 1024).toFixed(1)} KB • {parsedSubjects.length} valid subject(s)
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Validation Status */}
                {parsedSubjects.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Ready to add <strong>{parsedSubjects.length}</strong> subject(s) to{' '}
                      <strong>{selectedClass?.name}</strong>.
                    </span>
                  </div>
                )}

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
                    </ul>
                  </div>
                )}

                {/* Parsed Preview Table */}
                {parsedSubjects.length > 0 && (
                  <div className="border rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-muted/40 px-3 py-2 border-b text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                      <span>Curriculum Preview</span>
                      <span className="font-mono text-primary font-bold">
                        {parsedSubjects.length} subjects
                      </span>
                    </div>
                    <div className="divide-y divide-border/60 max-h-36 overflow-y-auto text-xs">
                      {parsedSubjects.slice(0, 5).map((sub, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {sub.name}
                          </span>
                          {sub.code && (
                            <span className="text-[10px] text-primary font-mono font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                              {sub.code}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUploadSubmit}
            disabled={isLoading || parsedSubjects.length === 0 || !selectedClassId}
            className="text-xs gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isLoading ? 'Importing Subjects...' : `Add ${parsedSubjects.length} Subject(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
