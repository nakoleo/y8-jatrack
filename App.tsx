
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlusCircle, History, BarChart3, Calendar as CalendarIcon,
  Trash2, CheckCircle2, Plus, Minus, Clock, Edit3, X, Settings,
  ChevronDown, FileText, Sparkles, Download, RefreshCw,
  LogOut, ChevronLeft, ChevronRight, TrendingUp, Wifi, WifiOff,
  Save, Sliders, UserCircle, Upload, ExternalLink, AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import {
  collection, collectionGroup, doc, setDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs,
} from 'firebase/firestore';
import {
  signInWithPopup, signOut, onAuthStateChanged, type User,
  reauthenticateWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth';
import { db, auth, googleProvider, createDriveProvider, firebaseApp } from './firebase';
import { WORK_GROUPS } from './constants';
import { WorkEntry, WorkGroup, WorkGroups, TabType, UserProfile, RoleId, DriveAttachment, LocalFileRef } from './types';
import { ROLE_DEFAULTS, ROLE_EMOJI } from './roleDefaults';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const HOST_EMAIL = 'host.y8@gmail.com';
const SUPER_ADMIN_EMAIL = 'info.nakoleo@gmail.com';
const KPI_POLICY_VERSION = 3;
const EXPECTED_FIREBASE_PROJECT = 'jartrack-y8pv';
const EXPECTED_FIREBASE_AUTH_DOMAIN = 'jartrack-y8pv.firebaseapp.com';

const ZERO_STARTER_GROUPS: WorkGroups = {
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

const normalizeEmail = (email?: string | null) => (email || '').trim().toLowerCase();
const isHostEmail = (email?: string | null) => normalizeEmail(email) === HOST_EMAIL;
const isSuperAdminEmail = (email?: string | null) => normalizeEmail(email) === SUPER_ADMIN_EMAIL;
const resolveRoleByEmail = (email?: string | null): RoleId =>
  isHostEmail(email) ? 'graphic_designer' : isSuperAdminEmail(email) ? 'art_director' : 'custom';

const cloneGroups = (groups: WorkGroups): WorkGroups => JSON.parse(JSON.stringify(groups));

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const dateToLocalStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const safePercent = (value: number, target: number) =>
  target > 0 ? Math.min((value / target) * 100, 100) : 0;

const sheetSafe = (value: string, fallback = 'User') => {
  const cleaned = value
    .trim()
    .replace(/[\\/?*\[\]:]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 70);
  return cleaned || fallback;
};

const buildSheetNames = (nickname: string, uid?: string) => {
  const uidTag = (uid || 'xxxxxx').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'xxxxxx';
  const base = sheetSafe(nickname, `User_${uidTag}`).slice(0, 50);
  const ownerKey = `${base}_${uidTag}`;
  return {
    ownerKey,
    masterSheetName: `${ownerKey}_KPI_MASTER`,
    dashboardSheetName: `${ownerKey}_Dashboard`,
  };
};

const getInitialKpiForEmail = (email?: string | null) => {
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

const scopedKey = (uid: string, key: string) => `jartrack_${uid}_${key}`;

const formatThaiDate = (dateStr: string, full = false) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: full ? 'long' : 'short',
      year: full ? 'numeric' : '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const getMonthNameThai = (monthIndex: number) =>
  new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date(2026, monthIndex));

// ─── CALENDAR TYPES + HELPERS ────────────────────────────────────────────────
interface CalEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  brand: 'y8' | 'pv';
}

const parseIcalDate = (raw: string): Date => {
  if (raw.includes('T')) {
    const s = raw.replace(/[^0-9]/g, '');
    return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}Z`);
  }
  return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T00:00:00`);
};

const parseIcal = (text: string, brand: 'y8' | 'pv'): CalEvent[] =>
  text.split('BEGIN:VEVENT').slice(1).reduce<CalEvent[]>((acc, block) => {
    const get = (k: string) => { const m = block.match(new RegExp(`${k}[^:]*:(.+)`)); return m ? m[1].trim() : ''; };
    try {
      const startStr = get('DTSTART');
      const endStr   = get('DTEND') || startStr;
      if (!startStr) return acc;
      acc.push({
        uid:   get('UID') || Math.random().toString(36),
        title: get('SUMMARY').replace(/\\n/g, ' ').replace(/\\,/g, ',') || '(ไม่มีชื่อ)',
        start: parseIcalDate(startStr),
        end:   parseIcalDate(endStr),
        brand,
      });
    } catch { /* skip malformed */ }
    return acc;
  }, []);

const extractGoogleApiReason = (raw: string) => {
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

/**
 * สร้างชื่อไฟล์มาตรฐาน: [TASKID]_[DDMMYYYY]_[NICKNAME]_[NN].[ext]
 * เช่น A01_08032026_tontawan_01.jpg
 */
const normalizeFileName = (
  originalName: string,
  taskId: string,
  entryDate: string,  // 'YYYY-MM-DD'
  nickname: string,
  index: number,
): string => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const [y = '0000', m = '00', d = '00'] = entryDate.split('-');
  const ddmmyyyy = `${d}${m}${y}`;
  const nick = nickname.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'user';
  const seq = String(index + 1).padStart(2, '0');
  return `${taskId}_${ddmmyyyy}_${nick}_${seq}.${ext}`;
};

interface PendingUploadFile {
  file: File;
  normalizedName: string;
  mode: 'log' | 'edit';
}

// GAS Webhook URL — pre-configured so users don't need to enter it manually
const DEFAULT_GAS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwZyi-i1WHuJaYwvvIZH6fyrbN58t8d4kbj6hzThKXKT390OHJj-yydQJAqGBgbXOJM/exec';

