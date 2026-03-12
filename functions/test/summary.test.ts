import { describe, expect, it } from 'vitest';

import { buildFallbackSummary, buildMonthlyStats, topGroupsForEntries } from '../src/summary.js';
import type { EntryDocument } from '../src/types.js';

const entries: EntryDocument[] = [
  {
    id: '1',
    date: '2026-03-01',
    user: 'u1',
    userName: 'Gift',
    groupId: 'A',
    groupName: 'Social Media',
    taskId: 'A01',
    quantity: 1,
    credits: 4,
    notes: '',
    createdAt: 1,
  },
  {
    id: '2',
    date: '2026-03-03',
    user: 'u1',
    userName: 'Gift',
    groupId: 'B',
    groupName: 'CRM',
    taskId: 'B01',
    quantity: 1,
    credits: 2,
    notes: '',
    createdAt: 2,
  },
];

describe('summary helpers', () => {
  it('builds monthly stats', () => {
    expect(buildMonthlyStats(entries, 10)).toEqual({
      totalCredits: 6,
      targetCredits: 10,
      entryCount: 2,
      percent: 60,
    });
  });

  it('returns top groups ordered by credits', () => {
    expect(topGroupsForEntries(entries)).toEqual([
      { name: 'Social Media', credits: 4 },
      { name: 'CRM', credits: 2 },
    ]);
  });

  it('builds fallback summary text', () => {
    const text = buildFallbackSummary(
      'Gift',
      'Graphic Designer',
      'มีนาคม 2569',
      buildMonthlyStats(entries, 10),
      topGroupsForEntries(entries),
    );
    expect(text).toContain('Gift');
    expect(text).toContain('6 จากเป้า 10');
    expect(text).toContain('Social Media (4 Cr.)');
  });
});
