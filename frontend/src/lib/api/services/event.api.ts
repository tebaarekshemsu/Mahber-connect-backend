import { apiClient } from '../client';
import { PaginatedResponse, Event, CreateEventDto, QRCodeResponse, Attendance, EventPhoto } from '@/lib/types';

export const eventApi = {
  getEvents: async (mahberId: string, page = 1, limit = 20): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get<PaginatedResponse<Event>>(
      `/mahbers/${mahberId}/events?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getEventById: async (mahberId: string, eventId: string): Promise<Event> => {
    const response = await apiClient.get<Event>(`/mahbers/${mahberId}/events/${eventId}`);
    return response.data;
  },

  createEvent: async (mahberId: string, data: CreateEventDto): Promise<Event> => {
    const response = await apiClient.post<Event>(`/mahbers/${mahberId}/events`, data);
    return response.data;
  },

  updateEvent: async (mahberId: string, eventId: string, data: Partial<CreateEventDto>): Promise<Event> => {
    const response = await apiClient.put<Event>(`/mahbers/${mahberId}/events/${eventId}`, data);
    return response.data;
  },

  cancelEvent: async (mahberId: string, eventId: string): Promise<Event> => {
    const response = await apiClient.delete<Event>(`/mahbers/${mahberId}/events/${eventId}`);
    return response.data;
  },

  getQRCode: async (mahberId: string, eventId: string): Promise<QRCodeResponse> => {
    const response = await apiClient.get<QRCodeResponse>(`/mahbers/${mahberId}/events/${eventId}/qr`);
    return response.data;
  },

  checkIn: async (mahberId: string, eventId: string, qrToken: string): Promise<Attendance> => {
    const response = await apiClient.post<Attendance>(`/mahbers/${mahberId}/events/${eventId}/attendance`, { qr_token: qrToken });
    return response.data;
  },

  getPhotos: async (mahberId: string, eventId: string, page = 1, limit = 20): Promise<PaginatedResponse<EventPhoto>> => {
    const response = await apiClient.get<PaginatedResponse<EventPhoto>>(
      `/mahbers/${mahberId}/events/${eventId}/photos?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  uploadPhoto: async (mahberId: string, eventId: string, formData: FormData): Promise<EventPhoto> => {
    const response = await apiClient.post<EventPhoto>(`/mahbers/${mahberId}/events/${eventId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
