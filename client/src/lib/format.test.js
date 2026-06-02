import { describe, it, expect } from 'vitest';
import { currency, pct, initials, titleCase, fileSize, date } from './format.js';

describe('format helpers', () => {
  it('formats currency without cents by default', () => {
    expect(currency(1000)).toBe('$1,000');
    expect(currency(0)).toBe('$0');
    expect(currency(null)).toBe('$0');
  });

  it('formats currency with cents when requested', () => {
    expect(currency(1234.5, { cents: true })).toBe('$1,234.50');
  });

  it('formats percentages', () => {
    expect(pct(5)).toBe('5.0%');
    expect(pct(0.25, 2)).toBe('0.25%');
    expect(pct(null)).toBe('—');
  });

  it('builds initials', () => {
    expect(initials('Alice', 'Harrison')).toBe('AH');
    expect(initials('bob', 'smith')).toBe('BS');
  });

  it('title-cases snake/kebab and words', () => {
    expect(titleCase('in_review')).toBe('In Review');
    expect(titleCase('client-group')).toBe('Client Group');
    expect(titleCase('active')).toBe('Active');
  });

  it('humanises file sizes', () => {
    expect(fileSize(0)).toBe('—');
    expect(fileSize(512)).toBe('512 B');
    expect(fileSize(1024)).toBe('1.0 KB');
    expect(fileSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('handles invalid dates gracefully', () => {
    expect(date(null)).toBe('—');
    expect(date('not-a-date')).toBe('—');
  });
});