// GAS v3 — Single-spreadsheet, multi-user, auto-creates sheets, supports attachments[] + Drive folders + delete_user
const GAS_TEMPLATE = `// ================================================================
// JATRACK — Google Apps Script v3
// Single Spreadsheet | Multi-User | Auto-Setup | Supports Attachments
// Drive Folder Sync | User Delete Logging
// Admin-only backend. Users never configure this.
// ================================================================
var VERSION = '3.0';
var S_CONFIG  = '_CONFIG';
var S_USERS   = '_USER_REGISTRY';
var S_ENTRIES = 'ALL_ENTRIES';

var ENTRY_HEADERS = [
  'timestamp','date','uid','email','nickname','role',
  'group','taskId','taskName','qty','unit','credits',
  'notes','canvaLink','driveLink',
  'attachments_count','attachments_links','attachments_names',
  'entry_id'
];
var USER_HEADERS = [
  'uid','email','nickname','role','kpiSheet',
  'first_seen','last_seen','entry_count'
];
var KPI_HEADERS = [
  'timestamp','date','group','taskId','taskName',
  'qty','unit','credits','notes','canvaLink','driveLink',
  'attachments_count','attachments_links','attachments_names',
  'entry_id'
];

function cleanName(v, fallback) {
  var s = String(v || '').replace(/[\\\\/?*[\\]:]/g, '').trim().replace(/\\s+/g, '_').slice(0, 60);
  return s || (fallback || 'user');
}

function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function styleHeader(sh, cols, bg, fg) {
  sh.getRange(1, 1, 1, cols)
    .setFontWeight('bold').setBackground(bg).setFontColor(fg || '#FFFFFF');
  sh.setFrozenRows(1);
}

// ── Ensure system sheets exist ──────────────────────────────
function ensureConfig(ss) {
  var sh = getOrCreate(ss, S_CONFIG);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Key', 'Value']);
    styleHeader(sh, 2, '#2C2A28');
    sh.appendRow(['version', VERSION]);
    sh.appendRow(['created_at', new Date().toISOString()]);
    sh.appendRow(['note', 'Admin-only. Do not share this sheet with regular users.']);
  }
  return sh;
}

function ensureUserRegistry(ss) {
  var sh = getOrCreate(ss, S_USERS);
  if (sh.getLastRow() === 0) {
    sh.appendRow(USER_HEADERS);
    styleHeader(sh, USER_HEADERS.length, '#F4823C');
  }
  return sh;
}

function ensureAllEntries(ss) {
  var sh = getOrCreate(ss, S_ENTRIES);
  if (sh.getLastRow() === 0) {
    sh.appendRow(ENTRY_HEADERS);
    styleHeader(sh, ENTRY_HEADERS.length, '#2C2A28');
    sh.setColumnWidth(1, 160); sh.setColumnWidth(3, 140);
    sh.setColumnWidth(9, 150); sh.setColumnWidth(17, 220);
  }
  return sh;
}

// ── Per-user KPI sheet ──────────────────────────────────────
function ensureKpiSheet(ss, sheetName, nickname) {
  var sh = ss.getSheetByName(sheetName);
  if (sh) return sh;
  sh = ss.insertSheet(sheetName);
  sh.appendRow(KPI_HEADERS);
  styleHeader(sh, KPI_HEADERS.length, '#1D6F42');
  sh.getRange('A1').setNote('KPI log for ' + nickname + '. Auto-created by JATRACK.');
  return sh;
}

// ── Upsert user registry ────────────────────────────────────
function upsertUser(sh, uid, email, nickname, role, kpiSheet) {
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(uid)) {
      sh.getRange(i + 1, 3).setValue(nickname);
      sh.getRange(i + 1, 7).setValue(new Date().toISOString());
      sh.getRange(i + 1, 8).setValue(Number(data[i][7] || 0) + 1);
      return;
    }
  }
  sh.appendRow([uid, email, nickname, role, kpiSheet,
    new Date().toISOString(), new Date().toISOString(), 1]);
}

// ── Parse attachments from payload ─────────────────────────
function parseAtt(d) {
  var atts = d.attachments;
  if (!atts || !Array.isArray(atts) || atts.length === 0) {
    return { count: 0, links: d.driveLink || '', names: '' };
  }
  return {
    count: atts.length,
    links: atts.map(function(a) { return a.link || ''; }).filter(Boolean).join(' | '),
    names: atts.map(function(a) {
      return a.normalizedName || a.originalName || '';
    }).filter(Boolean).join(' | ')
  };
}

// ── Drive folder helpers ────────────────────────────────────
function getOrCreateFolder(parent, name) {
  var iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

function syncDriveFolders(d) {
  var rootId = d.rootFolderId;
  if (!rootId) return { ok: false, error: 'rootFolderId missing' };
  var root = DriveApp.getFolderById(rootId);
  var groups = d.groups || [];
  var created = [];
  groups.forEach(function(g) {
    var gName = g.name || g.key;
    var gFolder = getOrCreateFolder(root, gName);
    var subs = [];
    var brands = g.brands || [];
    if (brands.indexOf('y8') !== -1) { getOrCreateFolder(gFolder, 'Y8'); subs.push('Y8'); }
    if (brands.indexOf('pv') !== -1) { getOrCreateFolder(gFolder, 'PV'); subs.push('PV'); }
    created.push(gName + (subs.length ? ' [' + subs.join(', ') + ']' : ''));
  });
  return { ok: true, created: created };
}

function logDeleteUser(d, ss) {
  var sh = ensureUserRegistry(ss);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(d.uid)) {
      sh.getRange(i + 1, 4).setValue('[DELETED] ' + (d.nickname || ''));
      sh.getRange(i + 1, 7).setValue(new Date().toISOString());
      return;
    }
  }
}

// ── doGet — health check ────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, version: VERSION, service: 'JATRACK GAS v3' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doPost — main entry webhook ─────────────────────────────
function doPost(e) {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var d   = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // ── Action routing (v3) ─────────────────────────────────
    var action = d.action || '';
    if (action === 'sync_drive_folders') {
      var folderResult = syncDriveFolders(d);
      return ContentService
        .createTextOutput(JSON.stringify(folderResult))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'delete_user') {
      logDeleteUser(d, ss);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, version: VERSION }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var uid      = String(d.uid || '');
    var email    = String(d.email || '');
    var nickname = cleanName(d.nickname || d.name || ('user_' + uid.slice(0, 6)), 'User');
    var role     = cleanName(d.role || 'member', 'member');
    var kpiName  = nickname + '_KPI';
    var att      = parseAtt(d);

    ensureConfig(ss);
    var userReg    = ensureUserRegistry(ss);
    var allEntries = ensureAllEntries(ss);
    var kpiSheet   = ensureKpiSheet(ss, kpiName, nickname);

    upsertUser(userReg, uid, email, nickname, role, kpiName);

    // Write to ALL_ENTRIES (master log)
    allEntries.appendRow([
      d.timestamp || new Date().toISOString(), d.date || '', uid, email,
      nickname, role, d.group || '', d.taskId || '', d.taskName || '',
      d.quantity || 0, d.unit || '', d.credits || 0, d.notes || '',
      d.canvaLink || '', d.driveLink || '',
      att.count, att.links, att.names, d.id || ''
    ]);

    // Write to per-user KPI sheet
    kpiSheet.appendRow([
      d.timestamp || new Date().toISOString(), d.date || '',
      d.group || '', d.taskId || '', d.taskName || '',
      d.quantity || 0, d.unit || '', d.credits || 0, d.notes || '',
      d.canvaLink || '', d.driveLink || '',
      att.count, att.links, att.names, d.id || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, version: VERSION, nickname: nickname, kpiSheet: kpiName }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Admin: run once to initialise all sheets ────────────────
function adminSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureConfig(ss);
  ensureUserRegistry(ss);
  ensureAllEntries(ss);
  SpreadsheetApp.getUi().alert(
    '✅ JATRACK v3 Setup Complete!\\n\\n' +
    'Sheets created:\\n  _CONFIG\\n  _USER_REGISTRY\\n  ALL_ENTRIES\\n\\n' +
    'New in v3: Drive folder sync + user delete logging.\\n\\n' +
    'Deploy as Web App → Execute as: Me → Anyone access.\\n' +
    'Paste the /exec URL into JATRACK app Settings.'
  );
}

// ── Admin menu in Google Sheets ─────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🟠 JATRACK Admin')
    .addItem('▶ Setup All Sheets', 'adminSetup')
    .addToUi();
}
`;

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({
  isOpen, onClose, title, children,
}: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-[36px] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
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
                          const perm = await handle.requestPermission({ mode: 'read' });
                          if (perm === 'granted') {
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
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[56px] transition-all duration-200"
    >
      <div
        className={`p-2.5 rounded-2xl transition-all duration-200 ${
          active ? 'bg-[#2C2A28] shadow-md text-[#F4823C]' : 'text-slate-300'
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-[9px] font-bold uppercase tracking-[0.12em] transition-all ${
          active ? 'text-[#2C2A28]' : 'text-slate-300'
        }`}
      >
        {label}
      </span>
    </button>
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
  config, monthlyTarget, onSave, onClose,
}: {
  config: WorkGroups;
  monthlyTarget: number;
  onSave: (updated: WorkGroups, newTarget: number) => Promise<void>;
  onClose: () => void;
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
          <p className="font-bold text-[#2C2A28] text-[14px]">จัดการ KPI ของฉัน</p>
          <p className="text-[9px] text-slate-400 mt-0.5">กลุ่มงาน · รายการ · Credits · เป้าหมาย</p>
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
  onSignIn, onEmailSignIn, onEmailRegister, loading, toast,
}: {
  onSignIn: () => void;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailRegister: (email: string, password: string) => Promise<void>;
  loading: boolean;
  toast: { show: boolean; message: string };
}) => {
  const [mode, setMode] = React.useState<'google' | 'email'>('google');
  const [isRegister, setIsRegister] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [emailLoading, setEmailLoading] = React.useState(false);

  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) return;
    setEmailLoading(true);
    try {
      if (isRegister) await onEmailRegister(email.trim(), password);
      else            await onEmailSignIn(email.trim(), password);
    } finally {
      setEmailLoading(false);
    }
  };

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

      {/* Tab switcher */}
      <div className="w-full flex bg-slate-100 rounded-2xl p-1 mb-5 relative z-10">
        <button onClick={() => setMode('google')}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${mode === 'google' ? 'bg-white shadow-sm text-[#2C2A28]' : 'text-slate-400'}`}>
          🔵 Google
        </button>
        <button onClick={() => setMode('email')}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${mode === 'email' ? 'bg-white shadow-sm text-[#2C2A28]' : 'text-slate-400'}`}>
          ✉️ Email
        </button>
      </div>

      <div className="w-full space-y-3 animate-in slide-in-from-bottom duration-500 relative z-10">
        {mode === 'google' ? (
          <>
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
              แนะนำ · รองรับ Google Drive &amp; Sheets อัตโนมัติ
            </p>
          </>
        ) : (
          <>
            <div className="flex bg-white rounded-2xl border border-slate-100 overflow-hidden text-[12px] font-bold">
              <button onClick={() => setIsRegister(false)}
                className={`flex-1 py-2.5 transition-colors ${!isRegister ? 'bg-[#F4823C] text-white' : 'text-slate-400'}`}>
                เข้าสู่ระบบ
              </button>
              <button onClick={() => setIsRegister(true)}
                className={`flex-1 py-2.5 transition-colors ${isRegister ? 'bg-[#F4823C] text-white' : 'text-slate-400'}`}>
                สมัครสมาชิก
              </button>
            </div>
            <input type="email" placeholder="อีเมล" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-[13px] outline-none"
              onKeyDown={e => e.key === 'Enter' && void handleEmail()} />
            <input type="password" placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-[13px] outline-none"
              onKeyDown={e => e.key === 'Enter' && void handleEmail()} />
            <button onClick={() => void handleEmail()} disabled={emailLoading || !email || !password}
              className="w-full py-4 rounded-2xl font-bold text-[14px] text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}>
              {emailLoading ? <RefreshCw size={16} className="animate-spin" /> : (isRegister ? '📧 สมัครสมาชิก' : '🔑 เข้าสู่ระบบ')}
            </button>
            <p className="text-center text-[10px] text-slate-300">
              ⚠️ อีเมล + รหัสผ่าน ไม่รองรับอัพโหลด Google Drive โดยตรง
            </p>
          </>
        )}
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
  type BrandMode = 'all' | 'y8' | 'pv';

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
  const [toast, setToast]                   = useState({ show: false, message: '' });
  const [isLoading, setIsLoading]           = useState(false);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);

  const [sheetUrl, setSheetUrl]             = useState<string>('');
  const [geminiApiKey, setGeminiApiKey]     = useState('');
  const [geminiResult, setGeminiResult]     = useState('');
  const [geminiLoading, setGeminiLoading]   = useState(false);
  const [showGemini, setShowGemini]         = useState(false);

  const [selectedDate, setSelectedDate]     = useState(getTodayStr());
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
  const [adminTargets, setAdminTargets]     = useState<Record<string, number>>({});
  const [adminLoading, setAdminLoading]     = useState(false);

  // ── Integration states
  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState('');
  const [calY8Url, setCalY8Url]               = useState('');
  const [calPvUrl, setCalPvUrl]               = useState('');
  const [driveFolderId, setDriveFolderId]     = useState('');
  const [calEvents, setCalEvents]             = useState<CalEvent[]>([]);
  const [calLoading, setCalLoading]           = useState(false);
  const [showCalSection, setShowCalSection]   = useState(true);
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
  const [syncQueueCount, setSyncQueueCount]       = useState(0);
  const [customTitleDraft, setCustomTitleDraft]   = useState('');
  const [showDriveTreeModal, setShowDriveTreeModal] = useState(false);
  const [driveTreeLoading, setDriveTreeLoading]   = useState(false);
  const [pendingLocalFiles, setPendingLocalFiles] = useState<LocalFileRef[]>([]);

  // ── Group expand/collapse + brand/icon management
  const [expandedGroups, setExpandedGroups]     = useState<Set<string>>(new Set());
  const [autoHoverExpand, setAutoHoverExpand]   = useState(false);
  const [hoveredGroup, setHoveredGroup]         = useState<string | null>(null);
  const [logBrandMode, setLogBrandMode]         = useState<BrandMode>('all');

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
    // Always use DEFAULT_GAS_WEBHOOK unless admin has explicitly saved a different one
    const savedWebhook = readSetting('sheets_webhook', '');
    setSheetsWebhookUrl(savedWebhook || DEFAULT_GAS_WEBHOOK);
    setCalY8Url(readSetting('cal_y8', ''));
    setCalPvUrl(readSetting('cal_pv', ''));
    setDriveFolderId(readSetting('drive_folder_id', ''));
    setGeminiApiKey(readSetting('gemini_api_key', ''));
    const savedHover = readSetting('auto_hover_expand', '');
    if (savedHover) {
      try { setAutoHoverExpand(JSON.parse(savedHover) as boolean); } catch { /* ignore */ }
    }
  }, [currentUser]);

  // ── Init syncQueueCount when user changes
  useEffect(() => {
    if (!currentUser) { setSyncQueueCount(0); return; }
    setSyncQueueCount(getWebhookQueue().length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Sync customTitleDraft when Settings opens
  useEffect(() => {
    if (!showSettings) return;
    if (userProfile?.customTitle !== undefined) setCustomTitleDraft(userProfile.customTitle || '');
  }, [showSettings]);

  // ── localStorage offline cache
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(scopedKey(currentUser.uid, 'entries_v8'), JSON.stringify(entries));
  }, [entries, currentUser]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2500);
  };

  const getWebhookQueue = (): Record<string, unknown>[] => {
    if (!currentUser) return [];
    const raw = localStorage.getItem(scopedKey(currentUser.uid, 'webhook_queue'));
    if (!raw) return [];
    try { return JSON.parse(raw) as Record<string, unknown>[]; }
    catch { return []; }
  };

  const setWebhookQueue = (rows: Record<string, unknown>[]) => {
    if (!currentUser) return;
    localStorage.setItem(scopedKey(currentUser.uid, 'webhook_queue'), JSON.stringify(rows));
  };

  const enqueueWebhook = (payload: Record<string, unknown>) => {
    const queue = getWebhookQueue();
    queue.push(payload);
    const trimmed = queue.slice(-200);
    setWebhookQueue(trimmed);
    setSyncQueueCount(trimmed.length);
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
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          const merged: UserProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || profile.displayName || 'User',
            nickname: profile.nickname || '',
            email: normalizeEmail(currentUser.email) || profile.email || '',
            photoURL: currentUser.photoURL || profile.photoURL || '',
            role: forcedRole,
            isAdmin: forcedAdmin,
            createdAt: profile.createdAt || now,
            updatedAt: now,
          };
          setUserProfile(merged);
          setNicknameDraft(merged.nickname || '');
          // ── Load persistent settings + customTitle from Firestore
          if (profile.customTitle) setCustomTitleDraft(profile.customTitle);
          if (profile.settings) {
            const s = profile.settings;
            if (s.autoHoverExpand !== undefined) setAutoHoverExpand(s.autoHoverExpand);
            if (s.calY8Url)       setCalY8Url(s.calY8Url);
            if (s.calPvUrl)       setCalPvUrl(s.calPvUrl);
            if (s.driveFolderId)  setDriveFolderId(s.driveFolderId);
            if (s.sheetUrl)       setSheetUrl(s.sheetUrl);
          }

          if (
            profile.role !== merged.role ||
            profile.isAdmin !== merged.isAdmin ||
            profile.email !== merged.email ||
            profile.displayName !== merged.displayName ||
            (profile.photoURL || '') !== (merged.photoURL || '')
          ) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              role: merged.role,
              isAdmin: merged.isAdmin,
              email: merged.email,
              displayName: merged.displayName,
              photoURL: merged.photoURL || '',
              updatedAt: now,
            }, { merge: true });
          }
        } else {
          const profile: UserProfile = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'User',
            nickname: '',
            email: normalizeEmail(currentUser.email),
            photoURL: currentUser.photoURL || '',
            role: forcedRole,
            isAdmin: forcedAdmin,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'users', currentUser.uid), profile, { merge: true });
          setUserProfile(profile);
          setNicknameDraft('');
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
      setAdminTargets({});
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
      query(collectionGroup(db, 'entries'), orderBy('createdAt', 'desc')),
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
        const next: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          next[d.id] = Number(d.data()?.monthlyTarget || 0);
        });
        setAdminTargets(next);
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

  // ── Calendar iCal fetch (fetches when Today tab is active)
  useEffect(() => {
    if (activeTab !== 'today') return;
    const urls: { url: string; brand: 'y8' | 'pv' }[] = [];
    if (calY8Url) urls.push({ url: calY8Url, brand: 'y8' });
    if (calPvUrl) urls.push({ url: calPvUrl, brand: 'pv' });
    if (!urls.length) return;
    setCalLoading(true);
    Promise.all(
      urls.map(({ url, brand }) =>
        fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
          .then(r => r.text())
          .then(t => parseIcal(t, brand))
          .catch(() => [] as CalEvent[])
      )
    )
      .then((results) => {
        const today = getTodayStr();
        setCalEvents(
          results
            .flat()
            .filter((ev) => dateToLocalStr(ev.start) === today)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
        );
      })
      .finally(() => setCalLoading(false));
  }, [activeTab, calY8Url, calPvUrl]);

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

  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') showToast('❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      else if (code === 'auth/user-not-found') showToast('❌ ไม่พบบัญชีนี้ ลองสมัครใหม่');
      else showToast('❌ เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  const handleEmailRegister = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast('✅ สมัครสมาชิกสำเร็จ');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') showToast('❌ อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบ');
      else if (code === 'auth/weak-password') showToast('❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      else showToast('❌ สมัครสมาชิกไม่สำเร็จ');
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

  const handleSaveNickname = async (nextNickname: string): Promise<boolean> => {
    if (!currentUser) return false;
    const cleaned = nextNickname.trim();
    if (!cleaned) {
      showToast('กรุณาใส่ชื่อเล่น');
      return false;
    }
    await setDoc(doc(db, 'users', currentUser.uid), {
      nickname: cleaned,
      role: resolveRoleByEmail(currentUser.email),
      isAdmin: isSuperAdminEmail(currentUser.email),
      updatedAt: Date.now(),
    }, { merge: true });
    setNicknameDraft(cleaned);
    setUserProfile((prev) => (prev ? { ...prev, nickname: cleaned } : prev));
    showToast('บันทึกชื่อเล่นแล้ว');
    return true;
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

  // ── Sheets Auto-Push (fire-and-forget, no-cors)
  const pushToSheetsWebhook = (entry: WorkEntry) => {
    if (!sheetsWebhookUrl) return;
    const task = kpiConfig[entry.groupId]?.tasks.find(t => t.id === entry.taskId);
    const nickname = (userProfile?.nickname || displayName).trim();
    const sheets = buildSheetNames(nickname, currentUser?.uid);
    const payload: Record<string, unknown> = {
      // New payload
      date:      entry.date,
      name:      entry.userName || displayName,
      group:     kpiConfig[entry.groupId]?.name || entry.groupId,
      taskId:    entry.taskId,
      taskName:  task?.name || '',
      quantity:  entry.quantity,
      unit:      task?.unit || '',
      credits:   entry.credits,
      notes:     entry.notes,
      canvaLink: entry.canvaLink || '',
      driveLink: entry.driveLink || (entry.attachments?.[0]?.link ?? ''),
      uid:       currentUser?.uid || '',
      email:     normalizeEmail(currentUser?.email),
      nickname,
      role:      userProfile?.role || 'custom',
      timestamp: new Date().toISOString(),
      // Multi-file attachments (GAS v2)
      attachments:      entry.attachments || [],
      attachmentsCount: entry.attachments?.length ?? 0,
      attachmentsLinks: entry.attachments?.map(a => a.link).join(' | ') ?? (entry.driveLink || ''),
      attachmentsNames: entry.attachments?.map(a => a.normalizedName).join(' | ') ?? '',
      // Backward-compatible fields (for legacy consumers)
      id:        entry.id,
      user:      entry.userName || displayName,
      groupName: kpiConfig[entry.groupId]?.name || entry.groupId,
      channel:   task?.channel || '',
      ownerKey:  sheets.ownerKey,
      masterSheetName:    sheets.masterSheetName,
      dashboardSheetName: sheets.dashboardSheetName,
    };

    if (!isOnline) {
      enqueueWebhook(payload);
      showToast('บันทึกแล้ว (คิวส่งชีตหลังออนไลน์)');
      return;
    }

    fetch(sheetsWebhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      enqueueWebhook(payload);
      showToast('บันทึกแล้ว (ส่งชีตไม่สำเร็จ, เข้า Queue)');
    });
  };

  useEffect(() => {
    if (!currentUser || !sheetsWebhookUrl || !isOnline) return;
    const queue = getWebhookQueue();
    if (!queue.length) return;

    const flush = async () => {
      const remaining: Record<string, unknown>[] = [];
      for (const payload of queue) {
        try {
          await fetch(sheetsWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch {
          remaining.push(payload);
        }
      }
      setWebhookQueue(remaining);
      setSyncQueueCount(remaining.length);
      if (remaining.length === 0) showToast('ส่งข้อมูลค้างไปชีตเรียบร้อย ✓');
    };

    void flush();
  }, [currentUser, sheetsWebhookUrl, isOnline]);

  // ── Ordered group keys — always sorted alphabetically (A → B → C → D)
  const orderedGroupKeys = useMemo(
    () => Object.keys(kpiConfig).sort(),
    [kpiConfig]
  );

  const visibleLogGroupKeys = useMemo(
    () =>
      orderedGroupKeys.filter((key) => {
        if (logBrandMode === 'all') return true;
        return kpiConfig[key]?.brands?.includes(logBrandMode) ?? false;
      }),
    [kpiConfig, logBrandMode, orderedGroupKeys]
  );

  const logBrandModeLabel = logBrandMode === 'all' ? 'All' : logBrandMode.toUpperCase();

  // ── Admin: delete user data from Firestore + notify webhook
  const handleDeleteAdminUser = async (uid: string, nickname: string) => {
    if (uid === currentUser?.uid) { showToast('ไม่สามารถลบตัวเองได้'); return; }
    if (!window.confirm(`ลบผู้ใช้ "${nickname}" ออกจากระบบ?\n\nข้อมูลทั้งหมดจะถูกลบถาวร\n(Firebase Auth ยังอยู่ แต่ไม่มีข้อมูลใดๆ)`)) return;
    try {
      // 1. ลบ entries subcollection
      const entriesSnap = await getDocs(collection(db, 'users', uid, 'entries'));
      await Promise.all(entriesSnap.docs.map(d => deleteDoc(d.ref)));
      // 2. ลบ kpiConfig
      await deleteDoc(doc(db, 'kpiConfigs', uid));
      // 3. ลบ user profile doc
      await deleteDoc(doc(db, 'users', uid));
      // 4. Fire webhook notification (fire-and-forget, no-cors)
      if (sheetsWebhookUrl) {
        fetch(sheetsWebhookUrl, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_user', uid, nickname,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
      showToast(`ลบผู้ใช้ "${nickname}" แล้ว ✓`);
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + (err as Error).message);
    }
  };

  // ── Derived state
  const currentTask = useMemo(() => {
    const fallbackGroupKey = visibleLogGroupKeys[0] || orderedGroupKeys[0];
    const group = kpiConfig[selectedGroup] || (fallbackGroupKey ? kpiConfig[fallbackGroupKey] : undefined);
    if (!group) return undefined;
    return group.tasks.find((t) => t.id === selectedTaskId) || group.tasks[0];
  }, [kpiConfig, orderedGroupKeys, selectedGroup, selectedTaskId, visibleLogGroupKeys]);

  const displayName =
    userProfile?.nickname?.trim() ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'User';

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
    const now = new Date();
    const profileByUid = new Map<string, UserProfile>(adminProfiles.map((p) => [p.uid, p]));
    const monthEntries = adminEntries.filter((e) => {
      try {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
      ...Object.keys(adminTargets),
    ]);

    return Array.from(allUserIds)
      .map((uid) => {
        const profile = profileByUid.get(uid);
        const target = adminTargets[uid] || 0;
        const credits = byUser[uid]?.credits || 0;
        const count = byUser[uid]?.count || 0;
        return {
          uid,
          nickname: profile?.nickname || profile?.displayName || uid.slice(0, 6),
          role: profile?.role || 'custom',
          target,
          credits,
          count,
          percent: Math.round(safePercent(credits, target)),
        };
      })
      .sort((a, b) => b.credits - a.credits);
  }, [adminEntries, adminProfiles, adminTargets]);

  // ── CRUD handlers
  const handleAddEntry = async () => {
    if (!currentUser || !currentTask) return;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    const newEntry: WorkEntry = {
      id,
      date:      selectedDate,
      user:      currentUser.uid,
      userName:  displayName,
      groupId:   selectedGroup,
      taskId:    selectedTaskId,
      quantity,
      credits:   quantity * currentTask.creditPerUnit,
      notes,
      createdAt: Date.now(),
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
      setQuantity(1);
      setNotes('');
      setCanvaLink('');
      setDriveLink('');
      setLogAttachments([]);
      setPendingLocalFiles([]);
      pushToSheetsWebhook(newEntry);
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
    const updated = { ...editEntry, credits: editEntry.quantity * task.creditPerUnit };
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'entries', updated.id), updated);
      setEditEntry(null);
      showToast('อัปเดตแล้ว');
    } catch (e) {
      console.error(e);
      showToast('❌ อัปเดตไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', id));
      setDeleteId(null);
      showToast('ลบเรียบร้อย');
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
    if (!geminiApiKey.trim()) { showToast('ใส่ Gemini API Key ใน Settings ก่อน'); return; }
    setGeminiLoading(true);
    setGeminiResult('');
    setShowGemini(true);
    try {
      const monthName = getMonthNameThai(summaryMonth);
      const role = userProfile ? (ROLE_DEFAULTS[userProfile.role]?.meta.label || userProfile.role) : '';
      const groupLines = summaryData.groups.map(g =>
        `  - ${g.name}: ${g.credits} Credits`
      ).join('\n');
      const prompt =
        `คุณเป็น KPI Analyst ผู้เชี่ยวชาญ วิเคราะห์ผลการทำงาน KPI ต่อไปนี้และสรุปเป็น**ภาษาไทย** สั้น ชัด อ่านง่าย ใน 3-5 ประโยค:\n\n` +
        `ชื่อ: ${displayName} | ตำแหน่ง: ${role}\n` +
        `เดือน: ${monthName} ${summaryYear}\n` +
        `ผลรวม: ${summaryData.totalCredits} / ${monthlyTarget} Credits (${Math.round(summaryData.percent)}%)\n` +
        `จำนวนงาน: ${summaryData.entryCount} รายการ\n` +
        `แยกตามกลุ่ม:\n${groupLines || '  (ยังไม่มีข้อมูล)'}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
      setGeminiResult(data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถสรุปได้ในขณะนี้');
    } catch {
      setGeminiResult('❌ เชื่อมต่อ Gemini ไม่สำเร็จ ตรวจสอบ API Key และการเชื่อมต่ออินเทอร์เน็ต');
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

  // ── Render guards
  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!currentUser) return <SignInScreen onSignIn={handleSignIn} onEmailSignIn={handleEmailSignIn} onEmailRegister={handleEmailRegister} loading={signInLoading} toast={toast} />;
  if (!userProfile) return <LoadingScreen />;
  if (!userProfile.nickname?.trim()) {
    return (
      <NicknameSetupScreen
        defaultValue={currentUser.displayName?.split(' ')[0] || ''}
        onSave={handleSaveNickname}
      />
    );
  }

  const todayEntries   = entries.filter((e) => e.user === currentUser.uid && e.date === getTodayStr());
  const historyEntries = entries.filter((e) => e.user === currentUser.uid);
  const historyDates   = Array.from<string>(new Set(historyEntries.map((e) => e.date))).sort((a, b) => b.localeCompare(a));

  // ─── MAIN APP ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#FDFAF7] text-[#2C2A28] relative overflow-hidden" style={{ height: '100dvh' }}>
      <Toast {...toast} />

      {/* KPI Editor (Phase 5) */}
      {showKpiEditor && (
        <KpiEditor
          config={kpiConfig}
          monthlyTarget={monthlyTarget}
          onSave={handleSaveKpiConfig}
          onClose={() => setShowKpiEditor(false)}
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

          <div className="space-y-2">
            {/* Space Sheet */}
            <button
              onClick={handleExportSpaceSheet}
              className="w-full py-3.5 bg-gradient-to-r from-[#F4823C] to-[#F5A855] text-white rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2.5 active:scale-95 transition-all glow-orange shadow-sm"
            >
              <Sparkles size={16} /> Space Sheet (.CSV for Sheets)
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCsv}
                className="py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
              >
                <Download size={15} /> CSV (Excel)
              </button>
              <button
                onClick={handleExportTxt}
                className="py-3.5 bg-[#2C2A28] text-white rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
              >
                <FileText size={15} /> TXT Report
              </button>
            </div>
          </div>
          <p className="text-center text-[9px] text-slate-300">Space Sheet = CSV ที่ออกแบบสำหรับ Google Sheets โดยเฉพาะ</p>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="space-y-4">
          {/* Firebase Status */}
          <div className={`px-4 py-3.5 rounded-2xl border flex items-center gap-3 ${isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            {isOnline
              ? <Wifi size={16} className="text-emerald-500 shrink-0" />
              : <WifiOff size={16} className="text-rose-400 shrink-0" />
            }
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-rose-400'}`}>
                Firebase Firestore
              </p>
              <p className="text-[12px] font-semibold text-[#2C2A28]">
                {isOnline ? 'เชื่อมต่อแล้ว · jartrack-y8pv' : 'ไม่มีสัญญาณอินเตอร์เน็ต'}
              </p>
            </div>
          </div>

          {/* Google Account info */}
          <div className="px-4 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="avatar"
                className="w-10 h-10 rounded-full shrink-0 object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <UserCircle size={22} className="text-blue-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Google Account</p>
              <p className="text-[14px] font-bold text-[#2C2A28] truncate">{currentUser.displayName || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              ชื่อเล่น (ใช้ตั้งชื่อ Sheet / Report)
            </label>
            <input
              type="text"
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              maxLength={40}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] outline-none"
              placeholder="เช่น Gift"
            />
          </div>

          {/* Custom title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              ชื่อตำแหน่ง (แสดงบนแอพ)
            </label>
            <input
              type="text"
              value={customTitleDraft}
              onChange={(e) => setCustomTitleDraft(e.target.value)}
              maxLength={40}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold outline-none"
              placeholder={ROLE_DEFAULTS[userProfile?.role || '']?.meta.label || 'ตำแหน่งงาน...'}
            />
          </div>

          {/* Google Sheet URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Google Sheet URL</label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] outline-none"
              placeholder="https://docs.google.com/..."
            />
          </div>

          {/* Sheets Auto-Push — status for all / edit for admin */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Sheets Auto-Push <span className="font-normal normal-case">(Google Apps Script)</span>
            </label>
            {isSuperAdmin ? (
              <>
                <input
                  type="text"
                  value={sheetsWebhookUrl}
                  onChange={(e) => setSheetsWebhookUrl(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] outline-none"
                  placeholder="https://script.google.com/macros/s/..."
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(GAS_TEMPLATE).then(() => showToast('คัดลอก GAS Template v3 แล้ว ✓'));
                  }}
                  className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5 active:bg-orange-50 transition-colors"
                >
                  📋 Copy GAS Template v3 (Apps Script)
                </button>
              </>
            ) : (
              <div className={`px-4 py-3 rounded-2xl border flex items-center gap-2.5 ${sheetsWebhookUrl ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[15px]">{sheetsWebhookUrl ? '✅' : '⏸'}</span>
                <div>
                  <p className={`text-[11px] font-bold ${sheetsWebhookUrl ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {sheetsWebhookUrl ? 'เชื่อมต่อ Google Sheets แล้ว' : 'ยังไม่ได้ตั้งค่า Webhook'}
                  </p>
                  <p className="text-[9px] text-slate-400">ตั้งค่าโดย Admin · ไม่ต้องดำเนินการเพิ่มเติม</p>
                </div>
              </div>
            )}
          </div>

          {/* Google Drive Attachment */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Google Drive Attachments
            </label>
            <button
              onClick={handleConnectGoogleDrive}
              className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5 active:bg-emerald-50 transition-colors"
            >
              <Upload size={13} />
              {googleAccessToken && Date.now() < googleAccessTokenExpiry
                ? 'เชื่อม Google Drive แล้ว'
                : 'เชื่อม Google Drive เพื่ออัปโหลดไฟล์'}
            </button>
            <input
              type="text"
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] outline-none"
              placeholder="Drive Folder ID (ไม่บังคับ)"
            />
            {driveFolderId.trim() && (
              <button
                onClick={() => window.open(`https://drive.google.com/drive/folders/${driveFolderId.trim()}`, '_blank')}
                className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5 active:bg-emerald-50 transition-colors"
              >
                <ExternalLink size={13} /> เปิดโฟลเดอร์ Drive ที่ตั้งไว้
              </button>
            )}
            <div className={`px-3.5 py-3 rounded-xl border ${firebaseConfigHealthy ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-start gap-2.5">
                {firebaseConfigHealthy ? (
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${firebaseConfigHealthy ? 'text-emerald-600' : 'text-amber-700'}`}>
                    Drive Preflight
                  </p>
                  <p className="text-[11px] text-slate-600 break-all">Project: {runtimeProjectId || '(missing)'}</p>
                  <p className="text-[11px] text-slate-600 break-all">Auth Domain: {runtimeAuthDomain || '(missing)'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    ค่าที่คาดหวัง: {EXPECTED_FIREBASE_PROJECT} / {EXPECTED_FIREBASE_AUTH_DOMAIN}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <button
                  onClick={() => window.open('https://console.cloud.google.com/apis/library/drive.googleapis.com?project=jartrack-y8pv', '_blank')}
                  className="py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600"
                >
                  Drive API
                </button>
                <button
                  onClick={() => window.open('https://console.cloud.google.com/apis/credentials/consent?project=jartrack-y8pv', '_blank')}
                  className="py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600"
                >
                  OAuth Screen
                </button>
              </div>
            </div>
          </div>

          {/* Google Calendar iCal — Y8 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#F4823C' }}>
              Google Calendar iCal · Y8
            </label>
            <input
              type="text"
              value={calY8Url}
              onChange={(e) => setCalY8Url(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] outline-none"
              placeholder="https://calendar.google.com/calendar/ical/...ics"
            />
          </div>

          {/* Google Calendar iCal — PV */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#E87AA5' }}>
              Google Calendar iCal · PV
            </label>
            <input
              type="text"
              value={calPvUrl}
              onChange={(e) => setCalPvUrl(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] outline-none"
              placeholder="https://calendar.google.com/calendar/ical/...ics"
            />
          </div>

          {/* Role Badge */}
          {userProfile && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">{ROLE_EMOJI[userProfile.role] || '⚙️'}</span>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ตำแหน่ง</p>
                  <p className="text-[13px] font-bold text-[#2C2A28]">
                    {ROLE_DEFAULTS[userProfile.role]?.meta.label || userProfile.role}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target/เดือน</p>
                <p className="text-[13px] font-bold text-[#F4823C]">{monthlyTarget} Cr.</p>
              </div>
            </div>
          )}

          <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-[11px] text-amber-700">
            Role ถูกกำหนดตามอีเมลอัตโนมัติ: host = Graphic Designer, info.nakoleo = Art Director (Admin), อื่นๆ = Custom
          </div>

          {/* KPI Config button (Phase 4/5) */}
          <button
            onClick={() => { setShowSettings(false); setShowKpiEditor(true); }}
            className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-[13px] text-[#2C2A28] flex items-center justify-center gap-2.5 active:bg-orange-50 transition-colors"
          >
            <Sliders size={15} /> จัดการ KPI Config (Role ของฉัน)
          </button>

          {/* Drive folder manager button */}
          {driveFolderId.trim() && (
            <button
              onClick={() => setShowDriveTreeModal(true)}
              className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-[13px] text-[#2C2A28] flex items-center justify-center gap-2.5 active:bg-green-50 transition-colors"
            >
              <FolderOpen size={15} /> จัดการโฟลเดอร์ Drive
            </button>
          )}

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#7C3AED' }}>
              🤖 Gemini API Key (สำหรับ AI Summary)
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] outline-none"
              placeholder="AIza... (จาก Google AI Studio)"
            />
            <p className="text-[10px] text-slate-400">
              รับฟรีที่ <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline text-violet-500">aistudio.google.com/apikey</a>
            </p>
          </div>

          {/* ── Auto-hover toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[12px] font-bold text-[#2C2A28]">แสดงงานอัตโนมัติเมื่อ hover</p>
              <p className="text-[9px] text-slate-400">เลื่อนเมาส์บนกลุ่ม → งานแสดงทันที</p>
            </div>
            <button
              onClick={() => setAutoHoverExpand(v => !v)}
              className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
              style={{ background: autoHoverExpand ? '#F4823C' : '#E2E8F0' }}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: autoHoverExpand ? '1.375rem' : '0.25rem' }}
              />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSignOut}
              className="flex-1 py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold text-[13px] border border-rose-100 flex items-center justify-center gap-2"
            >
              <LogOut size={15} /> Logout
            </button>
            <button
              onClick={async () => {
                if (!currentUser) return;
                const ok = await handleSaveNickname(nicknameDraft);
                if (!ok) return;
                localStorage.setItem(scopedKey(currentUser.uid, 'sheet_url'), sheetUrl.trim());
                // Only super admin can override the webhook URL
                if (isSuperAdmin) {
                  localStorage.setItem(scopedKey(currentUser.uid, 'sheets_webhook'), sheetsWebhookUrl.trim());
                }
                localStorage.setItem(scopedKey(currentUser.uid, 'gemini_api_key'), geminiApiKey.trim());
                // ── Persist settings + customTitle to Firestore
                try {
                  const titleVal = customTitleDraft.trim() || null;
                  await setDoc(doc(db, 'users', currentUser.uid), {
                    customTitle: titleVal,
                    settings: {
                      autoHoverExpand,
                      calY8Url:      calY8Url.trim(),
                      calPvUrl:      calPvUrl.trim(),
                      driveFolderId: driveFolderId.trim(),
                      sheetUrl:      sheetUrl.trim(),
                    },
                    updatedAt: Date.now(),
                  }, { merge: true });
                  setUserProfile(prev => prev ? { ...prev, customTitle: titleVal || undefined,
                    settings: { autoHoverExpand, calY8Url: calY8Url.trim(), calPvUrl: calPvUrl.trim(),
                      driveFolderId: driveFolderId.trim(), sheetUrl: sheetUrl.trim() } } : prev);
                } catch { /* non-critical */ }
                setShowSettings(false);
                showToast('บันทึก Config แล้ว');
              }}
              className="flex-[2] py-4 text-white rounded-2xl font-bold text-[13px] glow-orange"
              style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="px-5 pt-[calc(3.25rem+env(safe-area-inset-top))] pb-5 header-gradient shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-4">
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
              {syncQueueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-black text-white leading-none">{syncQueueCount > 9 ? '9+' : syncQueueCount}</span>
                </span>
              )}
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
      </header>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 pb-[calc(7rem+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100/80">
              <div className="flex items-center gap-2 mb-5">
                <CalendarIcon size={14} className="text-slate-300" />
                <h3 className="font-bold text-[#2C2A28] text-[11px] uppercase tracking-widest">บันทึกงานใหม่</h3>
              </div>

              <div className="space-y-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">วันที่</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl font-semibold text-[#2C2A28] text-[13px] outline-none"
                  />
                </div>

                {/* Group + Task — Expand/Collapse with animation */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">กลุ่มงาน</label>
                  <div className="space-y-2">
                    {orderedGroupKeys.map((key) => {
                      const grp        = kpiConfig[key];
                      const isActive   = selectedGroup === key;
                      const isExpanded = expandedGroups.has(key) || (autoHoverExpand && hoveredGroup === key);
                      const hasY8 = grp.brands?.includes('y8');
                      const hasPv = grp.brands?.includes('pv');
                      const brandLabel = hasY8 && hasPv ? 'Y8-PV' : hasY8 ? 'Y8' : hasPv ? 'PV' : null;
                      const brandBg    = hasY8 && hasPv ? 'linear-gradient(90deg,#FEF3E2,#FDE8F2)' : hasY8 ? '#FEF3E2' : '#FDE8F2';
                      const brandColor = hasY8 && hasPv ? '#9D5C1A' : hasY8 ? '#F4823C' : '#E87AA5';
                      return (
                        <div key={key}
                          className="rounded-[16px] overflow-hidden border transition-all duration-200"
                          style={{ borderColor: isActive ? grp.color : 'rgb(241 245 249)', background: isActive ? grp.bg : 'white' }}
                          onMouseEnter={() => autoHoverExpand && setHoveredGroup(key)}
                          onMouseLeave={() => autoHoverExpand && setHoveredGroup(null)}
                        >
                          {/* Group header — click = toggle expand + set selectedGroup */}
                          <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                            onClick={() => {
                              setSelectedGroup(key);
                              setSelectedTaskId(grp.tasks[0]?.id || '');
                              setExpandedGroups(prev => {
                                const s = new Set(prev);
                                s.has(key) ? s.delete(key) : s.add(key);
                                return s;
                              });
                            }}
                          >
                            <span className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                              style={{ background: grp.color }}>
                              {grp.icon || key.slice(0, 1)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[12px] font-bold text-[#2C2A28] truncate">{grp.name}</p>
                                {brandLabel && (
                                  <span className="text-[7px] px-1.5 py-0.5 rounded font-bold shrink-0"
                                    style={{ background: brandBg, color: brandColor }}>
                                    {brandLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400">{grp.tasks.length} งาน</p>
                            </div>
                            <ChevronDown size={14}
                              className="text-slate-300 shrink-0 transition-transform duration-200"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                          </button>

                          {/* Task list — smooth height animation */}
                          <div style={{
                            maxHeight: isExpanded ? `${grp.tasks.length * 80 + 60}px` : '0px',
                            overflow: 'hidden',
                            transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                          }}>
                            <div className="px-3 pb-2.5 space-y-1.5 border-t" style={{ borderColor: `${grp.color}33` }}>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pt-2">เลือกงาน</p>
                              {grp.tasks.map((t) => (
                                <button key={t.id}
                                  onClick={() => { setSelectedTaskId(t.id); setSelectedGroup(key); }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left"
                                  style={{
                                    background: selectedTaskId === t.id && isActive ? grp.color : 'white',
                                    color: selectedTaskId === t.id && isActive ? 'white' : '#2C2A28',
                                    border: `1px solid ${selectedTaskId === t.id && isActive ? grp.color : 'rgb(241 245 249)'}`,
                                  }}>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black opacity-70 mr-1">[{t.id}]</span>
                                    <span className="text-[12px] font-semibold">{t.name}</span>
                                  </div>
                                  <span className="shrink-0 text-[11px] font-black ml-2 opacity-80">
                                    {t.creditPerUnit} Cr/{t.unit}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity + Credits */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      จำนวน ({currentTask?.unit})
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="flex-1 text-center text-[22px] font-black text-[#2C2A28]">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-11 h-11 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Credits</label>
                    <div className="h-11 px-4 rounded-xl flex items-center justify-center gap-1 min-w-[76px]" style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}>
                      <span className="text-[22px] font-light text-white">{quantity * (currentTask?.creditPerUnit || 1)}</span>
                      <span className="text-[9px] text-white/60 mt-1">Cr.</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    หมายเหตุ <span className="normal-case font-normal">(ไม่บังคับ)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เพิ่มรายละเอียด..."
                    rows={2}
                    className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none resize-none text-[#2C2A28] placeholder:text-slate-300"
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    📎 แนบงาน <span className="normal-case font-normal opacity-60">(ไม่บังคับ)</span>
                  </label>

                  {/* Canva link */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded pointer-events-none" style={{ background: '#7C3AED' }}>C</span>
                    <input
                      type="url"
                      value={canvaLink}
                      onChange={(e) => setCanvaLink(e.target.value)}
                      placeholder="Canva link..."
                      className="w-full pl-9 pr-4 py-2.5 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none text-[#2C2A28] placeholder:text-slate-300"
                    />
                  </div>

                  {/* Drive link */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded pointer-events-none" style={{ background: '#1D6F42' }}>D</span>
                    <input
                      type="url"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="Google Drive link..."
                      className="w-full pl-9 pr-4 py-2.5 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none text-[#2C2A28] placeholder:text-slate-300"
                    />
                  </div>

                  {/* Uploaded Drive file chips */}
                  {logAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {logAttachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 max-w-full">
                          <span className="text-[9px] font-bold text-emerald-700 truncate" style={{ maxWidth: 160 }} title={att.normalizedName}>
                            {att.normalizedName}
                          </span>
                          <button type="button" onClick={() => setLogAttachments(prev => prev.filter((_, j) => j !== i))} className="text-emerald-300 active:text-rose-400 ml-1 text-[12px] leading-none shrink-0">×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons — single row */}
                  <input ref={logDriveInputRef} type="file" multiple className="hidden" onChange={(e) => handleDriveFilesSelected(e, 'log')} />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => logDriveInputRef.current?.click()}
                      disabled={driveUploading}
                      className={`py-2.5 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5 active:bg-emerald-50 transition-colors ${driveUploading ? 'opacity-60' : ''}`}
                    >
                      {driveUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                      {driveUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด Drive'}
                    </button>
                    <button
                      onClick={() => { void handlePickLocalFile(); }}
                      className="py-2.5 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5 active:bg-teal-50 transition-colors"
                    >
                      <FileText size={13} /> ไฟล์ในเครื่อง
                    </button>
                  </div>

                  {/* Pending local file chips */}
                  {pendingLocalFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pendingLocalFiles.map((lf, i) => (
                        <div key={i} className="flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-lg px-2 py-1 max-w-full">
                          {lf.thumbnail && <img src={lf.thumbnail} className="w-4 h-4 rounded object-cover shrink-0" alt="" />}
                          <span className="text-[9px] font-bold text-teal-700 truncate" style={{ maxWidth: 120 }} title={lf.name}>{lf.name}</span>
                          <button type="button" onClick={() => setPendingLocalFiles(prev => prev.filter((_, j) => j !== i))} className="text-teal-300 active:text-rose-400 ml-1 text-[12px] leading-none shrink-0">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddEntry}
                  disabled={isLoading}
                  className={`w-full py-4 text-white rounded-xl font-bold text-[13px] tracking-[0.15em] shadow-md active:scale-95 transition-all glow-orange ${isLoading ? 'opacity-60' : ''}`}
                  style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}
                >
                  {isLoading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : 'บันทึกข้อมูล'}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] px-1">
              {formatThaiDate(getTodayStr(), true)}
            </p>
            {todayEntries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-slate-200">
                <Clock size={26} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีรายการวันนี้</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayEntries.map((e) => (
                  <EntryCard key={e.id} entry={e} workGroups={kpiConfig} onEdit={setEditEntry} onDelete={setDeleteId} onShowToast={showToast} />
                ))}
              </div>
            )}

            {/* ── Calendar Events (shown only when iCal URL is configured) */}
            {(calY8Url || calPvUrl) && (
              <div className="mt-2">
                <button
                  onClick={() => setShowCalSection(s => !s)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-[18px] border border-slate-100 shadow-sm active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="text-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">กำหนดการ</span>
                    {calLoading && <span className="text-[9px] text-slate-300 pulse-soft ml-1">กำลังโหลด...</span>}
                  </div>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform duration-200 ${showCalSection ? 'rotate-180' : ''}`} />
                </button>
                {showCalSection && (
                  <div className="mt-2 space-y-2 animate-in fade-in duration-200">
                    {calEvents.length === 0 && !calLoading ? (
                      <p className="text-center text-[10px] text-slate-300 py-4">ไม่มีกำหนดการวันนี้</p>
                    ) : (
                      calEvents.map(ev => (
                        <div
                          key={ev.uid}
                          className="flex items-start gap-3 px-4 py-3 bg-white rounded-[16px] border shadow-sm"
                          style={{ borderColor: ev.brand === 'y8' ? 'rgba(244,130,60,0.25)' : 'rgba(232,122,165,0.25)' }}
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ background: ev.brand === 'y8' ? '#F4823C' : '#E87AA5' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#2C2A28] text-[12px] leading-tight">{ev.title}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {ev.start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              {' – '}
                              {ev.end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded text-white shrink-0"
                            style={{ background: ev.brand === 'y8' ? '#F4823C' : '#E87AA5' }}
                          >
                            {ev.brand.toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {historyDates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-slate-200">
                <History size={26} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีประวัติ</p>
              </div>
            ) : (
              historyDates.map((date) => {
                const dayEntries = historyEntries.filter((e) => e.date === date);
                const dayTotal   = dayEntries.reduce((s, e) => s + e.credits, 0);
                return (
                  <div key={date} className="space-y-2.5">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        {formatThaiDate(date, true)}
                      </p>
                      <span className="text-[11px] font-bold text-[#F4823C]">{dayTotal} Cr.</span>
                    </div>
                    {dayEntries.map((e) => (
                      <EntryCard key={e.id} entry={e} workGroups={kpiConfig} onEdit={setEditEntry} onDelete={setDeleteId} onShowToast={showToast} />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Month Navigator */}
            <div className="flex items-center justify-between bg-white rounded-[18px] p-1.5 border border-slate-100 shadow-sm">
              <button
                onClick={() => navSummaryMonth(-1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 active:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <p className="font-bold text-[#2C2A28] text-[14px]">{summaryData.monthName}</p>
                <p className="text-[10px] text-slate-400">{summaryYear}</p>
              </div>
              <button
                onClick={() => navSummaryMonth(1)}
                disabled={isAtCurrentMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 active:bg-slate-50 disabled:opacity-25 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Main Progress Card */}
            <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                  <div className="flex items-end gap-2">
                    <p className="text-[38px] font-light text-[#2C2A28] leading-none">{summaryData.totalCredits}</p>
                    <p className="text-[14px] text-slate-300 mb-0.5">/ {monthlyTarget} Cr.</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${summaryData.isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                    {summaryData.isTargetSet
                      ? (summaryData.isComplete ? '✓ ถึงเป้าแล้ว' : `${Math.round(summaryData.percent)}%`)
                      : 'ยังไม่ตั้งเป้า'}
                  </div>
                  <p className="text-[9px] text-slate-300 mt-1.5">{summaryData.entryCount} รายการ</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${summaryData.percent}%`,
                    backgroundColor: summaryData.isComplete ? '#34d399' : '#F4823C',
                  }}
                />
              </div>
            </section>

            {/* Daily Progress (current month, not complete) */}
            {summaryData.isCurrentMonth && summaryData.isTargetSet && !summaryData.isComplete && (
              <section className="bg-[#2C2A28] px-5 py-4 rounded-[24px] shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-[#F4823C]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">ต้องทำต่อวัน</p>
                    <p className="text-white font-bold leading-none mt-0.5">
                      <span className="text-[24px] font-light">{summaryData.dailyNeeded}</span>
                      <span className="text-[12px] ml-1 text-white/50">Cr./วัน</span>
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">เหลืออีก</p>
                    <p className="text-white font-bold leading-none mt-0.5">
                      <span className="text-[24px] font-light">{summaryData.remainingCredits}</span>
                      <span className="text-[12px] ml-1 text-white/50">Cr.</span>
                    </p>
                    <p className="text-[9px] text-white/40 mt-1">{summaryData.remainingDays} วันที่เหลือ</p>
                  </div>
                </div>
              </section>
            )}

            {/* Group Breakdown */}
            {summaryData.groups.length > 0 ? (
              <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} className="text-slate-300" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สัดส่วนงาน</p>
                </div>
                <div className="space-y-4">
                  {summaryData.groups.map((g) => (
                    <GroupBar
                      key={g.key}
                      groupKey={g.key}
                      name={g.name}
                      credits={g.credits}
                      maxCredits={summaryData.maxGroupCredits}
                      color={g.color}
                      bg={g.bg}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
                <BarChart3 size={26} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ไม่มีข้อมูลในเดือนนี้</p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => void handleExportToGoogleSheets()}
                disabled={sheetsExporting}
                className="py-5 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
              >
                {sheetsExporting
                  ? <RefreshCw size={18} className="animate-spin text-emerald-400" />
                  : <FileText size={18} className="text-emerald-500" />}
                <span className="font-bold text-[9px] tracking-widest text-[#2C2A28] uppercase">
                  {sheetsExporting ? 'กำลังส่ง...' : 'Google Sheet'}
                </span>
              </button>
              <button
                onClick={() => void handleGeminiSummary()}
                className="py-5 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Sparkles size={18} className={geminiLoading ? 'animate-spin text-violet-400' : 'text-violet-500'} />
                <span className="font-bold text-[9px] tracking-widest text-[#2C2A28] uppercase">Gemini AI</span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="py-5 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download size={18} className="text-sky-500" />
                <span className="font-bold text-[9px] tracking-widest text-[#2C2A28] uppercase">Export</span>
              </button>
            </div>

            {/* Gemini AI Result Panel */}
            {showGemini && (
              <section className="bg-white p-5 rounded-[24px] border border-violet-100 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-500" />
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Gemini AI Summary</p>
                  </div>
                  <button onClick={() => setShowGemini(false)} className="text-slate-300 hover:text-slate-500">
                    <X size={16} />
                  </button>
                </div>
                {geminiLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-[12px]">
                    <RefreshCw size={14} className="animate-spin" />
                    กำลังวิเคราะห์...
                  </div>
                ) : (
                  <p className="text-[13px] text-[#2C2A28] leading-relaxed whitespace-pre-wrap">{geminiResult}</p>
                )}
                {!geminiLoading && geminiResult && (
                  <button
                    onClick={() => { void navigator.clipboard.writeText(geminiResult); showToast('คัดลอกแล้ว ✓'); }}
                    className="mt-3 w-full py-2 bg-violet-50 rounded-xl text-[11px] font-bold text-violet-600 active:bg-violet-100 transition-colors"
                  >
                    📋 คัดลอกข้อความ
                  </button>
                )}
              </section>
            )}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && isSuperAdmin && (
          <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Overview</p>
              <p className="text-[20px] font-light text-[#2C2A28]">{adminProfiles.length} Users ทั้งหมด</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Active เดือนนี้ {adminSummary.length} คน · รวม {adminEntries.length} รายการ
              </p>
            </section>

            {adminLoading ? (
              <div className="text-center py-10 text-slate-300 text-[11px] font-bold uppercase tracking-widest">
                กำลังโหลดข้อมูลรวม...
              </div>
            ) : adminProfiles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
                <UserCircle size={26} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีผู้ใช้ในระบบ</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {adminProfiles.map((profile, idx) => {
                  const summary = adminSummary.find(r => r.uid === profile.uid);
                  const isSelf  = profile.uid === currentUser?.uid;
                  return (
                    <div key={profile.uid} className="bg-white px-4 py-3.5 rounded-[18px] border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-[#2C2A28] truncate">
                            {idx + 1}. {profile.nickname || profile.displayName || profile.email}
                            {isSelf && <span className="ml-1.5 text-[9px] font-bold text-[#F4823C] bg-orange-50 px-1.5 py-0.5 rounded-full">YOU</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {ROLE_EMOJI[profile.role] || '⚙️'} {ROLE_DEFAULTS[profile.role]?.meta.label || profile.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-[14px] font-bold text-[#F4823C]">{summary?.credits ?? 0} Cr.</p>
                            <p className="text-[9px] text-slate-300">
                              {summary ? `${summary.count} รายการ · ${summary.percent}%` : 'ไม่มีข้อมูลเดือนนี้'}
                            </p>
                          </div>
                          {/* Delete button — hidden for self */}
                          {!isSelf && (
                            <button
                              onClick={() => void handleDeleteAdminUser(profile.uid, profile.nickname || profile.displayName || profile.email)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-400 active:bg-rose-100 transition-colors shrink-0"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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

      {/* ─── DRIVE FOLDER TREE MODAL ────────────────────────────────────────── */}
      <Modal isOpen={showDriveTreeModal} onClose={() => setShowDriveTreeModal(false)} title="📁 โครงสร้างโฟลเดอร์ Drive">
        <div className="px-6 pb-8 space-y-4 overflow-y-auto">
          <p className="text-[11px] text-slate-400">โครงสร้างโฟลเดอร์ใน Google Drive — ไฟล์ที่อัปโหลดจะถูกจัดเรียงตามกลุ่มงาน/แบรนด์/เดือนโดยอัตโนมัติ:</p>

          {/* Tree preview */}
          <div className="bg-slate-50 rounded-2xl p-4 font-mono text-[11px] space-y-1 overflow-x-auto">
            <p className="font-bold text-[#2C2A28]">📁 Drive Root</p>
            {orderedGroupKeys.map((key, i) => {
              const grp    = kpiConfig[key];
              const isLast = i === orderedGroupKeys.length - 1;
              const hasY8  = grp.brands?.includes('y8');
              const hasPv  = grp.brands?.includes('pv');
              const singleBrand = (hasY8 && !hasPv) ? 'Y8' : (!hasY8 && hasPv) ? 'PV' : null;
              // When single brand: Root → Group → Brand → YYYY-MM
              // When multi/no brand: Root → Group → YYYY-MM
              const monthExample = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
              return (
                <div key={key} className="ml-3">
                  <p className="text-slate-600">{isLast ? '└──' : '├──'} 📁 {grp.name}</p>
                  {singleBrand ? (
                    // Single brand: Group → Brand → YYYY-MM
                    <div className="ml-6">
                      <p className="text-slate-500">└── 📁 {singleBrand}</p>
                      <div className="ml-6">
                        <p className="text-slate-400">└── 📁 {monthExample} <span className="text-slate-300">(สร้างอัตโนมัติเมื่ออัปโหลด)</span></p>
                      </div>
                    </div>
                  ) : (
                    // Multi/no brand: Group → YYYY-MM (+ show brand folders if both)
                    <>
                      {hasY8 && <p className="ml-6 text-slate-500">{hasPv ? '├──' : '└──'} 📁 Y8</p>}
                      {hasPv && <p className="ml-6 text-slate-500">├── 📁 PV</p>}
                      <div className="ml-6">
                        <p className="text-slate-400">{(hasY8 || hasPv) ? '└──' : '└──'} 📁 {monthExample} <span className="text-slate-300">(สร้างอัตโนมัติเมื่ออัปโหลด)</span></p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="space-y-2">
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-[10px] text-sky-700 leading-relaxed">
              ℹ️ ไฟล์ที่อัปโหลดจะถูกจัดเก็บตาม: <strong>กลุ่มงาน → แบรนด์ (ถ้ามีแบรนด์เดียว) → เดือน (YYYY-MM)</strong>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-700 leading-relaxed">
              ⚠️ ปุ่มยืนยันด้านล่างสร้างโครงสร้างหลักผ่าน GAS — โฟลเดอร์ YYYY-MM จะสร้างอัตโนมัติตอนอัปโหลดไฟล์ โฟลเดอร์เดิมและไฟล์จะไม่ถูกลบ
            </div>
          </div>

          {/* Confirm button */}
          <button
            disabled={driveTreeLoading}
            onClick={async () => {
              setDriveTreeLoading(true);
              try {
                await fetch(sheetsWebhookUrl, {
                  method: 'POST',
                  mode: 'no-cors',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'sync_drive_folders',
                    rootFolderId: driveFolderId.trim(),
                    groups: orderedGroupKeys.map(k => ({
                      key: k,
                      name: kpiConfig[k].name,
                      brands: kpiConfig[k].brands || [],
                      icon: kpiConfig[k].icon || k,
                    })),
                  }),
                });
                showToast('ส่งคำสั่งสร้างโฟลเดอร์ไปยัง GAS แล้ว ✓');
                setShowDriveTreeModal(false);
              } catch {
                showToast('เกิดข้อผิดพลาด กรุณาลองใหม่');
              }
              setDriveTreeLoading(false);
            }}
            className="w-full py-4 text-white rounded-2xl font-bold text-[13px] glow-orange disabled:opacity-60 transition-opacity active:opacity-80"
            style={{ background: 'linear-gradient(135deg, #1D6F42, #2EA84B)' }}
          >
            {driveTreeLoading ? 'กำลังส่ง...' : '✅ ยืนยันสร้าง/อัปเดตโฟลเดอร์'}
          </button>
        </div>
      </Modal>

      {/* ─── BOTTOM NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-100/80 z-[60] shadow-2xl flex flex-col items-center">
        <div className="flex items-center justify-around w-full px-3 pt-3 pb-2">
          <NavButton active={activeTab === 'log'}     onClick={() => setActiveTab('log')}     icon={<PlusCircle size={22} />} label="บันทึก" />
          <NavButton active={activeTab === 'today'}   onClick={() => setActiveTab('today')}   icon={<Clock size={22} />}      label="วันนี้" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={22} />}    label="ประวัติ" />
          <NavButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<BarChart3 size={22} />}  label="สรุป" />
          {isSuperAdmin && (
            <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<UserCircle size={22} />} label="Admin" />
          )}
        </div>
        <p className="text-[8px] text-slate-300/80 tracking-widest pb-[calc(0.4rem+env(safe-area-inset-bottom))]">
          © 2026 Young Age Corporation Co., Ltd. & Pharvia 2025 Co., Ltd.
        </p>
      </nav>
    </div>
  );
}
