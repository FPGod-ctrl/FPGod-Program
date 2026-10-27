import { describe, it, expect } from 'vitest';
import { pickClientRecord, nameTokens, HISTORY_SQL, HISTORY_TURNS } from '../services/library/ask.js';

// Fictional people only.
const ROWS = [
  { id: 1, first_name: 'Pat', last_name: 'Example', partner_first_name: null, partner_last_name: null },
  { id: 2, first_name: 'Sam', last_name: 'Sample', partner_first_name: 'Robin', partner_last_name: 'Sample' },
];

describe('library dbFacts record picking', () => {
  it('attaches a record only when first name AND surname match', () => {
    expect(pickClientRecord(nameTokens('Example, Pat'), ROWS)?.id).toBe(1);
    expect(pickClientRecord(nameTokens('Sam Sample'), ROWS)?.id).toBe(2);
  });

  it('accepts the partner pair', () => {
    expect(pickClientRecord(nameTokens('Sample, Robin'), ROWS)?.id).toBe(2);
  });

  it('attaches nothing on a surname-only or first-name-only match', () => {
    expect(pickClientRecord(nameTokens('Example, Jordan'), ROWS)).toBeNull();
    expect(pickClientRecord(nameTokens('Pat Otherperson'), ROWS)).toBeNull();
    expect(pickClientRecord(nameTokens('Sample'), ROWS)).toBeNull();
    expect(pickClientRecord(nameTokens('Anyone'), [])).toBeNull();
  });
});

describe('library history query', () => {
  it('takes the most recent turns and replays them oldest first', () => {
    const sql = HISTORY_SQL.replace(/\s+/g, ' ');
    expect(sql).toMatch(/ORDER BY created_at DESC LIMIT \$2 \) latest ORDER BY created_at ASC$/);
    expect(HISTORY_TURNS).toBe(12);
  });
});
