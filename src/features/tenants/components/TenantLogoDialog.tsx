import React, { useState, useRef } from 'react';
import { Image, UploadCloud, X, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Tenant } from '../types';

interface TenantLogoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const TenantLogoDialog: React.FC<TenantLogoDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onUpload,
  isUploading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | undefined) => {
    setErrorMsg(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Invalid file type. Supported formats: PNG, JPG, SVG, WebP.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg('File size exceeds the 5MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleReset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[480px] p-0 rounded-2xl border-border/70 shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Image className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Upload School Brand Logo
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate max-w-[340px]">
                {tenant?.name || 'School Tenant'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Hidden Native File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
          />

          {/* Current / Preview Logo Box */}
          {previewUrl || tenant?.logo_url ? (
            <div className="relative rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 flex flex-col items-center justify-center space-y-3">
              <div className="relative h-28 w-28 rounded-2xl border bg-muted/20 p-2 shadow-xs overflow-hidden flex items-center justify-center">
                <img
                  src={previewUrl || tenant?.logo_url || ''}
                  alt="School Logo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">
                  {selectedFile ? selectedFile.name : 'Current Brand Logo'}
                </p>
                {selectedFile && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-semibold"
                >
                  Choose Different Image
                </Button>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs text-destructive hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Click to browse or drag and drop logo here
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, SVG or WebP (Max 5MB)
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-muted/20 flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedFile || isUploading}
            className="min-w-[120px] font-semibold"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Save Logo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
