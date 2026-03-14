import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  LogOut,
  Settings2,
  Sliders,
  Upload,
  UserCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { ROLE_DEFAULTS, ROLE_EMOJI } from '@/config/roleDefaults';
import type { OrgCalendarConfig, UserProfile } from '@/domain/types';

interface SettingsPanelProps {
  currentUser: User;
  userProfile: UserProfile | null;
  nicknameDraft: string;
  setNicknameDraft: React.Dispatch<React.SetStateAction<string>>;
  customTitleDraft: string;
  setCustomTitleDraft: React.Dispatch<React.SetStateAction<string>>;
  reportGender: 'male' | 'female';
  setReportGender: React.Dispatch<React.SetStateAction<'male' | 'female'>>;
  reportEmojis: {
    focus?: string;
    routine?: string;
    results?: string;
    nextMove?: string;
    issues?: string;
  };
  setReportEmojis: React.Dispatch<React.SetStateAction<{
    focus?: string;
    routine?: string;
    results?: string;
    nextMove?: string;
    issues?: string;
  }>>;
  sheetUrl: string;
  setSheetUrl: React.Dispatch<React.SetStateAction<string>>;
  driveFolderId: string;
  setDriveFolderId: React.Dispatch<React.SetStateAction<string>>;
  googleAccessToken: string;
  googleAccessTokenExpiry: number;
  handleConnectGoogleDrive: () => Promise<void>;
  latestSyncState: {
    status: 'pending' | 'synced' | 'failed';
    lastError?: string;
  } | null;
  isOnline: boolean;
  isSuperAdmin: boolean;
  orgCalendarConfig: OrgCalendarConfig;
  calendarDraft: OrgCalendarConfig;
  setCalendarDraft: React.Dispatch<React.SetStateAction<OrgCalendarConfig>>;
  calendarActionLoading: boolean;
  onValidateCalendar: () => Promise<void>;
  onSave: () => Promise<void>;
  onSignOut: () => Promise<void>;
  openKpiEditor: () => void;
  runtimeProjectId: string;
  runtimeAuthDomain: string;
  firebaseConfigHealthy: boolean;
  autoHoverExpand: boolean;
  setAutoHoverExpand: React.Dispatch<React.SetStateAction<boolean>>;
  monthlyTarget: number;
}

const DEFAULT_REPORT_EMOJIS = {
  focus: '🚩',
  routine: '📌',
  results: '📄',
  nextMove: '🔜',
  issues: '⚠️',
} as const;

const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <section className="settings-section">
    <div className="settings-section-head">
      <div>
        <p className="section-kicker">{title}</p>
        {description && <p className="settings-section-copy">{description}</p>}
      </div>
    </div>
    <div className="settings-grid">{children}</div>
  </section>
);

