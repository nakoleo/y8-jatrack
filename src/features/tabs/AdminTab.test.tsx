import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminTab } from './AdminTab';

const rows = [
  {
    uid: 'orb',
    nickname: 'Orb',
    role: 'art_director',
    target: 300,
    credits: 120,
    count: 12,
    percent: 40,
    sortOrder: 0,
  },
  {
    uid: 'gift',
    nickname: 'Gift',
    role: 'custom',
    target: 150,
    credits: 90,
    count: 9,
    percent: 60,
    sortOrder: 1,
  },
];

describe('AdminTab', () => {
  it('shows monthly KPI fields and manage flow without delete action', () => {
    const onManageUser = vi.fn();

    render(
      <AdminTab
        adminSummary={rows}
        totalUsers={2}
        totalEntries={21}
        adminLoading={false}
        currentUserUid="orb"
        month={2}
        year={2026}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onManageUser={onManageUser}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/Target/i)[0]).toBeInTheDocument();
    expect(screen.getByText('150 Cr.')).toBeInTheDocument();
    expect(screen.queryByTitle('ลบผู้ใช้')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'จัดการ Gift' }));
    expect(onManageUser).toHaveBeenCalledWith('gift');
  });
});
