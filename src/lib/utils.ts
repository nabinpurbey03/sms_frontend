import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { ENV } from '@/config/env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a media or file upload path to a fully qualified URL.
 * If path is relative (e.g. /uploads/logos/xyz.png), prepends the backend API base URL.
 */
export function getMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.API_BASE_URL}${cleanPath}`;
}
