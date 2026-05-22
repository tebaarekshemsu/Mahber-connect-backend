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
