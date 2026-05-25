export function addFrequency(date: Date, frequency?: string): Date {
  const result = new Date(date);
  const freq = (frequency || 'Monthly').toLowerCase();
  switch (freq) {
    case 'daily':
      result.setDate(result.getDate() + 1);
      break;
    case 'weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'quarterly':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'monthly':
    default:
      result.setMonth(result.getMonth() + 1);
      break;
  }
  return result;
}

/**
 * Compute the next payment due date based on the Mahber's configured payment day.
 *
 * - weekly:   paymentDay is 0=Sun .. 6=Sat
 * - monthly:  paymentDay is 1-31 (clamped to month length)
 * - quarterly: paymentDay is 1-31 (clamped, advances 3 months)
 * - daily:    no-op
 *
 * When paymentDay is undefined the function falls back to addFrequency()
 * (the original join-date-based behaviour) for backward compatibility.
 */
export function getNextPaymentDueDate(
  fromDate: Date,
  frequency?: string,
  paymentDay?: number,
): Date {
  const result = new Date(fromDate);
  const freq = (frequency || 'Monthly').toLowerCase();

  if (freq === 'daily' || paymentDay === undefined) {
    return addFrequency(fromDate, frequency);
  }

  if (freq === 'weekly') {
    const diff = (paymentDay - result.getDay() + 7) % 7;
    result.setDate(result.getDate() + (diff === 0 ? 7 : diff));
    return result;
  }

  if (freq === 'monthly' || freq === 'quarterly') {
    const advanceMonths = freq === 'quarterly' ? 3 : 1;
    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

    result.setDate(1);
    result.setDate(Math.min(paymentDay, daysInMonth(result.getFullYear(), result.getMonth())));

    if (result <= fromDate) {
      result.setDate(1);
      result.setMonth(result.getMonth() + advanceMonths);
      result.setDate(Math.min(paymentDay, daysInMonth(result.getFullYear(), result.getMonth())));
    }
    return result;
  }

  return addFrequency(fromDate, frequency);
}
