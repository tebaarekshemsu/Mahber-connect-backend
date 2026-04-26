import { apiClient } from '../client';
import { MemberDetail, PaginatedResponse, UpdateRoleDto, JoinRequest, JoinRequestActionDto } from '@/lib/types';

export const memberApi = {
  getMembers: async (mahberId: string, page = 1, limit = 20): Promise<PaginatedResponse<MemberDetail>> => {
    const response = await apiClient.get<PaginatedResponse<MemberDetail>>(
      `/mahbers/${mahberId}/members?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getMemberById: async (mahberId: string, memberId: string): Promise<MemberDetail> => {
    const response = await apiClient.get<MemberDetail>(`/mahbers/${mahberId}/members/${memberId}`);
    return response.data;
  },

  suspendMember: async (mahberId: string, memberId: string): Promise<MemberDetail> => {
    const response = await apiClient.post<MemberDetail>(`/mahbers/${mahberId}/members/${memberId}/suspend`);
    return response.data;
  },

  reinstateMember: async (mahberId: string, memberId: string): Promise<MemberDetail> => {
    const response = await apiClient.post<MemberDetail>(`/mahbers/${mahberId}/members/${memberId}/reinstate`);
    return response.data;
  },

  updateMemberRole: async (mahberId: string, memberId: string, data: UpdateRoleDto): Promise<MemberDetail> => {
    const response = await apiClient.put<MemberDetail>(`/mahbers/${mahberId}/members/${memberId}/role`, data);
    return response.data;
  },

  removeMember: async (mahberId: string, memberId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/mahbers/${mahberId}/members/${memberId}`);
    return response.data;
  },

  getJoinRequests: async (mahberId: string): Promise<JoinRequest[]> => {
    const response = await apiClient.get<JoinRequest[]>(`/mahbers/${mahberId}/join-requests`);
    return response.data;
  },

  handleJoinRequest: async (mahberId: string, requestId: string, data: JoinRequestActionDto): Promise<JoinRequest> => {
    const response = await apiClient.put<JoinRequest>(`/mahbers/${mahberId}/join-requests/${requestId}`, data);
    return response.data;
  },
};
