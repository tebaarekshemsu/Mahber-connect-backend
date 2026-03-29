import { Permission, PERMISSIONS } from './permissions';

export interface Role {
  name: string;
  permissions: Permission[];
}

export const DEFAULT_ROLES: Record<string, Role> = {
  Admin: {
    name: 'Admin',
    permissions: [
      PERMISSIONS.MANAGE_MEMBERS,
      PERMISSIONS.MANAGE_FINANCES,
      PERMISSIONS.CREATE_EVENTS,
      PERMISSIONS.SEND_ANNOUNCEMENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_ROLES,
    ],
  },
  Treasurer: {
    name: 'Treasurer',
    permissions: [PERMISSIONS.MANAGE_FINANCES, PERMISSIONS.VIEW_REPORTS],
  },
  Secretary: {
    name: 'Secretary',
    permissions: [PERMISSIONS.CREATE_EVENTS, PERMISSIONS.SEND_ANNOUNCEMENTS],
  },
  Member: {
    name: 'Member',
    permissions: [],
  },
};
