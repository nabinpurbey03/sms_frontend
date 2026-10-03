export interface ShouldShowExpiryPromptParams {
  isExpired: boolean;
  userRole: string;
  hasNextYear: boolean;
}

export function shouldShowExpiryPrompt({
  isExpired,
  userRole,
  hasNextYear,
}: ShouldShowExpiryPromptParams): boolean {
  const allowedRoles = ['ADMIN', 'OFFICE_ADMIN'];
  return Boolean(isExpired && allowedRoles.includes(userRole) && hasNextYear);
}

export function formatAcademicYearElapsed(days: number): string {
  if (days <= 0) return 'ended today';
  if (days === 1) return 'ended yesterday';
  return `ended ${days} days ago`;
}
