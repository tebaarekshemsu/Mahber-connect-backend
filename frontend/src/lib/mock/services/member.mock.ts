import { delay, randomError } from '../utils';
import { mockMemberDetails } from '../data/memberships';
import { mockJoinRequests } from '../data/join-requests';
import { MemberDetail, UpdateRoleDto, JoinRequestActionDto } from '@/lib/types';

// In-memory state so actions persist during session
let members = [...mockMemberDetails];
let joinRequests = [...mockJoinRequests];

export const memberMock = {
  getMembers: async (mahberId: string) => {
    await delay(600);
    const data = members.filter(m => m.mahber_id === mahberId);
    return {
      data,
      meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
    };
  },

  getMemberById: async (mahberId: string, memberId: string) => {
    await delay(400);
    const member = members.find(m => m.mahber_id === mahberId && m.member_id === memberId);
    if (!member) throw new Error('Member not found');
    return member;
  },

  suspendMember: async (mahberId: string, memberId: string) => {
    await delay(800);
    randomError(0.05);
    const member = members.find(m => m.mahber_id === mahberId && m.member_id === memberId);
    if (!member) throw new Error('Member not found');
    member.status = 'Suspended';
    member.updated_at = new Date().toISOString();
    return member;
  },

  reinstateMember: async (mahberId: string, memberId: string) => {
    await delay(800);
    randomError(0.05);
    const member = members.find(m => m.mahber_id === mahberId && m.member_id === memberId);
    if (!member) throw new Error('Member not found');
    member.status = 'Active';
    member.updated_at = new Date().toISOString();
    return member;
  },

  updateMemberRole: async (mahberId: string, memberId: string, data: UpdateRoleDto) => {
    await delay(700);
    randomError(0.05);
    const member = members.find(m => m.mahber_id === mahberId && m.member_id === memberId);
    if (!member) throw new Error('Member not found');
    member.role_name = data.role_name;
    if (data.custom_permissions) member.permissions = data.custom_permissions;
    member.updated_at = new Date().toISOString();
    return member;
  },

  removeMember: async (mahberId: string, memberId: string) => {
    await delay(800);
    randomError(0.05);
    members = members.filter(m => !(m.mahber_id === mahberId && m.member_id === memberId));
    return { message: 'Member removed successfully' };
  },

  getJoinRequests: async (mahberId: string) => {
    await delay(600);
    return joinRequests.filter(jr => jr.mahber_id === mahberId);
  },

  handleJoinRequest: async (mahberId: string, requestId: string, data: JoinRequestActionDto) => {
    await delay(800);
    randomError(0.05);
    const request = joinRequests.find(jr => jr.id === requestId && jr.mahber_id === mahberId);
    if (!request) throw new Error('Join request not found');
    request.status = data.action === 'approve' ? 'APPROVED' : 'REJECTED';
    if (data.rejection_reason) request.rejection_reason = data.rejection_reason;
    request.updated_at = new Date().toISOString();
    return request;
  },
};
