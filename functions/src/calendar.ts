import type { NormalizedCalendarEvent, OrgCalendarConfig } from './types.js';

export const DEFAULT_Y8_CALENDAR_FEED_URL =
  'https://calendar.google.com/calendar/ical/743173a9c6b8651869b290dfecffd664359d853f459ef6a410824216e2968ce8%40group.calendar.google.com/private-55042342e3a3e421eafa8e46338e5af3/basic.ics';

const DEFAULT_TIMEZONE = 'Asia/Bangkok';
const DEFAULT_LABEL = 'Y8 Content';

const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Bangkok': '+07:00',
};

interface ParsedProperty {
  value: string;
  params: Record<string, string>;
}

const unfoldIcs = (text: string) => text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

const unescapeIcsValue = (value: string) =>
  value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();

const parseLine = (line: string): { key: string; property: ParsedProperty } | null => {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex < 0) return null;
  const left = line.slice(0, separatorIndex);
  const rawValue = line.slice(separatorIndex + 1);
  const [key, ...rawParams] = left.split(';');
  const params = rawParams.reduce<Record<string, string>>((acc, param) => {
    const [paramKey, paramValue] = param.split('=');
    if (paramKey && paramValue) acc[paramKey.toUpperCase()] = paramValue;
    return acc;
  }, {});
  return {
    key: key.toUpperCase(),
    property: {
      value: unescapeIcsValue(rawValue),
      params,
    },
  };
};

const readProperty = (block: string, name: string): ParsedProperty | null => {
  const target = name.toUpperCase();
  const parsed = unfoldIcs(block)
    .split(/\r?\n/)
    .map((line) => parseLine(line))
    .filter((line): line is { key: string; property: ParsedProperty } => Boolean(line));
  const match = parsed.find((entry) => entry.key === target);
  return match?.property || null;
};

const getOffset = (timezone?: string) => TIMEZONE_OFFSETS[timezone || ''] || 'Z';

const buildIsoWithOffset = (raw: string, timezone?: string) => {
  const clean = raw.replace(/[^0-9]/g, '');
  const offset = getOffset(timezone);
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(8, 10)}:${clean.slice(10, 12)}:${clean.slice(12, 14) || '00'}${offset}`;
};

const buildAllDayIso = (raw: string, timezone?: string) => {
  const offset = getOffset(timezone);
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00${offset}`;
};

const parseDateValue = (property: ParsedProperty | null, fallbackTimezone: string) => {
  if (!property?.value) {
    return { iso: '', allDay: false, timezone: fallbackTimezone };
  }
  const timezone = property.params.TZID || fallbackTimezone;
  const raw = property.value.trim();
  if (/^\d{8}$/.test(raw)) {
    return { iso: buildAllDayIso(raw, timezone), allDay: true, timezone };
  }
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    const clean = raw.replace(/Z$/, '');
    return { iso: `${buildIsoWithOffset(clean, 'UTC').replace('Z', '')}Z`, allDay: false, timezone: 'UTC' };
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    return { iso: buildIsoWithOffset(raw, timezone), allDay: false, timezone };
  }
  return { iso: raw, allDay: false, timezone };
};

const extractField = (text: string, regex: RegExp) => text.match(regex)?.[1]?.trim() || '';

const inferMetadata = (summary: string, description: string) => {
  const bracket = summary.match(/\[\s*([^|\]]+?)(?:\s*\|\s*([^\]]+))?\s*\]/);
  const brand = extractField(description, /แบรนด์\s*:\s*(.+)/i) || bracket?.[1]?.trim() || '';
  const product = extractField(description, /ผลิตภัณฑ์\s*:\s*(.+)/i) || bracket?.[2]?.trim() || '';
  const contentType = extractField(description, /ประเภทคอนเทนต์\s*:\s*(.+)/i);
  const launchDate = extractField(description, /วันเปิดขาย(?:สินค้า)?\s*:\s*(.+)/i);
  const rawCategoryText = summary.match(/(Pillar[^–\n]+)/i)?.[1]?.trim() || contentType || '';
  const sourceText = `${summary}\n${description}`.toLowerCase();

  let kind: NormalizedCalendarEvent['kind'] = 'general';
  if (launchDate || /launch|เปิดขาย|winning product/.test(sourceText)) {
    kind = 'launch';
  } else if (product || contentType || /\[[^\]]+\]/.test(summary)) {
    kind = 'content';
  }

  return {
    brand,
    product,
    contentType,
    launchDate: launchDate || undefined,
    rawCategoryText: rawCategoryText || undefined,
    kind,
  };
};

export const normalizeCalendarConfigData = (raw: Record<string, unknown> | undefined | null): OrgCalendarConfig => ({
  enabled: raw?.enabled === undefined ? true : Boolean(raw.enabled),
  label: String(raw?.label || DEFAULT_LABEL),
  timezone: String(raw?.timezone || DEFAULT_TIMEZONE),
  y8ContentFeedUrl: String(raw?.y8ContentFeedUrl || DEFAULT_Y8_CALENDAR_FEED_URL),
  updatedAt: raw?.updatedAt ? Number(raw.updatedAt) : undefined,
  lastValidatedAt: raw?.lastValidatedAt ? Number(raw.lastValidatedAt) : undefined,
  lastSyncStatus: raw?.lastSyncStatus ? String(raw.lastSyncStatus) as OrgCalendarConfig['lastSyncStatus'] : undefined,
  lastError: raw?.lastError === null ? null : raw?.lastError ? String(raw.lastError) : undefined,
  lastEventCount: raw?.lastEventCount ? Number(raw.lastEventCount) : undefined,
});

export const parseIcsCalendar = (text: string, config: OrgCalendarConfig): NormalizedCalendarEvent[] =>
  unfoldIcs(text)
    .split('BEGIN:VEVENT')
    .slice(1)
    .flatMap((block) => {
      const uid = readProperty(block, 'UID')?.value || crypto.randomUUID();
      const summary = readProperty(block, 'SUMMARY')?.value || '(ไม่มีชื่อ)';
      const description = readProperty(block, 'DESCRIPTION')?.value || '';
      const start = parseDateValue(readProperty(block, 'DTSTART'), config.timezone);
      const end = parseDateValue(readProperty(block, 'DTEND'), start.timezone || config.timezone);
      const meta = inferMetadata(summary, description);

      if (!start.iso) return [];
      return [{
        id: uid,
        title: summary,
        description,
        start: start.iso,
        end: end.iso || start.iso,
        allDay: start.allDay,
        timezone: start.timezone || config.timezone,
        brand: meta.brand,
        product: meta.product,
        contentType: meta.contentType,
        launchDate: meta.launchDate,
        rawCategoryText: meta.rawCategoryText,
        kind: meta.kind,
      } satisfies NormalizedCalendarEvent];
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

export const fetchNormalizedCalendarFeed = async (config: OrgCalendarConfig) => {
  if (!config.enabled || !config.y8ContentFeedUrl.trim()) return [];
  const response = await fetch(config.y8ContentFeedUrl);
  if (!response.ok) {
    throw new Error(`calendar_fetch_failed_${response.status}`);
  }
  const text = await response.text();
  return parseIcsCalendar(text, config);
};
