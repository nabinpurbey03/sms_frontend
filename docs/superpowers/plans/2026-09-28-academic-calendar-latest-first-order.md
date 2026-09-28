# Academic Calendar List View Latest-First Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable "Latest First" ordering for Academic Calendar events in the Admin School Settings List View, supported by backend `ORDER BY` query parameters (`order_by`, `order_direction`) and a flexible frontend sort control defaulting to latest event date first.

**Architecture:** 
1. Backend: Enhance `AcademicCalendarService.list_events` and the GET `/academic/tenants/{tenantId}/calendar-events` endpoint to support SQL `ORDER BY` sorting (`start_date` or `created_at`, in `desc` or `asc` order) and expose `created_at` / `updated_at` in the event DTO.
2. Frontend: Update `CalendarEventFilterParams` in `types.ts`, and update `AcademicCalendarView.tsx` to sort events latest first by default (`b.start_date.localeCompare(a.start_date)`), request sorted events from the backend, and add a quick sort selector dropdown (Latest Date First, Earliest Date First, Recently Added).

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, pytest, TypeScript, React 19, TanStack Query, shadcn/ui, Tailwind CSS.

**Spec:** User request: "for admin, school setting -> academic calendar -> list view, can we make the event in latest first, if you need to make it happen from using ORDER BY you can do that". Clarified preference: Event Date descending (Latest event date first: latest upcoming/future dates appear at the top), with an optional sort selector to switch to Earliest or Recently Added.

---

### Task 1: Backend Calendar API & Service Order By Support

**Files:**
- Modify: `E:\SSUP\backend\src\modules\academic\calendar_schemas.py:37-49`
- Modify: `E:\SSUP\backend\src\modules\academic\calendar_service.py:16-41`
- Modify: `E:\SSUP\backend\src\modules\academic\routers\calendar.py:24-48`
- Test: `E:\SSUP\backend\tests\test_academic_calendar_api.py`

**Interfaces:**
- Consumes: `AcademicCalendarEvent` model in `src/modules/academic/models.py`
- Produces: 
  - `AcademicCalendarEventResponseDTO`: includes `created_at: Optional[datetime]`, `updated_at: Optional[datetime]`
  - `AcademicCalendarService.list_events(db, tenant_id, academic_year_id, from_date, to_date, is_holiday, order_by, order_direction)`
  - Endpoint GET `/api/v1/academic/tenants/{tenant_id}/calendar-events?order_by=start_date&order_direction=desc`

- [ ] **Step 1: Write the failing test for ORDER BY queries in `tests/test_academic_calendar_api.py`**

