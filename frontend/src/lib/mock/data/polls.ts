import { Poll } from '@/lib/types';
import { mockUsers } from './users';
import { mockVotes } from './votes';

export const mockPolls: Poll[] = [
  {
    id: 'pol_1',
    mahber_id: 'mah_1',
    question: 'Where should we host our annual fundraiser?',
    poll_type: 'SINGLE_CHOICE',
    options: [
      { id: 'opt_1', text: 'Skylight Hotel' },
      { id: 'opt_2', text: 'Hilton Addis' },
      { id: 'opt_3', text: 'Sheraton Addis' },
    ],
    voting_deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    is_closed: false,
    created_by: 'usr_1',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    creator: mockUsers[0],
    votes: mockVotes.filter(v => v.poll_id === 'pol_1'),
  },
  {
    id: 'pol_2',
    mahber_id: 'mah_1',
    question: 'Should we increase the monthly contribution by 500 ETB?',
    poll_type: 'SINGLE_CHOICE',
    options: [
      { id: 'opt_4', text: 'Yes, increase it' },
      { id: 'opt_5', text: 'No, keep it the same' },
    ],
    voting_deadline: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago (closed)
    is_closed: true,
    created_by: 'usr_1',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    creator: mockUsers[0],
    votes: mockVotes.filter(v => v.poll_id === 'pol_2'),
  },
];
