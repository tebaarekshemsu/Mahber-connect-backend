import { apiClient } from '../client';
import { Mahber, Membership, CreateMahberDto } from '@/lib/types';

export const mahberApi = {
  getMyMahbers: async (): Promise<Membership[]> => {
    const response = await apiClient.get<Membership[]>('/mahbers/my-mahbers');
    return response.data;
  },
  
  getPublicMahbers: async (): Promise<Mahber[]> => {
    const response = await apiClient.get<Mahber[]>('/mahbers/public');
    return response.data;
  },

  createMahber: async (data: CreateMahberDto): Promise<Mahber> => {
    const response = await apiClient.post<Mahber>('/mahbers', data);
    return response.data;
  },

  getMahberById: async (id: string): Promise<Mahber> => {
    const response = await apiClient.get<Mahber>(`/mahbers/${id}`);
    return response.data;
  },

  joinMahber: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/mahbers/${id}/join`);
    return response.data;
  }
};