Add a test function `test_calendar_event_ordering` in `tests/test_academic_calendar_api.py`:
```python
def test_calendar_event_ordering(default_academic_year):
    from fastapi.testclient import TestClient
    from src.main import app
    from src.core.database import get_db
    from src.core.security import hash_password
    from src.modules.identity.models import User
    import random

    client = TestClient(app)
    db = next(get_db())

    # Create tenant & admin
    unique_suffix = f"{random.randint(100000, 999999)}"
    t_res = client.post(
        "/api/v1/super-admin/tenants",
        headers={"X-Super-Admin-Key": "super-secret-key"},
        json={"name": f"Calendar Order Test {unique_suffix}"},
    )
    tenant_id = t_res.json()["data"]["id"]
    ay = default_academic_year(db, tenant_id)

    admin_phone = f"98{random.randint(10000000, 99999999)}"
    admin_email = f"admin_order_{unique_suffix}@school.com"
    admin = User(
        email=admin_email,
        password=hash_password("Pass123!"),
        first_name="Order",
        last_name="Admin",
        phone=admin_phone,
    )
    db.add(admin)
    db.commit()

    client.post(
        f"/api/v1/tenants/{tenant_id}/members/admin/assign",
        headers={"X-Super-Admin-Key": "super-secret-key"},
        json={"phone": admin_phone},
    )
    auth_res = client.post("/api/v1/auth/login", json={"email": admin_email, "password": "Pass123!"})
    headers = {
        "Authorization": f"Bearer {auth_res.json()['access_token']}",
        "X-Tenant-ID": tenant_id,
    }

    # Create 3 events on different dates: Early, Mid, Late
    client.post(
        f"/api/v1/academic/tenants/{tenant_id}/calendar-events",
        headers=headers,
        json={"academic_year_id": ay.id, "title": "Early Event", "start_date": "2026-04-15", "end_date": "2026-04-15", "event_type": "EVENT", "is_holiday": False},
    )
    client.post(
        f"/api/v1/academic/tenants/{tenant_id}/calendar-events",
        headers=headers,
        json={"academic_year_id": ay.id, "title": "Late Event", "start_date": "2026-12-25", "end_date": "2026-12-25", "event_type": "HOLIDAY", "is_holiday": True},
    )
    client.post(
        f"/api/v1/academic/tenants/{tenant_id}/calendar-events",
        headers=headers,
        json={"academic_year_id": ay.id, "title": "Mid Event", "start_date": "2026-08-10", "end_date": "2026-08-10", "event_type": "EXAM", "is_holiday": False},
    )

    # Test DESC (Latest first): Late -> Mid -> Early
    res_desc = client.get(
        f"/api/v1/academic/tenants/{tenant_id}/calendar-events?academic_year_id={ay.id}&order_by=start_date&order_direction=desc",
        headers=headers,
    )
    assert res_desc.status_code == 200
    titles_desc = [e["title"] for e in res_desc.json()["data"]]
    assert titles_desc == ["Late Event", "Mid Event", "Early Event"]
    assert "created_at" in res_desc.json()["data"][0]

    # Test ASC (Earliest first): Early -> Mid -> Late
    res_asc = client.get(
        f"/api/v1/academic/tenants/{tenant_id}/calendar-events?academic_year_id={ay.id}&order_by=start_date&order_direction=asc",
        headers=headers,
    )
    assert res_asc.status_code == 200
    titles_asc = [e["title"] for e in res_asc.json()["data"]]
    assert titles_asc == ["Early Event", "Mid Event", "Late Event"]
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
.venv\Scripts\pytest.exe tests/test_academic_calendar_api.py -k test_calendar_event_ordering -v
```
Expected: FAIL (query parameters `order_by` and `order_direction` not handled; events returned in default ascending order).

- [ ] **Step 3: Update `calendar_schemas.py`**

In `E:\SSUP\backend\src\modules\academic\calendar_schemas.py`:
Add `created_at` and `updated_at`:
```python
from datetime import date, datetime
...
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Update `calendar_service.py` and `routers/calendar.py`**

In `E:\SSUP\backend\src\modules\academic\calendar_service.py`:
Update `list_events`:
```python
    @staticmethod
    def list_events(
        db: Session,
        tenant_id: str,
        academic_year_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        is_holiday: Optional[bool] = None,
        order_by: Optional[str] = "start_date",
        order_direction: Optional[str] = "asc",
    ) -> List[AcademicCalendarEventResponseDTO]:
        query = select(AcademicCalendarEvent).where(
            AcademicCalendarEvent.tenant_id == tenant_id,
            AcademicCalendarEvent.deleted_at == None,
        )
        if academic_year_id:
            query = query.where(AcademicCalendarEvent.academic_year_id == academic_year_id)
        if from_date:
            query = query.where(AcademicCalendarEvent.end_date >= from_date)
        if to_date:
            query = query.where(AcademicCalendarEvent.start_date <= to_date)
        if is_holiday is not None:
            query = query.where(AcademicCalendarEvent.is_holiday == is_holiday)

        # Ordering logic
        direction = (order_direction or "asc").lower()
        if order_by == "created_at":
            sort_col = AcademicCalendarEvent.created_at
        else:
            sort_col = AcademicCalendarEvent.start_date

        if direction == "desc":
            query = query.order_by(sort_col.desc(), AcademicCalendarEvent.title.asc())
        else:
            query = query.order_by(sort_col.asc(), AcademicCalendarEvent.title.asc())

        events = list(db.scalars(query).all())
        return [AcademicCalendarEventResponseDTO.model_validate(e) for e in events]
