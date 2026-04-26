import { delay, randomError } from '../utils';
import { mockPayments, mockTransactions } from '../data/financial';
import { InitiatePaymentDto } from '@/lib/types';
import { mockFines } from '../data/fines';
import { mockLotteryDraws } from '../data/lottery';
import { mockUsers } from '../data/users';

let fines = [...mockFines];
let lotteryDraws = [...mockLotteryDraws];

export const financialMock = {
  initiatePayment: async (data: InitiatePaymentDto) => {
    await delay(1200);
    randomError(0.05);
    
    const tx_ref = `tx_mock_${Date.now()}`;
    
    // In a real app, Chapa redirects here. 
    // We will simulate the Chapa checkout page by redirecting to our own mock callback URL
    const mockCheckoutUrl = `/payment/callback?tx_ref=${tx_ref}&status=success`;

    // Temporarily store it in our mock data as pending
    mockPayments.push({
      id: `pay_${Math.random()}`,
      user_id: 'usr_1',
      mahber_id: data.mahber_id,
      amount: data.amount,
      payment_type: data.payment_type,
      status: 'PENDING',
      tx_ref: tx_ref,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return { checkoutUrl: mockCheckoutUrl, tx_ref };
  },

  verifyPayment: async (tx_ref: string) => {
    await delay(800);
    const payment = mockPayments.find(p => p.tx_ref === tx_ref);
    if (!payment) throw new Error('Payment not found');
    
    // Simulate successful verification
    payment.status = 'COMPLETED';
    return payment;
  },
  
  getMahberPayments: async (mahberId: string) => {
    await delay(600);
    return mockPayments.filter(p => p.mahber_id === mahberId);
  },

  getMahberLedger: async (mahberId: string) => {
    await delay(600);
    return mockTransactions.filter(t => t.mahber_id === mahberId);
  },

  // Fines
  getFines: async (mahberId: string) => {
    await delay(500);
    return fines.filter(f => f.mahber_id === mahberId);
  },
  
  waiveFine: async (mahberId: string, fineId: string) => {
    await delay(600);
    const fineIndex = fines.findIndex(f => f.id === fineId && f.mahber_id === mahberId);
    if (fineIndex === -1) throw new Error('Fine not found');
    
    const updatedFine = { 
      ...fines[fineIndex], 
      status: 'waived' as const, 
      resolved_at: new Date().toISOString() 
    };
    fines[fineIndex] = updatedFine;
    return updatedFine;
  },

  // Lottery
  getLotteryHistory: async (mahberId: string) => {
    await delay(700);
    return lotteryDraws
      .filter(l => l.mahber_id === mahberId)
      .sort((a, b) => new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime());
  },

  drawLottery: async (mahberId: string) => {
    await delay(2000); // Simulate suspense of draw
    randomError(0.05);

    // Get members who haven't won yet
    const pastWinners = lotteryDraws.filter(l => l.mahber_id === mahberId).map(l => l.winner_id);
    const eligibleMembers = mockUsers.filter(u => !pastWinners.includes(u.id));

    if (eligibleMembers.length === 0) {
      throw new Error('All members have won. The Equb cycle is complete!');
    }

    // Pick random winner
    const winner = eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)];
    const cycle_number = lotteryDraws.filter(l => l.mahber_id === mahberId).length + 1;

    const newDraw = {
      id: `draw_${Date.now()}`,
      mahber_id: mahberId,
      cycle_number,
      winner_id: winner.id,
      payout_amount: 50000, // Mock fixed payout
      draw_date: new Date().toISOString(),
      winner
    };

    lotteryDraws = [newDraw, ...lotteryDraws];
    return newDraw;
  }
};
