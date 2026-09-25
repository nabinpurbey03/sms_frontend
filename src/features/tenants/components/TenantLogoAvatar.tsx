import React, { useState, useEffect } from 'react';
import { Building2, Camera, Eye } from 'lucide-react';
import { getMediaUrl, cn } from '@/lib/utils';

interface TenantLogoAvatarProps {
  logoUrl?: string | null;
  name?: string;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
  editable?: boolean;
  mode?: 'view' | 'edit' | 'avatar';
}

export const TenantLogoAvatar: React.FC<TenantLogoAvatarProps> = ({
  logoUrl,
  name,
  className,
  iconClassName,
  onClick,
  editable = false,
  mode,
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = getMediaUrl(logoUrl);

  // Automatically reset image error state whenever the URL changes or updates
  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

  const effectiveMode = mode || (editable ? 'edit' : 'avatar');
  const hasValidImage = Boolean(resolvedUrl && !imgError);
  const isClickable = Boolean(onClick);

  const getTitle = () => {
    if (effectiveMode === 'view' && hasValidImage) return `Click to view ${name || 'school'} logo`;
    if (editable || effectiveMode === 'edit') {
      return hasValidImage ? 'Click to update school logo' : 'No logo uploaded — Click to upload';
    }
    return name || 'School Logo';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden p-1 shrink-0 transition-all',
        isClickable && 'cursor-pointer hover:border-primary/60 hover:shadow-md',
        className || 'h-10 w-10 min-h-[40px] min-w-[40px]'
      )}
      title={getTitle()}
    >
      {hasValidImage ? (
        <img
          src={resolvedUrl}
          alt={name || 'School Logo'}
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <Building2 className={cn('h-5 w-5 text-primary', iconClassName)} />
      )}

      {isClickable && effectiveMode !== 'avatar' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          {effectiveMode === 'view' && hasValidImage ? (
            <Eye className="h-4 w-4 drop-shadow-sm" />
          ) : (
            <Camera className="h-4 w-4 drop-shadow-sm" />
          )}
        </div>
      )}
    </div>
  );
};
