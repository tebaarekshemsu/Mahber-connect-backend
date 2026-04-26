import { Mahber, Membership } from '@/lib/types';
import { mockUsers } from './users';

export const mockMahbers: Mahber[] = [
  {
    id: 'mah_1',
    name: 'Addis Tech Equb',
    type: 'EQUB',
    is_public: true,
    configuration: { contribution: 5000, frequency: 'MONTHLY' },
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    _count: { members: 12 }
  },
  {
    id: 'mah_2',
    name: 'Bole Community Iddir',
    type: 'IDDIR',
    is_public: false,
    configuration: { monthly_fee: 100 },
    created_at: new Date(Date.now() - 86400000 * 120).toISOString(),
    updated_at: new Date().toISOString(),
    _count: { members: 45 }
  },
  {
    id: 'mah_3',
    name: 'Alumni Network Mahber',
    type: 'MAHBER',
    is_public: true,
    configuration: {},
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
    _count: { members: 8 }
  }
];

export const mockMemberships: Membership[] = [
  {
    id: 'mem_1',
    user_id: mockUsers[0].id,
    mahber_id: 'mah_1',
    role: 'ADMIN',
    joined_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    mahber: mockMahbers[0],
  },
  {
    id: 'mem_2',
    user_id: mockUsers[0].id,
    mahber_id: 'mah_2',
    role: 'MEMBER',
    joined_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    mahber: mockMahbers[1],
  }
];
