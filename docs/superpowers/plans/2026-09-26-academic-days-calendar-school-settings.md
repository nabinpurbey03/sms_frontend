# Academic Days, Academic Calendar, and School Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement tenant-configurable weekly academic days (e.g., Sunday–Friday, Saturday off), an academic calendar with holidays and events, a unified "School Setting" hub in the sidebar under "Administration" (incorporating academic sessions transferred from the dashboard), and align attendance analytics and marking to the academic year and working days.

**Architecture:**
- **Backend**:
  - `SchoolSetting` model in `src/modules/tenant/settings_models.py` storing per-tenant weekly `academic_days` (JSON list of day names: `["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]`).
  - `AcademicCalendarEvent` model in `src/modules/academic/models.py` storing per-tenant and per-academic-year events, holidays, and breaks (`title`, `event_type`, `start_date`, `end_date`, `is_holiday`, `description`).
  - Dedicated APIs:
    - `/api/v1/tenants/{tenant_id}/settings` for reading (Admin, Office Admin, Teacher) and updating (Admin only) school settings.
    - `/api/v1/academic/tenants/{tenant_id}/calendar-events` for reading (All members) and managing (Admin only) calendar events.
  - Hardened Attendance Safeguards:
    - `AttendanceService.mark_attendance` enforces that `record_date` is a configured academic day and not a declared calendar holiday (rejecting with 400).
  - Academic-Year-Aligned Attendance Analytics:
    - `AttendanceService.get_school_attendance_report` and `get_class_attendance_report` support `academic_year_id` and compute scheduled academic days vs actual recorded days.
    - `AcademicAnalyticsService.compute_attendance_intelligence` tags weekday trends with `is_academic_day`.
- **Frontend**:
  - Domain slice `src/features/school-settings/` containing:
    - Tab 1: **Academic Sessions (`Manage Sessions`)**: Transferred from the dashboard, displaying the sessions table, status badges, create session dialog, close year, platform rollover, and class progression pipeline.
    - Tab 2: **Weekly Schedule (`Academic Days`)**: Interactive weekday toggles (Sunday to Saturday) with one-click presets (e.g. Sunday–Friday with Saturday off, Monday–Friday with weekend off).
    - Tab 3: **Academic Calendar**: Session-scoped calendar & holiday agenda, KPI counts (Holidays, Exam periods, Breaks), and event creation/editing modal dialog.
    - Tab 4: **School Profile**: School name, domain, email, phone, address, and logo management.
  - Sidebar Navigation (`AppShell.tsx`):
    - Add "School Settings" under the "Administration" category, guarded by `can('MANAGE_TENANT_SETTINGS')`.
  - Dashboard Page (`DashboardPage.tsx`):
    - Remove the "Manage Sessions" action button from the dashboard header (retaining the session context switcher dropdown).
  - Attendance Reports (`AttendanceReportsPage.tsx`):
    - Add Academic Year selector and "Full Academic Year" date preset.
    - Dynamically render weekday breakdown based on the tenant's configured academic days.
  - Mark Attendance (`MarkAttendancePage.tsx`):
    - Visually highlight and disable non-academic days and calendar holidays in the date picker.

**Tech Stack:**
- FastAPI 0.141+, SQLAlchemy 2.0, Alembic, PostgreSQL / SQLite
- React 19, TypeScript, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui, Lucide React, Sonner

**Spec:** User specification for academic days for weeks, tenant-isolated academic calendar managed by ADMIN only, "School Setting" in sidebar inside "Administration" category holding these features, transfer of "Manage session" from dashboard, and attendance analytics working per academic year.

## Global Constraints
- Only `ADMIN` (and `SUPER_ADMIN`) can mutate school settings, academic days, and academic calendar events.
- All endpoints must be tenant-isolated (`tenant_id` validation via `TenantMembershipContext`).
- Database models must support both PostgreSQL (production) and SQLite (development).
- Attendance marking must reject non-academic days and declared calendar holidays with descriptive error messages.
- The minimum touch target across all new interactive UI elements must adhere to WCAG 2.5.5 (≥ 44x44px).
- Zero placeholders: All implementations must include complete code, validation, and automated tests.

---

### Task 1: Backend Database Models for SchoolSetting and AcademicCalendarEvent

**Files:**
- Create: `backend/src/modules/tenant/settings_models.py`
- Modify: `backend/src/modules/academic/models.py`
- Test: `backend/tests/test_school_settings_models.py`

