import React from 'react';
import { Search, X, Download, UserPlus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="flex flex-col gap-3 sm:gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-xs">
      {/* Top row: Search input + Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Status selector */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden h-9 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => onStatusChange('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('ACTIVE')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('INACTIVE')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'INACTIVE'
                  ? 'bg-background text-muted-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Export CSV button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
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
              className="h-9 gap-1.5 text-xs font-medium shadow-xs"
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
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{totalFilteredCount}</span>{' '}
          {totalFilteredCount === 1 ? 'member' : 'members'}
        </div>
      </div>
    </div>
  );
};
