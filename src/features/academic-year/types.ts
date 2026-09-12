export interface AcademicYear {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicYearCreateDTO {
  name: string;
  start_date: string;
  end_date: string;
}

export interface AcademicYearUpdateDTO {
  name?: string;
  start_date?: string;
  end_date?: string;
}