**Interfaces:**
- Consumes: `src.common.models.Base`, `src.common.models.TenantBase`, `src.common.models.UUIDPrimaryKeyMixin`, `src.common.models.TimestampMixin`
- Produces: `SchoolSetting` model, `AcademicCalendarEvent` model

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_school_settings_models.py
import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.common.models import Base
from src.modules.tenant.models import Tenant
from src.modules.tenant.settings_models import SchoolSetting
from src.modules.academic.models import AcademicYear, AcademicCalendarEvent

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_school_setting_model_defaults(db_session):
    tenant = Tenant(name="Test Academy", domain_name="test-acad")
    db_session.add(tenant)
    db_session.flush()

    setting = SchoolSetting(
        tenant_id=tenant.id,
        academic_days=["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]
    )
    db_session.add(setting)
    db_session.commit()

    retrieved = db_session.query(SchoolSetting).filter_by(tenant_id=tenant.id).first()
    assert retrieved is not None
    assert "sunday" in retrieved.academic_days
    assert "saturday" not in retrieved.academic_days

def test_academic_calendar_event_model(db_session):
    tenant = Tenant(name="Test Academy", domain_name="test-acad-2")
    db_session.add(tenant)
    db_session.flush()

    year = AcademicYear(
        tenant_id=tenant.id,
        name="2026/2027",
        start_date=date(2026, 4, 1),
        end_date=date(2027, 3, 31),
        is_current=True
    )
    db_session.add(year)
    db_session.flush()

    event = AcademicCalendarEvent(
        tenant_id=tenant.id,
        academic_year_id=year.id,
        title="Dashain Vacation",
        event_type="VACATION",
        start_date=date(2026, 10, 10),
        end_date=date(2026, 10, 20),
        is_holiday=True,
        description="Annual autumn festival break"
    )
    db_session.add(event)
    db_session.commit()

    retrieved = db_session.query(AcademicCalendarEvent).filter_by(id=event.id).first()
    assert retrieved is not None
    assert retrieved.title == "Dashain Vacation"
    assert retrieved.is_holiday is True
    assert retrieved.event_type == "VACATION"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_school_settings_models.py`
Expected: FAIL (ModuleNotFoundError or AttributeError for `SchoolSetting` / `AcademicCalendarEvent`)

- [ ] **Step 3: Implement `SchoolSetting` and `AcademicCalendarEvent` models**

Create `backend/src/modules/tenant/settings_models.py`:
```python
from typing import List, Optional
from sqlalchemy import ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.common.models import Base, TimestampMixin, UUIDPrimaryKeyMixin

DEFAULT_ACADEMIC_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]

class SchoolSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Tenant-specific school settings including weekly academic working days.
    """
    __tablename__ = "school_settings"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    academic_days: Mapped[List[str]] = mapped_column(
        JSON, nullable=False, default=list(DEFAULT_ACADEMIC_DAYS)
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_school_setting_tenant"),
    )

    def __repr__(self) -> str:
        return f"<SchoolSetting tenant_id={self.tenant_id} academic_days={self.academic_days}>"
```

Add to `backend/src/modules/academic/models.py`:
```python
class AcademicCalendarEvent(TenantBase):
    """
    Academic calendar events, holidays, examinations, and vacation schedules for a school tenant.
    """
    __tablename__ = "academic_calendar_events"

    academic_year_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, default="HOLIDAY")  # HOLIDAY, EXAM, EVENT, VACATION, OTHER
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    academic_year: Mapped["AcademicYear"] = relationship("AcademicYear")

    def __repr__(self) -> str:
        return f"<AcademicCalendarEvent id={self.id} title={self.title} is_holiday={self.is_holiday}>"
```

Also import `SchoolSetting` into `src/modules/tenant/models.py` and `alembic/env.py` to ensure discovery.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_school_settings_models.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/tenant/settings_models.py src/modules/academic/models.py tests/test_school_settings_models.py
git commit -m "feat(backend): add SchoolSetting and AcademicCalendarEvent models"
```

---

### Task 2: Alembic Database Migration for School Settings and Calendar Events

**Files:**
- Create: `backend/alembic/versions/2026_09_26_1200-a1b2c3d4e5f7_add_school_settings_and_academic_calendar.py`

- [ ] **Step 1: Write the migration script**

```python
"""add school settings and academic calendar events

