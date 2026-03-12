import { describe, expect, it } from 'vitest';

import { normalizeCalendarConfigData, parseIcsCalendar } from '../src/calendar.js';

const sampleIcs = `BEGIN:VCALENDAR
X-WR-CALNAME:Y8 Content
X-WR-TIMEZONE:Asia/Bangkok
BEGIN:VEVENT
UID:event-1
DTSTART;VALUE=DATE:20260312
DTEND;VALUE=DATE:20260313
SUMMARY:⭐ [Y8 | 8X BLONDE] Pillar D #Winning Product - Hero
DESCRIPTION:แบรนด์: Y8\\nผลิตภัณฑ์: 8X Blonde\\nประเภทคอนเทนต์: Product Launch\\nวันเปิดขาย: 12 มีนาคม 2026
END:VEVENT
BEGIN:VEVENT
UID:event-2
DTSTART;TZID=Asia/Bangkok:20260313T103000
DTEND;TZID=Asia/Bangkok:20260313T120000
SUMMARY:📷 [Y8 | Sebotech] Pillar A - Education
DESCRIPTION:แบรนด์: Y8\\nผลิตภัณฑ์: Sebotech\\nประเภทคอนเทนต์: Education
END:VEVENT
END:VCALENDAR`;

describe('calendar parser', () => {
  it('parses all-day event in Asia/Bangkok', () => {
    const config = normalizeCalendarConfigData(undefined);
    const events = parseIcsCalendar(sampleIcs, config);

    expect(events[0].allDay).toBe(true);
    expect(events[0].timezone).toBe('Asia/Bangkok');
    expect(events[0].start).toContain('2026-03-12T00:00:00');
  });

  it('extracts product, content type, launch date, and kind', () => {
    const config = normalizeCalendarConfigData(undefined);
    const events = parseIcsCalendar(sampleIcs, config);

    expect(events[0]).toMatchObject({
      brand: 'Y8',
      product: '8X Blonde',
      contentType: 'Product Launch',
      launchDate: '12 มีนาคม 2026',
      kind: 'launch',
    });
    expect(events[1]).toMatchObject({
      product: 'Sebotech',
      contentType: 'Education',
      kind: 'content',
    });
  });

  it('falls back safely when metadata is missing', () => {
    const config = normalizeCalendarConfigData(undefined);
    const events = parseIcsCalendar(
      `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-3
DTSTART;VALUE=DATE:20260314
SUMMARY:Internal planning
END:VEVENT
END:VCALENDAR`,
      config,
    );

    expect(events[0].product).toBe('');
    expect(events[0].contentType).toBe('');
    expect(events[0].kind).toBe('general');
  });
});
