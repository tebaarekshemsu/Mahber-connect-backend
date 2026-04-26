import { Announcement } from '@/lib/types';
import { mockUsers } from './users';

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann_1',
    mahber_id: 'mah_1',
    title: 'Important: Venue Change for Next Meeting',
    content: 'Please be advised that the upcoming monthly meeting will be held at Jupiter Hotel instead of our usual location.',
    priority: 'Urgent',
    is_published: true,
    created_by: 'usr_1',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    creator: mockUsers[0],
    reads: [],
  },
  {
    id: 'ann_2',
    mahber_id: 'mah_1',
    title: 'New Equb Cycle Starting Soon',
    content: 'We are starting a new Equb cycle next month. Please ensure your balance is clear if you wish to participate.',
    priority: 'Important',
    is_published: true,
    created_by: 'usr_1',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    creator: mockUsers[0],
    reads: [
      { id: 'rd_1', announcement_id: 'ann_2', member_id: 'usr_2', read_at: new Date().toISOString() }
    ],
  },
];
