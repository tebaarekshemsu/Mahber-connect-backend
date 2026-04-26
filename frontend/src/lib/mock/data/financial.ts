import { Payment, Transaction } from '@/lib/types';
import { mockUsers } from './users';

export const mockPayments: Payment[] = [
  {
    id: 'pay_1',
    user_id: mockUsers[0].id,
    mahber_id: 'mah_1',
    amount: 5000,
    payment_type: 'CONTRIBUTION',
    status: 'COMPLETED',
    tx_ref: 'tx_mock_123',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    user: mockUsers[0]
  },
  {
    id: 'pay_2',
    user_id: mockUsers[0].id,
    mahber_id: 'mah_1',
    amount: 500,
    payment_type: 'FINE',
    status: 'PENDING',
    tx_ref: 'tx_mock_456',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    user: mockUsers[0]
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    mahber_id: 'mah_1',
    payment_id: 'pay_1',
    type: 'CREDIT',
    amount: 5000,
    balance_after: 55000,
    description: 'Monthly contribution from Abebe Kebede',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    payment: mockPayments[0]
  },
  {
    id: 'txn_2',
    mahber_id: 'mah_1',
    type: 'DEBIT',
    amount: 50000,
    balance_after: 5000,
    description: 'Equb lottery payout to member',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  }
];