```

In `E:\SSUP\backend\src\modules\academic\routers/calendar.py`:
```python
@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[List[AcademicCalendarEventResponseDTO]],
    summary="List academic calendar events for a school tenant",
)
def list_calendar_events(
    tenant_id: str,
    academic_year_id: Optional[str] = Query(None, description="Optional academic year filter"),
    from_date: Optional[date] = Query(None, description="Optional start of date window"),
    to_date: Optional[date] = Query(None, description="Optional end of date window"),
    is_holiday: Optional[bool] = Query(None, description="Optional filter by holiday status"),
    order_by: Optional[str] = Query("start_date", description="Field to sort by: 'start_date' or 'created_at'"),
    order_direction: Optional[str] = Query("asc", description="Sort direction: 'asc' or 'desc'"),
    db: Session = Depends(get_db),
    _member: TenantMembershipContext = Depends(get_current_tenant_member),
):
    events = AcademicCalendarService.list_events(
        db=db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        from_date=from_date,
        to_date=to_date,
        is_holiday=is_holiday,
        order_by=order_by,
        order_direction=order_direction,
    )
    return ApiResponse(status=True, message="Calendar events retrieved successfully", data=events)
```

- [ ] **Step 5: Run tests and verify they pass**

Run:
```powershell
.venv\Scripts\pytest.exe tests/test_academic_calendar_api.py -v
```
Expected: PASS (all tests pass, including ordering test).

- [ ] **Step 6: Commit backend changes**

```bash
git -C E:\SSUP\backend add src/modules/academic/calendar_schemas.py src/modules/academic/calendar_service.py src/modules/academic/routers/calendar.py tests/test_academic_calendar_api.py
git -C E:\SSUP\backend commit -m "feat(academic): add order_by and order_direction support for calendar events"
```

---

### Task 2: Frontend Types & Academic Calendar List View Latest-First Ordering

**Files:**
- Modify: `E:\SSUP\frontend\src\features\school-settings\types.ts:55-61`
- Modify: `E:\SSUP\frontend\src\features\school-settings\components\AcademicCalendarView.tsx`

**Interfaces:**
- Consumes:
  - `CalendarEventFilterParams`: `{ academic_year_id, order_by, order_direction, is_holiday, from_date, to_date }`
  - `useCalendarEvents(tenantId, params)`
- Produces:
  - Default sort order: Latest event date first (`LATEST_DATE`)
  - Sort select dropdown in list view: `LATEST_DATE` ("Latest Date First"), `EARLIEST_DATE` ("Earliest Date First"), `RECENTLY_ADDED` ("Recently Added")

- [ ] **Step 1: Update `CalendarEventFilterParams` in `types.ts`**

In `E:\SSUP\frontend\src\features\school-settings\types.ts`:
```typescript
export interface CalendarEventFilterParams {
  academic_year_id?: string;
  is_holiday?: boolean;
  from_date?: string;
  to_date?: string;
  order_by?: 'start_date' | 'created_at';
  order_direction?: 'asc' | 'desc';
}
```

- [ ] **Step 2: Update `AcademicCalendarView.tsx`**

1. Import `ArrowUpDown` from `lucide-react`.
2. Add type and state for sorting:
```typescript
type SortOption = 'LATEST_DATE' | 'EARLIEST_DATE' | 'RECENTLY_ADDED';
const [sortOrder, setSortOrder] = useState<SortOption>('LATEST_DATE');
```
3. Map `sortOrder` to backend query params:
```typescript
const queryParams = useMemo<CalendarEventFilterParams | undefined>(() => {
  if (!activeYearId) return undefined;
  if (sortOrder === 'RECENTLY_ADDED') {
    return { academic_year_id: activeYearId, order_by: 'created_at', order_direction: 'desc' };
  }
  if (sortOrder === 'EARLIEST_DATE') {
    return { academic_year_id: activeYearId, order_by: 'start_date', order_direction: 'asc' };
  }
  return { academic_year_id: activeYearId, order_by: 'start_date', order_direction: 'desc' };
}, [activeYearId, sortOrder]);

