# Advisor Role — Frontend Implementation Plan

## Overview

The **Advisor** role is a mahber-scoped, read-only stakeholder role for external auditors and community elders. It has exactly one permission: `view_reports`.

Admins assign it via `PUT /mahbers/:id/members/:memberId/role` with `{ "role_name": "Advisor" }`.

---

## 1. Permission utilities

Update `lib/utils/permissions.ts` to mirror the backend:

```typescript
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: Object.values(PERMISSIONS),
  Treasurer: [PERMISSIONS.MANAGE_FINANCES, PERMISSIONS.VIEW_REPORTS],
  Secretary: [PERMISSIONS.CREATE_EVENTS, PERMISSIONS.SEND_ANNOUNCEMENTS],
  Advisor: [PERMISSIONS.VIEW_REPORTS],
  Member: [],
};

export function hasPermission(
  permissions: string[],
  required: string,
): boolean {
  return permissions.includes(required);
}

export function isAdvisorRole(role: { name: string; permissions: string[] }): boolean {
  return role.name === 'Advisor';
}

export function isReadOnlyRole(role: { name: string; permissions: string[] }): boolean {
  return (
    isAdvisorRole(role) ||
    (role.permissions.length === 1 && role.permissions[0] === PERMISSIONS.VIEW_REPORTS)
  );
}
```

**Important:** Prefer checking `permissions` from the membership API (source of truth), not only `role.name`, for custom roles that mimic Advisor.

Fetch roles for the admin assignment dropdown:

```http
GET /mahbers/:id/roles
Authorization: Bearer <token>
```

Requires `manage_roles`. Response is the `DEFAULT_ROLES` array including Advisor.

---

## 2. Auth context / mahber session

When the user selects a mahber, store membership role from `GET /mahbers/:id/members/me` (or equivalent):

```typescript
interface MahberSession {
  mahberId: string;
  role: { name: string; permissions: string[] };
}
```

Expose helpers:

- `canViewReports` → `hasPermission(permissions, 'view_reports')`
- `canManageFinances` → `hasPermission(permissions, 'manage_finances')`
- `isReadOnly` → `isReadOnlyRole(role)`

---

## 3. Navigation & route access

### Show for Advisor (`view_reports`)

| Route | Purpose |
|-------|---------|
| `/mahbers/[id]/reports` | Reports hub (new) |
| `/mahbers/[id]/reports/financial` | Financial summary + export |
| `/mahbers/[id]/reports/attendance` | Attendance trends + PDF export |
| `/mahbers/[id]/audit-trail` | Audit log (read-only) |

### Hide for Advisor (no write permissions)

- Member management (invite, approve, suspend, role change)
- Payments, fines, expenses, payouts, lottery
- Event create/edit, QR generation, manual check-in
- Announcements compose, chat moderation, polls create
- Settings that change mahber configuration

### Middleware / layout guard

```typescript
// app/mahbers/[id]/reports/layout.tsx
if (!canViewReports) redirect(`/mahbers/${id}`);
```

For Advisor landing after login → redirect to `/mahbers/[id]/reports` instead of dashboard.

---

## 4. API integration

### Financial reports

```http
GET /mahbers/:id/reports/financial?startDate=&endDate=
GET /mahbers/:id/reports/export?format=pdf|csv&startDate=&endDate=
```

Requires `view_reports` or `manage_finances`.

### Attendance reports (mahber-scoped — preferred for Advisor)

```http
GET /mahbers/:id/reports/attendance/trends?months=6
GET /mahbers/:id/reports/attendance/export?startDate=&endDate=
```

Requires `view_reports` or `create_events`.

Legacy event-scoped URLs still work but require `eventId` in the path; **do not use for Advisor UI**.

### Audit trail

```http
GET /mahbers/:id/audit-trail?page=1&limit=20
```

Requires `view_reports`.

### Per-event attendance (optional drill-down)

```http
GET /mahbers/:id/events/:eventId/attendance
GET /mahbers/:id/events/:eventId/attendance/analytics
```

Requires `view_reports` or `create_events`.

---

## 5. UI components

### 5.1 Reports hub (`/mahbers/[id]/reports`)

- Card: **Financial report** → financial page
- Card: **Attendance report** → attendance page
- Card: **Audit trail** → existing audit page
- Banner when `isReadOnly`: “You have read-only Advisor access.”

### 5.2 Financial report page

- Date range picker (`startDate`, `endDate`)
- Summary cards from `GET .../reports/financial`:
  - totalContributions, totalFines, totalExpenses, totalPayouts, netBalance
- Export buttons: PDF / CSV → `GET .../reports/export`
- **No** “Record payment”, “Add expense”, or ledger edit actions

### 5.3 Attendance report page

- Line/bar chart from `GET .../reports/attendance/trends`
- Export PDF button → `GET .../reports/attendance/export`
- Optional table: list events (read-only) linking to event attendance analytics

### 5.4 Admin — assign Advisor role

On member detail / role modal:

- Add **Advisor** to role dropdown (from `GET /mahbers/:id/roles` or hardcoded list)
- Description: “Read-only access to financial and attendance reports and audit trail.”
- Disable custom permissions when Advisor is selected

```http
PUT /mahbers/:id/members/:memberId/role
{ "role_name": "Advisor" }
```

---

## 6. `ProtectedUI` usage

```tsx
<ProtectedUI permission={PERMISSIONS.VIEW_REPORTS}>
  <Link href={`/mahbers/${id}/reports`}>Reports</Link>
</ProtectedUI>

<ProtectedUI permission={PERMISSIONS.MANAGE_FINANCES}>
  <Button onClick={recordPayment}>Record payment</Button>
</ProtectedUI>
```

Advisors see the first block only.

---

## 7. Suggested file structure (Next.js)

```
app/mahbers/[id]/reports/
  layout.tsx          # view_reports guard
  page.tsx            # hub
  financial/page.tsx
  attendance/page.tsx

components/reports/
  financial-summary.tsx
  financial-export-buttons.tsx
  attendance-trends-chart.tsx
  attendance-export-button.tsx
  advisor-read-only-banner.tsx

lib/api/reports.ts    # fetch wrappers
lib/utils/permissions.ts
```

---

## 8. Testing checklist

- [ ] User with Advisor role sees Reports + Audit only in sidebar
- [ ] Advisor can load financial report JSON and export PDF/CSV
- [ ] Advisor can load attendance trends and export PDF
- [ ] Advisor can load audit trail; cannot POST/PUT/DELETE on finances or events
- [ ] Advisor receives 403 on `manage_finances` endpoints (e.g. create expense)
- [ ] Admin can assign Advisor via role API
- [ ] Secretary/Treasurer retain existing report access where applicable

---

## 9. Implementation order

1. Update `permissions.ts` + auth context with Advisor
2. Reports hub + route guards
3. Financial report page (wire existing APIs)
4. Attendance report page (use mahber-scoped `/reports/attendance/*`)
5. Audit trail link + read-only banner
6. Admin role assignment UI
7. E2E tests for Advisor journey
