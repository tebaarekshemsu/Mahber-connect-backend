import { JoinRequest } from '@/lib/types';

export const mockJoinRequests: JoinRequest[] = [
  {
    id: 'jr_1',
    mahber_id: 'mah_1',
    user_id: 'usr_6',
    status: 'PENDING',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    user: { id: 'usr_6', phone: '+251966789012', name: 'Yonas Bekele', created_at: '', updated_at: '' },
  },
  {
    id: 'jr_2',
    mahber_id: 'mah_1',
    user_id: 'usr_7',
    status: 'PENDING',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    user: { id: 'usr_7', phone: '+251977890123', name: 'Selam Tadesse', created_at: '', updated_at: '' },
  },
  {
    id: 'jr_3',
    mahber_id: 'mah_1',
    user_id: 'usr_8',
    status: 'APPROVED',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    user: { id: 'usr_8', phone: '+251988901234', name: 'Mekdes Worku', created_at: '', updated_at: '' },
  },
];
