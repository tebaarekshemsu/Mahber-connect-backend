import { apiClient } from '../client';
import { 
  PaginatedResponse, 
  ChatMessage, 
  Announcement, 
  AnnouncementRead,
  CreateAnnouncementDto,
  Poll,
  Vote,
  CreatePollDto
} from '@/lib/types';

export const communicationApi = {
  // Chat
  getChatMessages: async (mahberId: string, page = 1, limit = 50): Promise<PaginatedResponse<ChatMessage>> => {
    const response = await apiClient.get<PaginatedResponse<ChatMessage>>(
      `/mahbers/${mahberId}/chat/messages?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  sendChatMessage: async (mahberId: string, content: string): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>(`/mahbers/${mahberId}/chat/messages`, { content });
    return response.data;
  },

  // Announcements
  getAnnouncements: async (mahberId: string, page = 1, limit = 20): Promise<PaginatedResponse<Announcement>> => {
    const response = await apiClient.get<PaginatedResponse<Announcement>>(
      `/mahbers/${mahberId}/announcements?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  createAnnouncement: async (mahberId: string, data: CreateAnnouncementDto): Promise<Announcement> => {
    const response = await apiClient.post<Announcement>(`/mahbers/${mahberId}/announcements`, data);
    return response.data;
  },

  markAnnouncementAsRead: async (mahberId: string, announcementId: string): Promise<AnnouncementRead> => {
    const response = await apiClient.post<AnnouncementRead>(`/mahbers/${mahberId}/announcements/${announcementId}/read`);
    return response.data;
  },

  // Polls
  getPolls: async (mahberId: string, page = 1, limit = 20): Promise<PaginatedResponse<Poll>> => {
    const response = await apiClient.get<PaginatedResponse<Poll>>(
      `/mahbers/${mahberId}/polls?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  createPoll: async (mahberId: string, data: CreatePollDto): Promise<Poll> => {
    const response = await apiClient.post<Poll>(`/mahbers/${mahberId}/polls`, data);
    return response.data;
  },

  vote: async (mahberId: string, pollId: string, choices: string[]): Promise<Vote> => {
    const response = await apiClient.post<Vote>(`/mahbers/${mahberId}/polls/${pollId}/vote`, { choices });
    return response.data;
  },
};
