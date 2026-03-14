
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlusCircle, History, BarChart3, Calendar as CalendarIcon,
  Trash2, CheckCircle2, Plus, Minus, Clock, Edit3, X, Settings,
  ChevronDown, FileText, Sparkles, Download, RefreshCw,
  ChevronLeft, ChevronRight, TrendingUp, Wifi, WifiOff,
  Save, UserCircle, Upload, Copy, ClipboardCheck, Sun, Moon,
} from 'lucide-react';
import {
  collection, collectionGroup, doc, setDoc, deleteDoc,
  onSnapshot, query, orderBy,
} from 'firebase/firestore';
import {
  signInWithPopup, signOut, onAuthStateChanged, type User,
  reauthenticateWithPopup, GoogleAuthProvider,
} from 'firebase/auth';
import { db, auth, googleProvider, createDriveProvider, firebaseApp } from '../lib/firebase/client';
import {
  adminDeleteUser as adminDeleteUserCallable,
  syncEntryToSheets as syncEntryToSheetsCallable,
  generateMonthlySummary as generateMonthlySummaryCallable,
  getCalendarFeed as getCalendarFeedCallable,
  updateCalendarConfig as updateCalendarConfigCallable,
} from '../lib/functionsClient';
import { LoadingScreen as AuthLoadingScreen, NicknameSetupScreen as AuthNicknameSetupScreen, SignInScreen as AuthSignInScreen } from '../features/auth/screens';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { AdminTab } from '../features/tabs/AdminTab';
import { CalendarTab } from '../features/tabs/CalendarTab';
import { DailyTab } from '../features/tabs/DailyTab';
import { HistoryTab } from '../features/tabs/HistoryTab';
import { LogTab } from '../features/tabs/LogTab';
import { SummaryTab } from '../features/tabs/SummaryTab';
import { TodayTab } from '../features/tabs/TodayTab';
import { resolveAppViewState } from './viewState';
import { WORK_GROUPS } from '@/config/constants';
import type {
  DailyReport,
  DailyReportType,
  DriveAttachment,
  LocalFileRef,
  NormalizedCalendarEvent,
  OrgCalendarConfig,
  RoleId,
  TabType,
  UserProfile,
  WorkEntry,
  WorkGroup,
  WorkGroups,
} from '@/domain/types';
import { ROLE_DEFAULTS, ROLE_EMOJI } from '@/config/roleDefaults';
import {
  HOST_EMAIL, SUPER_ADMIN_EMAIL, KPI_POLICY_VERSION,
  EXPECTED_FIREBASE_PROJECT, EXPECTED_FIREBASE_AUTH_DOMAIN,
  ZERO_STARTER_GROUPS, normalizeEmail, isHostEmail, isSuperAdminEmail,
  resolveRoleByEmail, cloneGroups, getTodayStr, dateToLocalStr,
  safePercent, getInitialKpiForEmail, scopedKey, formatThaiDate,
  MANUAL_PROFILE_PHOTOS, resolveProfilePhotoUrl, resolveProfileTitle,
  getMonthNameThai, extractGoogleApiReason, normalizeFileName,
  type PendingUploadFile,
} from '@/lib/appHelpers';
import {
  DEFAULT_REPORT_EMOJIS, getCurrentTimeHM, sanitizeList,
  buildMorningReportText, buildEveningReportText,
} from '@/features/reports/reportText';

// ─── APP-LOCAL CONSTANTS ─────────────────────────────────────────────────────
const DEFAULT_ORG_CALENDAR_CONFIG: OrgCalendarConfig = {
  enabled: true,
  label: 'Y8 Content',
  timezone: 'Asia/Bangkok',
  y8ContentFeedUrl: 'https://calendar.google.com/calendar/ical/743173a9c6b8651869b290dfecffd664359d853f459ef6a410824216e2968ce8%40group.calendar.google.com/private-55042342e3a3e421eafa8e46338e5af3/basic.ics',
  lastSyncStatus: 'ok',
  lastError: null,
  lastEventCount: 0,
};

