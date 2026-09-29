import React, { useState, useEffect } from 'react';
import { useViewAsStore } from '@/stores/viewAsStore';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Clock, X } from 'lucide-react';

export const ViewAsBanner: React.FC = () => {
  const { activeToken, targetUserId, expiresAt, endSession } = useViewAsStore();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!activeToken || !expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        endSession();
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeToken, expiresAt, endSession]);

  if (!activeToken) return null;

  return (
    <div
      role="alert"
      className="bg-amber-600 dark:bg-amber-700 text-amber-50 px-4 py-2 flex items-center justify-between z-50 text-xs sm:text-sm font-medium shadow-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200" />
        <span className="truncate">
          <strong>Support Session:</strong> Viewing as User ID <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-xs">{targetUserId}</code>. Mutating actions are disabled.
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-amber-200 shrink-0 font-mono text-xs ml-2">
          <Clock className="w-3.5 h-3.5" /> {timeLeft}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={endSession}
        className="text-amber-900 bg-amber-50 hover:bg-white border-transparent h-7 px-2.5 text-xs font-semibold shrink-0 ml-3"
      >
        <X className="w-3.5 h-3.5 mr-1" />
        End Session
      </Button>
    </div>
  );
};
