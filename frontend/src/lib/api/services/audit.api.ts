import { apiClient } from '../client';
import { PaginatedResponse, AuditTrailEntry } from '@/lib/types';

export const auditApi = {
  getAuditTrail: async (mahberId: string, page = 1, limit = 50): Promise<PaginatedResponse<AuditTrailEntry>> => {
    const response = await apiClient.get<PaginatedResponse<AuditTrailEntry>>(
      `/mahbers/${mahberId}/audit-trail?page=${page}&limit=${limit}`
    );
    return response.data;
  }
};
