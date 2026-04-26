import { apiClient } from '../client';
import { Payment, Transaction, InitiatePaymentDto, Fine, LotteryDraw } from '@/lib/types';

export const financialApi = {
  // ── Payments ────────────────────────────────────────────────────────────────
  initiatePayment: async (data: InitiatePaymentDto): Promise<{ checkoutUrl: string; tx_ref: string }> => {
    // Backend route: POST /mahbers/:id/payments/initiate
    const response = await apiClient.post<{ checkoutUrl: string; tx_ref: string }>(
      `/mahbers/${data.mahber_id}/payments/initiate`, data
    );
    return response.data;
  },

  verifyPayment: async (tx_ref: string): Promise<Payment> => {
    // NOTE: The backend does not expose a dedicated verify endpoint.
    // Payment verification happens via the Chapa webhook controller (POST /webhooks/chapa).
    // This method is kept for mock compatibility; during real integration, the frontend should
    // poll the payment status via GET /mahbers/:id/payments/:paymentId instead.
    const response = await apiClient.get<Payment>(`/webhooks/chapa/verify/${tx_ref}`);
    return response.data;
  },
  
  getMahberPayments: async (mahberId: string): Promise<Payment[]> => {
    // Backend route: GET /mahbers/:id/payments
    const response = await apiClient.get<Payment[]>(`/mahbers/${mahberId}/payments`);
    return response.data;
  },

  // ── Ledger ──────────────────────────────────────────────────────────────────
  getMahberLedger: async (mahberId: string): Promise<Transaction[]> => {
    // Backend route: GET /mahbers/:id/ledger
    const response = await apiClient.get<Transaction[]>(`/mahbers/${mahberId}/ledger`);
    return response.data;
  },

  // ── Fines ───────────────────────────────────────────────────────────────────
  getFines: async (mahberId: string): Promise<Fine[]> => {
    // Backend route: GET /mahbers/:id/fines
    const response = await apiClient.get<Fine[]>(`/mahbers/${mahberId}/fines`);
    return response.data;
  },
  
  waiveFine: async (mahberId: string, fineId: string, reason = 'Waived by admin'): Promise<Fine> => {
    // Backend route: POST /mahbers/:id/fines/:fineId/waive  (expects { reason } body)
    const response = await apiClient.post<Fine>(`/mahbers/${mahberId}/fines/${fineId}/waive`, { reason });
    return response.data;
  },

  // ── Lottery ─────────────────────────────────────────────────────────────────
  // NOTE: The backend has lottery.service.ts but NO lottery controller yet.
  // These endpoints will fail until a LotteryController is created on the backend.
  // The integration tester must create this controller or adjust routes.
  getLotteryHistory: async (mahberId: string): Promise<LotteryDraw[]> => {
    const response = await apiClient.get<LotteryDraw[]>(`/mahbers/${mahberId}/lottery/history`);
    return response.data;
  },

  drawLottery: async (mahberId: string): Promise<LotteryDraw> => {
    const response = await apiClient.post<LotteryDraw>(`/mahbers/${mahberId}/lottery/draw`);
    return response.data;
  }
};
