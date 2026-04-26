import { Attendance } from '@/lib/types';
import { mockUsers } from './users';

export const mockAttendance: Attendance[] = [
  {
    id: 'att_1',
    event_id: 'evt_3',
    member_id: 'usr_1',
    mahber_id: 'mah_1',
    checked_in_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    user: mockUsers[0],
  },
  {
    id: 'att_2',
    event_id: 'evt_3',
    member_id: 'usr_2',
    mahber_id: 'mah_1',
    checked_in_at: new Date(Date.now() - 86400000 * 45 + 600000).toISOString(),
    user: mockUsers[1],
  },
];
