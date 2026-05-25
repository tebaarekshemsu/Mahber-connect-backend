import { addFrequency, getNextPaymentDueDate } from './date.utils';

describe('addFrequency', () => {
  it('should advance monthly by default', () => {
    const result = addFrequency(new Date('2026-03-15'), 'Monthly');
    expect(result.toISOString().slice(0, 7)).toBe('2026-04');
  });

  it('should advance weekly', () => {
    const result = addFrequency(new Date('2026-03-02'), 'Weekly');
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-09');
  });

  it('should advance quarterly', () => {
    const result = addFrequency(new Date('2026-01-15'), 'Quarterly');
    expect(result.toISOString().slice(0, 7)).toBe('2026-04');
  });
});

describe('getNextPaymentDueDate', () => {
  it('should use payment_day for monthly (day in future)', () => {
    const result = getNextPaymentDueDate(new Date('2026-03-10'), 'Monthly', 20);
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-20');
  });

  it('should advance month when payment_day has passed', () => {
    const result = getNextPaymentDueDate(new Date('2026-03-20'), 'Monthly', 5);
    expect(result.toISOString().slice(0, 10)).toBe('2026-04-05');
  });

  it('should clamp day to month length for monthly', () => {
    const result = getNextPaymentDueDate(new Date('2026-01-15'), 'Monthly', 31);
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('should clamp 31 to Feb 28', () => {
    const result = getNextPaymentDueDate(new Date('2026-01-31'), 'Monthly', 31);
    expect(result.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('should advance to next Monday when payment_day is Monday (1)', () => {
    // 2026-03-05 is a Thursday
    const result = getNextPaymentDueDate(new Date('2026-03-05'), 'Weekly', 1);
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-09');
  });

  it('should advance to next Sunday (0) when payment_day is Sunday', () => {
    // 2026-03-05 is a Thursday, next Sunday is Mar 8
    const result = getNextPaymentDueDate(new Date('2026-03-05'), 'Weekly', 0);
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-08');
  });

  it('should go to next week when today is the target day', () => {
    // 2026-03-09 is a Monday
    const result = getNextPaymentDueDate(new Date('2026-03-09'), 'Weekly', 1);
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-16');
  });

  it('should fall back to addFrequency when payment_day is undefined', () => {
    const result = getNextPaymentDueDate(new Date('2026-03-15'), 'Monthly');
    expect(result.toISOString().slice(0, 7)).toBe('2026-04');
  });

  it('should advance one day for daily frequency (payment_day ignored)', () => {
    const result = getNextPaymentDueDate(new Date('2026-03-15'), 'Daily', 5);
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-16');
  });
});
