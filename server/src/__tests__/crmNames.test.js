import { describe, it, expect } from 'vitest';
import {
  parseWho, looksLikeHousehold, displayName, whoMatchesClient, groupWhos, suggestContact,
  folderMatches,
} from '../services/crm/names.js';

// Names in the shapes the Task Tracker actually holds them.
describe('parseWho', () => {
  it('gives a lone first name the surname after the joiner', () => {
    expect(parseWho('David & Shira Borsky').people).toEqual([
      { first: 'David', last: 'Borsky' },
      { first: 'Shira', last: 'Borsky' },
    ]);
  });

  it('keeps two surnames apart', () => {
    expect(parseWho('Arun Ilancheran & Cherry Keragala').people).toEqual([
      { first: 'Arun', last: 'Ilancheran' },
      { first: 'Cherry', last: 'Keragala' },
    ]);
  });

  it('lifts a parenthetical out as a note', () => {
    const p = parseWho('Ben & Jodi Wishaw (Twin Waters Pharmacy)');
    expect(p.note).toBe('Twin Waters Pharmacy');
    expect(p.people.map((x) => x.last)).toEqual(['Wishaw', 'Wishaw']);
  });

  it('reads a bare first name as a person with no surname', () => {
    expect(parseWho('Jeff').people).toEqual([{ first: 'Jeff', last: '' }]);
  });
});

describe('looksLikeHousehold', () => {
  it('accepts people', () => {
    expect(looksLikeHousehold('Kevin Xu')).toBe(true);
    expect(looksLikeHousehold('Nathan & Chantelle Logue')).toBe(true);
  });

  it('rejects firms, insurers and case references', () => {
    expect(looksLikeHousehold('Allfin referrals')).toBe(false);
    expect(looksLikeHousehold('Zurich / OnePath')).toBe(false);
    expect(looksLikeHousehold('TAL pre-assessment PA-1319792 (48yo male)')).toBe(false);
    expect(looksLikeHousehold('Legacy Risk Advice (Josh Davidson)')).toBe(false);
  });

  it('holds back a first name with no surname', () => {
    expect(looksLikeHousehold('Belinda')).toBe(false);
  });
});

describe('displayName', () => {
  it('shares a surname', () => {
    expect(displayName({ first_name: 'David', last_name: 'Borsky', partner_first_name: 'Shira', partner_last_name: 'Borsky' }))
      .toBe('David & Shira Borsky');
  });

  it('names both surnames when they differ', () => {
    expect(displayName({ first_name: 'Neha', last_name: 'Khare', partner_first_name: 'Anshuman', partner_last_name: 'Sinha' }))
      .toBe('Neha Khare & Anshuman Sinha');
  });

  it('handles a single person and a single name', () => {
    expect(displayName({ first_name: 'Kevin', last_name: 'Xu' })).toBe('Kevin Xu');
    expect(displayName({ first_name: 'Belinda', last_name: '' })).toBe('Belinda');
  });
});

describe('whoMatchesClient', () => {
  const borsky = { first_name: 'David', last_name: 'Borsky', partner_first_name: 'Shira', partner_last_name: 'Borsky' };

  it('matches either partner by full name', () => {
    expect(whoMatchesClient('David Borsky', borsky)).toBe(true);
    expect(whoMatchesClient('Shira Borsky', borsky)).toBe(true);
    expect(whoMatchesClient('David & Shira Borsky', borsky)).toBe(true);
  });

  it('ignores case and punctuation', () => {
    expect(whoMatchesClient('DAVID  borsky', borsky)).toBe(true);
  });

  it('does not match on a first name alone', () => {
    expect(whoMatchesClient('David', borsky)).toBe(false);
    expect(whoMatchesClient('David Smith', borsky)).toBe(false);
  });
});

describe('groupWhos', () => {
  const whos = [
    'Kirsty Oakey', 'Kirsty & Dean Oakey', 'Jeff Soo', 'Jeff', 'Kevin Xu',
    'Jodi Wishaw', 'Ben & Jodi Wishaw (Twin Waters Pharmacy)', 'Belinda',
  ];
  const groups = groupWhos(whos.map((who) => ({ who }))).map((g) => g.map((i) => whos[i]).sort());

  it('merges variants that share a person', () => {
    expect(groups).toContainEqual(['Kirsty & Dean Oakey', 'Kirsty Oakey']);
    expect(groups).toContainEqual(['Ben & Jodi Wishaw (Twin Waters Pharmacy)', 'Jodi Wishaw']);
  });

  it('attaches a bare first name to the one household that has it', () => {
    expect(groups).toContainEqual(['Jeff', 'Jeff Soo']);
  });

  it('leaves unrelated names alone', () => {
    expect(groups).toContainEqual(['Kevin Xu']);
    expect(groups).toContainEqual(['Belinda']);
  });

  it('does not guess when a first name is shared by two households', () => {
    const w = ['Tom', 'Tom Ward', 'Tom Seneviratna'];
    const g = groupWhos(w.map((who) => ({ who }))).map((x) => x.map((i) => w[i]));
    expect(g).toContainEqual(['Tom']);
  });
});

describe('suggestContact', () => {
  it('uses the fullest variant of the name', () => {
    expect(suggestContact(['Kirsty Oakey', 'Kirsty & Dean Oakey'])).toMatchObject({
      first_name: 'Kirsty', last_name: 'Oakey', partner_first_name: 'Dean', partner_last_name: 'Oakey',
    });
  });

  it('turns a referral note into the referral source', () => {
    expect(suggestContact(['Brett (Steve De Bono referral)'])).toMatchObject({
      first_name: 'Brett', last_name: '', referral_source: 'Steve De Bono', notes: '',
    });
  });

  it('keeps any other note', () => {
    expect(suggestContact(['Ben & Jodi Wishaw (Twin Waters Pharmacy)']).notes).toBe('Twin Waters Pharmacy');
  });
});

describe('folderMatches', () => {
  it('matches SharePoint "Surname, First" folders in any order, by word prefix', () => {
    expect(folderMatches('david borsky', 'Borsky, David and Shira')).toBe(true);
    expect(folderMatches('bors', 'Borsky, David and Shira')).toBe(true);
    expect(folderMatches('david smith', 'Borsky, David and Shira')).toBe(false);
    expect(folderMatches('', 'Borsky, David')).toBe(false);
  });
});
