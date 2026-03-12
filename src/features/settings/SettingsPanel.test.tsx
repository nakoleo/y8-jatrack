import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsPanel } from './SettingsPanel';

const baseProps = {
  currentUser: {
    uid: 'u1',
    email: 'user@example.com',
    displayName: 'User Example',
    photoURL: '',
  } as never,
  userProfile: {
    uid: 'u1',
    displayName: 'User Example',
    nickname: 'Gift',
    email: 'user@example.com',
    role: 'custom',
    isAdmin: false,
    createdAt: 1,
    updatedAt: 1,
  },
  nicknameDraft: 'Gift',
  setNicknameDraft: vi.fn(),
  customTitleDraft: 'Designer',
  setCustomTitleDraft: vi.fn(),
  reportGender: 'male' as const,
  setReportGender: vi.fn(),
  reportEmojis: { focus: '🚩', routine: '📌', results: '📄', nextMove: '🔜', issues: '⚠️' },
  setReportEmojis: vi.fn(),
  sheetUrl: '',
  setSheetUrl: vi.fn(),
  driveFolderId: '',
  setDriveFolderId: vi.fn(),
  googleAccessToken: '',
  googleAccessTokenExpiry: 0,
  handleConnectGoogleDrive: vi.fn(async () => undefined),
  latestSyncState: null,
  isOnline: true,
  orgCalendarConfig: {
    enabled: true,
    label: 'Y8 Content',
    timezone: 'Asia/Bangkok',
    y8ContentFeedUrl: 'https://example.com/feed.ics',
    lastSyncStatus: 'ok' as const,
    lastEventCount: 10,
  },
  calendarDraft: {
    enabled: true,
    label: 'Y8 Content',
    timezone: 'Asia/Bangkok',
    y8ContentFeedUrl: 'https://example.com/feed.ics',
  },
  setCalendarDraft: vi.fn(),
  calendarActionLoading: false,
  onValidateCalendar: vi.fn(async () => undefined),
  onSave: vi.fn(async () => undefined),
  onSignOut: vi.fn(async () => undefined),
  openKpiEditor: vi.fn(),
  runtimeProjectId: 'jartrack-y8pv',
  runtimeAuthDomain: 'jartrack-y8pv.firebaseapp.com',
  firebaseConfigHealthy: true,
  autoHoverExpand: false,
  setAutoHoverExpand: vi.fn(),
  monthlyTarget: 120,
};

describe('SettingsPanel', () => {
  it('shows calendar as read-only for normal users', () => {
    render(<SettingsPanel {...baseProps} isSuperAdmin={false} />);

    expect(screen.getByText('Calendar นี้ถูกจัดการโดย super admin และแสดงเหมือนกันทั้งทีม')).toBeInTheDocument();
    expect(screen.queryByText('Feed URL')).not.toBeInTheDocument();
  });

  it('shows feed editor for super admin', () => {
    render(<SettingsPanel {...baseProps} isSuperAdmin />);

    expect(screen.getByText('Feed URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validate feed' })).toBeInTheDocument();
  });
});
