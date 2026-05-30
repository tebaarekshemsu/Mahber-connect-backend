import { DEFAULT_ROLES } from './roles';
import { PERMISSIONS } from './permissions';

describe('DEFAULT_ROLES', () => {
  it('defines Advisor as read-only with view_reports only', () => {
    const advisor = DEFAULT_ROLES.Advisor;
    expect(advisor.name).toBe('Advisor');
    expect(advisor.permissions).toEqual([PERMISSIONS.VIEW_REPORTS]);
    expect(advisor.permissions).not.toContain(PERMISSIONS.MANAGE_FINANCES);
    expect(advisor.permissions).not.toContain(PERMISSIONS.MANAGE_MEMBERS);
    expect(advisor.permissions).not.toContain(PERMISSIONS.CREATE_EVENTS);
    expect(advisor.permissions).not.toContain(PERMISSIONS.MANAGE_ROLES);
  });
});
