import { Fine } from '@/lib/types';
import { mockUsers } from './users';

export const mockFines: Fine[] = [
  {
    id: 'fine_1',
    mahber_id: 'mah_1',
    member_id: 'usr_2', // Selamawit
    amount: 150,
    reason: 'Missed monthly meeting on March 15',
    status: 'pending',
    issued_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    member: mockUsers[1]
  },
  {
    id: 'fine_2',
    mahber_id: 'mah_1',
    member_id: 'usr_3', // Current mock user
    amount: 500,
    reason: 'Late monthly contribution (April)',
    status: 'paid',
    issued_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    resolved_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    member: mockUsers[2]
  },
  {
    id: 'fine_3',
    mahber_id: 'mah_1',
    member_id: 'usr_2',
    amount: 300,
    reason: 'Disruptive behavior during ceremony',
    status: 'waived',
    issued_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    resolved_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    member: mockUsers[1]
  }
];
