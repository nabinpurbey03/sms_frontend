import React from 'react';
import { Search, X, Download, UserPlus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MemberRole } from '../types';

interface MemberFiltersToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedRole: MemberRole | 'ALL';
  onRoleChange: (role: MemberRole | 'ALL') => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  onStatusChange: (status: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  onExportCsv: () => void;
  onAddMember: () => void;
  canManageMembers: boolean;
  totalFilteredCount: number;
}

const ROLE_OPTIONS: Array<{ id: MemberRole | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'TEACHER', label: 'Teachers' },
  { id: 'OFFICE_ADMIN', label: 'Office Staff' },
  { id: 'ACCOUNTANT', label: 'Accountant' },
  { id: 'PARENT', label: 'Parents' },
  { id: 'ADMIN', label: 'Admins' },
];

export const MemberFiltersToolbar: React.FC<MemberFiltersToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  statusFilter,
  onStatusChange,
  onExportCsv,
  onAddMember,
  canManageMembers,
  totalFilteredCount,
}) => {
  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-3">
      {/* Top row: Search input + Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="pl-9 pr-8 h-9 text-xs rounded-lg"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status selector */}
          <div role="tablist" aria-label="Member Status Filter" className="flex items-center rounded-xl border border-border/80 p-1 bg-muted/60 dark:bg-muted/30 shadow-2xs gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'ALL'}
              onClick={() => onStatusChange('ALL')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border',
                statusFilter === 'ALL'
                  ? 'bg-primary/10 text-primary font-bold shadow-xs border-primary/30 dark:bg-primary/15 dark:text-primary dark:border-primary/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/40'
              )}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'ACTIVE'}
              onClick={() => onStatusChange('ACTIVE')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border',
                statusFilter === 'ACTIVE'
                  ? 'bg-primary/10 text-primary font-bold shadow-xs border-primary/30 dark:bg-primary/15 dark:text-primary dark:border-primary/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/40'
              )}
            >
              Active
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'INACTIVE'}
              onClick={() => onStatusChange('INACTIVE')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border',
                statusFilter === 'INACTIVE'
                  ? 'bg-primary/10 text-primary font-bold shadow-xs border-primary/30 dark:bg-primary/15 dark:text-primary dark:border-primary/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/40'
              )}
            >
              Inactive
            </button>
          </div>

          {/* Export CSV button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Export filtered roster to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Add Member button */}
          {canManageMembers && (
            <Button
              size="sm"
              onClick={onAddMember}
              className="h-9 gap-1.5 text-xs font-medium shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Role tabs + Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Role:
          </span>
          {ROLE_OPTIONS.map((opt) => {
            const isActive = selectedRole === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onRoleChange(opt.id)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full font-medium transition-all cursor-pointer select-none',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <strong className="text-foreground">{totalFilteredCount}</strong>{' '}
          {totalFilteredCount === 1 ? 'member' : 'members'}
        </div>
      </div>
    </div>
  );
};
