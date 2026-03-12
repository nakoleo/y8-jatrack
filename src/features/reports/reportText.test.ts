import { describe, expect, it } from 'vitest';

import { buildEveningReportText, buildMorningReportText } from './reportText';

describe('report text builders', () => {
  it('builds morning report with focus items', () => {
    const text = buildMorningReportText({
      nickname: 'Gift',
      date: '2026-03-12',
      gender: 'female',
      checkInTime: '09:00',
      focusItems: ['ทำ Artwork', 'สรุป KPI'],
      focusEmoji: '🚩',
    });

    expect(text).toContain('MORNING REPORT: Gift');
    expect(text).toContain('• F1] ทำ Artwork');
    expect(text).toContain('ขอบคุณค่ะ');
  });

  it('builds evening report with issue details', () => {
    const text = buildEveningReportText({
      nickname: 'Gift',
      date: '2026-03-12',
      gender: 'male',
      routineItems: ['ตอบแชตทีม'],
      resultItems: ['ส่งงานครบ'],
      nextMoveItems: ['วางแผนพรุ่งนี้'],
      issues: 'ไฟล์ต้นฉบับช้า',
      issueStatus: 'unresolved',
      issueDetail: 'รอไฟล์จากทีมขาย',
      issueNextStep: 'ติดตามตอนเช้า',
      routineEmoji: '📌',
      resultsEmoji: '📄',
      nextMoveEmoji: '🔜',
      issuesEmoji: '⚠️',
    });

    expect(text).toContain('EVENING REPORT: Gift');
    expect(text).toContain('สถานะ: ❌ ยังแก้ไขไม่ได้');
    expect(text).toContain('รายละเอียด: รอไฟล์จากทีมขาย');
    expect(text).toContain('ขอบคุณครับ');
  });
});
