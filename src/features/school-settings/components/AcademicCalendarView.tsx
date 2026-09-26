import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Plus,
  Calendar,
  BookOpen,
  Sun,
  PartyPopper,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { useAcademicYears } from '@/features/academic-year/hooks';
import { useCalendarEvents, useDeleteCalendarEvent } from '../hooks';
import { CalendarEventDialog } from './CalendarEventDialog';
import type { AcademicCalendarEvent, CalendarEventType } from '../types';

interface AcademicCalendarViewProps {
  tenantId: string;
  canManage: boolean;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  tenantId,
  canManage,
}) => {
  const { data: years = [], isLoading: isLoadingYears } = useAcademicYears(tenantId);
  const deleteMutation = useDeleteCalendarEvent();

  // Selected academic year (default to current or first)
  const currentYear = useMemo(() => {
    return years.find((y) => y.is_current) || years[0];
  }, [years]);

  const [selectedYearId, setSelectedYearId] = useState<string>('');

  const activeYearId = selectedYearId || currentYear?.id || '';

  // Filter tab: 'ALL' | 'HOLIDAY' | 'EXAM' | 'VACATION' | 'EVENT'
  const [filterType, setFilterType] = useState<string>('ALL');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicCalendarEvent | null>(null);

  // Fetch events for active year
  const {
    data: events = [],
    isLoading: isLoadingEvents,
    isError,
  } = useCalendarEvents(tenantId, activeYearId ? { academic_year_id: activeYearId } : undefined);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (filterType !== 'ALL') {
      if (filterType === 'HOLIDAY') {
        list = list.filter((e) => e.is_holiday || e.event_type === 'HOLIDAY');
      } else {
        list = list.filter((e) => e.event_type === filterType);
      }
    }
    // Sort by start_date ascending
    return list.sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events, filterType]);

  // KPIs
  const stats = useMemo(() => {
    const total = events.length;
    const holidays = events.filter((e) => e.is_holiday).length;
    const exams = events.filter((e) => e.event_type === 'EXAM').length;
    const vacations = events.filter((e) => e.event_type === 'VACATION').length;
    return { total, holidays, exams, vacations };
  }, [events]);

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (event: AcademicCalendarEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = async (event: AcademicCalendarEvent) => {
    if (!window.confirm(`Are you sure you want to delete "${event.title}" from the calendar?`)) {
      return;
    }
    await deleteMutation.mutateAsync({
      tenantId,
      eventId: event.id,
    });
  };

  const getEventBadgeColor = (type: CalendarEventType, isHoliday: boolean) => {
    switch (type) {
      case 'HOLIDAY':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900';
      case 'EXAM':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900';
      case 'VACATION':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      case 'EVENT':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const calculateDaysDuration = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    } catch {
      return null;
    }
  };

  if (isLoadingYears) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading academic calendar...</span>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Academic Calendar & Holiday Planner
              </CardTitle>
              <CardDescription className="mt-1">
                Define holidays, exam periods, breaks, and events for your school session.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Academic Year Switcher */}
              <div className="flex items-center gap-2">
                <label htmlFor="calendar-year" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Academic Session:
                </label>
                <select
                  id="calendar-year"
                  value={activeYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_current ? '(Current Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {canManage && (
                <Button size="sm" onClick={handleOpenAdd} disabled={!activeYearId}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Event / Holiday
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <span className="text-xs text-muted-foreground block">Total Events</span>
              <span className="text-2xl font-bold text-foreground mt-0.5 block">{stats.total}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <span className="text-xs text-rose-600 dark:text-rose-400 block font-medium">Holidays (School Off)</span>
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">{stats.holidays}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <span className="text-xs text-purple-600 dark:text-purple-400 block font-medium">Exam Periods</span>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">{stats.exams}</span>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
              <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Vacations & Breaks</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{stats.vacations}</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { key: 'ALL', label: 'All Items' },
              { key: 'HOLIDAY', label: 'Holidays Only' },
              { key: 'EXAM', label: 'Examinations' },
              { key: 'VACATION', label: 'Vacations' },
              { key: 'EVENT', label: 'Events' },
            ].map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={filterType === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(tab.key)}
                className="h-8 text-xs px-3"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Events List / Grid */}
          {isLoadingEvents ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading calendar schedule...</span>
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Could not load calendar events</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center border rounded-xl border-dashed border-border bg-muted/20">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-foreground text-base">No calendar events found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {filterType === 'ALL'
                  ? 'No events or holidays have been scheduled for this academic session yet.'
                  : `No ${filterType.toLowerCase()} events recorded.`}
              </p>
              {canManage && filterType === 'ALL' && (
                <Button size="sm" onClick={handleOpenAdd} className="mt-4">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Event
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEvents.map((event) => {
                const duration = calculateDaysDuration(event.start_date, event.end_date);
                const isSingleDay = event.start_date === event.end_date;

                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 font-semibold ${getEventBadgeColor(
                              event.event_type,
                              event.is_holiday
                            )}`}
                          >
                            {event.event_type}
                          </Badge>
                          {event.is_holiday && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider"
                            >
                              School Closed
                            </Badge>
                          )}
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(event)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit Event"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(event)}
                              disabled={deleteMutation.isPending}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <h4 className="font-semibold text-foreground text-base mt-2">{event.title}</h4>

                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {isSingleDay ? (
                          <span>{event.start_date}</span>
                        ) : (
                          <span>
                            {event.start_date} <span className="text-muted-foreground">to</span> {event.end_date}
                          </span>
                        )}
                      </div>
                      {duration && (
                        <span className="text-muted-foreground bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                          {duration}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Add / Edit */}
      {dialogOpen && activeYearId && (
        <CalendarEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tenantId={tenantId}
          academicYearId={activeYearId}
          eventToEdit={editingEvent}
        />
      )}
    </div>
  );
};
