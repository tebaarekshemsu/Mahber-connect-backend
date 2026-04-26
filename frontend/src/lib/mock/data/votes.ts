import { Vote } from '@/lib/types';

export const mockVotes: Vote[] = [
  {
    id: 'vot_1',
    poll_id: 'pol_1',
    member_id: 'usr_2',
    choices: ['opt_1'],
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'vot_2',
    poll_id: 'pol_2',
    member_id: 'usr_1',
    choices: ['opt_5'],
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'vot_3',
    poll_id: 'pol_2',
    member_id: 'usr_2',
    choices: ['opt_4'],
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];
