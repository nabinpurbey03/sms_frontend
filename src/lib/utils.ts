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

  // In Vite dev mode, Vite reverse-proxies '/uploads' to backend (zero CORS/PNA issues)
  if (ENV.IS_DEV && cleanPath.startsWith('/uploads')) {
    return cleanPath;
  }

  // If API_BASE_URL is empty or points to localhost/loopback in a production build,
  // rely on same-origin reverse-proxy via Nginx so client browsers don't try to query localhost
  const isLocalhostUrl = Boolean(
    ENV.API_BASE_URL && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(ENV.API_BASE_URL)
  );
  if (!ENV.API_BASE_URL || (ENV.IS_PROD && isLocalhostUrl)) {
    return cleanPath;
  }

  return `${ENV.API_BASE_URL}${cleanPath}`;
}
