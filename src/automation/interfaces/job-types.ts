export interface FineCalculationJobData {
  mahberId: string;
}

export interface JoinRequestExpiryJobData {}

export interface LotteryExecutionJobData {
  mahberId: string;
  operationalCostRate: number;
  fineThreshold: number;
}

export interface PaymentReminderJobData {}

export interface SuspensionExpiryJobData {}

export interface AttendanceProcessorJobData {
  mahberId: string;
  eventId: string;
}

export type JobData =
  | FineCalculationJobData
  | JoinRequestExpiryJobData
  | LotteryExecutionJobData
  | PaymentReminderJobData
  | AttendanceProcessorJobData
  | SuspensionExpiryJobData;

export const QUEUE_NAMES = {
  FINE_CALCULATION: 'fine-calculation',
  JOIN_REQUEST_EXPIRY: 'join-request-expiry',
  LOTTERY_EXECUTION: 'lottery-execution',
  PAYMENT_REMINDER: 'payment-reminder',
  ATTENDANCE_PROCESSOR: 'attendance-processor',
  SUSPENSION_EXPIRY: 'suspension-expiry',
} as const;
