
export type BrandId = 'y8' | 'pv';

export interface Task {
  id: string;
  name: string;
  desc?: string;
  creditPerUnit: number;
  avgMonthly?: number;
  unit: string;
  note?: string;
  channel?: string;
  related?: string;
  qtyConversion?: string;
  type?: 'fixed' | 'quality';
  brands?: BrandId[];        // which brand(s) this task belongs to
}

export interface WorkGroup {
  label?: string;
  name: string;
  color: string;
  bg: string;
  border?: string;
  icon?: string;              // custom emoji/symbol (fallback = group key letter)
  brands?: BrandId[];         // legacy group-level brand source / aggregate
  tasks: Task[];
}

export type WorkGroups = Record<string, WorkGroup>;

export interface DriveAttachment {
  originalName:   string;   // ชื่อไฟล์ต้นฉบับ
  normalizedName: string;   // ชื่อไฟล์ที่ normalize แล้ว เช่น A01_08032026_tontawan_01.jpg
  fileId:         string;   // Google Drive file ID
  link:           string;   // webViewLink
  mimeType:       string;   // MIME type ของไฟล์
}

// ─── LOCAL FILE REFERENCE ─────────────────────────────────────────────────────

export interface LocalFileRef {
  name:         string;    // ชื่อไฟล์
  size:         number;    // ขนาด bytes
  type:         string;    // MIME type
  lastModified: number;    // timestamp
  thumbnail?:   string;    // base64 JPEG thumbnail (สำหรับ image, สูงสุด 64x64px)
  idbKey:       string;    // key ใน IndexedDB สำหรับดึง FileSystemFileHandle กลับมา
}

export type EntrySyncAction = 'create' | 'update' | 'delete';
export type SheetSyncStatus = 'pending' | 'synced' | 'failed';

export interface SheetSyncState {
  status: SheetSyncStatus;
  action?: EntrySyncAction;
  lastAttemptedAt?: number;
  lastSuccessAt?: number;
  lastError?: string;
  revision?: number;
}

export interface WorkEntry {
  id: string;
  date: string;
  user: string;        // Firebase UID
  userName?: string;   // Display name (for export)
  email?: string;      // Email snapshot at time of entry
  role?: string;       // Role at time of entry
  groupId: string;
  groupName?: string;  // Group label at time of entry
  taskId: string;
  taskName?: string;   // Task label at time of entry
  quantity: number;
  unit?: string;       // Unit at time of entry
  creditPerUnit?: number; // Credits per unit at time of entry
  brands?: BrandId[];  // Brand snapshot at time of entry
  credits: number;
  notes: string;
  createdAt: number;
  updatedAt?: number;
  channel?: string;    // Channel metadata at time of entry
  canvaLink?:    string;              // Canva presentation/board URL
  driveLink?:    string;              // Drive link (backward compat / manual paste)
  attachments?:  DriveAttachment[];   // Multi-file Drive uploads
  localFiles?:   LocalFileRef[];      // Local file references (File System Access API)
  sheetSync?:    SheetSyncState;
}

// ─── ROLE SYSTEM ──────────────────────────────────────────────────────────────

export type RoleId =
  | 'art_director'
  | 'graphic_designer'
  | 'vdo_editor'
  | 'content_creator'
  | 'social_admin'
  | 'custom';

export interface RoleMeta {
  id: RoleId | string;
  label: string;
  labelEn: string;
  color: string;
  monthlyTarget: number;
  monthlyPlan?: number;
}

export interface RoleConfig {
  meta: RoleMeta;
  groups: WorkGroups;
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  nickname: string;
  email: string;
  photoURL?: string;
  role: RoleId | string;
  isAdmin: boolean;
  createdAt: number;
  updatedAt: number;
  customTitle?: string;   // user-defined position title (overrides role label)
  settings?: {            // persisted cross-device settings
    autoHoverExpand?: boolean;
    calY8Url?: string;
    calPvUrl?: string;
    driveFolderId?: string;
    sheetUrl?: string;
    reportGender?: 'male' | 'female';
    reportEmojis?: {
      focus?: string;
      routine?: string;
      results?: string;
      nextMove?: string;
      issues?: string;
    };
  };
}

export type DailyReportType = 'morning' | 'evening';

export interface DailyReport {
  id: string;
  type: DailyReportType;
  date: string;
  uid: string;
  email: string;
  nickname: string;
  gender: 'male' | 'female';
  checkInTime?: string;
  focusItems: string[];
  routineItems: string[];
  resultItems: string[];
  nextMoveItems: string[];
  issues: string;
  issueStatus: 'resolved' | 'unresolved';
  issueDetail: string;
  issueNextStep: string;
  sourceEntryIds: string[];
  generatedText: string;
  createdAt: number;
  updatedAt: number;
  lastCopiedAt?: number;
}

export type TabType = 'log' | 'today' | 'history' | 'daily' | 'summary' | 'admin';