const dateKeyInTimezone = (value: string | Date, timezone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(typeof value === 'string' ? new Date(value) : value);

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({
  isOpen, onClose, title, children, maxWidthClassName = 'max-w-md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white w-full ${maxWidthClassName} rounded-t-[36px] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col`}
        style={{ maxHeight: 'min(92dvh, calc(100vh - env(safe-area-inset-top, 0px) - 1rem))' }}
      >
        {/* Sticky title row */}
        <div className="flex justify-between items-center px-6 pt-7 pb-4 shrink-0">
          <h3 className="text-base font-bold text-[#2C2A28] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
        {/* Scrollable body */}
        <div
          className="overflow-y-auto flex-1 px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
const Toast = ({ message, show }: { message: string; show: boolean }) => {
  if (!show) return null;
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[200] bg-[#2D3748] text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
      <CheckCircle2 className="text-emerald-400 shrink-0" size={15} />
      <span className="font-semibold text-[13px] whitespace-nowrap">{message}</span>
    </div>
  );
};

// ─── GROUP BAR ────────────────────────────────────────────────────────────────
const GroupBar = ({
  groupKey, name, credits, maxCredits, color, bg,
}: {
  key?: React.Key; groupKey: string; name: string; credits: number; maxCredits: number; color: string; bg: string;
}) => {
  const pct = maxCredits > 0 ? (credits / maxCredits) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ backgroundColor: bg, color }}
      >
        {groupKey}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1.5">
          <p className="text-[11px] font-semibold text-[#2C2A28] truncate">{name}</p>
          <p className="text-[11px] font-bold ml-2 shrink-0 tabular-nums" style={{ color }}>
            {credits} Cr.
          </p>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── ENTRY CARD ──────────────────────────────────────────────────────────────
function EntryCard({
  entry, workGroups, onEdit, onDelete, onShowToast,
}: {
  key?: React.Key;
  entry: WorkEntry;
  workGroups: WorkGroups;
  onEdit: (e: WorkEntry) => void;
  onDelete: (id: string) => void;
  onShowToast: (msg: string) => void;
}) {
  const group = workGroups[entry.groupId];
  const task  = group?.tasks.find((tk) => tk.id === entry.taskId);

  // ── Swipe-to-delete
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeStartX.current;
    if (dx < -5) setSwipeOffset(Math.max(dx, -90));
  };
  const onTouchEnd = () => {
    if (swipeOffset < -60) onDelete(entry.id);
    setSwipeOffset(0);
  };

  const hasLinks = entry.canvaLink || entry.driveLink ||
    (entry.attachments && entry.attachments.length > 0) ||
    (entry.localFiles  && entry.localFiles.length  > 0);

  return (
    <div className="relative overflow-hidden rounded-[20px]">
      {/* Red "delete" layer behind */}
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end pr-4 rounded-[20px]">
        <Trash2 size={16} className="text-white" />
      </div>
      {/* Swipeable card */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform:  `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.3s ease' : 'none',
        }}
        className="relative bg-white px-4 py-3.5 rounded-[20px] border border-slate-100/80 flex items-center gap-3 shadow-sm"
      >
        <div
          className="w-9 h-9 rounded-[12px] flex items-center justify-center font-black text-[11px] shrink-0"
          style={{ backgroundColor: group?.bg || '#f3f4f6', color: group?.color || '#4B5563' }}
        >
          {group?.icon || entry.groupId.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#2C2A28] text-[13px] leading-tight truncate">{task?.name || 'Unknown'}</p>
          <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider mt-0.5">
            {entry.quantity} {task?.unit || 'หน่วย'} ·{' '}
            <span className="text-[#F4823C]">{entry.credits} Cr.</span>
          </p>
          {entry.notes ? (
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{entry.notes}</p>
          ) : null}
          {hasLinks && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {entry.canvaLink && (
                <a href={entry.canvaLink} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-[8px] font-black px-2 py-0.5 rounded-md text-white tracking-wide"
                  style={{ background: '#7C3AED' }}>Canva ↗</a>
              )}
              {entry.attachments && entry.attachments.length > 0
                ? entry.attachments.map((att, i) => (
                    <a key={i} href={att.link} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title={att.normalizedName}
                      className="text-[8px] font-black px-2 py-0.5 rounded-md text-white tracking-wide"
                      style={{ background: '#1D6F42' }}>
                      {entry.attachments!.length > 1 ? `Drive ${i + 1} ↗` : 'Drive ↗'}
                    </a>
                  ))
                : entry.driveLink && (
                    <a href={entry.driveLink} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[8px] font-black px-2 py-0.5 rounded-md text-white tracking-wide"
                      style={{ background: '#1D6F42' }}>Drive ↗</a>
                  )
              }
              {/* Local files */}
              {entry.localFiles && entry.localFiles.map((lf, i) => (
                <button
                  key={`lf-${i}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (lf.idbKey) {
                      const handle = await idbGet(lf.idbKey);
                      if (handle) {
                        try {
                          const maybePermission =
                            'requestPermission' in handle
                              ? await (handle as FileSystemFileHandle & {
                                requestPermission: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
                              }).requestPermission({ mode: 'read' })
                              : 'granted';
                          if (maybePermission === 'granted') {
                            const file = await handle.getFile();
                            const url  = URL.createObjectURL(file);
                            window.open(url, '_blank');
                            return;
                          }
                        } catch { /* fall through */ }
                      }
                    }
                    onShowToast('ไฟล์ไม่พร้อมใช้งาน — เปิดบนอุปกรณ์เดิม');
                  }}
                  className="text-[8px] font-black px-2 py-0.5 rounded-md text-white tracking-wide flex items-center gap-1"
                  style={{ background: '#0F766E' }}
                >
                  {lf.thumbnail && (
                    <img src={lf.thumbnail} className="w-4 h-4 rounded object-cover" alt="" />
                  )}
                  {lf.name.length > 12 ? lf.name.slice(0, 12) + '…' : lf.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 transition-colors active:bg-slate-50"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 transition-colors active:bg-rose-50 active:text-rose-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NAV BUTTON ──────────────────────────────────────────────────────────────
function NavButton({
  active, onClick, icon, label, compact = false,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${compact ? 'min-w-0' : 'min-w-[56px]'} transition-all duration-200`}
    >
      <div
        className={`${compact ? 'p-2' : 'p-2.5'} rounded-2xl transition-all duration-200 ${
          active ? 'bg-[#2C2A28] shadow-md text-[#F4823C]' : 'text-slate-300'
        }`}
      >
        {icon}
      </div>
      <span
        className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-bold uppercase tracking-[0.08em] transition-all text-center ${
          active ? 'text-[#2C2A28]' : 'text-slate-300'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function DailyListField({
  label,
  prefix,
  items,
  onAdd,
  onChange,
  onRemove,
}: {
  label: string;
  prefix: string;
  items: string[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-1.5 rounded-xl bg-orange-50 text-[#F4823C] text-[10px] font-bold border border-orange-100 flex items-center gap-1.5"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${prefix}_${index}`} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-[#F4823C] flex items-center justify-center text-[10px] font-black shrink-0">
              {prefix === '✔️' ? prefix : `${prefix}${index + 1}`}
            </div>
            <input
              type="text"
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              className="flex-1 px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none"
              placeholder={label}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COLOR PALETTE FOR GROUP PICKER ──────────────────────────────────────────
const GROUP_COLORS = [
  { color: '#F4823C', bg: 'rgba(244,130,60,0.12)' },
  { color: '#F5A855', bg: 'rgba(245,168,85,0.12)' },
  { color: '#E87AA5', bg: 'rgba(232,122,165,0.12)' },
  { color: '#7B61FF', bg: 'rgba(123,97,255,0.12)' },
  { color: '#4682B4', bg: 'rgba(70,130,180,0.12)' },
  { color: '#2BAE66', bg: 'rgba(43,174,102,0.12)' },
  { color: '#C9A96E', bg: 'rgba(201,169,110,0.12)' },
  { color: '#008080', bg: 'rgba(0,128,128,0.12)' },
  { color: '#A0785A', bg: 'rgba(160,120,90,0.12)' },
  { color: '#B784A7', bg: 'rgba(183,132,167,0.12)' },
  { color: '#707080', bg: 'rgba(112,112,128,0.12)' },
  { color: '#E07B54', bg: 'rgba(224,123,84,0.12)' },
];

// ─── KPI EDITOR (Phase 5 — per-user, group CRUD, target) ─────────────────────
function KpiEditor({
  config, monthlyTarget, onSave, onClose, title = 'จัดการ KPI ของฉัน', subtitle = 'กลุ่มงาน · รายการ · Credits · เป้าหมาย', deleteAction,
}: {
  config: WorkGroups;
  monthlyTarget: number;
  onSave: (updated: WorkGroups, newTarget: number) => Promise<void>;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  deleteAction?: {
    label: string;
    helper: string;
    onDelete: () => Promise<void>;
  };
}) {
  const [draft, setDraft]             = useState<WorkGroups>(() => JSON.parse(JSON.stringify(config)));
  const [targetDraft, setTargetDraft] = useState<number>(monthlyTarget);
  const [saving, setSaving]           = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(Object.keys(config)[0] || null);
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);

  // ── Group icon / brand helpers
  const updateGroupIcon = (gKey: string, icon: string) =>
    setDraft(prev => ({ ...prev, [gKey]: { ...prev[gKey], icon: icon || undefined } }));

  const toggleGroupBrand = (gKey: string, brand: 'y8' | 'pv', checked: boolean) =>
    setDraft(prev => {
      const cur = prev[gKey].brands || [];
      const next = checked ? ([...cur, brand] as ('y8' | 'pv')[]) : cur.filter(b => b !== brand);
      return { ...prev, [gKey]: { ...prev[gKey], brands: next } };
    });

  // ── Task CRUD
  const updateTask = (gKey: string, taskId: string, field: string, value: string | number) => {
    setDraft(prev => ({
      ...prev,
      [gKey]: {
        ...prev[gKey],
        tasks: prev[gKey].tasks.map(t =>
          t.id === taskId ? { ...t, [field]: field === 'creditPerUnit' ? Number(value) : value } : t
        ),
      },
    }));
  };

  const addTask = (gKey: string) => {
    const group = draft[gKey];
    const ts    = Date.now().toString(36).slice(-4).toUpperCase();
    const newId = `${gKey}-${ts}`;
    setDraft(prev => ({
      ...prev,
      [gKey]: {
        ...prev[gKey],
        tasks: [...prev[gKey].tasks, { id: newId, name: 'New Task', creditPerUnit: 1, unit: 'Artwork', desc: '' }],
      },
    }));
  };

  const deleteTask = (gKey: string, taskId: string) => {
    setDraft(prev => ({
      ...prev,
      [gKey]: { ...prev[gKey], tasks: prev[gKey].tasks.filter(t => t.id !== taskId) },
    }));
  };

  // ── Group CRUD
  const addGroup = () => {
    const ts     = Date.now().toString(36).slice(-4).toUpperCase();
    const key    = `GRP-${ts}`;
    const palette = GROUP_COLORS[Object.keys(draft).length % GROUP_COLORS.length];
    setDraft(prev => ({
      ...prev,
      [key]: {
        label: key,
        name: 'กลุ่มงานใหม่',
        color: palette.color,
        bg: palette.bg,
        border: palette.bg,
        tasks: [{ id: `${key}-01`, name: 'New Task', creditPerUnit: 1, unit: 'Artwork', desc: '' }],
      },
    }));
    setExpandedGroup(key);
    setEditingGroupKey(key);
  };

  const updateGroupName = (gKey: string, name: string) => {
    setDraft(prev => ({ ...prev, [gKey]: { ...prev[gKey], name } }));
  };

  const updateGroupColor = (gKey: string, color: string, bg: string) => {
    setDraft(prev => ({ ...prev, [gKey]: { ...prev[gKey], color, bg, border: bg } }));
  };

  const deleteGroup = (gKey: string) => {
    setDraft(prev => {
      const next = { ...prev };
      delete next[gKey];
      return next;
    });
    if (expandedGroup === gKey) setExpandedGroup(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft, targetDraft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const groups = (Object.entries(draft) as [string, WorkGroup][]).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-[150] bg-[#FDFAF7] flex flex-col max-w-md mx-auto left-0 right-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-4 bg-white border-b border-orange-100/60 shadow-sm shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 active:bg-orange-50 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <p className="font-bold text-[#2C2A28] text-[14px]">{title}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 bg-[#F4823C] text-white rounded-xl font-bold text-[12px] flex items-center gap-1.5 disabled:opacity-60 active:scale-95 transition-all glow-orange"
        >
          {saving
            ? <RefreshCw size={13} className="animate-spin" />
            : <><Save size={12} /> บันทึก</>
          }
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-3">

        {/* Monthly Target */}
        <div className="bg-white rounded-[20px] border border-orange-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold text-[#F4823C] uppercase tracking-widest mb-1">เป้าหมายต่อเดือน</p>
            <p className="text-[12px] text-slate-400">Credits รวมที่ต้องทำให้ครบ</p>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 rounded-2xl px-3 py-2 border border-orange-100">
            <button
              onClick={() => setTargetDraft(t => Math.max(0, t - 10))}
              className="w-7 h-7 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#F4823C] active:scale-90 transition-transform shadow-sm"
            >
              <Minus size={13} />
            </button>
            <input
              type="number"
              value={targetDraft}
              onChange={e => setTargetDraft(Number(e.target.value))}
              className="w-16 text-center text-[22px] font-light text-[#F4823C] bg-transparent outline-none"
              min={0}
            />
            <button
              onClick={() => setTargetDraft(t => t + 10)}
              className="w-7 h-7 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[#F4823C] active:scale-90 transition-transform shadow-sm"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Groups */}
        {groups.map(([key, group]) => (
          <div key={key} className="bg-white rounded-[20px] border border-slate-100 overflow-hidden shadow-sm">
            {/* Group Header */}
            <div className="flex items-center gap-2 px-3 py-3">
              {/* Icon input — lives inside the colored badge */}
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: group.bg }}
              >
                <input
                  type="text"
                  value={group.icon || ''}
                  maxLength={2}
                  onChange={e => updateGroupIcon(key, e.target.value.slice(0, 2))}
                  placeholder={key.slice(0, 1)}
                  className="w-full h-full text-center bg-transparent outline-none text-[14px] font-black rounded-[12px]"
                  style={{ color: group.color }}
                  onClick={e => e.stopPropagation()}
                />
              </div>

              {/* Name + brand tags — tap to expand */}
              <button
                onClick={() => setExpandedGroup(expandedGroup === key ? null : key)}
                className="flex items-center gap-2 flex-1 text-left min-w-0"
              >
                <div className="flex-1 min-w-0">
                  {editingGroupKey === key ? (
                    <input
                      autoFocus
                      type="text"
                      value={group.name}
                      onChange={e => updateGroupName(key, e.target.value)}
                      onBlur={() => setEditingGroupKey(null)}
                      className="font-bold text-[13px] text-[#2C2A28] bg-orange-50 border border-orange-200 rounded-lg px-2 py-0.5 w-full outline-none"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <p className="font-bold text-[#2C2A28] text-[13px] truncate">{group.name}</p>
                  )}
                  {/* Brand chips */}
                  <div className="flex items-center gap-2 mt-0.5">
                    {(['y8', 'pv'] as const).map(brand => (
                      <label
                        key={brand}
                        className="flex items-center gap-1 text-[10px] cursor-pointer select-none"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={(group.brands || []).includes(brand)}
                          onChange={e => toggleGroupBrand(key, brand, e.target.checked)}
                          className="w-3 h-3 accent-[#F4823C]"
                        />
                        <span className="font-bold" style={{ color: brand === 'y8' ? '#F4823C' : '#E87AA5' }}>
                          {brand === 'y8' ? 'Y8' : 'PV'}
                        </span>
                      </label>
                    ))}
                    <span className="text-[9px] text-slate-300">{group.tasks.length} รายการ</span>
                  </div>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-slate-300 transition-transform duration-300 shrink-0 ${expandedGroup === key ? 'rotate-180' : ''}`}
                />
              </button>

              <button
                onClick={() => setEditingGroupKey(key)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 active:text-[#F4823C] active:bg-orange-50 transition-colors"
              >
                <Edit3 size={12} />
              </button>
              {groups.length > 1 && (
                <button
                  onClick={() => deleteGroup(key)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 active:text-rose-400 active:bg-rose-50 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Color Picker (visible only when expanded) */}
            {expandedGroup === key && (
              <div className="px-4 pb-3 flex gap-2 flex-wrap border-b border-slate-50">
                {GROUP_COLORS.map(({ color, bg }) => (
                  <button
                    key={color}
                    onClick={() => updateGroupColor(key, color, bg)}
                    className="w-7 h-7 rounded-full transition-all active:scale-90 border-2"
                    style={{
                      backgroundColor: color,
                      borderColor: group.color === color ? color : 'transparent',
                      boxShadow: group.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Tasks */}
            {expandedGroup === key && (
              <div className="px-4 pb-4 pt-3 space-y-2.5">
                {group.tasks.map((task) => (
                  <div key={task.id} className="bg-[#FDFAF7] rounded-[14px] p-3 space-y-2.5 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: group.bg, color: group.color }}
                      >
                        {task.id}
                      </span>
                      {group.tasks.length > 1 && (
                        <button
                          onClick={() => deleteTask(key, task.id)}
                          className="w-6 h-6 flex items-center justify-center text-rose-300 active:text-rose-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={task.name}
                      onChange={e => updateTask(key, task.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-[#2C2A28] outline-none focus:border-orange-300"
                      placeholder="ชื่อรายการงาน..."
                    />
                    <input
                      type="text"
                      value={task.desc || ''}
                      onChange={e => updateTask(key, task.id, 'desc', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-400 outline-none focus:border-orange-300"
                      placeholder="คำอธิบาย (ไม่บังคับ)"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cr/Unit</label>
                        <input
                          type="number"
                          value={task.creditPerUnit}
                          onChange={e => updateTask(key, task.id, 'creditPerUnit', e.target.value)}
                          min="0" step="0.1"
                          className="w-full px-2 py-2 bg-white border border-orange-200 rounded-xl text-[14px] font-bold text-[#F4823C] outline-none text-center"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">หน่วย (Unit)</label>
                        <input
                          type="text"
                          value={task.unit}
                          onChange={e => updateTask(key, task.id, 'unit', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-[#2C2A28] outline-none focus:border-orange-300"
                          placeholder="Artwork, Clip, Post..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Task */}
                <button
                  onClick={() => addTask(key)}
                  className="w-full py-3 border-2 border-dashed rounded-[14px] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  style={{ borderColor: group.color + '40', color: group.color }}
                >
                  <Plus size={14} /> เพิ่มรายการงาน
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Group */}
        <button
          onClick={addGroup}
          className="w-full py-4 border-2 border-dashed border-orange-200 rounded-[20px] text-[12px] font-bold text-[#F4823C] flex items-center justify-center gap-2 active:bg-orange-50 transition-colors"
        >
          <Plus size={16} /> เพิ่มกลุ่มงานใหม่
        </button>

        <p className="text-center text-[10px] text-slate-300 pb-2">
          การเปลี่ยนแปลงนี้จะมีผลเฉพาะ KPI ของคุณเท่านั้น
        </p>

        {deleteAction && (
          <div className="bg-rose-50 rounded-[20px] border border-rose-200 px-5 py-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Danger Zone</p>
              <p className="mt-2 text-[13px] font-semibold text-[#2C2A28]">{deleteAction.label}</p>
              <p className="mt-1 text-[12px] text-slate-500 leading-6">{deleteAction.helper}</p>
            </div>
            <button
              type="button"
              onClick={() => void deleteAction.onDelete()}
              className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-[12px] font-bold text-rose-600"
            >
              ลบผู้ใช้นี้ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INDEXEDDB HELPERS (Local File System Access) ────────────────────────────
const IDB_DB    = 'jatrack_files';
const IDB_STORE = 'handles';

function idbGet(key: string): Promise<FileSystemFileHandle | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, 'readonly');
      const r  = tx.objectStore(IDB_STORE).get(key);
      r.onsuccess = () => resolve((r.result as FileSystemFileHandle) || null);
      r.onerror   = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}

function idbSet(key: string, handle: FileSystemFileHandle): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    };
    req.onerror = () => resolve();
  });
}

// ─── APP LOGO ────────────────────────────────────────────────────────────────
const AppLogo = ({ size = 80 }: { size?: number }) => (
  <div
    className="rounded-[28px] overflow-hidden shadow-2xl border border-white/50"
    style={{ width: size, height: size, minWidth: size }}
  >
    <img src="/icon-512.png" alt="Jatrack" className="w-full h-full object-cover" />
  </div>
);

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-[#FDFAF7] items-center justify-center">
    <div className="relative flex flex-col items-center mb-8 animate-in zoom-in duration-400">
      <div
        className="absolute inset-[-16px] rounded-[44px] animate-glow pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,130,60,0.24) 0%, transparent 70%)' }}
      />
      <div className="animate-float relative z-10">
        <AppLogo size={80} />
      </div>
      <div
        className="absolute bottom-[-12px] left-1/2 w-[52px] h-[9px] rounded-full blur-xl animate-shadow pointer-events-none"
        style={{ background: 'rgba(244,130,60,0.50)' }}
      />
    </div>
    <RefreshCw size={18} className="text-orange-300 animate-spin" />
    <p className="text-[10px] text-slate-300 mt-3 tracking-widest uppercase">Loading...</p>
  </div>
);

// ─── SIGN IN SCREEN ───────────────────────────────────────────────────────────
const SignInScreen = ({
  onSignIn, loading, toast,
}: {
  onSignIn: () => void;
  loading: boolean;
  toast: { show: boolean; message: string };
}) => {
  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-[#FDFAF7] items-center justify-center px-7">
      <Toast {...toast} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col items-center mb-10 animate-in zoom-in duration-500 relative z-10">
        <div className="relative flex flex-col items-center mb-6">
          <div className="absolute inset-[-18px] rounded-[46px] animate-glow pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(244,130,60,0.28) 0%, transparent 70%)' }} />
          <div className="animate-float relative z-10"><AppLogo size={88} /></div>
          <div className="absolute bottom-[-14px] left-1/2 w-[56px] h-[10px] rounded-full blur-xl animate-shadow pointer-events-none"
            style={{ background: 'rgba(244,130,60,0.55)' }} />
        </div>
        <h1 className="text-[20px] font-light text-[#2C2A28] tracking-[0.15em]">Jatrack</h1>
        <p className="text-[11px] text-[#F4823C] font-bold mt-0.5 tracking-[0.35em] uppercase">KPI Tracker</p>
      </div>

      <div className="w-full bg-white/70 border border-orange-100 rounded-2xl px-4 py-3 mb-5 relative z-10 shadow-sm">
        <p className="text-[10px] font-bold text-[#F4823C] uppercase tracking-widest mb-1">Google Only</p>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          เข้าใช้งานด้วยบัญชี Google เท่านั้น เพื่อให้เชื่อม Drive, Sheets และสิทธิ์ผู้ใช้สอดคล้องกันทั้งระบบ
        </p>
      </div>

      <div className="w-full space-y-3 animate-in slide-in-from-bottom duration-500 relative z-10">
        <button onClick={onSignIn} disabled={loading}
          className="w-full py-4 bg-white border border-orange-100 rounded-2xl font-bold text-[14px] text-[#2C2A28] tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
          style={{ boxShadow: '0 4px 20px rgba(244,130,60,0.12)' }}>
          {loading ? <RefreshCw size={18} className="animate-spin text-orange-300" /> : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-slate-300">
          รองรับ Google Drive, Google Sheets และสิทธิ์ตามบัญชีโดยตรง
        </p>
      </div>

      <p className="absolute bottom-6 left-0 right-0 text-center text-[9px] text-slate-300 tracking-widest">
        © 2026 Young Age Corporation Co., Ltd. &amp; Pharvia 2025 Co., Ltd.
      </p>
    </div>
  );
};

// ─── NICKNAME SETUP SCREEN ───────────────────────────────────────────────────
const NicknameSetupScreen = ({
  defaultValue,
  onSave,
}: {
  defaultValue: string;
  onSave: (nickname: string) => Promise<boolean>;
}) => {
  const [nickname, setNickname] = useState(defaultValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-[#FDFAF7] px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-10">
      <div className="flex flex-col items-center mb-8 animate-in zoom-in duration-400">
        <div className="mb-4"><AppLogo size={68} /></div>
        <h1 className="text-[16px] font-bold text-[#2C2A28] tracking-wide">ตั้งชื่อเล่นก่อนเริ่มใช้งาน</h1>
        <p className="text-[11px] text-slate-400 mt-1 text-center leading-relaxed">
          ชื่อเล่นจะใช้สร้างชื่อ Sheet และรายงานอัตโนมัติ
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[22px] p-5 space-y-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nickname</label>
          <input
            autoFocus
            value={nickname}
            maxLength={40}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="เช่น Gift, Aof, Mymint"
            className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[14px] font-semibold outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim()}
          className="w-full py-3.5 text-white rounded-xl font-bold text-[13px] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกชื่อเล่น'}
        </button>
      </div>
    </div>
  );
};

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Auth (Phase 3)
  const [currentUser, setCurrentUser]       = useState<User | null>(null);
  const [authLoading, setAuthLoading]       = useState(true);
  const [signInLoading, setSignInLoading]   = useState(false);

  // ── User Profile + Access Policy
  const [userProfile, setUserProfile]       = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [nicknameDraft, setNicknameDraft]   = useState('');

  // ── KPI Config
  const [kpiConfig, setKpiConfig]           = useState<WorkGroups>(WORK_GROUPS);
  const [monthlyTarget, setMonthlyTarget]   = useState<number>(0);
  const [showKpiEditor, setShowKpiEditor]   = useState(false);

  // ── App state
  const [entries, setEntries]               = useState<WorkEntry[]>([]);
  const [activeTab, setActiveTab]           = useState<TabType>('log');
  const [dailyTab, setDailyTab]             = useState<'morning' | 'evening' | 'history'>('morning');
  const [toast, setToast]                   = useState({ show: false, message: '' });
  const [isLoading, setIsLoading]           = useState(false);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);

  const [sheetUrl, setSheetUrl]             = useState<string>('');
  const [geminiResult, setGeminiResult]     = useState('');
  const [geminiLoading, setGeminiLoading]   = useState(false);
  const [showGemini, setShowGemini]         = useState(false);

  const [selectedDate, setSelectedDate]     = useState(getTodayStr());
  const [dailyDate, setDailyDate]           = useState(getTodayStr());
  const [selectedGroup, setSelectedGroup]   = useState<string>('A');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    Object.values(WORK_GROUPS)[0]?.tasks[0]?.id || 'A01'
  );
  const [quantity, setQuantity]             = useState<number>(1);
  const [notes, setNotes]                   = useState('');

  const [editEntry, setEditEntry]           = useState<WorkEntry | null>(null);
  const [deleteId, setDeleteId]             = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState(false);
  const [showSettings, setShowSettings]     = useState(false);
  const [exportMonth, setExportMonth]       = useState(new Date().getMonth());
  const [exportYear, setExportYear]         = useState(new Date().getFullYear());
  const [summaryMonth, setSummaryMonth]     = useState(new Date().getMonth());
  const [summaryYear, setSummaryYear]       = useState(new Date().getFullYear());
  const [adminProfiles, setAdminProfiles]   = useState<UserProfile[]>([]);
  const [adminEntries, setAdminEntries]     = useState<WorkEntry[]>([]);
  const [adminKpiConfigs, setAdminKpiConfigs] = useState<Record<string, { groups: WorkGroups; monthlyTarget: number; roleId?: string }>>({});
  const [adminLoading, setAdminLoading]     = useState(false);
  const [adminMonth, setAdminMonth]         = useState(new Date().getMonth());
  const [adminYear, setAdminYear]           = useState(new Date().getFullYear());
  const [adminManagedUid, setAdminManagedUid] = useState<string | null>(null);
  const [adminUserOrder, setAdminUserOrder] = useState<string[]>([]);
  const [dailyReports, setDailyReports]     = useState<DailyReport[]>([]);
  const [dailyReportsLoading, setDailyReportsLoading] = useState(false);
  const [dailySaving, setDailySaving]       = useState(false);
  const [dailyCopySuccess, setDailyCopySuccess] = useState(false);
  const [reportGender, setReportGender]     = useState<'male' | 'female'>('male');
  const [reportEmojis, setReportEmojis]     = useState(DEFAULT_REPORT_EMOJIS);
  const [morningCheckInTime, setMorningCheckInTime] = useState(getCurrentTimeHM());
  const [morningFocusItems, setMorningFocusItems] = useState<string[]>(['']);
  const [eveningRoutineItems, setEveningRoutineItems] = useState<string[]>(['']);
  const [eveningResultItems, setEveningResultItems] = useState<string[]>(['']);
  const [eveningNextMoveItems, setEveningNextMoveItems] = useState<string[]>(['']);
  const [dailyIssues, setDailyIssues]       = useState('');
  const [dailyIssueStatus, setDailyIssueStatus] = useState<'resolved' | 'unresolved'>('resolved');
  const [dailyIssueDetail, setDailyIssueDetail] = useState('');
  const [dailyIssueNextStep, setDailyIssueNextStep] = useState('');

  // ── Integration states
  const [driveFolderId, setDriveFolderId]     = useState('');
  const [orgCalendarConfig, setOrgCalendarConfig] = useState<OrgCalendarConfig>(DEFAULT_ORG_CALENDAR_CONFIG);
  const [calendarDraft, setCalendarDraft]     = useState<OrgCalendarConfig>(DEFAULT_ORG_CALENDAR_CONFIG);
  const [calendarEvents, setCalendarEvents]   = useState<NormalizedCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);
  const [calendarError, setCalendarError]     = useState('');
  const [driveUploading, setDriveUploading]   = useState(false);
  const [driveUploadingEdit, setDriveUploadingEdit] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [googleAccessTokenExpiry, setGoogleAccessTokenExpiry] = useState(0);
  // Entry link fields (LOG form)
  const [canvaLink, setCanvaLink]             = useState('');
  const [driveLink, setDriveLink]             = useState('');
  const [logAttachments, setLogAttachments]   = useState<DriveAttachment[]>([]);
  // Rename-before-upload modal
  const [pendingUploads, setPendingUploads]   = useState<PendingUploadFile[]>([]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const logDriveInputRef  = useRef<HTMLInputElement | null>(null);
  const editDriveInputRef = useRef<HTMLInputElement | null>(null);
  // Cache Drive subfolder IDs to avoid repeated API lookups per session
  const subfolderCache = useRef(new Map<string, string>());
  const isSuperAdmin = isSuperAdminEmail(currentUser?.email);

  // ── New v3 states
  const [customTitleDraft, setCustomTitleDraft]   = useState('');
  const [pendingLocalFiles, setPendingLocalFiles] = useState<LocalFileRef[]>([]);

  // ── Group expand/collapse + brand/icon management
  const [expandedGroups, setExpandedGroups]     = useState<Set<string>>(new Set());
  const [autoHoverExpand, setAutoHoverExpand]   = useState(false);
  const [hoveredGroup, setHoveredGroup]         = useState<string | null>(null);
  const inFlightEntrySyncs = useRef(new Set<string>());

  // ── Offline detection
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Load per-user integration settings
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const readSetting = (key: string, fallback = '') =>
      localStorage.getItem(scopedKey(uid, key)) ?? fallback;

    setSheetUrl(readSetting('sheet_url', ''));
    setDriveFolderId(readSetting('drive_folder_id', ''));
    const savedGender = readSetting('report_gender', 'male');
    setReportGender(savedGender === 'female' ? 'female' : 'male');
    const rawEmojiSettings = readSetting('report_emojis', '');
    if (rawEmojiSettings) {
      try {
        setReportEmojis({ ...DEFAULT_REPORT_EMOJIS, ...(JSON.parse(rawEmojiSettings) as Partial<typeof DEFAULT_REPORT_EMOJIS>) });
      } catch {
        setReportEmojis(DEFAULT_REPORT_EMOJIS);
      }
    } else {
      setReportEmojis(DEFAULT_REPORT_EMOJIS);
    }
    const savedHover = readSetting('auto_hover_expand', '');
    if (savedHover) {
      try { setAutoHoverExpand(JSON.parse(savedHover) as boolean); } catch { /* ignore */ }
    }
  }, [currentUser]);

  // ── Sync customTitleDraft when Settings opens
  useEffect(() => {
    if (!showSettings) return;
    if (userProfile?.customTitle !== undefined) setCustomTitleDraft(userProfile.customTitle || '');
    setCalendarDraft(orgCalendarConfig);
  }, [showSettings, orgCalendarConfig, userProfile?.customTitle]);

  // ── localStorage offline cache
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(scopedKey(currentUser.uid, 'entries_v8'), JSON.stringify(entries));
  }, [entries, currentUser]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const describeCallableError = (error: unknown) => {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code || '') : '';
    const message = typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message || '') : '';
    if (code.endsWith('unauthenticated')) return 'กรุณาเข้าสู่ระบบใหม่';
    if (code.endsWith('invalid-argument')) return message || 'ข้อมูลปฏิทินไม่ถูกต้อง';
    if (code.endsWith('permission-denied')) return 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
    if (code.endsWith('internal')) return 'เชื่อมต่อบริการเบื้องหลังไม่สำเร็จ';
    return message || 'เชื่อมต่อบริการไม่สำเร็จ';
  };

  // ── Firebase Auth listener (Phase 3)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── User profile listener + role policy by email
  useEffect(() => {
    if (!currentUser) { setUserProfile(null); return; }
    setProfileLoading(true);
    const forcedRole = resolveRoleByEmail(currentUser.email);
    const forcedAdmin = isSuperAdminEmail(currentUser.email);
    const now = Date.now();

    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid),
      async (snap) => {
        const normalizedCurrentEmail = normalizeEmail(currentUser.email);
        const defaultTitle = resolveProfileTitle({ email: normalizedCurrentEmail, role: forcedRole });
        const defaultPhotoOverride = MANUAL_PROFILE_PHOTOS[normalizedCurrentEmail] || '';
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          const persistedPhotoURL = currentUser.photoURL || profile.photoURL || '';
          const merged: UserProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || profile.displayName || 'User',
            nickname: profile.nickname || '',
            email: normalizedCurrentEmail || profile.email || '',
            photoURL: resolveProfilePhotoUrl({
              email: normalizedCurrentEmail || profile.email || '',
              manualPhotoURL: profile.photoURLOverride,
              googlePhotoURL: currentUser.photoURL,
              storedPhotoURL: profile.photoURL,
            }),
            photoURLOverride: profile.photoURLOverride || defaultPhotoOverride,
            role: forcedRole,
            isAdmin: forcedAdmin,
            customTitle: resolveProfileTitle({
              email: normalizedCurrentEmail || profile.email || '',
              role: forcedRole,
              customTitle: profile.customTitle,
            }),
            settings: profile.settings,
            createdAt: profile.createdAt || now,
            updatedAt: now,
          };
          setUserProfile(merged);
          setNicknameDraft(merged.nickname || '');
          setCustomTitleDraft(merged.customTitle || '');
          if (profile.settings) {
            const s = profile.settings;
            if (s.autoHoverExpand !== undefined) setAutoHoverExpand(s.autoHoverExpand);
            if (s.driveFolderId)  setDriveFolderId(s.driveFolderId);
            if (s.sheetUrl)       setSheetUrl(s.sheetUrl);
            if (s.reportGender)   setReportGender(s.reportGender);
            if (s.reportEmojis)   setReportEmojis({ ...DEFAULT_REPORT_EMOJIS, ...s.reportEmojis });
          }

          if (
            profile.role !== merged.role ||
            profile.isAdmin !== merged.isAdmin ||
            profile.email !== merged.email ||
            profile.displayName !== merged.displayName ||
            (profile.photoURL || '') !== (persistedPhotoURL || '') ||
            (profile.photoURLOverride || '') !== (merged.photoURLOverride || '') ||
            (profile.customTitle || '') !== (merged.customTitle || '')
          ) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              role: merged.role,
              isAdmin: merged.isAdmin,
              email: merged.email,
              displayName: merged.displayName,
              photoURL: persistedPhotoURL,
              photoURLOverride: merged.photoURLOverride || '',
              customTitle: merged.customTitle || defaultTitle,
              updatedAt: now,
            }, { merge: true });
          }
        } else {
          const profile: UserProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'User',
            nickname: '',
            email: normalizedCurrentEmail,
            photoURL: resolveProfilePhotoUrl({
              email: normalizedCurrentEmail,
              manualPhotoURL: defaultPhotoOverride,
              googlePhotoURL: currentUser.photoURL,
            }),
            photoURLOverride: defaultPhotoOverride,
            role: forcedRole,
            isAdmin: forcedAdmin,
            customTitle: defaultTitle,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'users', currentUser.uid), {
            ...profile,
            photoURL: currentUser.photoURL || '',
          }, { merge: true });
          setUserProfile(profile);
          setNicknameDraft('');
          setCustomTitleDraft(profile.customTitle || '');
        }
        setProfileLoading(false);
      },
      (err) => {
        console.warn('Profile listener:', err.message);
        setProfileLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // ── KPI config listener (per user)
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(
      doc(db, 'kpiConfigs', currentUser.uid),
      async (snap) => {
        const initial = getInitialKpiForEmail(currentUser.email);
        if (snap.exists() && snap.data()?.groups) {
          const data = snap.data()!;
          const mustResetToPolicy =
            !isHostEmail(currentUser.email) && Number(data.policyVersion || 0) < KPI_POLICY_VERSION;

          if (mustResetToPolicy) {
            setKpiConfig(initial.groups);
            setMonthlyTarget(initial.monthlyTarget);
              await setDoc(doc(db, 'kpiConfigs', currentUser.uid), {
                uid: currentUser.uid,
                roleId: initial.roleId,
                label: initial.label,
                groups: initial.groups,
                monthlyTarget: initial.monthlyTarget,
                policyVersion: KPI_POLICY_VERSION,
                seededAt: Date.now(),
                updatedAt: Date.now(),
              }, { merge: true });
          } else {
            setKpiConfig(data.groups as WorkGroups);
            setMonthlyTarget(Math.max(0, Number(data.monthlyTarget || 0)));
          }
        } else {
          setKpiConfig(initial.groups);
          setMonthlyTarget(initial.monthlyTarget);
          await setDoc(doc(db, 'kpiConfigs', currentUser.uid), {
            uid: currentUser.uid,
            roleId: initial.roleId,
            label: initial.label,
            groups: initial.groups,
            monthlyTarget: initial.monthlyTarget,
            policyVersion: KPI_POLICY_VERSION,
            seededAt: Date.now(),
            updatedAt: Date.now(),
          }, { merge: true });
        }
      },
      (err) => {
        console.warn('KPI Config listener:', err.message);
        const initial = getInitialKpiForEmail(currentUser.email);
        setKpiConfig(initial.groups);
        setMonthlyTarget(initial.monthlyTarget);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // ── Admin-only global visibility
  useEffect(() => {
    if (!currentUser || !isSuperAdmin) {
      setAdminProfiles([]);
      setAdminEntries([]);
      setAdminKpiConfigs({});
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setAdminProfiles(snapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
        setAdminLoading(false);
      },
      (error) => {
        console.error('Admin users listener:', error);
        setAdminLoading(false);
      }
    );

    const unsubscribeEntries = onSnapshot(
      collectionGroup(db, 'entries'),
      (snapshot) => {
        setAdminEntries(snapshot.docs.map(d => ({ ...d.data() } as WorkEntry)));
      },
      (error) => {
        console.error('Admin entries listener:', error);
      }
    );

    const unsubscribeKpi = onSnapshot(
      collection(db, 'kpiConfigs'),
      (snapshot) => {
        const next: Record<string, { groups: WorkGroups; monthlyTarget: number; roleId?: string }> = {};
        snapshot.docs.forEach((d) => {
          next[d.id] = {
            groups: cloneGroups((d.data()?.groups as WorkGroups | undefined) || ZERO_STARTER_GROUPS),
            monthlyTarget: Number(d.data()?.monthlyTarget || 0),
            roleId: d.data()?.roleId ? String(d.data()?.roleId) : undefined,
          };
        });
        setAdminKpiConfigs(next);
      },
      (error) => {
        console.error('Admin kpi listener:', error);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeEntries();
      unsubscribeKpi();
    };
  }, [currentUser, isSuperAdmin]);

  // ── Firestore entries listener (Phase 3: use uid)
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    const q = query(
      collection(db, 'users', currentUser.uid, 'entries'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ ...d.data() } as WorkEntry));
        setEntries(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('Firestore:', error);
        const saved = localStorage.getItem(scopedKey(currentUser.uid, 'entries_v8'));
        if (saved) try { setEntries(JSON.parse(saved)); } catch { /* ignore */ }
        setIsLoading(false);
        showToast('⚠️ ใช้ข้อมูล offline');
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // ── Firestore daily reports listener
  useEffect(() => {
    if (!currentUser) {
      setDailyReports([]);
      setDailyReportsLoading(false);
      return;
    }
    setDailyReportsLoading(true);

    const q = query(
      collection(db, 'users', currentUser.uid, 'dailyReports'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDailyReports(snapshot.docs.map((d) => ({ ...d.data() } as DailyReport)));
        setDailyReportsLoading(false);
      },
      (error) => {
        console.error('Daily reports:', error);
        setDailyReports([]);
        setDailyReportsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // ── Org-level calendar config
  useEffect(() => {
    if (!currentUser) {
      setOrgCalendarConfig(DEFAULT_ORG_CALENDAR_CONFIG);
      setCalendarDraft(DEFAULT_ORG_CALENDAR_CONFIG);
      setAdminUserOrder([]);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'system', 'appConfig'),
      (snapshot) => {
        const data = snapshot.data() || {};
        const next = {
          ...DEFAULT_ORG_CALENDAR_CONFIG,
          ...(data.calendar || {}),
        } as OrgCalendarConfig;
        setOrgCalendarConfig(next);
        setCalendarDraft((prev) => (showSettings ? prev : next));
        setAdminUserOrder(Array.isArray((data as { admin?: { userOrder?: string[] } }).admin?.userOrder)
          ? (data as { admin?: { userOrder?: string[] } }).admin!.userOrder!.map((uid) => String(uid))
          : []);
      },
      () => {
        setOrgCalendarConfig(DEFAULT_ORG_CALENDAR_CONFIG);
        setAdminUserOrder([]);
      },
    );

    return () => unsubscribe();
  }, [currentUser, showSettings]);

  // ── Normalized calendar feed
  useEffect(() => {
    if (!currentUser) {
      setCalendarEvents([]);
      setCalendarError('');
      return;
    }

    const shouldLoadCalendar = activeTab === 'today' || activeTab === 'calendar' || showSettings;
    if (!shouldLoadCalendar || !orgCalendarConfig.enabled) return;

    let cancelled = false;
    setCalendarLoading(true);
    setCalendarError('');

    void getCalendarFeedCallable()
      .then((data) => {
        if (cancelled) return;
        setCalendarEvents(data.events || []);
        setOrgCalendarConfig((prev) => ({ ...prev, ...data.config }));
        setCalendarError(data.config?.lastSyncStatus === 'error' ? data.config.lastError || 'โหลดปฏิทินไม่สำเร็จ' : '');
      })
      .catch((error) => {
        if (cancelled) return;
        setCalendarEvents([]);
        setCalendarError(describeCallableError(error));
      })
      .finally(() => {
        if (!cancelled) setCalendarLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentUser, orgCalendarConfig.enabled, orgCalendarConfig.y8ContentFeedUrl, showSettings]);

  useEffect(() => {
    if (!isSuperAdmin && activeTab === 'admin') {
      setActiveTab('log');
    }
  }, [activeTab, isSuperAdmin]);

  // ── Keep selected group/task valid after config changes
  useEffect(() => {
    const keys = Object.keys(kpiConfig);
    if (!keys.length) return;
    if (!kpiConfig[selectedGroup]) {
      const first = keys[0];
      setSelectedGroup(first);
      setSelectedTaskId(kpiConfig[first]?.tasks[0]?.id || '');
      return;
    }
    const taskIds = (kpiConfig[selectedGroup]?.tasks || []).map(t => t.id);
    if (!taskIds.includes(selectedTaskId)) {
      setSelectedTaskId(taskIds[0] || '');
    }
  }, [kpiConfig, selectedGroup, selectedTaskId]);

  // ── Auth handlers
  const persistGoogleToken = (uid: string, token: string) => {
    const expiry = Date.now() + 50 * 60 * 1000;
    localStorage.setItem(scopedKey(uid, 'google_token'), JSON.stringify({ token, expiry }));
    setGoogleAccessToken(token);
    setGoogleAccessTokenExpiry(expiry);
  };

  const handleSignIn = async () => {
    setSignInLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (accessToken) persistGoogleToken(result.user.uid, accessToken);
    } catch (e) {
      console.error(e);
      showToast('❌ เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setEntries([]);
    setShowSettings(false);
    setGoogleAccessToken('');
    setGoogleAccessTokenExpiry(0);
    showToast('ออกจากระบบแล้ว');
  };

  const ensureDriveAccessToken = async (): Promise<string | null> => {
    // 1. Check in-memory token (fastest)
    if (googleAccessToken && Date.now() < googleAccessTokenExpiry - 60_000) {
      return googleAccessToken;
    }
    if (!currentUser) return null;
    // 2. Check localStorage-persisted token (survives page refresh)
    const stored = localStorage.getItem(scopedKey(currentUser.uid, 'google_token'));
    if (stored) {
      try {
        const { token, expiry } = JSON.parse(stored) as { token: string; expiry: number };
        if (token && Date.now() < expiry - 60_000) {
          setGoogleAccessToken(token);
          setGoogleAccessTokenExpiry(expiry);
          return token;
        }
      } catch { /* corrupt storage */ }
    }
    // 3. Fallback: popup re-auth
    const driveProvider = createDriveProvider();

    const readAccessToken = (result: unknown) => {
      const credential = GoogleAuthProvider.credentialFromResult(result as any);
      return credential?.accessToken || '';
    };

    try {
      const result = await reauthenticateWithPopup(currentUser, driveProvider);
      const accessToken = readAccessToken(result);
      if (accessToken) {
        persistGoogleToken(currentUser.uid, accessToken);
        return accessToken;
      }
    } catch (error) {
      console.warn('Drive reauth failed, fallback to popup sign-in:', error);
    }

    try {
      const result = await signInWithPopup(auth, driveProvider);
      const accessToken = readAccessToken(result);
      if (accessToken) {
        persistGoogleToken(currentUser.uid, accessToken);
        return accessToken;
      }
      showToast('❌ ไม่ได้รับสิทธิ์ Google Drive จากบัญชีที่ล็อกอิน');
      return null;
    } catch (error) {
      console.error('Drive auth:', error);
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/popup-blocked') {
        showToast('❌ Popup ถูกบล็อก กรุณาอนุญาต popup แล้วลองใหม่');
      } else if (code === 'auth/popup-closed-by-user') {
        showToast('❌ ยกเลิกการอนุญาต Google Drive');
      } else {
        showToast('❌ ต้องอนุญาต Google Drive ก่อนอัปโหลดไฟล์');
      }
      return null;
    }
  };

  // parentFolderId: if provided, overrides driveFolderId (used for subfolder uploads)
  const uploadFileToGoogleDrive = async (file: File, parentFolderId?: string): Promise<{ link: string; fileId: string } | null> => {
    const accessToken = await ensureDriveAccessToken();
    if (!accessToken) return null;

    const buildForm = (metadata: Record<string, unknown>) => {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);
      return form;
    };

    const effectiveFolder = (parentFolderId ?? driveFolderId).trim();
    const metadata: Record<string, unknown> = {
      name: file.name,
    };
    if (effectiveFolder) metadata.parents = [effectiveFolder];

    const uploadRequest = (body: FormData) => fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });

    let uploadRes = await uploadRequest(buildForm(metadata));

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      const reason = extractGoogleApiReason(errText);
      console.error('Drive upload:', reason || errText);
      if ((uploadRes.status === 404 || uploadRes.status === 400) && effectiveFolder) {
        const fallbackRes = await uploadRequest(buildForm({ name: file.name }));
        if (fallbackRes.ok) {
          uploadRes = fallbackRes;
          showToast('โฟลเดอร์ไม่ถูกต้อง: บันทึกไฟล์ไว้ที่ My Drive แทน');
        } else {
          throw new Error('drive_folder_not_found');
        }
      }
      if (uploadRes.status === 403) {
        if (String(reason).toLowerCase().includes('accessnotconfigured')) {
          throw new Error('drive_api_not_enabled');
        }
        if (String(reason).toLowerCase().includes('insufficient')) {
          throw new Error('drive_scope_missing');
        }
        throw new Error('drive_forbidden');
      }
      if (!uploadRes.ok) throw new Error('drive_upload_failed');
    }

    const uploaded = await uploadRes.json() as { id?: string; webViewLink?: string };
    if (!uploaded.id) return null;

    // Ensure the file can be opened by link.
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(() => {});

    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}?fields=webViewLink,webContentLink`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) return { link: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`, fileId: uploaded.id };

    const fileData = await fileRes.json() as { webViewLink?: string; webContentLink?: string };
    return { link: fileData.webViewLink || fileData.webContentLink || `https://drive.google.com/file/d/${uploaded.id}/view`, fileId: uploaded.id };
  };

  // ── Drive Subfolder Helper ─────────────────────────────────────────────────
  // Returns an existing or newly-created subfolder ID inside parentFolderId.
  // Results are cached per-session (subfolderCache) to avoid repeated API calls.
  const getOrCreateDriveSubfolder = async (
    parentFolderId: string,
    subName: string,
    token: string,
  ): Promise<string> => {
    const cacheKey = `${parentFolderId}/${subName}`;
    const cached = subfolderCache.current.get(cacheKey);
    if (cached) return cached;

    // Search for an existing folder with this name inside the parent
    const q = `mimeType='application/vnd.google-apps.folder' and name='${subName}' and '${parentFolderId}' in parents and trashed=false`;
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (searchRes.ok) {
        const data = await searchRes.json() as { files?: { id: string }[] };
        if (data.files && data.files.length > 0) {
          const id = data.files[0].id;
          subfolderCache.current.set(cacheKey, id);
          return id;
        }
      }
      // Create subfolder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json() as { id?: string };
        if (created.id) {
          subfolderCache.current.set(cacheKey, created.id);
          return created.id;
        }
      }
    } catch {
      // Swallow — fall through to parent folder
    }
    return parentFolderId; // Fallback: upload to parent folder
  };

  const handleConnectGoogleDrive = async () => {
    const token = await ensureDriveAccessToken();
    if (!token) return;
    try {
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!aboutRes.ok) throw new Error('about_failed');
      const about = await aboutRes.json() as { user?: { emailAddress?: string; displayName?: string } };
      const label = about.user?.displayName || about.user?.emailAddress || 'บัญชีปัจจุบัน';
      showToast(`เชื่อม Google Drive แล้ว ✓ (${label})`);
    } catch {
      showToast('เชื่อม Google Drive แล้ว ✓');
    }
  };

  // ── เปิด rename modal เมื่อผู้ใช้เลือกไฟล์ (multi-file)
  const handleDriveFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'log' | 'edit',
  ) => {
    const files = Array.from<File>(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const taskId = mode === 'log'
      ? (currentTask?.id || 'FILE')
      : (editEntry?.taskId || 'FILE');
    const date = mode === 'log' ? selectedDate : (editEntry?.date || getTodayStr());
    const nick = userProfile?.nickname || displayName;
    setPendingUploads(files.map((file, i) => ({
      file,
      normalizedName: normalizeFileName(file.name, taskId, date, nick, i),
      mode,
    })));
    setShowRenameModal(true);
  };

  // ── อัปโหลดจริงหลังผู้ใช้ยืนยันชื่อไฟล์
  // overrideUploads ใช้กรณีกด "อัปโหลดด้วยชื่อเดิม" เพื่อข้ามการตั้งชื่อ
  const handleConfirmUploads = async (overrideUploads?: PendingUploadFile[]) => {
    const uploads = overrideUploads ?? pendingUploads;
    setShowRenameModal(false);
    if (!uploads.length) return;
    const mode = uploads[0].mode;
    if (mode === 'log') setDriveUploading(true);
    else setDriveUploadingEdit(true);
    try {
      // ── Resolve target folder: Root → Group → (Brand if single) → YYYY-MM ──
      let targetFolderId: string | undefined;
      const baseFolderId = driveFolderId.trim();
      if (baseFolderId) {
        const token = await ensureDriveAccessToken();
        if (token) {
          const entryGroupId = mode === 'log' ? selectedGroup : (editEntry?.groupId || selectedGroup);
          const grp          = kpiConfig[entryGroupId];
          const entryDate    = mode === 'log' ? selectedDate : (editEntry?.date || getTodayStr());
          const [y = '', m = ''] = entryDate.split('-');
          const monthSub     = `${y}-${m}`;

          let folderId = baseFolderId;

          // Level 1: Group folder (named after group name)
          if (grp?.name) {
            folderId = await getOrCreateDriveSubfolder(folderId, grp.name, token);
          }

          // Level 2: Brand subfolder — only when group has exactly ONE brand (unambiguous)
          const brands = grp?.brands ?? [];
          if (brands.length === 1) {
            folderId = await getOrCreateDriveSubfolder(folderId, brands[0].toUpperCase(), token);
          }

          // Level 3: YYYY-MM subfolder for chronological organization
          targetFolderId = await getOrCreateDriveSubfolder(folderId, monthSub, token);
        }
      }

      const newAttachments: DriveAttachment[] = [];
      for (const { file, normalizedName } of uploads) {
        const renamed = new File([file], normalizedName, { type: file.type });
        const result = await uploadFileToGoogleDrive(renamed, targetFolderId);
        if (result) {
          newAttachments.push({
            originalName:   file.name,
            normalizedName,
            fileId:         result.fileId,
            link:           result.link,
            mimeType:       file.type,
          });
        }
      }
      if (!newAttachments.length) throw new Error('no_files_uploaded');
      if (mode === 'log') {
        setLogAttachments(prev => [...prev, ...newAttachments]);
        if (!driveLink) setDriveLink(newAttachments[0].link);
      } else {
        setEditEntry(prev => prev ? {
          ...prev,
          attachments: [...(prev.attachments || []), ...newAttachments],
          driveLink:   prev.driveLink || newAttachments[0].link,
        } : prev);
      }
      showToast(`✅ อัปโหลด ${newAttachments.length} ไฟล์สำเร็จ`);
    } catch (error) {
      console.error('Drive upload error:', error);
      const message = (error as { message?: string })?.message || '';
      if (message === 'drive_folder_not_found')   showToast('❌ ไม่พบ Drive Folder ID ที่ตั้งไว้');
      else if (message === 'drive_api_not_enabled') showToast('❌ ยังไม่เปิด Drive API ในโปรเจกต์');
      else if (message === 'drive_scope_missing')   showToast('❌ OAuth scope ยังไม่ครบ (drive.file)');
      else if (message === 'drive_forbidden')       showToast('❌ ไม่มีสิทธิ์อัปโหลด');
      else showToast('❌ อัปโหลดไม่สำเร็จ');
    } finally {
      setPendingUploads([]);
      if (mode === 'log') setDriveUploading(false);
      else setDriveUploadingEdit(false);
    }
  };

  const handleSaveProfileBasics = async (nextNickname: string, nextCustomTitle?: string): Promise<boolean> => {
    if (!currentUser) return false;
    const cleaned = nextNickname.trim();
    const cleanedTitle = (nextCustomTitle ?? customTitleDraft).trim();
    if (!cleaned) {
      showToast('กรุณาใส่ชื่อเล่น');
      return false;
    }
    if (!cleanedTitle) {
      showToast('กรุณาระบุตำแหน่งงาน');
      return false;
    }
    await setDoc(doc(db, 'users', currentUser.uid), {
      nickname: cleaned,
      customTitle: cleanedTitle,
      role: resolveRoleByEmail(currentUser.email),
      isAdmin: isSuperAdminEmail(currentUser.email),
      updatedAt: Date.now(),
    }, { merge: true });
    setNicknameDraft(cleaned);
    setCustomTitleDraft(cleanedTitle);
    setUserProfile((prev) => (prev ? { ...prev, nickname: cleaned, customTitle: cleanedTitle } : prev));
    showToast('บันทึกโปรไฟล์แล้ว');
    return true;
  };

  const handleValidateCalendar = async () => {
    if (!isSuperAdmin) return;
    setCalendarActionLoading(true);
    try {
      const result = await updateCalendarConfigCallable({
        y8ContentFeedUrl: calendarDraft.y8ContentFeedUrl,
        enabled: calendarDraft.enabled,
        label: calendarDraft.label,
        timezone: calendarDraft.timezone,
        validateOnly: true,
      });
      setCalendarDraft(result.config);
      setOrgCalendarConfig((prev) => ({ ...prev, ...result.config }));
      showToast(`ตรวจสอบ feed แล้ว ✓ (${result.eventCount} events)`);
    } catch (error) {
      showToast(`ตรวจสอบ feed ไม่สำเร็จ: ${(error as Error).message}`);
    } finally {
      setCalendarActionLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    const ok = await handleSaveProfileBasics(nicknameDraft, customTitleDraft);
    if (!ok) return;

    try {
      let nextCalendarConfig = orgCalendarConfig;
      if (isSuperAdmin) {
        const calendarResult = await updateCalendarConfigCallable({
          y8ContentFeedUrl: calendarDraft.y8ContentFeedUrl,
          enabled: calendarDraft.enabled,
          label: calendarDraft.label,
          timezone: calendarDraft.timezone,
        });
        nextCalendarConfig = calendarResult.config;
        setOrgCalendarConfig(calendarResult.config);
        setCalendarDraft(calendarResult.config);
      }

      localStorage.setItem(scopedKey(currentUser.uid, 'sheet_url'), sheetUrl.trim());
      localStorage.setItem(scopedKey(currentUser.uid, 'report_gender'), reportGender);
      localStorage.setItem(scopedKey(currentUser.uid, 'report_emojis'), JSON.stringify(reportEmojis));
      localStorage.setItem(scopedKey(currentUser.uid, 'drive_folder_id'), driveFolderId.trim());
      localStorage.setItem(scopedKey(currentUser.uid, 'auto_hover_expand'), JSON.stringify(autoHoverExpand));

      const titleVal = customTitleDraft.trim() || null;
      const nextSettings = {
        autoHoverExpand,
        driveFolderId: driveFolderId.trim(),
        sheetUrl: sheetUrl.trim(),
        reportGender,
        reportEmojis,
      };
      await setDoc(doc(db, 'users', currentUser.uid), {
        customTitle: titleVal,
        settings: nextSettings,
        updatedAt: Date.now(),
      }, { merge: true });

      setUserProfile((prev) => (
        prev
          ? {
              ...prev,
              customTitle: titleVal || undefined,
              settings: nextSettings,
            }
          : prev
      ));
      setShowSettings(false);
      setCalendarError(nextCalendarConfig.lastError || '');
      showToast('บันทึก Settings แล้ว');
    } catch (error) {
      showToast(`บันทึก Settings ไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  // ── KPI Config save — per user (stored by uid)
  const handleSaveKpiConfig = async (updated: WorkGroups, newTarget?: number) => {
    if (!currentUser) return;
    const target = Math.max(0, Number(newTarget ?? monthlyTarget) || 0);
    // Immediately sync local state so UI updates without waiting for Firestore listener
    setKpiConfig(updated);
    if (newTarget !== undefined) setMonthlyTarget(target);
    await setDoc(doc(db, 'kpiConfigs', currentUser.uid), {
      groups: updated,
      monthlyTarget: target,
      uid: currentUser.uid,
      roleId: userProfile?.role || 'custom',
      policyVersion: KPI_POLICY_VERSION,
      updatedAt: Date.now(),
    }, { merge: true });
    showToast('✅ บันทึก KPI Config แล้ว');
  };

  const handleSaveManagedKpiConfig = async (uid: string, updated: WorkGroups, newTarget?: number) => {
    if (!currentUser || !isSuperAdmin) return;
    const profile = adminProfileMap.get(uid);
    const seed = getInitialKpiForEmail(profile?.email);
    const target = Math.max(0, Number(newTarget ?? adminKpiConfigs[uid]?.monthlyTarget ?? seed.monthlyTarget) || 0);
    await setDoc(doc(db, 'kpiConfigs', uid), {
      groups: updated,
      monthlyTarget: target,
      uid,
      roleId: profile?.role || adminKpiConfigs[uid]?.roleId || seed.roleId,
      policyVersion: KPI_POLICY_VERSION,
      updatedAt: Date.now(),
    }, { merge: true });
    setAdminKpiConfigs((prev) => ({
      ...prev,
      [uid]: {
        groups: cloneGroups(updated),
        monthlyTarget: target,
        roleId: profile?.role || prev[uid]?.roleId || seed.roleId,
      },
    }));
    if (uid === currentUser.uid) {
      setKpiConfig(updated);
      setMonthlyTarget(target);
    }
    showToast('✅ บันทึก KPI Config แล้ว');
  };

  // ── Local file picker (File System Access API with fallback)
  const handlePickLocalFile = async (): Promise<LocalFileRef[]> => {
    try {
      if ('showOpenFilePicker' in window) {
        type FilePicker = (o: object) => Promise<FileSystemFileHandle[]>;
        const handles = await (window as unknown as { showOpenFilePicker: FilePicker }).showOpenFilePicker({ multiple: true });
        const refs: LocalFileRef[] = [];
        for (const handle of handles) {
          const file   = await handle.getFile();
          const idbKey = `${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
          await idbSet(idbKey, handle);
          let thumbnail: string | undefined;
          if (file.type.startsWith('image/')) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(r => { img.onload = r; });
            canvas.getContext('2d')?.drawImage(img, 0, 0, 64, 64);
            thumbnail = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(img.src);
          }
          refs.push({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified, thumbnail, idbKey });
        }
        setPendingLocalFiles(prev => [...prev, ...refs]);
        return refs;
      }
      // Fallback for iOS / browsers without File System Access API
      return await new Promise<LocalFileRef[]>((resolve) => {
        const input = document.createElement('input');
        input.type  = 'file';
        input.multiple = true;
        input.onchange = () => {
          const files = Array.from(input.files || []);
          const refs: LocalFileRef[] = files.map(f => ({
            name: f.name, size: f.size, type: f.type,
            lastModified: f.lastModified, idbKey: '',
          }));
          setPendingLocalFiles(prev => [...prev, ...refs]);
          resolve(refs);
        };
        input.click();
      });
    } catch {
      return [];
    }
  };

  // ── Ordered group keys — always sorted alphabetically (A → B → C → D)
  const orderedGroupKeys = useMemo(
    () => Object.keys(kpiConfig).sort(),
    [kpiConfig]
  );

  // ── Derived state
  const currentTask = useMemo(() => {
    const group = kpiConfig[selectedGroup];
    if (!group) return (Object.values(kpiConfig) as WorkGroup[])[0]?.tasks[0];
    return group.tasks.find((t) => t.id === selectedTaskId) || group.tasks[0];
  }, [kpiConfig, selectedGroup, selectedTaskId]);

  const displayName =
    userProfile?.nickname?.trim() ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'User';

  const latestSyncState = useMemo(() => {
    const sorted = [...entries].sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
    return sorted.find((entry) => entry.sheetSync)?.sheetSync || null;
  }, [entries]);

  const updateDailyListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addDailyListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, '']);
  };

  const removeDailyListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  };

  const dailyEntriesForDate = useMemo(
    () => entries
      .filter((entry) => entry.user === currentUser?.uid && entry.date === dailyDate)
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)),
    [entries, currentUser, dailyDate]
  );

  const autoEveningRoutineItems = useMemo(() => {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const entry of dailyEntriesForDate) {
      const group = kpiConfig[entry.groupId];
      const task = group?.tasks.find((item) => item.id === entry.taskId);
      const taskName = entry.taskName || task?.name || entry.taskId;
      if (!taskName || seen.has(taskName)) continue;
      seen.add(taskName);
      next.push(taskName);
    }
    return next;
  }, [dailyEntriesForDate, kpiConfig]);

  const autoEveningResultItems = useMemo(
    () => dailyEntriesForDate.map((entry) => {
      const group = kpiConfig[entry.groupId];
      const task = group?.tasks.find((item) => item.id === entry.taskId);
      const taskName = entry.taskName || task?.name || entry.taskId;
      const unit = entry.unit || task?.unit || '';
      const qtyText = `${entry.quantity}${unit ? ` ${unit}` : ''}`;
      const noteText = entry.notes?.trim() ? ` · ${entry.notes.trim()}` : '';
      return `${taskName} — ${qtyText} = ${entry.credits} Cr${noteText}`;
    }),
    [dailyEntriesForDate, kpiConfig]
  );

  const activeMorningReport = useMemo(
    () => dailyReports.find((report) => report.date === dailyDate && report.type === 'morning'),
    [dailyReports, dailyDate]
  );

  const activeEveningReport = useMemo(
    () => dailyReports.find((report) => report.date === dailyDate && report.type === 'evening'),
    [dailyReports, dailyDate]
  );

  useEffect(() => {
    if (activeMorningReport) {
      setMorningCheckInTime(activeMorningReport.checkInTime || (dailyDate === getTodayStr() ? getCurrentTimeHM() : ''));
      setMorningFocusItems(activeMorningReport.focusItems.length ? activeMorningReport.focusItems : ['']);
      return;
    }
    setMorningCheckInTime(dailyDate === getTodayStr() ? getCurrentTimeHM() : '');
    setMorningFocusItems(['']);
  }, [activeMorningReport, dailyDate]);

  useEffect(() => {
    if (activeEveningReport) {
      setEveningRoutineItems(activeEveningReport.routineItems.length ? activeEveningReport.routineItems : ['']);
      setEveningResultItems(activeEveningReport.resultItems.length ? activeEveningReport.resultItems : ['']);
      setEveningNextMoveItems(activeEveningReport.nextMoveItems.length ? activeEveningReport.nextMoveItems : ['']);
      setDailyIssues(activeEveningReport.issues || '');
      setDailyIssueStatus(activeEveningReport.issueStatus || 'resolved');
      setDailyIssueDetail(activeEveningReport.issueDetail || '');
      setDailyIssueNextStep(activeEveningReport.issueNextStep || '');
      return;
    }
    setEveningRoutineItems(autoEveningRoutineItems.length ? autoEveningRoutineItems : ['']);
    setEveningResultItems(autoEveningResultItems.length ? autoEveningResultItems : ['']);
    setEveningNextMoveItems(['']);
    setDailyIssues('');
    setDailyIssueStatus('resolved');
    setDailyIssueDetail('');
    setDailyIssueNextStep('');
  }, [activeEveningReport, autoEveningRoutineItems, autoEveningResultItems]);

  useEffect(() => {
    setDailyCopySuccess(false);
  }, [dailyDate, dailyTab]);

  const morningPreviewText = useMemo(
    () => buildMorningReportText({
      nickname: displayName,
      date: dailyDate,
      gender: reportGender,
      checkInTime: morningCheckInTime,
      focusItems: morningFocusItems,
      focusEmoji: reportEmojis.focus,
    }),
    [displayName, dailyDate, reportGender, morningCheckInTime, morningFocusItems, reportEmojis.focus]
  );

  const eveningPreviewText = useMemo(
    () => buildEveningReportText({
      nickname: displayName,
      date: dailyDate,
      gender: reportGender,
      routineItems: eveningRoutineItems,
      resultItems: eveningResultItems,
      nextMoveItems: eveningNextMoveItems,
      issues: dailyIssues,
      issueStatus: dailyIssueStatus,
      issueDetail: dailyIssueDetail,
      issueNextStep: dailyIssueNextStep,
      routineEmoji: reportEmojis.routine,
      resultsEmoji: reportEmojis.results,
      nextMoveEmoji: reportEmojis.nextMove,
      issuesEmoji: reportEmojis.issues,
    }),
    [displayName, dailyDate, reportGender, eveningRoutineItems, eveningResultItems, eveningNextMoveItems, dailyIssues, dailyIssueStatus, dailyIssueDetail, dailyIssueNextStep, reportEmojis.routine, reportEmojis.results, reportEmojis.nextMove, reportEmojis.issues]
  );

  const copyDailyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setDailyCopySuccess(true);
    window.setTimeout(() => setDailyCopySuccess(false), 2000);
  };

  const saveAndCopyDailyReport = async (type: DailyReportType) => {
    if (!currentUser) return;
    const now = Date.now();
    const reportId = `${dailyDate}_${type}`;
    const existing = type === 'morning' ? activeMorningReport : activeEveningReport;
    const generatedText = type === 'morning' ? morningPreviewText : eveningPreviewText;
    const nextReport: DailyReport = {
      id: reportId,
      type,
      date: dailyDate,
      uid: currentUser.uid,
      email: normalizeEmail(currentUser.email),
      nickname: displayName,
      gender: reportGender,
      checkInTime: type === 'morning' ? morningCheckInTime : '',
      focusItems: type === 'morning' ? sanitizeList(morningFocusItems) : [],
      routineItems: type === 'evening' ? sanitizeList(eveningRoutineItems) : [],
      resultItems: type === 'evening' ? sanitizeList(eveningResultItems) : [],
      nextMoveItems: type === 'evening' ? sanitizeList(eveningNextMoveItems) : [],
      issues: type === 'evening' ? dailyIssues.trim() : '',
      issueStatus: type === 'evening' ? dailyIssueStatus : 'resolved',
      issueDetail: type === 'evening' ? dailyIssueDetail.trim() : '',
      issueNextStep: type === 'evening' ? dailyIssueNextStep.trim() : '',
      sourceEntryIds: type === 'evening' ? dailyEntriesForDate.map((entry) => entry.id) : [],
      generatedText,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastCopiedAt: existing?.lastCopiedAt,
    };

    setDailySaving(true);
    let saved = false;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'dailyReports', reportId), nextReport, { merge: true });
      saved = true;
    } catch (error) {
      console.error('Daily report save:', error);
    }

    try {
      await copyDailyText(generatedText);
      if (saved) {
        await setDoc(doc(db, 'users', currentUser.uid, 'dailyReports', reportId), {
          generatedText,
          lastCopiedAt: Date.now(),
          updatedAt: Date.now(),
        }, { merge: true });
        showToast('✅ บันทึกและคัดลอก Daily Report แล้ว');
      } else {
        showToast('⚠️ คัดลอกแล้ว แต่ยังบันทึก history ไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Daily report copy:', error);
      showToast(saved ? '❌ บันทึกรายงานแล้ว แต่คัดลอกไม่สำเร็จ' : '❌ คัดลอกไม่สำเร็จ และ history ยังไม่ถูกบันทึก');
    } finally {
      setDailySaving(false);
    }
  };

  const handleCopyDailyHistory = async (report: DailyReport) => {
    if (!currentUser) return;
    try {
      await copyDailyText(report.generatedText);
      await setDoc(doc(db, 'users', currentUser.uid, 'dailyReports', report.id), {
        lastCopiedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
      showToast('คัดลอก Daily Report แล้ว ✓');
    } catch (error) {
      console.error('Daily history copy:', error);
      showToast('❌ คัดลอกไม่สำเร็จ');
    }
  };

  const runtimeProjectId = String(firebaseApp.options.projectId || '');
  const runtimeAuthDomain = String(firebaseApp.options.authDomain || '');
  const firebaseConfigHealthy =
    runtimeProjectId === EXPECTED_FIREBASE_PROJECT &&
    runtimeAuthDomain === EXPECTED_FIREBASE_AUTH_DOMAIN;

  const exportYearOptions = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    entries.forEach((entry) => {
      const year = new Date(entry.date).getFullYear();
      if (!Number.isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  // ── Header stats — always current month
  const stats = useMemo(() => {
    const now = new Date();
    const uid = currentUser?.uid;
    const userEntries = entries.filter((e) => e.user === uid);
    const monthEntries = userEntries.filter((e) => {
      try {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } catch { return false; }
    });
    const todayEntries = userEntries.filter((e) => e.date === getTodayStr());
    const monthCredits = monthEntries.reduce((s, e) => s + e.credits, 0);
    return {
      monthTotal:  monthCredits,
      todayTotal:  todayEntries.reduce((s, e) => s + e.credits, 0),
      percent:     safePercent(monthCredits, monthlyTarget),
    };
  }, [entries, currentUser, monthlyTarget]);

  // ── Summary tab data
  const summaryData = useMemo(() => {
    const uid = currentUser?.uid;
    const userEntries = entries.filter((e) => e.user === uid);
    const monthEntries = userEntries.filter((e) => {
      try {
        const d = new Date(e.date);
        return d.getMonth() === summaryMonth && d.getFullYear() === summaryYear;
      } catch { return false; }
    });
    const totalCredits   = monthEntries.reduce((s, e) => s + e.credits, 0);
    const isTargetSet    = monthlyTarget > 0;
    const percent        = safePercent(totalCredits, monthlyTarget);

    const groups = Object.keys(kpiConfig)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        name:    kpiConfig[key].name,
        color:   kpiConfig[key].color,
        bg:      kpiConfig[key].bg,
        credits: monthEntries.filter((e) => e.groupId === key).reduce((s, e) => s + e.credits, 0),
      }))
      .filter((g) => g.credits > 0);

    const maxGroupCredits = groups.length > 0 ? groups[0].credits : 1;
    const now             = new Date();
    const isCurrentMonth  = summaryMonth === now.getMonth() && summaryYear === now.getFullYear();
    const daysInMonth     = new Date(summaryYear, summaryMonth + 1, 0).getDate();
    const remainingDays   = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : 0;
    const remainingCredits = isTargetSet ? Math.max(0, monthlyTarget - totalCredits) : 0;
    const dailyNeeded     = isCurrentMonth && isTargetSet ? Math.ceil(remainingCredits / remainingDays) : 0;
    const isComplete      = isTargetSet && totalCredits >= monthlyTarget;

    return {
      totalCredits, percent, groups, maxGroupCredits, isCurrentMonth,
      remainingDays, remainingCredits, dailyNeeded, isComplete, isTargetSet,
      monthName: getMonthNameThai(summaryMonth), entryCount: monthEntries.length,
    };
  }, [entries, currentUser, summaryMonth, summaryYear, kpiConfig, monthlyTarget]);

  const navSummaryMonth = (dir: -1 | 1) => {
    const next = summaryMonth + dir;
    if (next < 0)       { setSummaryYear(y => y - 1); setSummaryMonth(11); }
    else if (next > 11) { setSummaryYear(y => y + 1); setSummaryMonth(0); }
    else                { setSummaryMonth(next); }
  };

  const isAtCurrentMonth = summaryMonth === new Date().getMonth() && summaryYear === new Date().getFullYear();

  const adminSummary = useMemo(() => {
    const profileByUid = new Map<string, UserProfile>(adminProfiles.map((p) => [p.uid, p]));
    const orderMap = new Map<string, number>(adminUserOrder.map((uid, index) => [uid, index]));
    const monthEntries = adminEntries.filter((e) => {
      try {
        const d = new Date(`${e.date}T00:00:00`);
        return d.getMonth() === adminMonth && d.getFullYear() === adminYear;
      } catch {
        return false;
      }
    });

    const byUser = monthEntries.reduce<Record<string, { credits: number; count: number }>>((acc, entry) => {
      if (!acc[entry.user]) acc[entry.user] = { credits: 0, count: 0 };
      acc[entry.user].credits += entry.credits;
      acc[entry.user].count += 1;
      return acc;
    }, {});

    const allUserIds = new Set<string>([
      ...adminProfiles.map((p) => p.uid),
      ...Object.keys(byUser),
      ...Object.keys(adminKpiConfigs),
    ]);

    return Array.from(allUserIds)
      .map((uid) => {
        const profile = profileByUid.get(uid);
        const target = adminKpiConfigs[uid]?.monthlyTarget || 0;
        const credits = byUser[uid]?.credits || 0;
        const count = byUser[uid]?.count || 0;
        return {
          uid,
          nickname: profile?.nickname || profile?.displayName || uid.slice(0, 6),
          role: profile?.role || 'custom',
          displayTitle: resolveProfileTitle({
            email: profile?.email,
            role: profile?.role,
            customTitle: profile?.customTitle,
          }),
          email: profile?.email,
          photoURL: resolveProfilePhotoUrl({
            email: profile?.email,
            manualPhotoURL: profile?.photoURLOverride,
            storedPhotoURL: profile?.photoURL,
          }),
          target,
          credits,
          count,
          percent: Math.round(safePercent(credits, target)),
          sortOrder: orderMap.get(uid) ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        if (b.credits !== a.credits) return b.credits - a.credits;
        return a.nickname.localeCompare(b.nickname, 'th');
      });
  }, [adminEntries, adminProfiles, adminKpiConfigs, adminMonth, adminYear, adminUserOrder]);

  const adminProfileMap = useMemo(
    () => new Map(adminProfiles.map((profile) => [profile.uid, profile])),
    [adminProfiles],
  );
  const adminSummaryMap = useMemo(
    () => new Map(adminSummary.map((row) => [row.uid, row])),
    [adminSummary],
  );
  const managedAdminProfile = adminManagedUid ? adminProfileMap.get(adminManagedUid) || null : null;
  const managedAdminSummary = adminManagedUid ? adminSummaryMap.get(adminManagedUid) || null : null;
  const managedAdminSeed = adminManagedUid
    ? getInitialKpiForEmail(managedAdminProfile?.email || managedAdminSummary?.email || null)
    : null;
  const managedAdminConfig = adminManagedUid
    ? adminKpiConfigs[adminManagedUid]?.groups || managedAdminSeed?.groups || ZERO_STARTER_GROUPS
    : null;
  const managedAdminTarget = adminManagedUid
    ? adminKpiConfigs[adminManagedUid]?.monthlyTarget ?? managedAdminSeed?.monthlyTarget ?? 0
    : 0;

  const triggerEntrySync = async (
    action: 'create' | 'update' | 'delete',
    entry: WorkEntry,
    options?: { silent?: boolean; successMessage?: string; failureMessage?: string },
  ) => {
    if (!currentUser) return;
    const syncKey = `${action}:${entry.id}`;
    if (inFlightEntrySyncs.current.has(syncKey)) return;
    inFlightEntrySyncs.current.add(syncKey);
    try {
      await syncEntryToSheetsCallable({
        action,
        uid: currentUser.uid,
        entryId: entry.id,
        ...(action === 'delete' ? { entry } : {}),
      });
      if (options?.successMessage) showToast(options.successMessage);
    } catch (error) {
      console.error('Sheets sync failed:', error);
      if (!options?.silent) {
        showToast(options?.failureMessage || `ซิงก์ Sheet ไม่สำเร็จ: ${describeCallableError(error)}`);
      }
    } finally {
      inFlightEntrySyncs.current.delete(syncKey);
    }
  };

  useEffect(() => {
    if (!currentUser || !isOnline) return;
    const recoverable = entries
      .filter((entry) => entry.sheetSync?.status && entry.sheetSync.status !== 'synced')
      .slice(0, 3);
    recoverable.forEach((entry) => {
      void triggerEntrySync(entry.sheetSync?.action || 'update', entry, { silent: true });
    });
  }, [currentUser, entries, isOnline]);

  const changeAdminMonth = (delta: number) => {
    const next = adminMonth + delta;
    if (next < 0) {
      setAdminYear((year) => year - 1);
      setAdminMonth(11);
      return;
    }
    if (next > 11) {
      setAdminYear((year) => year + 1);
      setAdminMonth(0);
      return;
    }
    setAdminMonth(next);
  };

  const persistAdminUserOrder = async (nextOrder: string[]) => {
    if (!currentUser || !isSuperAdmin) return;
    setAdminUserOrder(nextOrder);
    try {
      await setDoc(doc(db, 'system', 'appConfig'), {
        admin: {
          userOrder: nextOrder,
          updatedAt: Date.now(),
        },
      }, { merge: true });
    } catch (error) {
      console.error('Save admin order failed:', error);
      showToast(`บันทึกลำดับรายชื่อไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleMoveAdminUser = async (uid: string, direction: -1 | 1) => {
    const currentOrder = adminSummary.map((row) => row.uid);
    const index = currentOrder.indexOf(uid);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    await persistAdminUserOrder(nextOrder);
  };

  const openManagedKpiEditor = (uid: string) => {
    setAdminManagedUid(uid);
    setShowKpiEditor(true);
  };

  const handleDeleteManagedUser = async (uid: string) => {
    if (!isSuperAdmin || !currentUser) return;
    if (uid === currentUser.uid) {
      showToast('ไม่สามารถลบบัญชีของตัวเองได้');
      return;
    }

    const profile = adminProfileMap.get(uid);
    const summary = adminSummaryMap.get(uid);
    const label = profile?.nickname || profile?.displayName || summary?.nickname || profile?.email || summary?.email || uid;
    const email = profile?.email || summary?.email || '';
    const firstConfirm = window.confirm(
      `ลบผู้ใช้ "${label}" ออกจากระบบทั้งหมด?\n\nระบบจะลบทั้งข้อมูลในแอพ, Google Sheets projection และ Firebase Authentication`
    );
    if (!firstConfirm) return;

    const expectedToken = profile?.nickname?.trim() || summary?.nickname?.trim() || email || uid;
    const typed = window.prompt(`พิมพ์ "${expectedToken}" เพื่อยืนยันการลบขั้นสุดท้าย`);
    if ((typed || '').trim() !== expectedToken) {
      showToast('ยืนยันการลบไม่ถูกต้อง');
      return;
    }

    setIsLoading(true);
    try {
      await adminDeleteUserCallable({ uid });
      setAdminManagedUid(null);
      setShowKpiEditor(false);
      showToast(`ลบผู้ใช้ "${label}" แล้ว`);
    } catch (error) {
      console.error(error);
      showToast(`ลบผู้ใช้ไม่สำเร็จ: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ── CRUD handlers
  const handleAddEntry = async () => {
    if (!currentUser || !currentTask) return;
    const now = Date.now();
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    const newEntry: WorkEntry = {
      id,
      date:      selectedDate,
      user:      currentUser.uid,
      userName:  displayName,
      email:     normalizeEmail(currentUser.email),
      role:      userProfile?.customTitle || String(userProfile?.role || 'custom'),
      groupId:   selectedGroup,
      groupName: kpiConfig[selectedGroup]?.name || selectedGroup,
      taskId:    selectedTaskId,
      taskName:  currentTask.name,
      quantity,
      unit:      currentTask.unit,
      creditPerUnit: currentTask.creditPerUnit,
      brands:    currentTask.brands || kpiConfig[selectedGroup]?.brands || [],
      credits:   quantity * currentTask.creditPerUnit,
      notes,
      createdAt: now,
      updatedAt: now,
      channel:   currentTask.channel,
      sheetSync: {
        status: 'pending',
        action: 'create',
        lastAttemptedAt: now,
        revision: 0,
      },
      ...(canvaLink.trim() ? { canvaLink: canvaLink.trim() } : {}),
      ...(driveLink.trim() || logAttachments[0]?.link
        ? { driveLink: driveLink.trim() || logAttachments[0].link }
        : {}),
      ...(logAttachments.length > 0 ? { attachments: logAttachments } : {}),
      ...(pendingLocalFiles.length > 0 ? { localFiles: pendingLocalFiles } : {}),
    };
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'entries', id), newEntry);
      showToast(`บันทึกแล้ว +${newEntry.credits} Cr.`);
      void triggerEntrySync('create', newEntry, {
        silent: true,
        failureMessage: 'บันทึกแล้ว แต่ซิงก์ Google Sheet ยังไม่สำเร็จ',
      });
      setQuantity(1);
      setNotes('');
      setCanvaLink('');
      setDriveLink('');
      setLogAttachments([]);
      setPendingLocalFiles([]);
    } catch (e) {
      console.error(e);
      showToast('❌ บันทึกไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editEntry || !currentUser) return;
    const task = kpiConfig[editEntry.groupId]?.tasks.find((t) => t.id === editEntry.taskId);
    if (!task) return;
    const updatedAt = Date.now();
    const updated = {
      ...editEntry,
      email: normalizeEmail(currentUser.email),
      userName: displayName,
      role: userProfile?.customTitle || String(userProfile?.role || 'custom'),
      groupName: kpiConfig[editEntry.groupId]?.name || editEntry.groupId,
      taskName: task.name,
      unit: task.unit,
      creditPerUnit: task.creditPerUnit,
      brands: task.brands || kpiConfig[editEntry.groupId]?.brands || [],
      channel: task.channel,
      credits: editEntry.quantity * task.creditPerUnit,
      updatedAt,
      sheetSync: {
        status: 'pending' as const,
        action: 'update' as const,
        lastAttemptedAt: updatedAt,
        revision: editEntry.sheetSync?.revision || 0,
      },
    };
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'entries', updated.id), updated);
      setEditEntry(null);
      showToast('อัปเดตแล้ว');
      void triggerEntrySync('update', updated, {
        silent: true,
        failureMessage: 'อัปเดตแล้ว แต่ซิงก์ Google Sheet ยังไม่สำเร็จ',
      });
    } catch (e) {
      console.error(e);
      showToast('❌ อัปเดตไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    const deletedEntry = entries.find((entry) => entry.id === id);
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', id));
      setDeleteId(null);
      showToast('ลบเรียบร้อย');
      if (deletedEntry) {
        void triggerEntrySync('delete', deletedEntry, {
          silent: false,
          failureMessage: 'ลบแล้ว แต่ยังลบจาก Google Sheet ไม่สำเร็จ',
        });
      }
    } catch (e) {
      console.error(e);
      showToast('❌ ลบไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Export
  const buildExportRows = (month: number, year: number) => {
    return entries
      .filter((e) => e.user === currentUser?.uid)
      .filter((e) => {
        try {
          const date = new Date(e.date);
          return date.getMonth() === month && date.getFullYear() === year;
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // ── TXT รายงาน LINE-friendly (ไม่ใช้ box-drawing chars)
  const handleExportTxt = () => {
    const filtered = buildExportRows(exportMonth, exportYear);
    if (filtered.length === 0) { showToast('ไม่มีข้อมูลในเดือนที่เลือก'); return; }
    const monthName    = getMonthNameThai(exportMonth);
    const yr           = exportYear;
    const totalCredits = filtered.reduce((s, e) => s + e.credits, 0);
    const pct          = Math.round(safePercent(totalCredits, monthlyTarget));
    const role         = userProfile ? (ROLE_DEFAULTS[userProfile.role]?.meta.label || userProfile.role) : '';
    const bar          = '──────────────────────';
    const dbl          = '══════════════════════';

    let content = `📊 JATRACK KPI REPORT\n`;
    content += `เดือน: ${monthName} ${yr}\n`;
    content += `${bar}\n`;
    content += `👤 ${displayName}  |  ${role}\n`;
    content += `🎯 เป้าหมาย: ${monthlyTarget} Credits/เดือน\n`;
    content += `📅 Export: ${new Date().toLocaleDateString('th-TH')}\n\n`;

    const groupKeys = [...new Set(filtered.map(e => e.groupId))] as string[];
    groupKeys.forEach(gKey => {
      const group     = kpiConfig[gKey];
      const groupRows = filtered.filter(e => e.groupId === gKey);
      const gTotal    = groupRows.reduce((s, e) => s + e.credits, 0);
      content += `📁 ${group?.name || gKey}\n`;
      groupRows.forEach((e, idx) => {
        const task = group?.tasks.find(t => t.id === e.taskId);
        const dd   = e.date.slice(8) + '/' + e.date.slice(5,7);
        content += `  ${idx+1}. [${dd}] ${task?.name || 'Unknown'}\n`;
        content += `     ${e.quantity} ${task?.unit || ''} x ${task?.creditPerUnit || 1} Cr = ${e.credits} Cr\n`;
        if (e.notes) content += `     💬 ${e.notes}\n`;
      });
      content += `  รวมกลุ่มนี้: ${gTotal} Credits\n\n`;
    });

    content += `${dbl}\n`;
    content += `✅ รวมทั้งหมด: ${totalCredits} / ${monthlyTarget} Credits (${pct}%)\n`;
    content += `${dbl}\n`;
    content += `📱 Jatrack · Young Age & Pharvia\n`;

    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Jatrack_${displayName}_${monthName}_${yr}.txt`;
    link.click();
    showToast('ดาวน์โหลด TXT แล้ว ✓');
    setShowExportModal(false);
  };

  // ── Export to Google Sheets via Sheets API (สร้างใหม่ครั้งแรก / อัปเดตเสมอเมื่อข้อมูลใหม่)
  const handleExportToGoogleSheets = async () => {
    if (sheetsExporting) return;
    const filtered = buildExportRows(summaryMonth, summaryYear);
    if (filtered.length === 0) { showToast('ไม่มีข้อมูลในเดือนนี้'); return; }

    const token = await ensureDriveAccessToken();
    if (!token) return;

    setSheetsExporting(true);
    const monthName    = getMonthNameThai(summaryMonth);
    const yr           = summaryYear;
    const totalCredits = filtered.reduce((s, e) => s + e.credits, 0);
    const pct          = Math.round(safePercent(totalCredits, monthlyTarget));
    const sheetKey     = `sheet_id_${yr}_${summaryMonth}`;
    const savedId      = currentUser ? localStorage.getItem(scopedKey(currentUser.uid, sheetKey)) : null;

    showToast('⏳ กำลังสร้าง / อัปเดต Google Sheet...');

    // Build values (reused for both new + existing)
    const header = ['#', 'วันที่', 'กลุ่ม', 'Task ID', 'ชื่องาน', 'จำนวน', 'หน่วย', 'Cr/Unit', 'Credits', 'หมายเหตุ', 'Canva Link', 'Drive Link'];
    const rows = filtered.map((e, idx) => {
      const g = kpiConfig[e.groupId];
      const t = g?.tasks.find(x => x.id === e.taskId);
      return [idx + 1, e.date, g?.name || e.groupId, e.taskId, t?.name || '', e.quantity, t?.unit || '', t?.creditPerUnit || 1, e.credits, e.notes || '', e.canvaLink || '', e.driveLink || ''];
    });
    const summary = [[], [`รวมทั้งหมด`, totalCredits, `Cr`, `${pct}% ของเป้า ${monthlyTarget} Cr`]];
    const values  = [
      [`JATRACK KPI REPORT — ${displayName} — ${monthName} ${yr}`],
      [`Export: ${new Date().toLocaleString('th-TH')}`],
      [],
      header,
      ...rows,
      ...summary,
    ];

    let spreadsheetId = savedId;
    try {
      if (!spreadsheetId) {
        // สร้าง Spreadsheet ใหม่
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            properties: { title: `Jatrack KPI — ${displayName} ${monthName} ${yr}` },
            sheets: [{ properties: { title: 'KPI Report' } }],
          }),
        });
        if (!createRes.ok) throw new Error('create_failed');
        const created = await createRes.json() as { spreadsheetId?: string };
        spreadsheetId = created.spreadsheetId || null;
        if (!spreadsheetId) throw new Error('no_id');

        // บันทึก ID + URL ไว้
        if (currentUser) {
          localStorage.setItem(scopedKey(currentUser.uid, sheetKey), spreadsheetId);
          const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
          localStorage.setItem(scopedKey(currentUser.uid, 'sheet_url'), url);
          setSheetUrl(url);
        }
      }

      // เขียน/อัปเดตข้อมูลเสมอ (ทั้งสร้างใหม่และเปิดซ้ำ)
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      showToast(savedId ? `✅ อัปเดต Google Sheet แล้ว (${filtered.length} รายการ)` : '✅ สร้าง Google Sheet ใหม่แล้ว!');
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    } catch {
      showToast('❌ สร้าง Google Sheet ไม่สำเร็จ — ตรวจสอบสิทธิ์ Spreadsheets API');
    } finally {
      setSheetsExporting(false);
    }
  };

  // ── Gemini AI Summary
  const handleGeminiSummary = async () => {
    setGeminiLoading(true);
    setGeminiResult('');
    setShowGemini(true);
    try {
      const data = await generateMonthlySummaryCallable({
        uid: currentUser?.uid || '',
        month: summaryMonth,
        year: summaryYear,
      });
      setGeminiResult(data.summary || 'ไม่สามารถสรุปได้ในขณะนี้');
    } catch {
      setGeminiResult('❌ ไม่สามารถสร้างสรุปผ่าน backend ได้ในขณะนี้');
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleExportCsv = () => {
    const filtered = buildExportRows(exportMonth, exportYear);
    if (filtered.length === 0) { showToast('ไม่มีข้อมูลในเดือนที่เลือก'); return; }
    const monthName = getMonthNameThai(exportMonth);
    const yr        = exportYear;
    const headers = ['#', 'วันที่', 'กลุ่ม', 'Task ID', 'Task Name', 'จำนวน', 'หน่วย', 'Cr/Unit', 'Credits', 'หมายเหตุ', 'Canva Link', 'Drive Link'];
    const rows = filtered.map((e, idx) => {
      const group = kpiConfig[e.groupId];
      const task  = group?.tasks.find((t) => t.id === e.taskId);
      return [
        idx + 1,
        e.date,
        `"${group?.name || e.groupId}"`,
        e.taskId,
        `"${task?.name || 'Unknown'}"`,
        e.quantity,
        task?.unit || '',
        task?.creditPerUnit || 1,
        e.credits,
        `"${e.notes || ''}"`,
        `"${e.canvaLink || ''}"`,
        `"${e.driveLink || ''}"`,
      ].join(',');
    });
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Jatrack_${displayName}_${monthName}_${yr}.csv`;
    link.click();
    showToast('ดาวน์โหลด CSV แล้ว ✓');
    setShowExportModal(false);
  };

  // ── Space Sheet Export — professional Google Sheets format
  const handleExportSpaceSheet = () => {
    const filtered = buildExportRows(exportMonth, exportYear);
    if (filtered.length === 0) { showToast('ไม่มีข้อมูลในเดือนที่เลือก'); return; }
    const monthName    = getMonthNameThai(exportMonth);
    const yr           = exportYear;
    const totalCredits = filtered.reduce((s, e) => s + e.credits, 0);
    const pct          = Math.round(safePercent(totalCredits, monthlyTarget));
    const role         = userProfile ? (ROLE_DEFAULTS[userProfile.role]?.meta.label || userProfile.role) : '';

    const rows: string[] = [];
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    // ── HEADER SECTION
    rows.push(`${q('JATRACK KPI SPACE SHEET')},${q(`${monthName} ${yr}`)}`);
    rows.push(`${q('Name')},${q(displayName)}`);
    rows.push(`${q('Role')},${q(role)}`);
    rows.push(`${q('Monthly Target')},${monthlyTarget},${q('Credits')}`);
    rows.push(`${q('Total Achieved')},${totalCredits},${q(`${pct}% of target`)}`);
    rows.push(`${q('Generated')},${q(new Date().toLocaleString('th-TH'))}`);
    rows.push(''); // blank row

    // ── DETAIL SECTION — per group
    const groupKeys = [...new Set(filtered.map(e => e.groupId))] as string[];
    groupKeys.forEach(gKey => {
      const group     = kpiConfig[gKey];
      const groupRows = filtered.filter(e => e.groupId === gKey);
      const gTotal    = groupRows.reduce((s, e) => s + e.credits, 0);

      rows.push(`${q(`▸ ${gKey} — ${group?.name || gKey}`)}`);
      rows.push(['#', 'Date', 'Task ID', 'Task Name', 'Qty', 'Unit', 'Cr/Unit', 'Credits', 'Notes', 'Canva', 'Drive'].map(q).join(','));

      groupRows.forEach((e, idx) => {
        const task = group?.tasks.find(t => t.id === e.taskId);
        rows.push([
          idx + 1,
          q(e.date),
          q(e.taskId),
          q(task?.name || 'Unknown'),
          e.quantity,
          q(task?.unit || ''),
          task?.creditPerUnit || 1,
          e.credits,
          q(e.notes || ''),
          q(e.canvaLink || ''),
          q(e.driveLink || ''),
        ].join(','));
      });
      rows.push(`${q('Subtotal')},,,,,,,,${gTotal}`);
      rows.push(''); // blank row
    });

    // ── SUMMARY SECTION
    rows.push(`${q('── SUMMARY ──')}`);
    rows.push(['Group', 'Name', 'Credits', '% of Total'].map(q).join(','));
    groupKeys.forEach(gKey => {
      const group  = kpiConfig[gKey];
      const gTotal = filtered.filter(e => e.groupId === gKey).reduce((s, e) => s + e.credits, 0);
      rows.push([
        q(gKey),
        q(group?.name || gKey),
        gTotal,
        q(`${totalCredits > 0 ? Math.round((gTotal/totalCredits)*100) : 0}%`),
      ].join(','));
    });
    rows.push('');
    rows.push(`${q('GRAND TOTAL')},,,${totalCredits},,,,,${q(`${pct}% / target ${monthlyTarget} Cr.`)}`);
    rows.push(`${q('Generated by Jatrack · Young Age Corporation Co., Ltd. & Pharvia 2025 Co., Ltd.')}`);

    const csv  = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(blob);
    link.download = `Jatrack_SpaceSheet_${displayName}_${monthName}_${yr}.csv`;
    link.click();
    showToast('Space Sheet ดาวน์โหลดแล้ว ✓');
    setShowExportModal(false);
  };

  const viewState = resolveAppViewState({ authLoading, profileLoading, currentUser, userProfile });

  // ── Render guards
  if (viewState === 'loading') return <AuthLoadingScreen />;
  if (viewState === 'signin') return <AuthSignInScreen onSignIn={handleSignIn} loading={signInLoading} toast={toast} ToastComponent={Toast} />;
  if (viewState === 'nickname') {
    return (
      <AuthNicknameSetupScreen
        defaultValue={currentUser.displayName?.split(' ')[0] || ''}
        defaultTitle={userProfile?.customTitle || ROLE_DEFAULTS[userProfile?.role || '']?.meta.label || ''}
        onSave={handleSaveProfileBasics}
      />
    );
  }
  if (!currentUser || !userProfile) return <AuthLoadingScreen />;

  const todayEntries   = entries.filter((e) => e.user === currentUser.uid && e.date === getTodayStr());
  const todayCalendarEvents = calendarEvents.filter(
    (event) => dateKeyInTimezone(event.start, orgCalendarConfig.timezone) === getTodayStr(),
  );
  const historyEntries = entries.filter((e) => e.user === currentUser.uid);
  const historyDates   = Array.from<string>(new Set(historyEntries.map((e) => e.date))).sort((a, b) => b.localeCompare(a));
  const navItems: Array<{ key: TabType; label: string; icon: React.ReactNode }> = [
    { key: 'log', label: 'บันทึก', icon: <PlusCircle size={20} /> },
    { key: 'today', label: 'วันนี้', icon: <Clock size={20} /> },
    { key: 'calendar', label: 'Calendar', icon: <CalendarIcon size={20} /> },
    { key: 'history', label: 'ประวัติ', icon: <History size={20} /> },
    { key: 'daily', label: 'รายงาน', icon: <FileText size={20} /> },
    { key: 'summary', label: 'สรุป', icon: <BarChart3 size={20} /> },
  ];
  if (isSuperAdmin) {
    navItems.push({ key: 'admin', label: 'Admin', icon: <UserCircle size={20} /> });
  }

  // ─── MAIN APP ───────────────────────────────────────────────────────────────
  return (
    <div className="relative mx-auto flex h-screen w-full max-w-[1180px] flex-col overflow-hidden bg-[#FDFAF7] text-[#2C2A28]" style={{ height: '100dvh' }}>
      <Toast {...toast} />

      {/* KPI Editor (Phase 5) */}
      {showKpiEditor && (
        <KpiEditor
          config={adminManagedUid && managedAdminConfig ? managedAdminConfig : kpiConfig}
          monthlyTarget={adminManagedUid ? managedAdminTarget : monthlyTarget}
          onSave={(updated, newTarget) => (
            adminManagedUid
              ? handleSaveManagedKpiConfig(adminManagedUid, updated, newTarget)
              : handleSaveKpiConfig(updated, newTarget)
          )}
          onClose={() => {
            setShowKpiEditor(false);
            setAdminManagedUid(null);
          }}
          title={adminManagedUid
            ? `จัดการ KPI ของ ${managedAdminProfile?.nickname || managedAdminProfile?.displayName || managedAdminSummary?.nickname || managedAdminProfile?.email || managedAdminSummary?.email || 'สมาชิก'}`
            : 'จัดการ KPI ของฉัน'}
          subtitle={adminManagedUid
            ? 'ปรับกลุ่มงาน · รายการ · Credits · เป้าหมายรายเดือน'
            : 'กลุ่มงาน · รายการ · Credits · เป้าหมาย'}
          deleteAction={adminManagedUid
            ? {
                label: `ลบ ${managedAdminProfile?.nickname || managedAdminProfile?.displayName || managedAdminSummary?.nickname || managedAdminProfile?.email || managedAdminSummary?.email || 'ผู้ใช้นี้'} ออกจากระบบ`,
                helper: 'ลบทั้งข้อมูลใน Firestore, Google Sheets projection และ Firebase Authentication โดยมีการยืนยัน 2 ชั้น',
                onDelete: () => handleDeleteManagedUser(adminManagedUid),
              }
            : undefined}
        />
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editEntry} onClose={() => setEditEntry(null)} title="แก้ไขรายการ">
        {editEntry && (
          <div className="space-y-4">
            <div className="px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                {editEntry.groupId} · {editEntry.taskId}
              </p>
              <p className="font-bold text-[#2C2A28] text-[14px]">
                {kpiConfig[editEntry.groupId]?.tasks.find((t) => t.id === editEntry.taskId)?.name}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-2 rounded-2xl">
              <button
                onClick={() => setEditEntry({ ...editEntry, quantity: Math.max(1, editEntry.quantity - 1) })}
                className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-transform"
              >
                <Minus size={18} />
              </button>
              <span className="text-3xl font-black text-[#2C2A28]">{editEntry.quantity}</span>
              <button
                onClick={() => setEditEntry({ ...editEntry, quantity: editEntry.quantity + 1 })}
                className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-transform"
              >
                <Plus size={18} />
              </button>
            </div>
            <textarea
              value={editEntry.notes}
              onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })}
              placeholder="เพิ่มบันทึก..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] outline-none resize-none"
            />
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded-md pointer-events-none" style={{ background: '#7C3AED' }}>C</span>
              <input
                type="url"
                value={editEntry.canvaLink || ''}
                onChange={(e) => setEditEntry({ ...editEntry, canvaLink: e.target.value })}
                placeholder="Canva link..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] outline-none"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded-md pointer-events-none" style={{ background: '#1D6F42' }}>D</span>
              <input
                type="url"
                value={editEntry.driveLink || ''}
                onChange={(e) => setEditEntry({ ...editEntry, driveLink: e.target.value })}
                placeholder="Google Drive link..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] outline-none"
              />
            </div>
            {/* ไฟล์ที่อัปโหลดแล้ว (edit mode) */}
            {editEntry.attachments && editEntry.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {editEntry.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 max-w-full">
                    <a href={att.link} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] font-bold text-emerald-700 truncate hover:underline" style={{ maxWidth: 150 }} title={att.normalizedName}>
                      {att.normalizedName}
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditEntry(prev => prev ? {
                        ...prev,
                        attachments: prev.attachments!.filter((_, j) => j !== i),
                      } : prev)}
                      className="text-emerald-400 hover:text-rose-400 ml-1 text-[11px] leading-none shrink-0"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={editDriveInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleDriveFilesSelected(e, 'edit')}
            />
            <button
              onClick={() => editDriveInputRef.current?.click()}
              disabled={driveUploadingEdit}
              className={`w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-[11px] text-slate-500 flex items-center justify-center gap-1.5 active:bg-emerald-50 transition-colors ${driveUploadingEdit ? 'opacity-60' : ''}`}
            >
              {driveUploadingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
              {driveUploadingEdit ? 'กำลังอัปโหลด...' : 'อัปโหลดเข้า Drive'}
            </button>
            <button
              onClick={handleUpdateEntry}
              className="w-full py-4 text-white rounded-2xl font-bold text-[13px] tracking-widest active:scale-95 transition-all glow-orange"
              style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}
            >
              บันทึกการแก้ไข
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="ยืนยันการลบ">
        <div className="text-center space-y-5 py-2">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={24} className="text-rose-400" />
          </div>
          <div>
            <p className="font-bold text-[#2C2A28]">ต้องการลบรายการนี้?</p>
            <p className="text-[12px] text-slate-400 mt-1">ข้อมูลจะถูกลบออกจาก Cloud ถาวร</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold text-[13px]">ยกเลิก</button>
            <button onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold text-[13px]">ลบเลย</button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="ส่งออกรายงาน">
        <div className="space-y-4">
          {/* Month picker */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">เลือกเดือน</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[...Array(12)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setExportMonth(i)}
                  className={`py-2.5 rounded-xl font-bold text-[10px] transition-all active:scale-95 ${
                    exportMonth === i
                      ? 'bg-[#F4823C] text-white shadow-sm glow-orange'
                      : 'bg-orange-50 text-slate-400 border border-orange-100'
                  }`}
                >
                  {getMonthNameThai(i).slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Year picker */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">เลือกปี</p>
            <select
              value={exportYear}
              onChange={(e) => setExportYear(Number(e.target.value))}
              className="w-full px-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl text-[12px] font-bold text-[#2C2A28] outline-none"
            >
              {exportYearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Export count preview */}
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-2xl border border-orange-100">
            <div className="w-8 h-8 rounded-xl bg-[#F4823C] flex items-center justify-center text-white shrink-0">
              <FileText size={15} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#2C2A28]">
                {buildExportRows(exportMonth, exportYear).length} รายการ · {buildExportRows(exportMonth, exportYear).reduce((s,e)=>s+e.credits,0)} Cr.
              </p>
              <p className="text-[9px] text-slate-400">{getMonthNameThai(exportMonth)} {exportYear}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportCsv}
              className="py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <Download size={15} /> CSV
            </button>
            <button
              onClick={handleExportTxt}
              className="py-3.5 bg-[#2C2A28] text-white rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <FileText size={15} /> TXT Report
            </button>
          </div>
          <p className="text-center text-[9px] text-slate-300">CSV สำหรับตารางงาน, TXT สำหรับรายงานข้อความสรุป</p>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings" maxWidthClassName="max-w-5xl">
        <SettingsPanel
          currentUser={currentUser}
          userProfile={userProfile}
          nicknameDraft={nicknameDraft}
          setNicknameDraft={setNicknameDraft}
          customTitleDraft={customTitleDraft}
          setCustomTitleDraft={setCustomTitleDraft}
          reportGender={reportGender}
          setReportGender={setReportGender}
          reportEmojis={reportEmojis}
          setReportEmojis={setReportEmojis}
          sheetUrl={sheetUrl}
          setSheetUrl={setSheetUrl}
          driveFolderId={driveFolderId}
          setDriveFolderId={setDriveFolderId}
          googleAccessToken={googleAccessToken}
          googleAccessTokenExpiry={googleAccessTokenExpiry}
          handleConnectGoogleDrive={handleConnectGoogleDrive}
          latestSyncState={latestSyncState}
          isOnline={isOnline}
          isSuperAdmin={isSuperAdmin}
          orgCalendarConfig={orgCalendarConfig}
          calendarDraft={calendarDraft}
          setCalendarDraft={setCalendarDraft}
          calendarActionLoading={calendarActionLoading}
          onValidateCalendar={handleValidateCalendar}
          onSave={handleSaveSettings}
          onSignOut={handleSignOut}
          openKpiEditor={() => {
            setShowSettings(false);
            setAdminManagedUid(null);
            setShowKpiEditor(true);
          }}
          runtimeProjectId={runtimeProjectId}
          runtimeAuthDomain={runtimeAuthDomain}
          firebaseConfigHealthy={firebaseConfigHealthy}
          autoHoverExpand={autoHoverExpand}
          setAutoHoverExpand={setAutoHoverExpand}
          monthlyTarget={monthlyTarget}
        />
      </Modal>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="header-gradient shrink-0 px-5 pt-[calc(3.25rem+env(safe-area-inset-top))] pb-5 shadow-sm">
        <div className="mx-auto w-full max-w-[1080px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mini App Icon */}
            <div className="w-9 h-9 rounded-[13px] overflow-hidden shadow-md border border-white/70 shrink-0">
              <img src="/icon-512.png" alt="Jatrack" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[18px] font-light text-[#2C2A28] tracking-[0.18em]">Jatrack</h1>
                <Sparkles size={11} className="text-[#F4823C]" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] mt-0.5" style={{ color: '#F4823C' }}>
                {ROLE_EMOJI[userProfile?.role || ''] || '⚙️'} {userProfile?.customTitle || customTitleDraft || ROLE_DEFAULTS[userProfile?.role || '']?.meta.label || userProfile?.role || 'Custom'}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${isOnline ? 'bg-emerald-50/80 border-emerald-200/50 text-emerald-500' : 'bg-rose-50/80 border-rose-200/50 text-rose-400'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 bg-white/60 rounded-xl flex items-center justify-center border border-white/70 text-[#2C2A28] active:bg-orange-50 transition-colors"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/60 backdrop-blur-md px-4 py-3 rounded-[20px] border border-white/80">
            <p className="text-[8px] font-bold text-[#F4823C] uppercase tracking-widest">เดือนนี้</p>
            <p className="text-[28px] font-light text-[#F4823C] leading-tight mt-0.5">{stats.monthTotal}</p>
            <p className="text-[8px] text-slate-300 font-medium">
              {monthlyTarget > 0 ? `/ ${monthlyTarget} Cr. · ${Math.round(stats.percent)}%` : 'credits'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-[20px] shadow-md" style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest">วันนี้</p>
            <p className="text-[28px] font-light text-white leading-tight mt-0.5">{stats.todayTotal}</p>
            <p className="text-[8px] text-white/60 font-medium">credits</p>
          </div>
        </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div className="mx-auto w-full max-w-[1080px]">

        {activeTab === 'log' && (
          <LogTab
            orderedGroupKeys={orderedGroupKeys}
            kpiConfig={kpiConfig}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedTaskId={selectedTaskId}
            setSelectedTaskId={setSelectedTaskId}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
            autoHoverExpand={autoHoverExpand}
            hoveredGroup={hoveredGroup}
            setHoveredGroup={setHoveredGroup}
            currentTask={currentTask}
            quantity={quantity}
            setQuantity={setQuantity}
            notes={notes}
            setNotes={setNotes}
            canvaLink={canvaLink}
            setCanvaLink={setCanvaLink}
            driveLink={driveLink}
            setDriveLink={setDriveLink}
            logAttachments={logAttachments}
            setLogAttachments={setLogAttachments}
            pendingLocalFiles={pendingLocalFiles}
            setPendingLocalFiles={setPendingLocalFiles}
            logDriveInputRef={logDriveInputRef}
            handleDriveFilesSelected={handleDriveFilesSelected}
            handlePickLocalFile={handlePickLocalFile}
            driveUploading={driveUploading}
            handleAddEntry={handleAddEntry}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'today' && (
          <TodayTab
            todayLabel={formatThaiDate(getTodayStr(), true)}
            todayEntries={todayEntries}
            kpiConfig={kpiConfig}
            setEditEntry={setEditEntry}
            setDeleteId={setDeleteId}
            showToast={showToast}
            EntryCardComponent={EntryCard}
            calendarEnabled={orgCalendarConfig.enabled}
            calendarLoading={calendarLoading}
            calendarError={calendarError}
            calendarEvents={todayCalendarEvents}
            openCalendarTab={() => setActiveTab('calendar')}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            config={orgCalendarConfig}
            events={calendarEvents}
            loading={calendarLoading}
            error={calendarError}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            historyDates={historyDates}
            historyEntries={historyEntries}
            kpiConfig={kpiConfig}
            setEditEntry={setEditEntry}
            setDeleteId={setDeleteId}
            showToast={showToast}
            EntryCardComponent={EntryCard}
            formatThaiDate={formatThaiDate}
          />
        )}

        {activeTab === 'daily' && (
          <DailyTab
            dailyTab={dailyTab}
            setDailyTab={setDailyTab}
            dailyDate={dailyDate}
            setDailyDate={setDailyDate}
            displayName={displayName}
            morningCheckInTime={morningCheckInTime}
            setMorningCheckInTime={setMorningCheckInTime}
            morningFocusItems={morningFocusItems}
            setMorningFocusItems={setMorningFocusItems}
            eveningRoutineItems={eveningRoutineItems}
            setEveningRoutineItems={setEveningRoutineItems}
            eveningResultItems={eveningResultItems}
            setEveningResultItems={setEveningResultItems}
            eveningNextMoveItems={eveningNextMoveItems}
            setEveningNextMoveItems={setEveningNextMoveItems}
            dailyIssues={dailyIssues}
            setDailyIssues={setDailyIssues}
            dailyIssueStatus={dailyIssueStatus}
            setDailyIssueStatus={setDailyIssueStatus}
            dailyIssueDetail={dailyIssueDetail}
            setDailyIssueDetail={setDailyIssueDetail}
            dailyIssueNextStep={dailyIssueNextStep}
            setDailyIssueNextStep={setDailyIssueNextStep}
            dailyEntriesForDate={dailyEntriesForDate}
            dailySaving={dailySaving}
            dailyCopySuccess={dailyCopySuccess}
            morningPreviewText={morningPreviewText}
            eveningPreviewText={eveningPreviewText}
            dailyReportsLoading={dailyReportsLoading}
            dailyReports={dailyReports}
            addDailyListItem={addDailyListItem}
            updateDailyListItem={updateDailyListItem}
            removeDailyListItem={removeDailyListItem}
            saveAndCopyDailyReport={saveAndCopyDailyReport}
            copyDailyText={copyDailyText}
            handleCopyDailyHistory={handleCopyDailyHistory}
            showToast={showToast}
            formatThaiDate={formatThaiDate}
            DailyListFieldComponent={DailyListField}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            summaryData={summaryData}
            summaryYear={summaryYear}
            monthlyTarget={monthlyTarget}
            isAtCurrentMonth={isAtCurrentMonth}
            navSummaryMonth={navSummaryMonth}
            handleExportToGoogleSheets={handleExportToGoogleSheets}
            sheetsExporting={sheetsExporting}
            handleGeminiSummary={handleGeminiSummary}
            geminiLoading={geminiLoading}
            setShowExportModal={setShowExportModal}
            showGemini={showGemini}
            setShowGemini={setShowGemini}
            geminiResult={geminiResult}
            showToast={showToast}
            GroupBarComponent={GroupBar}
          />
        )}

        {activeTab === 'admin' && isSuperAdmin && (
          <AdminTab
            adminSummary={adminSummary}
            totalUsers={adminProfiles.length}
            totalEntries={adminEntries.length}
            adminLoading={adminLoading}
            currentUserUid={currentUser?.uid}
            month={adminMonth}
            year={adminYear}
            onPrevMonth={() => changeAdminMonth(-1)}
            onNextMonth={() => changeAdminMonth(1)}
            onManageUser={openManagedKpiEditor}
            onMoveUp={(uid) => { void handleMoveAdminUser(uid, -1); }}
            onMoveDown={(uid) => { void handleMoveAdminUser(uid, 1); }}
          />
        )}
        </div>
      </main>

      {/* ─── RENAME BEFORE UPLOAD MODAL ──────────────────────────────────────── */}
      {showRenameModal && (() => {
        // Duplicate detection: existing attachments + within-batch
        const curMode  = pendingUploads[0]?.mode;
        const alreadyUploaded = new Set<string>(
          curMode === 'log'
            ? logAttachments.map(a => a.normalizedName)
            : (editEntry?.attachments ?? []).map(a => a.normalizedName)
        );
        const batchNames = pendingUploads.map(p => p.normalizedName);
        const isDup = (name: string, idx: number) =>
          alreadyUploaded.has(name) ||
          batchNames.some((n, j) => n === name && j !== idx);
        const anyDup = pendingUploads.some((p, i) => isDup(p.normalizedName, i));
        return (
          <div className="fixed inset-0 z-[90] bg-black/50 flex items-end justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#FDFAF7] rounded-[28px] w-full max-w-md shadow-2xl flex flex-col" style={{ maxHeight: '80dvh' }}>
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <p className="font-bold text-[#2C2A28] text-[15px]">ตรวจสอบชื่อไฟล์ก่อนอัปโหลด</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {pendingUploads.length} ไฟล์ · แก้ชื่อได้ก่อนยืนยัน
                  {anyDup && <span className="text-amber-500 ml-1.5 font-bold">· ⚠️ พบชื่อซ้ำ</span>}
                </p>
              </div>
              {/* File list */}
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
                {pendingUploads.map((pf, i) => {
                  const dup = isDup(pf.normalizedName, i);
                  return (
                    <div key={i} className={`rounded-[16px] border p-3 space-y-1.5 transition-colors ${dup ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-slate-400 truncate flex-1">ต้นฉบับ: {pf.file.name}</p>
                        {dup && (
                          <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                            ⚠️ ชื่อซ้ำ
                          </span>
                        )}
                      </div>
                      <input
                        value={pf.normalizedName}
                        onChange={(e) => {
                          const updated = [...pendingUploads];
                          updated[i] = { ...updated[i], normalizedName: e.target.value };
                          setPendingUploads(updated);
                        }}
                        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-[12px] font-mono outline-none transition-colors ${dup ? 'border-amber-300 focus:border-amber-500' : 'border-slate-100 focus:border-[#F4823C]'}`}
                      />
                      <p className="text-[8px] text-slate-300">
                        {(pf.file.size / 1024).toFixed(0)} KB · {pf.file.type || 'unknown'}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* Actions */}
              <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 space-y-2 border-t border-slate-100">
                {/* Skip rename — upload with original filenames */}
                <button
                  onClick={() => void handleConfirmUploads(pendingUploads.map(p => ({ ...p, normalizedName: p.file.name })))}
                  className="w-full py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[12px] font-bold text-slate-500 active:bg-slate-100 transition-colors"
                >
                  📎 อัปโหลดด้วยชื่อเดิม (ข้ามการตั้งชื่อ)
                </button>
                {/* Cancel + Confirm */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => { setShowRenameModal(false); setPendingUploads([]); }}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-[13px] font-bold text-slate-500 active:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => void handleConfirmUploads()}
                    className="flex-1 py-3.5 rounded-2xl text-white text-[13px] font-bold active:opacity-80 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #1D6F42, #2E9B5E)' }}
                  >
                    ✅ ยืนยัน · อัปโหลด {pendingUploads.length} ไฟล์
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── BOTTOM NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto flex w-full max-w-[1180px] flex-col items-center border-t border-slate-100/80 bg-white/95 shadow-2xl backdrop-blur-xl z-[60]">
        <div
          className="grid items-start w-full px-2 pt-3 pb-2 gap-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => (
            <div key={item.key}>
              <NavButton
                active={activeTab === item.key}
                onClick={() => setActiveTab(item.key)}
                icon={item.icon}
                label={item.label}
                compact={navItems.length >= 6}
              />
            </div>
          ))}
        </div>
        <p className="text-[8px] text-slate-300/80 tracking-widest pb-[calc(0.4rem+env(safe-area-inset-bottom))]">
          © 2026 Young Age Corporation Co., Ltd. & Pharvia 2025 Co., Ltd.
        </p>
      </nav>
    </div>
  );
}
