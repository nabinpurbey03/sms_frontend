import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  X,
  Download,
  Phone,
  Calendar,
  User,
  CheckCircle2,
  Filter,
} from 'lucide-react';

import { useAbsentStudents } from '@/features/attendance/hooks';
import { useAllClassesWithDetails } from '@/features/academic/hooks';

export interface AbsentStudentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
  initialDate?: string;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

export const AbsentStudentsDrawer: React.FC<AbsentStudentsDrawerProps> = ({
  open,
  onOpenChange,
  tenantId,
  initialDate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [classId, setClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Sync selectedDate with initialDate when opened
  useEffect(() => {
    if (open && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [open, initialDate]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch absent students
  const { data, isLoading } = useAbsentStudents(
    tenantId,
    {
      record_date: selectedDate,
      class_id: classId || undefined,
      search: debouncedSearch || undefined,
    },
    { enabled: open && !!tenantId }
  );

  // Fetch classes for class filter dropdown
  const { data: classes = [] } = useAllClassesWithDetails(open ? tenantId : null);

  // Export CSV handler
  const handleExportCsv = () => {
    if (!data?.items || data.items.length === 0) return;

    const headers = ['Student Name', 'Class', 'Section', 'Parent Name', 'Parent Phone', 'Remarks'];
    const rows = data.items.map((item) => {
      const studentName = `${item.first_name}${item.middle_name ? ` ${item.middle_name}` : ''} ${item.last_name}`.trim();
      return [
        studentName,
        item.class_name || '',
        item.section_name || 'N/A',
        item.parent_name || 'N/A',
        item.parent_phone || 'N/A',
        item.remarks || '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `absent_students_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalAbsent = data?.total_absent ?? 0;
  const items = data?.items || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border/80 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/15 text-left space-y-2">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-bold text-foreground">
                Absent Students
              </SheetTitle>
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                {totalAbsent} {totalAbsent === 1 ? 'Absentee' : 'Absentees'}
              </Badge>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {selectedDate}
            </Badge>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Roster of students absent on this date with primary parent/guardian contact details.
          </SheetDescription>
        </SheetHeader>

        {/* Toolbar & Filter Controls */}
        <div className="px-6 py-3 border-b border-border/60 bg-muted/5 flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={selectedDate}
              max={getTodayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-[130px] text-xs font-mono"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-9 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[130px]"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 pr-7 text-xs w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!items.length}
            className="h-9 text-xs gap-1.5 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span> CSV
          </Button>
        </div>

        {/* Content Roster */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-border/60 bg-card/60 animate-pulse flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : totalAbsent === 0 || items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-xl border-border/80 bg-muted/10 my-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">No Absent Students</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {searchQuery || classId
                  ? 'No absent students match your search or filter criteria for this date.'
                  : 'All marked students are present for this date!'}
              </p>
            </div>
          ) : (
            /* Absentee Roster Cards */
            <div className="space-y-3">
              {items.map((item) => {
                const studentName = `${item.first_name}${item.middle_name ? ` ${item.middle_name}` : ''} ${item.last_name}`.trim();
                const initials = `${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}`.toUpperCase() || 'S';

                return (
                  <div
                    key={item.student_id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Avatar + Names + Badges */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {studentName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="text-[11px] px-2 py-0">
                              {item.class_name}
                            </Badge>
                            {item.section_name && (
                              <Badge variant="outline" className="text-[11px] px-2 py-0">
                                Sec {item.section_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Absent status badge */}
                      <Badge
                        variant="outline"
                        className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px] shrink-0 font-medium"
                      >
                        Absent
                      </Badge>
                    </div>

                    {/* Primary Parent / Guardian Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="font-medium text-foreground truncate">
                          {item.parent_name || 'No parent linked'}
                        </span>
                        {item.parent_relationship && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0 capitalize">
                            {item.parent_relationship.toLowerCase()}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0">
                        {item.parent_phone ? (
                          <a
                            href={`tel:${item.parent_phone}`}
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                            title={`Call ${item.parent_phone}`}
                          >
                            <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{item.parent_phone}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/70 italic">
                            No phone linked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remarks if recorded */}
                    {item.remarks && (
                      <div className="text-[11px] bg-muted/40 rounded-lg p-2 text-muted-foreground border border-border/30">
                        <span className="font-semibold text-foreground/80">Remarks: </span>
                        {item.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