const {
  data: events = [],
  isLoading: isLoadingEvents,
  isError,
} = useCalendarEvents(tenantId, queryParams);
```
4. Update `filteredEvents` memo to sort according to `sortOrder`:
```typescript
const filteredEvents = useMemo(() => {
  let list = [...events];
  if (filterType !== 'ALL') {
    if (filterType === 'HOLIDAY') {
      list = list.filter((e) => e.is_holiday || e.event_type === 'HOLIDAY');
    } else {
      list = list.filter((e) => e.event_type === filterType);
    }
  }

  return list.sort((a, b) => {
    if (sortOrder === 'LATEST_DATE') {
      // Latest event start_date first
      const dateCmp = b.start_date.localeCompare(a.start_date);
      if (dateCmp !== 0) return dateCmp;
      return a.title.localeCompare(b.title);
    }
    if (sortOrder === 'RECENTLY_ADDED') {
      // Most recently created first
      if (a.created_at && b.created_at) {
        const createCmp = b.created_at.localeCompare(a.created_at);
        if (createCmp !== 0) return createCmp;
      }
      return b.start_date.localeCompare(a.start_date);
    }
    // Default to EARLIEST_DATE
    const dateCmp = a.start_date.localeCompare(b.start_date);
    if (dateCmp !== 0) return dateCmp;
    return a.title.localeCompare(b.title);
  });
}, [events, filterType, sortOrder]);
```
5. Add the Sort Control in the controls toolbar (visible in List View):
```tsx
{/* Sort Selector Dropdown */}
{viewMode === 'list' && (
  <div className="flex items-center gap-1.5">
    <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as SortOption)}>
      <SelectTrigger className="h-8 text-xs font-medium w-[170px]" aria-label="Sort events order">
        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
        <SelectValue placeholder="Sort events" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="LATEST_DATE">Latest Date First</SelectItem>
        <SelectItem value="EARLIEST_DATE">Earliest Date First</SelectItem>
        <SelectItem value="RECENTLY_ADDED">Recently Added</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

- [ ] **Step 3: Run TypeScript typecheck**

Run:
```powershell
npx tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 4: Run Vite build**

Run:
```powershell
npm run build
```
Expected: PASS (bundle built successfully).

- [ ] **Step 5: Commit frontend changes**

```bash
git add src/features/school-settings/types.ts src/features/school-settings/components/AcademicCalendarView.tsx
git commit -m "feat(academic-calendar): sort list view by latest event date first with sort selector"
```

---

### Task 3: Verification & Edge Case Audit

- [ ] **Step 1: Run complete backend test suite for academic module**

Run:
```powershell
.venv\Scripts\pytest.exe tests/test_academic_calendar_api.py -v
```
Expected: 100% tests passing.

- [ ] **Step 2: Verify frontend typecheck and linter**

Run:
```powershell
npx tsc --noEmit
npm run lint
```
Expected: 0 errors.

- [ ] **Step 3: Edge Case Verification**
- Multiple events with identical `start_date`: title alphabetical order preserves deterministic ordering.
- Events missing `created_at`: gracefully falls back to `start_date` descending.
- Empty event list: renders "No calendar events found" empty state gracefully.
- Switching between `Month Grid` and `List View`: Month Grid renders appropriately on calendar cells; switching back to `List View` preserves the selected sort order (defaulting to Latest Date First).