export function SettingsPanel({
  currentUser,
  userProfile,
  nicknameDraft,
  setNicknameDraft,
  customTitleDraft,
  setCustomTitleDraft,
  reportGender,
  setReportGender,
  reportEmojis,
  setReportEmojis,
  sheetUrl,
  setSheetUrl,
  driveFolderId,
  setDriveFolderId,
  googleAccessToken,
  googleAccessTokenExpiry,
  handleConnectGoogleDrive,
  latestSyncState,
  isOnline,
  isSuperAdmin,
  orgCalendarConfig,
  calendarDraft,
  setCalendarDraft,
  calendarActionLoading,
  onValidateCalendar,
  onSave,
  onSignOut,
  openKpiEditor,
  runtimeProjectId,
  runtimeAuthDomain,
  firebaseConfigHealthy,
  autoHoverExpand,
  setAutoHoverExpand,
  monthlyTarget,
}: SettingsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const calendarStatusLabel = useMemo(() => {
    if (orgCalendarConfig.lastSyncStatus === 'error') return 'มีปัญหา';
    if (orgCalendarConfig.lastSyncStatus === 'disabled') return 'ปิดใช้งาน';
    return 'พร้อมใช้งาน';
  }, [orgCalendarConfig.lastSyncStatus]);

  return (
    <div className="space-y-5">
      <div className={`rounded-[22px] border px-4 py-3.5 ${isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
        <div className="flex items-center gap-3">
          {isOnline ? <Wifi size={16} className="text-emerald-600" /> : <WifiOff size={16} className="text-rose-500" />}
          <div>
            <p className="section-kicker">{isOnline ? 'Online' : 'Offline'}</p>
            <p className="text-[13px] font-semibold text-[#2C2A28]">
              {isOnline ? 'Firestore connected' : 'ไม่มีสัญญาณอินเทอร์เน็ต'}
            </p>
          </div>
        </div>
      </div>

      <Section title="Profile" description="ข้อมูลส่วนตัวและชื่อที่ใช้แสดงในระบบ">
        <div className="settings-card md:col-span-2">
          <div className="flex items-center gap-3">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="avatar" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                <UserCircle size={22} className="text-slate-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#2C2A28] truncate">{currentUser.displayName || 'User'}</p>
              <p className="text-[12px] text-slate-500 truncate">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <label className="settings-field">
          <span className="settings-label">Nickname</span>
          <input
            type="text"
            value={nicknameDraft}
            onChange={(event) => setNicknameDraft(event.target.value)}
            maxLength={40}
            className="settings-input"
            placeholder="เช่น Gift"
          />
        </label>

        <label className="settings-field">
          <span className="settings-label">Display title</span>
          <input
            type="text"
            value={customTitleDraft}
            onChange={(event) => setCustomTitleDraft(event.target.value)}
            maxLength={40}
            className="settings-input"
            placeholder={ROLE_DEFAULTS[userProfile?.role || '']?.meta.label || 'ตำแหน่งงาน'}
          />
        </label>

        {userProfile && (
          <div className="settings-card md:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[22px]">{ROLE_EMOJI[userProfile.role] || '⚙️'}</span>
                <div>
                  <p className="settings-label">Role</p>
                  <p className="text-[13px] font-semibold text-[#2C2A28]">{ROLE_DEFAULTS[userProfile.role]?.meta.label || userProfile.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="settings-label">Target</p>
                <p className="text-[13px] font-semibold text-[#F4823C]">{monthlyTarget} Cr./month</p>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Reports" description="ข้อความลงท้ายและการส่งออกส่วนตัว">
        <div className="settings-card">
          <p className="settings-label">Daily ending</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReportGender('male')}
              className={`segmented-button rounded-2xl py-3 text-[11px] font-bold ${reportGender === 'male' ? 'active' : ''}`}
            >
              ครับ
            </button>
            <button
              type="button"
              onClick={() => setReportGender('female')}
              className={`segmented-button rounded-2xl py-3 text-[11px] font-bold ${reportGender === 'female' ? 'active' : ''}`}
            >
              ค่ะ
            </button>
          </div>
        </div>

        <label className="settings-field md:col-span-2">
          <span className="settings-label">Google Sheet URL</span>
          <input
            type="text"
            value={sheetUrl}
            onChange={(event) => setSheetUrl(event.target.value)}
            className="settings-input"
            placeholder="https://docs.google.com/..."
          />
        </label>

        <div className="settings-card md:col-span-2">
          <p className="settings-label">Daily labels</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { key: 'focus', label: 'Focus' },
              { key: 'routine', label: 'Routine' },
              { key: 'results', label: 'Results' },
              { key: 'nextMove', label: 'Next' },
              { key: 'issues', label: 'Issues' },
            ].map((field) => (
              <label key={field.key} className="settings-field !space-y-1">
                <span className="settings-label">{field.label}</span>
                <input
                  type="text"
                  value={reportEmojis[field.key as keyof typeof reportEmojis] || ''}
                  onChange={(event) => {
                    const value = event.target.value.slice(0, 4) || DEFAULT_REPORT_EMOJIS[field.key as keyof typeof DEFAULT_REPORT_EMOJIS];
                    setReportEmojis((prev) => ({ ...prev, [field.key]: value }));
                  }}
                  className="settings-input text-center text-[18px]"
                  placeholder={DEFAULT_REPORT_EMOJIS[field.key as keyof typeof DEFAULT_REPORT_EMOJIS]}
                />
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Calendar" description="ปฏิทินกลางสำหรับทีม Y8">
        <div className="settings-card md:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF2E8]">
              <CalendarIcon size={18} className="text-[#F4823C]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold text-[#2C2A28]">{orgCalendarConfig.label}</p>
                <span className={`calendar-kind ${orgCalendarConfig.lastSyncStatus === 'error' ? 'general' : 'content'}`}>{calendarStatusLabel}</span>
              </div>
              <p className="mt-1 text-[12px] leading-6 text-slate-600">
                {isSuperAdmin ? 'จัดการ feed กลางได้จากด้านล่าง' : 'Calendar นี้ถูกจัดการโดย super admin และแสดงเหมือนกันทั้งทีม'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="calendar-meta">{orgCalendarConfig.timezone}</span>
                <span className="calendar-meta">{orgCalendarConfig.lastEventCount || 0} events</span>
                <span className="calendar-meta">
                  {orgCalendarConfig.lastValidatedAt ? new Date(orgCalendarConfig.lastValidatedAt).toLocaleString('th-TH') : 'ยังไม่เคย validate'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isSuperAdmin ? (
          <>
            <label className="settings-field md:col-span-2">
              <span className="settings-label">Feed URL</span>
              <input
                type="text"
                value={calendarDraft.y8ContentFeedUrl}
                onChange={(event) => setCalendarDraft((prev) => ({ ...prev, y8ContentFeedUrl: event.target.value }))}
                className="settings-input"
                placeholder="https://calendar.google.com/calendar/ical/...ics"
              />
            </label>

            <label className="settings-field">
              <span className="settings-label">Label</span>
              <input
                type="text"
                value={calendarDraft.label}
                onChange={(event) => setCalendarDraft((prev) => ({ ...prev, label: event.target.value }))}
                className="settings-input"
              />
            </label>

            <label className="settings-field">
              <span className="settings-label">Timezone</span>
              <input
                type="text"
                value={calendarDraft.timezone}
                onChange={(event) => setCalendarDraft((prev) => ({ ...prev, timezone: event.target.value }))}
                className="settings-input"
              />
            </label>

            <div className="settings-card md:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="settings-label">Calendar enabled</p>
                  <p className="mt-1 text-[12px] text-slate-500">ปิดได้ถ้าต้องการหยุดแสดงปฏิทินชั่วคราว</p>
                </div>
                <button
                  onClick={() => setCalendarDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className="relative h-7 w-12 rounded-full transition-colors"
                  style={{ background: calendarDraft.enabled ? '#F4823C' : '#CBD5E1' }}
                >
                  <div
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
                    style={{ left: calendarDraft.enabled ? '1.45rem' : '0.25rem' }}
                  />
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => void onValidateCalendar()}
                disabled={calendarActionLoading}
                className="btn-secondary w-full rounded-2xl px-4 py-3 text-[12px] font-bold disabled:opacity-60"
              >
                {calendarActionLoading ? 'กำลังตรวจสอบ feed...' : 'Validate feed'}
              </button>
            </div>
          </>
        ) : null}
      </Section>

      <Section title="Drive" description="การเชื่อม Google Drive และโฟลเดอร์อัปโหลด">
        <div className="settings-card md:col-span-2">
          <button
            onClick={() => void handleConnectGoogleDrive()}
            className="btn-secondary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12px] font-bold"
          >
            <Upload size={14} />
            {googleAccessToken && Date.now() < googleAccessTokenExpiry ? 'เชื่อม Google Drive แล้ว' : 'เชื่อม Google Drive'}
          </button>
        </div>

        <label className="settings-field">
          <span className="settings-label">Folder ID</span>
          <input
            type="text"
            value={driveFolderId}
            onChange={(event) => setDriveFolderId(event.target.value)}
            className="settings-input"
            placeholder="Drive Folder ID"
          />
        </label>

        <div className="settings-card">
          <p className="settings-label">Sheets sync</p>
          <p className="mt-2 text-[13px] font-semibold text-[#2C2A28]">
            {latestSyncState?.status === 'failed'
              ? 'Backend sync มีปัญหา'
              : latestSyncState?.status === 'pending'
                ? 'กำลัง sync ไป Google Sheets'
                : 'Backend sync พร้อมใช้งาน'}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">{latestSyncState?.lastError || 'Firestore เป็น source of truth และ sync ผ่าน Cloud Functions'}</p>
        </div>

        {driveFolderId.trim() && (
          <div className="md:col-span-2">
            <button
              onClick={() => window.open(`https://drive.google.com/drive/folders/${driveFolderId.trim()}`, '_blank')}
              className="btn-secondary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12px] font-bold"
            >
              <ExternalLink size={14} />
              เปิดโฟลเดอร์ที่ตั้งไว้
            </button>
          </div>
        )}
      </Section>

      <section className="settings-section">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-[24px] border border-slate-200 bg-white px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Settings2 size={16} className="text-slate-500" />
            <div className="text-left">
              <p className="section-kicker">Advanced</p>
              <p className="settings-section-copy">diagnostics และการตั้งค่าที่ใช้งานไม่บ่อย</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="settings-grid pt-3">
            <div className={`settings-card md:col-span-2 ${firebaseConfigHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-start gap-3">
                {firebaseConfigHealthy ? (
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
                ) : (
                  <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
                )}
                <div className="min-w-0">
                  <p className="settings-label">Runtime diagnostics</p>
                  <p className="mt-1 text-[12px] text-slate-600 break-all">Project: {runtimeProjectId || '(missing)'}</p>
                  <p className="text-[12px] text-slate-600 break-all">Auth Domain: {runtimeAuthDomain || '(missing)'}</p>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="settings-label">Hover expand</p>
                  <p className="mt-1 text-[12px] text-slate-500">แสดงงานในกลุ่มทันทีเมื่อชี้เมาส์</p>
                </div>
                <button
                  onClick={() => setAutoHoverExpand((prev) => !prev)}
                  className="relative h-7 w-12 rounded-full transition-colors"
                  style={{ background: autoHoverExpand ? '#F4823C' : '#CBD5E1' }}
                >
                  <div
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all"
                    style={{ left: autoHoverExpand ? '1.45rem' : '0.25rem' }}
                  />
                </button>
              </div>
            </div>

            <div className="settings-card">
              <button
                onClick={openKpiEditor}
                className="btn-secondary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12px] font-bold"
              >
                <Sliders size={14} />
                KPI Config
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => void onSignOut()}
          className="btn-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[12px] font-bold sm:w-[170px]"
        >
          <LogOut size={14} />
          Logout
        </button>
        <button
          onClick={() => void onSave()}
          className="btn-primary flex-1 rounded-2xl px-4 py-3.5 text-[13px] font-bold"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
