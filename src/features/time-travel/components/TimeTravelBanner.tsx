import React from 'react';
import { AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/useAuth';
import { useTimeTravel } from '../TimeTravelContext';
import {
  formatTimeTravelBannerText,
  shouldRenderTimeTravelBanner,
} from '../timeTravelUtils';

export const TimeTravelBanner: React.FC = () => {
  const isEnabled = import.meta.env.VITE_ENABLE_TIME_TRAVEL === 'true';
  const { user } = useAuth();
  const { isSimulated, effectiveDate, resetToLive } = useTimeTravel();

  if (
    !shouldRenderTimeTravelBanner({
      isEnabled,
      isSuperAdmin: user?.is_super_admin,
      isSimulated,
    })
  ) {
    return null;
  }

  const bannerText = formatTimeTravelBannerText(effectiveDate);

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 w-full bg-amber-500 dark:bg-amber-600 text-amber-950 dark:text-amber-50 border-b border-amber-600/30 px-3.5 py-2 shadow-md transition-all shrink-0"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 shrink-0 bg-amber-600/25 dark:bg-amber-950/30 px-2 py-0.5 rounded-full text-xs font-bold text-amber-950 dark:text-amber-100">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-950 dark:text-amber-100" />
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-950 dark:text-amber-100" />
            <span className="hidden sm:inline">Active Sandbox</span>
          </div>
          <span
            className="text-xs sm:text-sm font-semibold truncate text-amber-950 dark:text-amber-50"
            title={bannerText}
          >
            {bannerText}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resetToLive}
          className="h-7 px-3 text-xs font-bold bg-white/95 hover:bg-white text-amber-950 hover:text-amber-900 border-amber-700/40 shadow-xs shrink-0 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset to Live Time
        </Button>
      </div>
    </aside>
  );
};
