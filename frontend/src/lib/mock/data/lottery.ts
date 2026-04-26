import { LotteryDraw } from '@/lib/types';
import { mockUsers } from './users';

export const mockLotteryDraws: LotteryDraw[] = [
  {
    id: 'draw_2',
    mahber_id: 'mah_1',
    cycle_number: 2,
    winner_id: 'usr_2',
    payout_amount: 50000,
    draw_date: new Date(Date.now() - 86400000 * 30).toISOString(), // 1 month ago
    winner: mockUsers[1]
  },
  {
    id: 'draw_1',
    mahber_id: 'mah_1',
    cycle_number: 1,
    winner_id: 'usr_1',
    payout_amount: 50000,
    draw_date: new Date(Date.now() - 86400000 * 60).toISOString(), // 2 months ago
    winner: mockUsers[0]
  }
];
