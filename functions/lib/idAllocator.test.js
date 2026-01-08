import { describe, it, expect } from 'vitest';
import { formatDayUTC, randomNonce } from './idAllocator.js';

describe('formatDayUTC', () => {
  it('formats date as YYMMDD in UTC', () => {
    const date = new Date('2026-01-08T15:30:00Z');
    expect(formatDayUTC(date)).toBe('260108');
  });

  it('zero-pads single digits', () => {
    const date = new Date('2026-03-05T00:00:00Z');
    expect(formatDayUTC(date)).toBe('260305');
  });

  it('handles year wrap correctly', () => {
    const date = new Date('2099-12-31T23:59:59Z');
    expect(formatDayUTC(date)).toBe('991231');
  });

  it('handles first day of year', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(formatDayUTC(date)).toBe('260101');
  });
});

describe('randomNonce', () => {
  const SAFE_ALPHABET = 'bcdfghjkmnpqrstvwxyz';

  it('generates nonce of correct length (2)', () => {
    const nonce = randomNonce(2);
    expect(nonce).toHaveLength(2);
  });

  it('generates nonce of correct length (3)', () => {
    const nonce = randomNonce(3);
    expect(nonce).toHaveLength(3);
  });

  it('uses only characters from SAFE_ALPHABET', () => {
    for (let i = 0; i < 100; i++) {
      const nonce = randomNonce(3);
      for (const char of nonce) {
        expect(SAFE_ALPHABET).toContain(char);
      }
    }
  });

  it('generates different nonces (randomness check)', () => {
    const nonces = new Set();
    for (let i = 0; i < 100; i++) {
      nonces.add(randomNonce(3));
    }
    // Should have high uniqueness (at least 95%)
    expect(nonces.size).toBeGreaterThan(95);
  });

  it('only contains lowercase letters', () => {
    for (let i = 0; i < 50; i++) {
      const nonce = randomNonce(3);
      expect(nonce).toMatch(/^[a-z]+$/);
    }
  });
});

describe('ID format regex', () => {
  it('matches valid 2-letter IDs', () => {
    const regex = /^[0-9]{6}-[bcdfghjkmnpqrstvwxyz]{2,3}$/;
    expect('260108-bc').toMatch(regex);
    expect('260108-xyz').toMatch(regex); // Note: x,y,z are in alphabet
  });

  it('matches valid 3-letter IDs', () => {
    const regex = /^[0-9]{6}-[bcdfghjkmnpqrstvwxyz]{2,3}$/;
    expect('260108-bcf').toMatch(regex);
    expect('260108-xyz').toMatch(regex);
  });

  it('rejects invalid formats', () => {
    const regex = /^[0-9]{6}-[bcdfghjkmnpqrstvwxyz]{2,3}$/;
    expect('260108-a').not.toMatch(regex); // 'a' not in alphabet
    expect('260108-bcfg').not.toMatch(regex); // too long
    expect('260108-b').not.toMatch(regex); // too short
    expect('26010-bc').not.toMatch(regex); // date too short
    expect('260108-BC').not.toMatch(regex); // uppercase
    expect('260108-12').not.toMatch(regex); // numbers
  });
});
