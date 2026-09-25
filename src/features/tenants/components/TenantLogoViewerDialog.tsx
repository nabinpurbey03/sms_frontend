import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Download,
  Upload,
  Globe,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { getMediaUrl } from '@/lib/utils';

interface TenantLogoViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name?: string;
    domain_name?: string;
    logo_url?: string | null;
  } | null;
  onOpenUpload?: () => void;
}

export const TenantLogoViewerDialog: React.FC<TenantLogoViewerDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onOpenUpload,
}) => {
  const [loadError, setLoadError] = useState(false);
  const resolvedUrl = getMediaUrl(tenant?.logo_url);

  // Reset error when dialog opens or tenant/url changes
  React.useEffect(() => {
    setLoadError(false);
  }, [open, resolvedUrl]);

  if (!tenant) return null;

  const handleDownload = async () => {
    if (!resolvedUrl) return;
    try {
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const extension = resolvedUrl.split('.').pop()?.split('?')[0] || 'png';
      link.download = `${tenant.name || 'school'}_logo.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct window open if fetch blocked
      window.open(resolvedUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 rounded-2xl border-border/70 shadow-2xl overflow-hidden bg-card">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold truncate">
                {tenant.name || 'School Entity'} — Brand Emblem
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <Globe className="h-3 w-3" />
                <span className="font-mono">{tenant.domain_name || 'school-domain'}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body / Image Lightbox */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full aspect-square max-w-[340px] max-h-[340px] rounded-2xl border border-border/80 p-6 flex items-center justify-center shadow-inner overflow-hidden bg-neutral-100 dark:bg-neutral-900/80">
            {/* Checkerboard subtle pattern for transparency inspection */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#888 1px, transparent 1px), radial-gradient(#888 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            />

            {resolvedUrl && !loadError ? (
              <img
                src={resolvedUrl}
                alt={tenant.name || 'School Logo'}
                className="relative z-10 max-h-full max-w-full object-contain transition-transform hover:scale-105 duration-200"
                onError={() => setLoadError(true)}
              />
            ) : (
              <div className="relative z-10 text-center space-y-2 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {resolvedUrl ? 'Failed to Load Image' : 'No Logo Configured'}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {resolvedUrl
                    ? 'The logo file could not be found on storage or returned an error.'
                    : 'This school does not have an official logo uploaded yet.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono py-0.5 px-2 bg-muted/30">
              {resolvedUrl ? resolvedUrl.split('/').pop() : 'No file'}
            </Badge>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 sm:p-5 pt-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {resolvedUrl && !loadError && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-1.5 text-xs font-semibold rounded-xl h-8.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </Button>

                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold rounded-xl h-8.5 text-muted-foreground hover:text-foreground"
                >
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open in Tab</span>
                  </a>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onOpenUpload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenUpload();
                }}
                className="gap-1.5 text-xs font-semibold rounded-xl h-8.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{resolvedUrl ? 'Update Logo' : 'Upload Logo'}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold rounded-xl h-8.5"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
