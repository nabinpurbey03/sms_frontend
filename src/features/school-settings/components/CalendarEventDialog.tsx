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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { NepaliDatePicker } from './NepaliDatePicker';
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
  initialDate?: string;
  minDate?: string;
  maxDate?: string;
}

export const CalendarEventDialog: React.FC<CalendarEventDialogProps> = ({
  open,
  onOpenChange,
  tenantId,
  academicYearId,
  eventToEdit,
  initialDate,
  minDate,
  maxDate,
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
      start_date: initialDate || '',
      end_date: initialDate || '',
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
          start_date: initialDate || '',
          end_date: initialDate || '',
          is_holiday: true,
          description: '',
        });
      }
    }
  }, [open, eventToEdit, academicYearId, initialDate, reset]);

  // Category-aware "School Closed" default: ON for Holiday and Vacation, OFF for Exam, Event, and Other
  const handleTypeChange = (type: (typeof CALENDAR_EVENT_TYPES)[number]) => {
    setValue('event_type', type);
    if (type === 'HOLIDAY' || type === 'VACATION') {
      setValue('is_holiday', true);
    } else {
      setValue('is_holiday', false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: CalendarEventFormData) => {
    if (!tenantId) return;

    if (minDate && (data.start_date < minDate || data.end_date < minDate)) {
      toast.error('Invalid Date Range', {
        description: `Event date cannot be before academic session start (${minDate}).`,
      });
      return;
    }
    if (maxDate && (data.start_date > maxDate || data.end_date > maxDate)) {
      toast.error('Invalid Date Range', {
        description: `Event date cannot be after academic session end (${maxDate}).`,
      });
      return;
    }

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
              <Select
                value={selectedType}
                onValueChange={(val) =>
                  handleTypeChange(val as (typeof CALENDAR_EVENT_TYPES)[number])
                }
              >
                <SelectTrigger id="event_type" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOLIDAY">Holiday (Public or School Holiday)</SelectItem>
                  <SelectItem value="EXAM">Examination Window</SelectItem>
                  <SelectItem value="VACATION">Vacation / Term Break</SelectItem>
                  <SelectItem value="EVENT">School Event / Celebration</SelectItem>
                  <SelectItem value="OTHER">Other Academic Milestone</SelectItem>
                </SelectContent>
              </Select>
              {errors.event_type && (
                <p className="text-xs text-destructive">{errors.event_type.message}</p>
              )}
            </div>

            {/* Dates: Start and End using Nepali (BS) Date Picker with Session Bounds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => (
                  <NepaliDatePicker
                    id="start_date"
                    label="Start Date *"
                    value={field.value}
                    minDate={minDate}
                    maxDate={maxDate}
                    onChange={(newStart) => {
                      field.onChange(newStart);
                      const currentEnd = watch('end_date');
                      if (!currentEnd || currentEnd < newStart) {
                        setValue('end_date', newStart, { shouldValidate: true });
                      }
                    }}
                    error={errors.start_date?.message}
                  />
                )}
              />

              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <NepaliDatePicker
                    id="end_date"
                    label="End Date *"
                    value={field.value}
                    minDate={watch('start_date') || minDate}
                    maxDate={maxDate}
                    onChange={field.onChange}
                    error={errors.end_date?.message}
                  />
                )}
              />
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
              <Textarea
                id="description"
                rows={3}
                placeholder="Additional notes, schedule remarks, or notices..."
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
