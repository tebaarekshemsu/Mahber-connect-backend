export type User = {
  id: string;
  phone: string;
  name: string;
  email?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
};

export type MahberType = 'MAHBER' | 'EQUB' | 'IDDIR';
export type MemberRole = 'ADMIN' | 'MEMBER';
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Mahber = {
  id: string;
  name: string;
  type: MahberType;
  configuration: Record<string, unknown>;
  is_public: boolean;
  invitation_code?: string;
  created_at: string;
  updated_at: string;
  _count?: {
    members: number;
  };
};

export type Membership = {
  id: string;
  user_id: string;
  mahber_id: string;
  role: MemberRole;
  joined_at: string;
  mahber?: Mahber;
  user?: User;
};

export type CreateMahberDto = {
  name: string;
  type: MahberType;
  is_public: boolean;
  configuration?: Record<string, unknown>;
};

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type PaymentType = 'CONTRIBUTION' | 'FINE' | 'PENALTY';

export type Payment = {
  id: string;
  user_id: string;
  mahber_id: string;
  amount: number;
  payment_type: PaymentType;
  status: PaymentStatus;
  tx_ref: string;
  created_at: string;
  updated_at: string;
  user?: User;
};

export type Transaction = {
  id: string;
  mahber_id: string;
  payment_id?: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  payment?: Payment;
};

export type InitiatePaymentDto = {
  mahber_id: string;
  amount: number;
  payment_type: PaymentType;
  email?: string;
};

// ── RBAC ──────────────────────────────────────────────────────────────────────
export type Permission =
  | 'manage_members'
  | 'manage_finances'
  | 'create_events'
  | 'send_announcements'
  | 'view_reports'
  | 'manage_roles';

export type RoleName = 'Admin' | 'Treasurer' | 'Secretary' | 'Member' | 'custom';

export type MembershipStatus =
  | 'Pending'
  | 'Approved'
  | 'Payment_Required'
  | 'Active'
  | 'Suspended'
  | 'Rejected'
  | 'Invalidated';

export type MemberDetail = {
  id: string;
  mahber_id: string;
  member_id: string;
  status: MembershipStatus;
  role: MemberRole;
  role_name?: RoleName;
  permissions?: Permission[];
  balance: string;
  has_won_current_cycle: boolean;
  approval_date?: string;
  activation_date?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  mahber?: Mahber;
};

export type JoinRequest = {
  id: string;
  mahber_id: string;
  user_id: string;
  status: JoinRequestStatus;
  invitation_code?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  user?: User;
};

export type UpdateRoleDto = {
  role_name: RoleName;
  custom_permissions?: Permission[];
};

export type JoinRequestActionDto = {
  action: 'approve' | 'reject';
  rejection_reason?: string;
};

// ── Generic Wrappers ──────────────────────────────────────────────────────────
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

// ── Events & Attendance ───────────────────────────────────────────────────────
export type EventType = 'Meeting' | 'Ceremony' | 'Fundraiser' | 'Social_Gathering';

export type Event = {
  id: string;
  mahber_id: string;
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  location: string;
  is_mandatory: boolean;
  is_cancelled: boolean;
  created_at: string;
};

export type Attendance = {
  id: string;
  event_id: string;
  member_id: string;
  mahber_id: string;
  checked_in_at: string;
  user?: User;
};

export type EventPhoto = {
  id: string;
  event_id: string;
  mahber_id: string;
  uploader_id: string;
  file_path: string;
  thumbnail_path?: string;
  caption?: string;
  created_at: string;
  user?: User;
};

export type QRCodeResponse = {
  qr_code: string;
};

export type CreateEventDto = {
  title: string;
  description: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  location: string;
  is_mandatory?: boolean;
};

// ── Communication & Engagement ────────────────────────────────────────────────
export type ChatMessage = {
  id: string;
  mahber_id: string;
  sender_id: string;
  content: string;
  edited_at?: string;
  is_deleted: boolean;
  created_at: string;
  sender?: User;
};

export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent';

export type AnnouncementRead = {
  id: string;
  announcement_id: string;
  member_id: string;
  read_at: string;
};

export type Announcement = {
  id: string;
  mahber_id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_audience?: string;
  scheduled_at?: string;
  is_published: boolean;
  created_by: string;
  created_at: string;
  reads?: AnnouncementRead[];
  creator?: User;
};

export type PollType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export type PollOption = {
  id: string;
  text: string;
};

export type Vote = {
  id: string;
  poll_id: string;
  member_id: string;
  choices: string[];
  created_at: string;
};

export type Poll = {
  id: string;
  mahber_id: string;
  question: string;
  options: PollOption[];
  poll_type: PollType;
  voting_deadline: string;
  eligibility_criteria?: string;
  is_closed: boolean;
  created_by: string;
  created_at: string;
  votes?: Vote[];
  creator?: User;
};

export type CreateAnnouncementDto = {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_audience?: string;
  scheduled_at?: string;
};

export type CreatePollDto = {
  question: string;
  options: string[]; // List of option texts
  poll_type: PollType;
  voting_deadline: string;
  eligibility_criteria?: string;
};

// ── Fines & Lottery ──────────────────────────────────────────────────────────
export type FineStatus = 'pending' | 'paid' | 'waived';

export type Fine = {
  id: string;
  mahber_id: string;
  member_id: string;
  amount: number;
  reason: string;
  status: FineStatus;
  issued_at: string;
  resolved_at?: string;
  member?: User; // Joined via membership for display
};

export type LotteryDraw = {
  id: string;
  mahber_id: string;
  cycle_number: number;
  winner_id: string;
  payout_amount: number;
  draw_date: string;
  winner?: User; // Joined for display
};

// ── Audit Trail ──────────────────────────────────────────────────────────────
export type AuditTrailEntry = {
  id: string;
  mahber_id: string;
  actor_id: string;
  action_type: string;
  details: any;
  created_at: string;
  actor?: User; // Joined for display
};
