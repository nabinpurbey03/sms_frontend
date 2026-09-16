import React, { useState, useRef, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useTenants, useTenant } from '@/features/tenants/hooks';
import type { Tenant } from '@/features/tenants/types';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ChevronDown,
  Search,
  Check,
  X,
  Loader2,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SchoolSearchSelectProps {
  selectedTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  className?: string;
}

export const SchoolSearchSelect: React.FC<SchoolSearchSelectProps> = ({
  selectedTenantId,
  onSelectTenant,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 250);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch tenants matching the search term from the backend API
  const { data: tenantsResponse, isLoading } = useTenants({
    search: debouncedSearch.trim() || undefined,
    page_size: 50,
  });

  // Fetch specifically selected tenant details to guarantee display name
  const { data: selectedTenant } = useTenant(selectedTenantId || null);

  const tenants: Tenant[] = tenantsResponse?.items || [];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (tenantId: string) => {
    onSelectTenant(tenantId);
    setIsOpen(false);
  };

  const displayName = selectedTenant?.name || (selectedTenantId ? 'School Selected' : 'Choose School to View');

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-9 px-3 text-xs justify-between gap-2 min-w-[220px] max-w-[320px] bg-background font-medium hover:bg-muted/60"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {selectedTenantId ? (
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{displayName}</span>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 opacity-50 shrink-0 ml-1 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-1.5 w-72 sm:w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Search Input Box */}
          <div className="p-2 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search school name or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-background rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/70"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-[260px] overflow-y-auto p-1 space-y-0.5">
            {/* Option to clear filter and go back to Global Platform Scope */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={cn(
                'w-full text-left cursor-pointer text-xs rounded-lg px-2.5 py-2 flex items-center justify-between transition-colors hover:bg-accent hover:text-accent-foreground',
                !selectedTenantId && 'bg-primary/10 font-bold text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="italic">-- All Schools (Global View) --</span>
              </div>
              {!selectedTenantId && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
            </button>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Searching schools...</span>
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No schools found matching &quot;{searchTerm}&quot;
              </div>
            ) : (
              tenants.map((t) => {
                const isSelected = t.id === selectedTenantId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className={cn(
                      'w-full text-left cursor-pointer text-xs rounded-lg px-2.5 py-2 flex items-center justify-between transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-primary/10 font-bold text-primary'
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono opacity-80 truncate">
                        {t.domain_name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
