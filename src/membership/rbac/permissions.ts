export const PERMISSIONS = {
  MANAGE_MEMBERS: 'manage_members',
  MANAGE_FINANCES: 'manage_finances',
  CREATE_EVENTS: 'create_events',
  SEND_ANNOUNCEMENTS: 'send_announcements',
  VIEW_REPORTS: 'view_reports',
  MANAGE_ROLES: 'manage_roles',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
