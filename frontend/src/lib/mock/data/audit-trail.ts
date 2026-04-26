import { AuditTrailEntry } from '@/lib/types';
import { mockUsers } from './users';

export const mockAuditTrail: AuditTrailEntry[] = [
  {
    id: 'aud_1',
    mahber_id: 'mah_1',
    actor_id: 'usr_1',
    action_type: 'MAHBER_CREATED',
    details: { name: 'Addis Tech Equb' },
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(), // 90 days ago
    actor: mockUsers[0]
  },
  {
    id: 'aud_2',
    mahber_id: 'mah_1',
    actor_id: 'usr_1',
    action_type: 'MEMBER_ADDED',
    details: { added_member: 'usr_2' },
    created_at: new Date(Date.now() - 86400000 * 85).toISOString(),
    actor: mockUsers[0]
  },
  {
    id: 'aud_3',
    mahber_id: 'mah_1',
    actor_id: 'usr_1',
    action_type: 'LOTTERY_DRAWN',
    details: { cycle: 1, winner: 'usr_1' },
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    actor: mockUsers[0]
  },
  {
    id: 'aud_4',
    mahber_id: 'mah_1',
    actor_id: 'usr_1',
    action_type: 'FINE_WAIVED',
    details: { fine_id: 'fine_3', reason: 'Forgiven by admin' },
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    actor: mockUsers[0]
  }
];
