
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
}

export interface WorkGroup {
  label?: string;
  name: string;
  color: string;
  bg: string;
  border?: string;
  tasks: Task[];
}

export type WorkGroups = Record<string, WorkGroup>;

export interface WorkEntry {
  id: string;
  date: string;
  user: string;        // Firebase UID
  userName?: string;   // Display name (for export)
  role?: string;       // Role at time of entry
  groupId: string;
  taskId: string;
  quantity: number;
  credits: number;
  notes: string;
  createdAt: number;
  canvaLink?: string;   // Canva presentation/board URL
  driveLink?: string;   // Google Drive file/folder URL
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
}

export type TabType = 'log' | 'today' | 'history' | 'summary' | 'admin';
