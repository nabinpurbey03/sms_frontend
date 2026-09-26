import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import {
  calendarEventFormSchema,
  type CalendarEventFormData,
  CALENDAR_EVENT_TYPES,
} from '../schema';
import { useCreateCalendarEvent, useUpdateCalendarEvent } from '../hooks';
import type { AcademicCalendarEvent } from '../types';

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  academicYearId: string;
  eventToEdit?: AcademicCalendarEvent | null;
}

export const CalendarEventDialog: React.FC<CalendarEventDialogProps> = ({
  open,
  onOpenChange,
  tenantId,
  academicYearId,
  eventToEdit,
}) => {
  const isEditing = !!eventToEdit;
  const createMutation = useCreateCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CalendarEventFormData>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      academic_year_id: academicYearId,
      title: '',
      event_type: 'HOLIDAY',
      start_date: '',
      end_date: '',
      is_holiday: true,
      description: '',
    },
  });

  const selectedType = watch('event_type');

  useEffect(() => {
    if (open) {
      if (eventToEdit) {
        reset({
          academic_year_id: eventToEdit.academic_year_id,
          title: eventToEdit.title,
          event_type: eventToEdit.event_type,
          start_date: eventToEdit.start_date,
          end_date: eventToEdit.end_date,
          is_holiday: eventToEdit.is_holiday,
          description: eventToEdit.description || '',
        });
      } else {
        reset({
          academic_year_id: academicYearId,
          title: '',
          event_type: 'HOLIDAY',
          start_date: '',
          end_date: '',
          is_holiday: true,
          description: '',
        });
      }
    }
  }, [open, eventToEdit, academicYearId, reset]);

  // When event type changes to HOLIDAY or VACATION, auto-toggle is_holiday
  const handleTypeChange = (type: (typeof CALENDAR_EVENT_TYPES)[number]) => {
    setValue('event_type', type);
    if (type === 'HOLIDAY' || type === 'VACATION') {
      setValue('is_holiday', true);
    } else if (type === 'EXAM' || type === 'EVENT') {
      setValue('is_holiday', false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: CalendarEventFormData) => {
    if (!tenantId) return;

    if (isEditing && eventToEdit) {
      await updateMutation.mutateAsync({
        tenantId,
        eventId: eventToEdit.id,
        data: {
          title: data.title,
          event_type: data.event_type,
          start_date: data.start_date,
          end_date: data.end_date,
          is_holiday: data.is_holiday,
          description: data.description || null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        tenantId,
        data: {
          academic_year_id: data.academic_year_id,
          title: data.title,
          event_type: data.event_type,
          start_date: data.start_date,
          end_date: data.end_date,
          is_holiday: data.is_holiday,
          description: data.description || null,
        },
      });
    }
    handleClose();
  };

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Calendar Event' : 'Add Calendar Event / Holiday'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the event details and holiday status for the academic calendar.'
                : 'Schedule holidays, examinations, vacations, and special school events.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <input type="hidden" {...register('academic_year_id')} />

            {/* Event Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Dashain Vacation, Mid-Term Exam, Sports Day"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Event Type */}
            <div className="space-y-1.5">
              <Label htmlFor="event_type">Category *</Label>
              <select
                id="event_type"
                value={selectedType}
                onChange={(e) =>
                  handleTypeChange(e.target.value as (typeof CALENDAR_EVENT_TYPES)[number])
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="HOLIDAY">Holiday (Public or School Holiday)</option>
                <option value="EXAM">Examination Window</option>
                <option value="VACATION">Vacation / Term Break</option>
                <option value="EVENT">School Event / Celebration</option>
                <option value="OTHER">Other Academic Milestone</option>
              </select>
              {errors.event_type && (
                <p className="text-xs text-destructive">{errors.event_type.message}</p>
              )}
            </div>

            {/* Dates: Start and End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
                {errors.start_date && (
                  <p className="text-xs text-destructive">{errors.start_date.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">End Date *</Label>
                <Input id="end_date" type="date" {...register('end_date')} />
                {errors.end_date && (
                  <p className="text-xs text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            {/* Holiday Toggle */}
            <div className="rounded-lg border border-border p-3 bg-muted/20">
              <Controller
                name="is_holiday"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="is_holiday"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="is_holiday"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        School Closed (Official Holiday)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, classes will not run on these dates and attendance marking will be disabled.
                      </p>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="Additional notes, schedule remarks, or notices..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
