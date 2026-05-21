export function addFrequency(date: Date, frequency?: string): Date {
  const result = new Date(date);
  const freq = frequency || 'Monthly';
  switch (freq) {
    case 'Daily':
      result.setDate(result.getDate() + 1);
      break;
    case 'Weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'Quarterly':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'Monthly':
    default:
      result.setMonth(result.getMonth() + 1);
      break;
  }
  return result;
}
