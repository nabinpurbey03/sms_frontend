export type WeekDay =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface SchoolSetting {
  tenant_id: string;
  academic_days: WeekDay[];
}

export interface SchoolSettingUpdateRequest {
  academic_days: WeekDay[];
}

export type CalendarEventType = 'HOLIDAY' | 'EXAM' | 'EVENT' | 'VACATION' | 'OTHER';

export interface AcademicCalendarEvent {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  title: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  is_holiday: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEventCreateDTO {
  academic_year_id: string;
  title: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  is_holiday: boolean;
  description?: string | null;
}

export interface CalendarEventUpdateDTO {
  academic_year_id?: string;
  title?: string;
  event_type?: CalendarEventType;
  start_date?: string;
  end_date?: string;
  is_holiday?: boolean;
  description?: string | null;
}

export interface CalendarEventFilterParams {
  academic_year_id?: string;
  is_holiday?: boolean;
  from_date?: string;
  to_date?: string;
}
