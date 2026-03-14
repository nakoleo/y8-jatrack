import type { RoleId, WorkGroups } from '@/domain/types';
import { ROLE_DEFAULTS } from '@/config/roleDefaults';

export const HOST_EMAIL = 'host.y8@gmail.com';
export const SUPER_ADMIN_EMAIL = 'info.nakoleo@gmail.com';
export const KPI_POLICY_VERSION = 3;
export const EXPECTED_FIREBASE_PROJECT = 'jartrack-y8pv';
export const EXPECTED_FIREBASE_AUTH_DOMAIN = 'jartrack-y8pv.firebaseapp.com';
export const MANUAL_PROFILE_PHOTOS: Record<string, string> = {
  [HOST_EMAIL]: '/avatars/gift-display.jpg',
};
export const MANUAL_PROFILE_TITLES: Record<string, string> = {
  [HOST_EMAIL]: 'Sr.Graphic Designer',
};

export const ZERO_STARTER_GROUPS: WorkGroups = {
  A: {
    label: 'Group A',
    name: 'กลุ่มเริ่มต้น',
    color: '#F4823C',
    bg: 'rgba(244,130,60,0.12)',
    border: 'rgba(244,130,60,0.22)',
    tasks: [
      { id: 'A01', name: 'งานเริ่มต้น', creditPerUnit: 0, unit: 'งาน', desc: 'ตั้งค่าเครดิตได้เองใน KPI Config' },
    ],
  },
};

export interface CalEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  brand: 'y8' | 'pv';
}

export interface PendingUploadFile {
  file: File;
  normalizedName: string;
  mode: 'log' | 'edit';
}

export const normalizeEmail = (email?: string | null) => (email || '').trim().toLowerCase();
export const isHostEmail = (email?: string | null) => normalizeEmail(email) === HOST_EMAIL;
export const isSuperAdminEmail = (email?: string | null) => normalizeEmail(email) === SUPER_ADMIN_EMAIL;
export const resolveProfilePhotoUrl = ({
  email,
  manualPhotoURL,
  googlePhotoURL,
  storedPhotoURL,
}: {
  email?: string | null;
  manualPhotoURL?: string | null;
  googlePhotoURL?: string | null;
  storedPhotoURL?: string | null;
}) => {
  const manual = (manualPhotoURL || '').trim() || MANUAL_PROFILE_PHOTOS[normalizeEmail(email)] || '';
  return manual || (googlePhotoURL || '').trim() || (storedPhotoURL || '').trim() || '';
};
export const resolveProfileTitle = ({
  email,
  customTitle,
  role,
}: {
  email?: string | null;
  customTitle?: string | null;
  role?: RoleId | string | null;
}) => {
  const normalizedEmail = normalizeEmail(email);
  const manual = MANUAL_PROFILE_TITLES[normalizedEmail] || '';
  const nextCustomTitle = (customTitle || '').trim();
  const roleLabel = ROLE_DEFAULTS[role as RoleId]?.meta.label || String(role || 'Custom');
  if (manual && (!nextCustomTitle || nextCustomTitle === roleLabel)) return manual;
  return nextCustomTitle || manual || roleLabel;
};

export const resolveRoleByEmail = (email?: string | null): RoleId =>
  isHostEmail(email) ? 'graphic_designer' : isSuperAdminEmail(email) ? 'art_director' : 'custom';

export const cloneGroups = (groups: WorkGroups): WorkGroups => JSON.parse(JSON.stringify(groups));

export const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const dateToLocalStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const safePercent = (value: number, target: number) =>
  target > 0 ? Math.min((value / target) * 100, 100) : 0;

export const sheetSafe = (value: string, fallback = 'User') => {
  const cleaned = value
    .trim()
    .replace(/[\\/?*\[\]:]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 70);
  return cleaned || fallback;
};

export const buildSheetNames = (nickname: string, uid?: string) => {
  const uidTag = (uid || 'xxxxxx').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'xxxxxx';
  const base = sheetSafe(nickname, `User_${uidTag}`).slice(0, 50);
  const ownerKey = `${base}_${uidTag}`;
  return {
    ownerKey,
    masterSheetName: `${ownerKey}_KPI_MASTER`,
    dashboardSheetName: `${ownerKey}_Dashboard`,
  };
};

export const getInitialKpiForEmail = (email?: string | null) => {
  if (isHostEmail(email)) {
    const graphic = ROLE_DEFAULTS.graphic_designer;
    return {
      groups: cloneGroups(graphic.groups),
      monthlyTarget: graphic.meta.monthlyTarget,
      roleId: 'graphic_designer',
      label: graphic.meta.label,
    };
  }
  return {
    groups: cloneGroups(ZERO_STARTER_GROUPS),
    monthlyTarget: 0,
    roleId: resolveRoleByEmail(email),
    label: 'Custom',
  };
};

export const scopedKey = (uid: string, key: string) => `jartrack_${uid}_${key}`;

export const formatThaiDate = (dateStr: string, full = false) => {
  if (!dateStr) return '';
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: full ? 'long' : 'short',
      year: full ? 'numeric' : '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const getMonthNameThai = (monthIndex: number) =>
  new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(2026, monthIndex));

export const parseIcalDate = (raw: string): Date => {
  if (raw.includes('T')) {
    const s = raw.replace(/[^0-9]/g, '');
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`);
  }
  return new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00`);
};

export const parseIcal = (text: string, brand: 'y8' | 'pv'): CalEvent[] =>
  text.split('BEGIN:VEVENT').slice(1).reduce<CalEvent[]>((acc, block) => {
    const get = (k: string) => {
      const match = block.match(new RegExp(`${k}[^:]*:(.+)`));
      return match ? match[1].trim() : '';
    };
    try {
      const startStr = get('DTSTART');
      const endStr = get('DTEND') || startStr;
      if (!startStr) return acc;
      acc.push({
        uid: get('UID') || Math.random().toString(36),
        title: get('SUMMARY').replace(/\\n/g, ' ').replace(/\\,/g, ',') || '(ไม่มีชื่อ)',
        start: parseIcalDate(startStr),
        end: parseIcalDate(endStr),
        brand,
      });
    } catch {
      return acc;
    }
    return acc;
  }, []);

export const extractGoogleApiReason = (raw: string) => {
  if (!raw) return '';
  try {
    const json = JSON.parse(raw) as {
      error?: { status?: string; message?: string; errors?: Array<{ reason?: string; message?: string }> };
    };
    return json.error?.errors?.[0]?.reason || json.error?.status || json.error?.message || '';
  } catch {
    return raw.slice(0, 120);
  }
};

export const normalizeFileName = (
  originalName: string,
  taskId: string,
  entryDate: string,
  nickname: string,
  index: number,
) => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const [y = '0000', m = '00', d = '00'] = entryDate.split('-');
  const ddmmyyyy = `${d}${m}${y}`;
  const nick = nickname.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'user';
  const seq = String(index + 1).padStart(2, '0');
  return `${taskId}_${ddmmyyyy}_${nick}_${seq}.${ext}`;
};
