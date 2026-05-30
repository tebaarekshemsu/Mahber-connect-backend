# Frontend Integration Plan

This document covers:
- [Temporary Suspension with Timer (UC-08)](#temporary-suspension-with-timer-uc-08)
- [Role Limit Enforcement](#role-limit-enforcement)
- [Ranked Choice Voting (UC-19)](#ranked-choice-voting-uc-19)

## Temporary Suspension with Timer (UC-08)

Temporary suspension allows admins to suspend a member for a fixed duration. After the duration expires, the system automatically reinstates the member — no manual intervention needed.

---

## 1. Backend Endpoints

### Suspend Member (with optional duration)

```
POST /mahbers/:id/members/:memberId/suspend
```

**Request Body:**
```json
{
  "duration_days": 7,
  "reason": "Missed 3 consecutive payments"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `duration_days` | integer (min 1) | No | Days until auto-reinstate. If omitted, suspension is permanent (until manually reinstated). |
| `reason` | string | No | Reason for display |

**Response (200):**
```json
{
  "id": "membership-uuid",
  "status": "Suspended",
  "suspended_until": "2026-06-09T12:00:00.000Z",
  "suspension_reason": "Missed 3 consecutive payments"
}
```

### Reinstate Member (manual)

```
POST /mahbers/:id/members/:memberId/reinstate
```

No body required. Transitions `Suspended` → `Active`.

### Unban Member

```
POST /mahbers/:id/members/:memberId/unban
```

No body required. Transitions `Banned` → `Active`.

### Get Member Details (to check suspension status)

```
GET /mahbers/:id/members/:memberId
```

**Relevant fields in response:**
```json
{
  "id": "membership-uuid",
  "status": "Suspended",
  "suspended_until": "2026-06-09T12:00:00.000Z",
  "suspension_reason": "Missed 3 consecutive payments",
  "user": {
    "name": "Abebe Kebede",
    "phone": "+251911223344"
  }
}
```

### List Members (shows suspension info)

```
GET /mahbers/:id/members
```

Each member object includes `status`, `suspended_until`, and `suspension_reason`.

---

## 2. Data Flow

```
Admin selects "Suspend" on member
  → Modal/Sheet asks: duration + reason
  → PATCH /suspend with { duration_days, reason }
  → Backend sets status=Suspended, suspended_until=now+duration
  → Frontend refreshes member list → shows Suspended badge

[Time passes — suspended_until reached]
  → Bull queue processor runs hourly
  → Finds expired membership where status=Suspended AND suspended_until <= now
  → Transitions to Active, clears suspended_until & suspension_reason
  → Sends push notification to member

Member opens app
  → Sees notification "Your temporary suspension has expired..."
  → Can now access mahber features again
```

---

## 3. UI Components Needed

### 3.1 Member List Item — Status Badge

Each member card/row needs a status indicator:

| Status | Badge Color | Behavior |
|---|---|---|
| `Active` | Green | Normal |
| `Suspended` | Orange/Red | Show remaining time if `suspended_until` is set. Show "Permanent" if null. |
| `Banned` | Dark Red | No timer |
| `Pending` / `Approved` / `Payment_Required` | Yellow/Blue | Existing |

**Specific logic for Suspended:**
```dart
if (membership.status == 'Suspended') {
  if (membership.suspended_until != null) {
    final remaining = membership.suspended_until.difference(DateTime.now());
    if (remaining.isNegative) {
      badge = 'Suspended (expiring...)'; // will be cleared by next cron run
    } else {
      badge = 'Suspended (${remaining.inDays}d ${remaining.inHours.remainder(24)}h)';
    }
  } else {
    badge = 'Suspended (Permanent)';
  }
}
```

### 3.2 Suspend Member Dialog

A modal or bottom sheet with:

1. **Reason text field** (optional)
2. **Duration selector:**
   - Preset chips: `1 day`, `3 days`, `7 days`, `14 days`, `30 days`
   - Custom input for specific days
   - Toggle for "Permanent" (no duration — sets `duration_days` to `null`)
3. **Confirm button** — calls `POST /mahbers/:id/members/:memberId/suspend`

### 3.3 Reinstate Button

When viewing a Suspended member's profile:
- Show `suspension_reason` and `suspended_until` (with countdown)
- **Buttons:**
  - "Reinstate Now" — calls `POST /mahbers/:id/members/:memberId/reinstate`
  - "Ban Instead" — calls `POST /mahbers/:id/members/:memberId/suspend` (no duration)
    - Actually, the state machine supports `Suspended → Banned`. You would first need to transition to Banned. The current API only has suspend (Active→Suspended) and reinstate (Suspended→Active). To ban from Suspended, you'd need a different approach. The state machine allows it but there's no dedicated `POST suspend → Banned` endpoint. For now, admins can reinstate first then ban.

### 3.4 Push Notification Handling

When the auto-reinstate background job runs, it sends a push notification via Firebase. The frontend should:

1. Listen for notifications with `type: 'MEMBERSHIP_REINSTATED'`
2. Show a local notification: "Your temporary suspension has expired and your membership has been reinstated."
3. On tap → navigate to the relevant mahber dashboard

---

## 4. Error States

| Scenario | Response | Frontend Handling |
|---|---|---|
| `duration_days < 1` | 400 Bad Request | Validate min 1 day in UI before sending |
| Member not found | 404 Not Found | Show "Member not found" snackbar |
| Invalid transition (e.g. Active→Banned directly) | 400 Bad Request | The state machine handles this — frontend should only show available actions per status |
| Member already Suspended | 400 Bad Request | Show "Member is already suspended" |

---

## 5. Suggested Implementation Order

1. **Backend** ✅ Done — see `src/membership/member.service.ts`, `src/automation/processors/suspension-expiry.processor.ts`, `src/automation/schedulers/job.scheduler.ts`
2. **Prisma migration** — run `npx prisma migrate dev` (schema already has `suspended_until` and index)
3. **Frontend: Member list status badges** — parse `suspended_until` in member cards
4. **Frontend: Suspend dialog** — duration picker + reason field
5. **Frontend: Reinstate button** — on suspended member detail page
6. **Frontend: Push notification handler** — for `MEMBERSHIP_REINSTATED` type

---

## 6. API Contract Summary

```dart
// Models
class Membership {
  final String id;
  final MembershipStatus status;
  final DateTime? suspendedUntil;
  final String? suspensionReason;
  final User user;
  // ... other fields
}

enum MembershipStatus {
  pending,
  approved,
  paymentRequired,
  active,
  suspended,
  rejected,
  invalidated,
  banned,
}

// API calls
Future<Membership> suspendMember(String mahberId, String memberId, {int? durationDays, String? reason});
Future<Membership> reinstateMember(String mahberId, String memberId);
Future<Membership> unbanMember(String mahberId, String memberId);
Future<Membership> getMember(String mahberId, String memberId);
Future<PaginatedResponse<Membership>> listMembers(String mahberId, {int page, int limit});
```

---

## 7. Testing the Feature

1. **Manual test:** Suspend a member with `duration_days: 1/24` (1 hour). Check DB — `suspended_until` should be set. Wait for the next cron run or trigger it manually via Redis/Bull board.
2. **Cron test:** Run `checkAndReinstateExpiredSuspensions()` directly in a test. Verify member is reinstated.
3. **Edge case:** Suspend with `duration_days: null` — should be permanent (no auto-reinstate).
4. **Edge case:** Reinstate manually before expiry — should work (state machine allows Suspended→Active).

---

## Role Limit Enforcement

### Overview

Admins can configure per-role member caps (e.g., maximum 2 Treasurers) in the Mahber configuration. When assigning a role, the backend checks the limit and rejects the assignment if it would be exceeded.

### Configuration

Role limits are stored in the Mahber `configuration` JSONB field under the `role_limits` key:

```json
{
  "contribution_amount": 500,
  "payment_frequency": "Monthly",
  "role_limits": {
    "Treasurer": 2,
    "Secretary": 3,
    "Advisor": 1
  }
}
```

Any role name can have a limit — both built-in (`Admin`, `Treasurer`, `Secretary`, `Member`, `Advisor`) and custom roles.

### Backend Endpoint

```
PUT /mahbers/:id/members/:memberId/role
```

**Request Body:**
```json
{
  "role_name": "Treasurer",
  "custom_permissions": []
}
```

**Success (200):** Returns the updated membership with the new role.

**Error (400) when limit exceeded:**
```json
{
  "statusCode": 400,
  "message": "Role limit exceeded: maximum 2 member(s) can have the \"Treasurer\" role"
}
```

### Data Flow

```
Admin opens "Assign Role" dialog for a member
  → Selects role (e.g., "Treasurer")
  → PUT /role with { role_name: "Treasurer" }
  → Backend checks:
      1. Actor has manage_roles permission
      2. Target member exists and is Active
      3. Not removing last Admin
      4. Checks mahber.configuration.role_limits["Treasurer"]
      5. Counts current Active members with role "Treasurer"
      6. If count >= limit → 400 error
  → On success → updates role, returns membership
  → On error → show "Limit exceeded" message
```

### UI Components

#### 4.1 Role Selection Dialog

The existing role assignment UI needs to:

1. **Fetch Mahber configuration** — to know the role limits (you can get these from `GET /mahbers/:id` which returns `configuration`)

2. **Show limit info** next to each role option:
   ```
   Treasurer (2/2 — full)
   Secretary (1/3)
   Advisor (0/1)
   ```

3. **Disable/limit roles** that have reached their cap. You don't strictly need to fetch limits client-side — the backend will reject the request. But showing the cap proactively is better UX.

**To compute current counts client-side**, you can:
```dart
// From GET /mahbers/:id/members — filter active members by role name
int countByRole(List<Member> members, String roleName) {
  return members.where((m) =>
    m.status == MembershipStatus.active &&
    m.role?.name == roleName
  ).length;
}
```

#### 4.2 Error Handling

| Scenario | Response | Frontend Handling |
|---|---|---|
| Role limit exceeded | 400 | Show snackbar: "Maximum 2 members can have Treasurer role" |
| Role assignment OK | 200 | Update member list, refresh role display |

### Implementation Order

1. **Backend** ✅ Done — `src/membership/role.service.ts:96-125`
2. **Set role limits** — admins configure via Mahber settings UI (writes to `configuration.role_limits`)
3. **Frontend: Show role cap** — in role picker, show `current/limit` per role
4. **Frontend: Error handling** — display backend error messages on limit violation

---

## Ranked Choice Voting (UC-19)

### Overview

The system supports ranked choice (preferential) voting as a poll option. Members rank candidates in order of preference (1st, 2nd, 3rd, ...). The backend uses Instant Runoff Voting (IRV) to determine the winner: ballots are counted by first preference, the lowest candidate is eliminated each round, and votes are redistributed until one candidate has >50% of active votes.

### Backend Status — Fully Implemented ✅

| Component | File | Status |
|---|---|---|
| `PollType` enum with `RANKED_CHOICE` | `prisma/schema.prisma:458` | ✅ |
| Poll creation (accepts poll_type) | `src/communication/poll.service.ts:create()` | ✅ |
| Vote validation (no dupes, min 1 choice) | `src/communication/poll.service.ts:validatePollAndVoteRequest()` | ✅ |
| IRV results algorithm | `src/communication/poll.service.ts:getResults()` | ✅ |
| `irv_rounds` in results API response | `src/communication/poll.service.ts:getResults()` | ✅ |

### API Endpoints (all exist, no changes needed)

All poll endpoints work generically for all poll types:

```
POST   /mahbers/:id/polls                    → Create poll (use poll_type: "RANKED_CHOICE")
POST   /mahbers/:id/polls/:pollId/vote       → Cast vote (choices array = ranked order)
PUT    /mahbers/:id/polls/:pollId/vote       → Edit vote before deadline
GET    /mahbers/:id/polls/:pollId/results    → Get results (includes irv_rounds for RANKED_CHOICE)
```

### Vote Format

For RANKED_CHOICE polls, the `choices` array represents **ranked preference order**:

```json
// Voter ranks: Option A = 1st, Option B = 2nd, Option C = 3rd
{ "choices": ["opt_a", "opt_b", "opt_c"] }
```

### Results Format (IRV)

```json
{
  "poll_id": "...",
  "poll_type": "RANKED_CHOICE",
  "is_closed": true,
  "total_votes": 50,
  "results": [
    { "option_id": "opt_a", "option_text": "Candidate A", "vote_count": 22 },
    { "option_id": "opt_b", "option_text": "Candidate B", "vote_count": 28 }
  ],
  "irv_rounds": [
    {
      "round": 1,
      "counts": { "opt_a": 20, "opt_b": 15, "opt_c": 15 },
      "eliminated": ["opt_c"]
    },
    {
      "round": 2,
      "counts": { "opt_a": 22, "opt_b": 28 },
      "eliminated": [],
      "winner": "opt_b"
    }
  ]
}
```

### Frontend Changes ✅ Done

| Change | Location |
|---|---|
| Poll type selector in creation dialog | `chat/page.tsx:693-706` |
| Ranked choice option interaction (tap to rank, tap ranked to unrank) | `chat/page.tsx:316-321` |
| Rank number badge (1, 2, 3...) on ranked options | `chat/page.tsx:486-489` |
| "Ranked" badge in poll header | `chat/page.tsx:459-461` |
| Ranked-specific results display (first-preference bar) | `chat/page.tsx:513-543` |

### Voting UX Flow

```
Admin creates poll with type "Ranked Choice"
  → Poll appears in chat feed with [Ranked] badge
  → Member taps options to rank:
      Tap "Candidate A" → shows "1" badge
      Tap "Candidate B" → shows "2" badge (A stays "1")
      Tap "Candidate A" → removes rank, B becomes "1"
  → Member taps "Submit vote" → backend stores choices in order
  → Results show first-preference counts
  → Use GET /results for full IRV round data
```
