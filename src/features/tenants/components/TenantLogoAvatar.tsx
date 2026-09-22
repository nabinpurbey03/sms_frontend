import React, { useState } from 'react';
import { Building2, Camera } from 'lucide-react';
import { getMediaUrl, cn } from '@/lib/utils';

interface TenantLogoAvatarProps {
  logoUrl?: string | null;
  name?: string;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
  editable?: boolean;
}

export const TenantLogoAvatar: React.FC<TenantLogoAvatarProps> = ({
  logoUrl,
  name,
  className,
  iconClassName,
  onClick,
  editable = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = getMediaUrl(logoUrl);

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden p-1 shrink-0 transition-all',
        isClickable && 'cursor-pointer hover:border-primary/60 hover:shadow-md',
        className || 'h-10 w-10 min-h-[40px] min-w-[40px]'
      )}
      title={editable ? 'Click to update school logo' : name || 'School Logo'}
    >
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={name || 'School Logo'}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <Building2 className={cn('h-5 w-5 text-primary', iconClassName)} />
      )}

      {editable && isClickable && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <Camera className="h-4 w-4 drop-shadow-sm" />
        </div>
      )}
    </div>
  );
};
