import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useCalendarEvents } from '@/features/school-settings/hooks';
import { useDailyAttendanceStatus } from '@/features/attendance/hooks';
import { getLocalTodayDate } from '@/features/attendance/utils/attendanceStatus';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';

export const NotificationPopover: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { isParent, isTeacher, can } = usePermission();
  const { calendarSystem } = useCalendarPreferenceStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const todayStr = useMemo(() => getLocalTodayDate(), []);

  // 1. Attendance status check
  const { data: attendanceStatus } = useDailyAttendanceStatus(
    !isParent ? activeTenantId : null,
    todayStr,
    undefined,
    { enabled: !!activeTenantId && !isParent }
  );

  // 2. Upcoming events check (next 30 days)
  const { data: events = [] } = useCalendarEvents(
    activeTenantId,
    useMemo(() => ({ from_date: todayStr }), [todayStr])
  );

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.start_date >= todayStr || (e.end_date && e.end_date >= todayStr))
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 3);
  }, [events, todayStr]);

  // Compute attendance status
  const isFullyMarked = useMemo(() => {
    if (!attendanceStatus?.sections || attendanceStatus.sections.length === 0) {
      return false;
    }
    return attendanceStatus.sections.every((s) => s.is_marked);
  }, [attendanceStatus]);

  const hasAttendancePending =
    Boolean(attendanceStatus) &&
    !isFullyMarked &&
    (can('MARK_ATTENDANCE') || isTeacher);

  const totalNotifications =
    (hasAttendancePending ? 1 : 0) + (upcomingEvents.length > 0 ? 1 : 0);

  const showBadge = totalNotifications > 0 && !isDismissed;

  const handleMarkAllRead = () => {
    setIsDismissed(true);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground relative"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {showBadge && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-xl border-border/80 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Notifications</h4>
            {showBadge && (
              <Badge variant="default" className="text-[10px] h-4 px-1.5">
                {totalNotifications} new
              </Badge>
            )}
          </div>
          {showBadge && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 p-1">
          {/* 1. Daily Attendance Status Alert */}
          {hasAttendancePending ? (
            <div className="p-3 hover:bg-muted/30 transition-colors rounded-xl space-y-1.5">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    Attendance Pending for Today
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Today&rsquo;s classroom attendance has not been completed.
                  </p>
                  <div className="pt-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-7 text-[11px] px-2.5 gap-1 text-primary border-primary/30 hover:bg-primary/5"
                      onClick={() => setIsOpen(false)}
                    >
                      <Link to="/attendance/mark">
                        <span>Mark Attendance</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : isFullyMarked ? (
            <div className="p-3 hover:bg-muted/30 transition-colors rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">Today&rsquo;s Attendance Completed</span>
              </div>
              <p className="text-[11px] text-muted-foreground pl-6">
                All sections for today have been verified and submitted.
              </p>
            </div>
          ) : null}

          {/* 2. Upcoming Calendar Events */}
          {upcomingEvents.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span>Upcoming Events</span>
              </div>
              <div className="space-y-1.5">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{evt.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDualDate(evt.start_date, calendarSystem)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-mono px-1 py-0 shrink-0"
                    >
                      {evt.event_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasAttendancePending && upcomingEvents.length === 0 && (
            <div className="py-8 px-4 text-center space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Info className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[11px] text-muted-foreground">
                No pending alerts or notifications at this time.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border/60 bg-muted/20 text-center">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full h-7 text-xs text-muted-foreground hover:text-foreground justify-center gap-1"
            onClick={() => setIsOpen(false)}
          >
            <Link to="/academic-calendar">
              <span>View Full Academic Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
