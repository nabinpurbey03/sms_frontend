import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  className = '',
}) => {
  const errorMessage =
    message ||
    (error instanceof Error ? error.message : null) ||
    'Unable to load data from the server. Please check your connection and try again.';

  return (
    <div className={`flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};