Revision ID: a1b2c3d4e5f7
Revises: f1a2b3c4d5e6
Create Date: 2026-09-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Create school_settings table
    op.create_table(
        'school_settings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=False),
        sa.Column('academic_days', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', name='uq_school_setting_tenant')
    )
    op.create_index(op.f('ix_school_settings_tenant_id'), 'school_settings', ['tenant_id'], unique=False)

    # 2. Create academic_calendar_events table
    op.create_table(
        'academic_calendar_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=False),
        sa.Column('academic_year_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_holiday', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_academic_calendar_events_tenant_id'), 'academic_calendar_events', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_academic_calendar_events_academic_year_id'), 'academic_calendar_events', ['academic_year_id'], unique=False)
    op.create_index(op.f('ix_academic_calendar_events_start_date'), 'academic_calendar_events', ['start_date'], unique=False)
    op.create_index(op.f('ix_academic_calendar_events_end_date'), 'academic_calendar_events', ['end_date'], unique=False)

def downgrade() -> None:
    op.drop_table('academic_calendar_events')
    op.drop_table('school_settings')
```

- [ ] **Step 2: Run Alembic upgrade test**

Run: `uv run alembic upgrade head`
Expected: Migration applies successfully without error.

- [ ] **Step 3: Commit**

```bash
git add alembic/versions/2026_09_26_1200-a1b2c3d4e5f7_add_school_settings_and_academic_calendar.py
git commit -m "feat(migration): add school_settings and academic_calendar_events tables"
```

---

### Task 3: Backend School Settings Schemas, Service & API Router

**Files:**
- Create: `backend/src/modules/tenant/settings_schemas.py`
- Create: `backend/src/modules/tenant/settings_service.py`
- Modify: `backend/src/modules/tenant/router.py`
- Test: `backend/tests/test_school_settings_api.py`

**Interfaces:**
- Consumes: `SchoolSetting` model, `DEFAULT_ACADEMIC_DAYS`
- Produces: `SchoolSettingResponseDTO`, `SchoolSettingUpdateRequest`, `GET /tenants/{tenant_id}/settings`, `PUT /tenants/{tenant_id}/settings`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_school_settings_api.py
import pytest
from fastapi.testclient import TestClient

def test_get_and_update_school_settings_flow(client: TestClient, admin_auth_headers, teacher_auth_headers, test_tenant_id):
    # 1. GET default settings (Sunday-Friday)
    res = client.get(f"/api/v1/tenants/{test_tenant_id}/settings", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "sunday" in data["academic_days"]
    assert "saturday" not in data["academic_days"]

    # 2. Teacher cannot update settings
    bad_res = client.put(
        f"/api/v1/tenants/{test_tenant_id}/settings",
        json={"academic_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]},
        headers=teacher_auth_headers
    )
    assert bad_res.status_code == 403

    # 3. Admin updates settings to 5-day week
    update_res = client.put(
        f"/api/v1/tenants/{test_tenant_id}/settings",
        json={"academic_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]},
        headers=admin_auth_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["academic_days"] == ["monday", "tuesday", "wednesday", "thursday", "friday"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_school_settings_api.py`
Expected: FAIL (404 Not Found on `/tenants/{id}/settings`)

- [ ] **Step 3: Implement schemas, service, and router endpoints**

Create `backend/src/modules/tenant/settings_schemas.py`:
```python
from typing import List, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_DAYS = ("sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday")
DayName = Literal["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

class SchoolSettingUpdateRequest(BaseModel):
    academic_days: List[DayName] = Field(..., min_length=1, max_length=7, description="Weekly academic working days")

    @field_validator("academic_days")
    @classmethod
    def validate_unique_days(cls, v: List[str]) -> List[str]:
        cleaned = [d.lower().strip() for d in v]
        for d in cleaned:
            if d not in VALID_DAYS:
                raise ValueError(f"Invalid weekday: {d}")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Duplicate days are not allowed.")
        return cleaned

class SchoolSettingResponseDTO(BaseModel):
    tenant_id: str
    academic_days: List[str]
    model_config = ConfigDict(from_attributes=True)
```

Create `backend/src/modules/tenant/settings_service.py`:
```python
from sqlalchemy.orm import Session
from sqlalchemy import select
from src.modules.tenant.settings_models import SchoolSetting, DEFAULT_ACADEMIC_DAYS
from src.modules.tenant.settings_schemas import SchoolSettingResponseDTO, SchoolSettingUpdateRequest
from src.core.audit import record_audit, AuditAction, AuditStatus

class SchoolSettingService:
    @staticmethod
    def get_settings(db: Session, tenant_id: str) -> SchoolSettingResponseDTO:
        setting = db.scalar(select(SchoolSetting).where(SchoolSetting.tenant_id == tenant_id))
        if not setting:
            return SchoolSettingResponseDTO(tenant_id=tenant_id, academic_days=list(DEFAULT_ACADEMIC_DAYS))
        return SchoolSettingResponseDTO(tenant_id=tenant_id, academic_days=setting.academic_days)

    @staticmethod
    def update_settings(
        db: Session,
        tenant_id: str,
        payload: SchoolSettingUpdateRequest,
        user_id: str,
        ip_address: str = None,
        user_agent: str = None,
    ) -> SchoolSettingResponseDTO:
        setting = db.scalar(select(SchoolSetting).where(SchoolSetting.tenant_id == tenant_id))
        if not setting:
            setting = SchoolSetting(tenant_id=tenant_id, academic_days=payload.academic_days)
            db.add(setting)
        else:
            setting.academic_days = payload.academic_days
        db.flush()

        record_audit(
            db=db,
            action=AuditAction.TENANT_UPDATED,
            status=AuditStatus.SUCCESS,
            user_id=user_id,
            tenant_id=tenant_id,
            resource_id=setting.id,
            resource_type="school_settings",
            ip_address=ip_address,
            user_agent=user_agent,
            details=f"Updated academic days to: {', '.join(payload.academic_days)}"
        )
        return SchoolSettingResponseDTO(tenant_id=tenant_id, academic_days=setting.academic_days)
```

Add endpoints to `backend/src/modules/tenant/router.py`:
```python
@router.get(
    "/{tenant_id}/settings",
    response_model=ApiResponse[SchoolSettingResponseDTO],
    summary="Get tenant school settings including academic days",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OFFICE_ADMIN, UserRole.TEACHER))],
)
def get_school_settings(tenant_id: str, db: Session = Depends(get_db)):
    settings = SchoolSettingService.get_settings(db, tenant_id)
    return ApiResponse(status=True, message="School settings retrieved", data=settings)

@router.put(
    "/{tenant_id}/settings",
    response_model=ApiResponse[SchoolSettingResponseDTO],
    summary="Update tenant school settings (Admin only)",
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def update_school_settings(
    request: Request,
    tenant_id: str,
    body: SchoolSettingUpdateRequest,
    member: TenantMembershipContext = Depends(get_current_tenant_member),
    db: Session = Depends(get_db),
):
    ip, user_agent = _extract_client_info(request)
    settings = SchoolSettingService.update_settings(
        db, tenant_id, body, user_id=member.user.id, ip_address=ip, user_agent=user_agent
    )
    return ApiResponse(status=True, message="School settings updated successfully", data=settings)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_school_settings_api.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/tenant/settings_schemas.py src/modules/tenant/settings_service.py src/modules/tenant/router.py tests/test_school_settings_api.py
git commit -m "feat(backend): implement school settings schemas, service, and API endpoints"
```

---

### Task 4: Backend Academic Calendar Schemas, Service & Router

**Files:**
- Create: `backend/src/modules/academic/calendar_schemas.py`
- Create: `backend/src/modules/academic/calendar_service.py`
- Create: `backend/src/modules/academic/routers/calendar.py`
- Modify: `backend/src/modules/academic/routers/__init__.py`
- Test: `backend/tests/test_academic_calendar_api.py`

**Interfaces:**
- Consumes: `AcademicCalendarEvent`, `AcademicYear`
- Produces: CRUD endpoints under `/api/v1/academic/tenants/{tenant_id}/calendar-events`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_academic_calendar_api.py
import pytest
from fastapi.testclient import TestClient

def test_calendar_event_lifecycle(client: TestClient, admin_auth_headers, teacher_auth_headers, test_tenant_id, test_academic_year_id):
    payload = {
        "academic_year_id": test_academic_year_id,
        "title": "Winter Break",
        "event_type": "VACATION",
        "start_date": "2026-12-25",
        "end_date": "2027-01-02",
        "is_holiday": True,
        "description": "School closed for winter break"
    }
    create_res = client.post(
        f"/api/v1/academic/tenants/{test_tenant_id}/calendar-events",
        json=payload,
        headers=admin_auth_headers
    )
    assert create_res.status_code == 201
    event_id = create_res.json()["data"]["id"]

    list_res = client.get(
        f"/api/v1/academic/tenants/{test_tenant_id}/calendar-events?academic_year_id={test_academic_year_id}",
        headers=teacher_auth_headers
    )
    assert list_res.status_code == 200
    events = list_res.json()["data"]
    assert any(e["id"] == event_id for e in events)

    del_bad = client.delete(
        f"/api/v1/academic/tenants/{test_tenant_id}/calendar-events/{event_id}",
        headers=teacher_auth_headers
    )
    assert del_bad.status_code == 403

    del_ok = client.delete(
        f"/api/v1/academic/tenants/{test_tenant_id}/calendar-events/{event_id}",
        headers=admin_auth_headers
    )
    assert del_ok.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_academic_calendar_api.py`
Expected: FAIL (404 Not Found)

- [ ] **Step 3: Implement schemas, service, and calendar router**

Create `backend/src/modules/academic/calendar_schemas.py`:
```python
from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

CalendarEventType = Literal["HOLIDAY", "EXAM", "EVENT", "VACATION", "OTHER"]

class AcademicCalendarEventCreateDTO(BaseModel):
    academic_year_id: str
    title: str = Field(..., min_length=2, max_length=150)
    event_type: CalendarEventType = "HOLIDAY"
    start_date: date
    end_date: date
    is_holiday: bool = True
    description: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date > self.end_date:
            raise ValueError("start_date cannot be after end_date")
        return self

class AcademicCalendarEventUpdateDTO(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    event_type: Optional[CalendarEventType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_holiday: Optional[bool] = None
    description: Optional[str] = Field(None, max_length=500)

class AcademicCalendarEventResponseDTO(BaseModel):
    id: str
    tenant_id: str
    academic_year_id: str
    title: str
    event_type: str
    start_date: date
    end_date: date
    is_holiday: bool
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
```

Create `backend/src/modules/academic/calendar_service.py` with methods: `list_events`, `create_event`, `update_event`, `delete_event`, and `check_is_holiday(db, tenant_id, date)`.

Create `backend/src/modules/academic/routers/calendar.py` and register it in `backend/src/modules/academic/routers/__init__.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_academic_calendar_api.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/academic/calendar_schemas.py src/modules/academic/calendar_service.py src/modules/academic/routers/calendar.py src/modules/academic/routers/__init__.py tests/test_academic_calendar_api.py
git commit -m "feat(backend): implement academic calendar events schemas, service, and router"
```

---

### Task 5: Enforce Academic Days & Calendar Holidays in Attendance Marking

**Files:**
- Modify: `backend/src/modules/attendance/service.py:35-80`
- Test: `backend/tests/test_attendance_academic_days_guard.py`

**Interfaces:**
- Consumes: `SchoolSettingService.get_settings`, `AcademicCalendarService.check_is_holiday`
- Produces: 400 Bad Request if marking attendance on non-academic days or calendar holidays

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_attendance_academic_days_guard.py
import pytest
from datetime import date
from fastapi.testclient import TestClient

def test_cannot_mark_attendance_on_off_day(client: TestClient, admin_auth_headers, test_tenant_id, test_class_id, test_section_id):
    client.put(
        f"/api/v1/tenants/{test_tenant_id}/settings",
        json={"academic_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]},
        headers=admin_auth_headers
    )

    sunday_date = "2026-09-20"  # Sunday
    res = client.post(
        f"/api/v1/attendance/tenants/{test_tenant_id}/classes/{test_class_id}/sections/{test_section_id}?record_date={sunday_date}",
        json={"present_student_ids": []},
        headers=admin_auth_headers
    )
    assert res.status_code == 400
    assert "not configured as an academic working day" in res.json()["message"].lower()

def test_cannot_mark_attendance_on_calendar_holiday(client: TestClient, admin_auth_headers, test_tenant_id, test_academic_year_id, test_class_id, test_section_id):
    holiday_date = "2026-09-21"  # Monday
    client.post(
        f"/api/v1/academic/tenants/{test_tenant_id}/calendar-events",
        json={
            "academic_year_id": test_academic_year_id,
            "title": "Constitution Day Holiday",
            "event_type": "HOLIDAY",
            "start_date": holiday_date,
            "end_date": holiday_date,
            "is_holiday": True
        },
        headers=admin_auth_headers
    )

    res = client.post(
        f"/api/v1/attendance/tenants/{test_tenant_id}/classes/{test_class_id}/sections/{test_section_id}?record_date={holiday_date}",
        json={"present_student_ids": []},
        headers=admin_auth_headers
    )
    assert res.status_code == 400
    assert "holiday" in res.json()["message"].lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_attendance_academic_days_guard.py`
Expected: FAIL

- [ ] **Step 3: Update `AttendanceService.mark_attendance`**

In `backend/src/modules/attendance/service.py`:
- Fetch tenant settings: `weekday_name = record_date.strftime("%A").lower()`. If `weekday_name not in settings.academic_days`, raise `BadRequestException(f"{record_date.strftime('%A')} is not configured as an academic working day for this school.")`.
- Check active calendar holidays: Query `AcademicCalendarEvent` for `tenant_id`, where `is_holiday == True`, `deleted_at == None`, and `start_date <= record_date <= end_date`. If found, raise `BadRequestException(f"Cannot mark attendance on declared school holiday: {holiday.title}.")`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_attendance_academic_days_guard.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/attendance/service.py tests/test_attendance_academic_days_guard.py
git commit -m "feat(attendance): enforce weekly academic days and calendar holidays in mark_attendance"
```

---

### Task 6: Align Attendance Analytics & Reports with Academic Year and Academic Days

**Files:**
- Modify: `backend/src/modules/attendance/service.py:490-600`
- Modify: `backend/src/modules/academic/analytics_service.py:195-260`
- Modify: `backend/src/modules/attendance/router.py`
- Test: `backend/tests/test_attendance_academic_year_analytics.py`

**Interfaces:**
- Consumes: `academic_year_id` query param, `SchoolSetting`, `AcademicCalendarEvent`
- Produces: Enriched attendance reports and analytics scoped by academic year with scheduled vs recorded operational days

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_attendance_academic_year_analytics.py
import pytest
from fastapi.testclient import TestClient

def test_attendance_report_with_academic_year_scope(client: TestClient, admin_auth_headers, test_tenant_id, test_academic_year_id):
    res = client.get(
        f"/api/v1/attendance/tenants/{test_tenant_id}/school/report?academic_year_id={test_academic_year_id}",
        headers=admin_auth_headers
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "expected_school_days" in data
    assert "academic_year_id" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_attendance_academic_year_analytics.py`
Expected: FAIL

- [ ] **Step 3: Update `AttendanceService` and `AcademicAnalyticsService`**

- In `AttendanceService.get_school_attendance_report` and `get_class_attendance_report`:
  - Accept `academic_year_id: Optional[str] = None`.
  - If `academic_year_id` provided, default `from_date` and `to_date` to `[ay.start_date, min(today, ay.end_date)]` if not explicitly specified.
  - Calculate `expected_school_days`: number of dates in range that match `academic_days` and are not holidays in `AcademicCalendarEvent`.
  - Add `academic_year_id` and `expected_school_days` to response schemas and output.
- In `AcademicAnalyticsService.compute_attendance_intelligence`:
  - Fetch `academic_days` for the tenant.
  - In `day_of_week_trends`, set `is_academic_day: True` if day is in `academic_days`, else `False`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_attendance_academic_year_analytics.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/attendance/service.py src/modules/attendance/schemas.py src/modules/attendance/router.py src/modules/academic/analytics_service.py src/modules/academic/analytics_schemas.py tests/test_attendance_academic_year_analytics.py
git commit -m "feat(analytics): align attendance reports and intelligence with academic year and academic days"
```

---

### Task 7: Frontend School Settings Feature Slice (API, Types, Hooks, and Schema)

**Files:**
- Create: `frontend/src/features/school-settings/types.ts`
- Create: `frontend/src/features/school-settings/schema.ts`
- Create: `frontend/src/features/school-settings/api.ts`
- Create: `frontend/src/features/school-settings/hooks.ts`
- Test: Build verification (`npm run build`)

**Interfaces:**
- Produces: `useSchoolSettings`, `useUpdateSchoolSettings`, `useCalendarEvents`, `useCreateCalendarEvent`, `useUpdateCalendarEvent`, `useDeleteCalendarEvent`

- [ ] **Step 1: Create `types.ts` and `schema.ts`**

Define TypeScript interfaces:
- `SchoolSettingDTO`: `{ tenant_id: string; academic_days: string[] }`
- `AcademicCalendarEventDTO`: `{ id: string; tenant_id: string; academic_year_id: string; title: string; event_type: 'HOLIDAY'|'EXAM'|'EVENT'|'VACATION'|'OTHER'; start_date: string; end_date: string; is_holiday: boolean; description?: string }`
- Zod validation schemas for forms.

- [ ] **Step 2: Create `api.ts`**

Implement strongly-typed Axios API calls:
- `getSettings(tenantId)`: `GET /tenants/${tenantId}/settings`
- `updateSettings(tenantId, payload)`: `PUT /tenants/${tenantId}/settings`
- `getCalendarEvents(tenantId, academicYearId)`: `GET /academic/tenants/${tenantId}/calendar-events`
- `createCalendarEvent(tenantId, payload)`: `POST /academic/tenants/${tenantId}/calendar-events`
- `updateCalendarEvent(tenantId, eventId, payload)`: `PATCH /academic/tenants/${tenantId}/calendar-events/${eventId}`
- `deleteCalendarEvent(tenantId, eventId)`: `DELETE /academic/tenants/${tenantId}/calendar-events/${eventId}`

- [ ] **Step 3: Create `hooks.ts`**

Create TanStack Query queries and mutations with key invalidation:
- `useSchoolSettings(tenantId)`
- `useUpdateSchoolSettings()`
- `useCalendarEvents(tenantId, academicYearId)`
- `useCreateCalendarEvent()`
- `useUpdateCalendarEvent()`
- `useDeleteCalendarEvent()`

- [ ] **Step 4: Verify types and compilation**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/types.ts src/features/school-settings/schema.ts src/features/school-settings/api.ts src/features/school-settings/hooks.ts
git commit -m "feat(frontend): add school-settings types, schemas, api client, and query hooks"
```

---

### Task 8: Frontend Weekly Academic Days Configuration Component

**Files:**
- Create: `frontend/src/features/school-settings/components/AcademicDaysConfig.tsx`

**Interfaces:**
- Consumes: `useSchoolSettings`, `useUpdateSchoolSettings`
- Props: `{ tenantId: string; canManage: boolean }`

- [ ] **Step 1: Implement `AcademicDaysConfig.tsx`**

Features:
- Card displaying:
  - Header: "Weekly Academic Days" & description.
  - 7 day cards (Sunday through Saturday).
  - Checkbox toggle with active state badges ("School Day" in green / "Weekend Off" in muted).
  - Quick preset buttons:
    - `Sunday – Friday (6 Days)` (Default Nepal/Mid-East)
    - `Monday – Friday (5 Days)` (Standard)
    - `Monday – Saturday (6 Days)`
  - Summary banner: e.g. "6 Academic Days active, 1 Day off (Saturday). Attendance marking and operational analytics will strictly respect these days."
  - Save Changes button (disabled if not dirty or no changes) with pending spinner.
  - Toast confirmation via Sonner.

- [ ] **Step 2: Verify component build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/components/AcademicDaysConfig.tsx
git commit -m "feat(frontend): create AcademicDaysConfig component with presets and day toggles"
```

---

### Task 9: Frontend Academic Calendar Component & Dialog

**Files:**
- Create: `frontend/src/features/school-settings/components/CalendarEventDialog.tsx`
- Create: `frontend/src/features/school-settings/components/AcademicCalendarView.tsx`

**Interfaces:**
- Consumes: `useCalendarEvents`, `useCreateCalendarEvent`, `useUpdateCalendarEvent`, `useDeleteCalendarEvent`, `useAcademicYears`
- Props: `{ tenantId: string; canManage: boolean }`

- [ ] **Step 1: Implement `CalendarEventDialog.tsx`**

Modal dialog to create/edit calendar events:
- Form fields: Title, Event Type (Holiday, Exam, Vacation, Event, Other), Start Date, End Date (with "Single Day Event" checkbox), "Mark as School Off / Holiday" toggle, Description.
- Zod validation and React Hook Form.

- [ ] **Step 2: Implement `AcademicCalendarView.tsx`**

Features:
- Academic Session selector for filtering calendar events.
- Metrics summary cards:
  - Total Holidays (with off days count)
  - Scheduled Exams
  - Vacations & Breaks
  - Special Events
- Visual event list / timeline:
  - Date badge (e.g. "Oct 10 - Oct 20" or "Sep 25")
  - Title and description
  - Category badge (Red for Holiday, Violet for Exam, Amber for Vacation, Blue for Event)
  - "School Off" indicator
  - Edit & Delete actions for admins with confirmation
- "Add Calendar Event" action button opening dialog.

- [ ] **Step 3: Verify component build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/school-settings/components/CalendarEventDialog.tsx src/features/school-settings/components/AcademicCalendarView.tsx
git commit -m "feat(frontend): create AcademicCalendarView and CalendarEventDialog components"
```

---

### Task 10: Frontend General School Profile Settings Component

**Files:**
- Create: `frontend/src/features/school-settings/components/SchoolGeneralSettings.tsx`

**Interfaces:**
- Consumes: `useTenant`, `useUpdateTenant`, `useUpdateTenantLogo`
- Props: `{ tenantId: string; canManage: boolean }`

- [ ] **Step 1: Implement `SchoolGeneralSettings.tsx`**

Features:
- School Logo preview with "Upload Logo" trigger (`TenantLogoDialog`).
- School Name, Domain Name (read-only/editable as appropriate), Contact Email, Contact Phone.
- Address fields: Province, District, Municipality, Ward, Tole.
- Save Profile action with validation and Sonner feedback.

- [ ] **Step 2: Verify component build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/components/SchoolGeneralSettings.tsx
git commit -m "feat(frontend): create SchoolGeneralSettings component for school profile management"
```

---

### Task 11: Unified School Settings Page Component

**Files:**
- Create: `frontend/src/features/school-settings/pages/SchoolSettingsPage.tsx`

**Interfaces:**
- Combines:
  - Tab 1: **Academic Sessions (`Manage Sessions`)**: Embedded `AcademicYearsPage` content, session table, create year, close year, set current, platform rollover, and class progression pipeline.
  - Tab 2: **Weekly Academic Days (`Academic Days`)**: `AcademicDaysConfig`.
  - Tab 3: **Academic Calendar**: `AcademicCalendarView`.
  - Tab 4: **School Profile**: `SchoolGeneralSettings`.
- Supports URL tab synchronization: `?tab=sessions|academic-days|calendar|profile`.

- [ ] **Step 1: Implement `SchoolSettingsPage.tsx`**

Create the page with tab switching, header, description, responsive layout, and permissions verification.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/pages/SchoolSettingsPage.tsx
git commit -m "feat(frontend): create unified SchoolSettingsPage hub with 4 administration tabs"
```

---

### Task 12: Sidebar Navigation Integration & Dashboard Session Transfer

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx:160-220`
- Modify: `frontend/src/features/dashboard/pages/DashboardPage.tsx:240-260`
- Modify: `frontend/src/app/router.tsx`

**Interfaces:**
- Sidebar: Add "School Settings" under "Administration"
- Route: `/school-settings`
- Redirect: `/academic-years` -> `/school-settings?tab=sessions`
- Dashboard: Remove "Manage Sessions" action button from header bar

- [ ] **Step 1: Update `AppShell.tsx`**

Add to `navItems` under category `'Administration'`:
```tsx
{
  label: 'School Settings',
  href: '/school-settings',
  icon: Settings,
  description: 'Manage academic sessions, weekly days, calendar, and school settings.',
  show: can('MANAGE_TENANT_SETTINGS'),
  category: 'Administration',
},
```

- [ ] **Step 2: Update `router.tsx`**

Register route `/school-settings` pointing to `SchoolSettingsPage`.
For `/academic-years`, redirect to `/school-settings?tab=sessions`.

- [ ] **Step 3: Update `DashboardPage.tsx`**

Remove the "Manage Sessions" button (`<Link to="/academic-years">...Manage Sessions</Link>`) from the dashboard header bar, keeping the session switcher dropdown intact.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx src/features/dashboard/pages/DashboardPage.tsx src/app/router.tsx
git commit -m "feat(nav): add School Settings to Administration sidebar and transfer Manage Sessions from dashboard"
```

---

### Task 13: Align Attendance Reports & Marking UI with Academic Year & Weekly Days

**Files:**
- Modify: `frontend/src/features/attendance/pages/AttendanceReportsPage.tsx`
- Modify: `frontend/src/features/attendance/pages/MarkAttendancePage.tsx`
- Modify: `frontend/src/features/academic/components/analytics/DayOfWeekAttendanceChart.tsx`

- [ ] **Step 1: Update `AttendanceReportsPage.tsx`**

- Fetch active academic years via `useAcademicYears(activeTenantId)`.
- Fetch school settings via `useSchoolSettings(activeTenantId)`.
- Add Academic Year selector dropdown at the top of Attendance Reports.
- Add preset: `session` ("Full Academic Year") setting `fromDate` to `year.start_date` and `toDate` to `min(today, year.end_date)`.
- Render `WEEKDAYS` dynamically using tenant's configured `academic_days` (supporting Sunday-Friday).

- [ ] **Step 2: Update `MarkAttendancePage.tsx`**

- Fetch `useSchoolSettings(activeTenantId)` and `useCalendarEvents(activeTenantId)`.
- In the date picker, disable dates that are non-academic days or calendar holidays, and display a helpful badge (e.g. "Saturday (Off)" or "Holiday: Dashain Vacation").

- [ ] **Step 3: Update `DayOfWeekAttendanceChart.tsx`**

- Annotate weekend / off days in the tooltip and chart bars so non-working days are not mislabeled as low attendance days.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/pages/AttendanceReportsPage.tsx src/features/attendance/pages/MarkAttendancePage.tsx src/features/academic/components/analytics/DayOfWeekAttendanceChart.tsx
git commit -m "feat(attendance): align attendance reports, marking date picker, and charts with academic year and working days"
```

---

### Task 14: Comprehensive Verification & Regression Testing

**Files:**
- Test: All backend tests (`backend/tests/`)
- Test: Frontend build & lint

- [ ] **Step 1: Run full backend test suite**

Run: `uv run pytest tests/ -v`
Expected: 100% PASS with 0 errors.

- [ ] **Step 2: Run frontend build and typecheck**

Run: `npm run build`
Expected: PASS with 0 type errors.

- [ ] **Step 3: Final commit and verification summary**

```bash
git status
```

---

## Verification Plan

### Automated Tests
1. **Backend Tests**:
   - `uv run pytest tests/test_school_settings_models.py -v`: Models, foreign keys, cascade delete, JSON column.
   - `uv run pytest tests/test_school_settings_api.py -v`: RBAC restrictions (ADMIN can update, TEACHER gets 403, defaults to Sunday-Friday).
   - `uv run pytest tests/test_academic_calendar_api.py -v`: CRUD for calendar events, date validation, filtering.
   - `uv run pytest tests/test_attendance_academic_days_guard.py -v`: 400 rejection when marking attendance on non-academic days or calendar holidays.
   - `uv run pytest tests/test_attendance_academic_year_analytics.py -v`: Academic year scoping and scheduled vs recorded days.
   - `uv run pytest tests/ -v`: Full regression test across all 87+ existing backend tests.
2. **Frontend Tests & Build**:
   - `npm run build`: Compiles TypeScript and bundles SPA with 0 errors.
   - `npm run lint`: Oxlint verification.

### Manual Verification
1. **School Settings Navigation**:
   - Log in as `ADMIN` (Principal).
   - In sidebar under "Administration", verify "School Settings" appears with the settings icon.
   - Click "School Settings" -> lands on `/school-settings`.
   - Verify all 4 tabs are present:
     - "Academic Sessions (Manage Sessions)"
     - "Weekly Academic Days"
     - "Academic Calendar"
     - "School Profile"
2. **Dashboard Verification**:
   - Navigate to `/dashboard`.
   - Verify "Manage Sessions" button is removed from the dashboard header bar, while the session switcher dropdown remains intact.
3. **Weekly Academic Days**:
   - Switch to "Weekly Academic Days" tab.
   - Select "Sunday – Friday (Saturday Off)".
   - Click "Save Changes" -> toast confirms success.
   - Refresh page -> verify settings persist.
4. **Academic Calendar**:
   - Switch to "Academic Calendar" tab.
   - Click "Add Event / Holiday".
   - Create a holiday for upcoming Monday.
   - Verify holiday card appears in the list with "School Off" indicator.
5. **Mark Attendance Guardrail**:
   - Navigate to `/attendance/mark`.
   - Try selecting Saturday or the created holiday.
   - Verify visual indicator / disabled state and backend prevention.
6. **Attendance Reports**:
   - Navigate to `/attendance/reports`.
   - Verify Academic Session dropdown is present.
   - Select "Full Academic Year" preset -> verify date range automatically sets to the academic year bounds.
   - Verify Sunday appears in the weekday matrix for Sunday–Friday schools.
