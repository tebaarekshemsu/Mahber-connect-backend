import { toChapaEmail } from './chapa.utils';

describe('toChapaEmail', () => {
  const userId = 'eaa6263d-9489-44ad-a5d0-f728c8d89252';

  it('uses user email when within Chapa limit', () => {
    expect(toChapaEmail('user@example.com', userId)).toBe('user@example.com');
  });

  it('replaces synthetic mahberconnect emails even when length is 50', () => {
    const synthetic = `${userId.replace(/-/g, '')}@mahberconnect.com`;
    expect(synthetic.length).toBe(50);
    expect(toChapaEmail(synthetic, userId)).toBe('pay.eaa6263d@mahberconnect.com');
  });

  it('builds fallback from userId when email is missing', () => {
    expect(toChapaEmail(null, userId)).toBe('pay.eaa6263d@mahberconnect.com');
  });
});
