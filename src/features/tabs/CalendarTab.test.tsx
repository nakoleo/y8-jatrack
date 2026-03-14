import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CalendarTab } from './CalendarTab';

const config = {
  enabled: true,
  label: 'Y8 Content',
  timezone: 'Asia/Bangkok',
  y8ContentFeedUrl: 'https://example.com/feed.ics',
  lastSyncStatus: 'ok' as const,
  lastEventCount: 3,
};

const events = [
  {
    id: '1',
    title: 'Launch event',
    description: 'launch',
    start: '2026-03-12T00:00:00+07:00',
    end: '2026-03-12T00:00:00+07:00',
    allDay: true,
    timezone: 'Asia/Bangkok',
    brand: 'Y8',
    product: 'Product A',
    contentType: 'Launch',
    launchDate: '12 มี.ค. 2026',
    kind: 'launch' as const,
  },
  {
    id: '2',
    title: 'Content event',
    description: 'content',
    start: '2026-03-13T10:00:00+07:00',
    end: '2026-03-13T11:00:00+07:00',
    allDay: false,
    timezone: 'Asia/Bangkok',
    brand: 'Y8',
    product: 'Product B',
    contentType: 'Education',
    kind: 'content' as const,
  },
];

describe('CalendarTab', () => {
  it('filters launch events', () => {
    render(<CalendarTab config={config} events={events} loading={false} error="" />);

    fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    expect(screen.getByText('Launch event')).toBeInTheDocument();
    expect(screen.queryByText('Content event')).not.toBeInTheDocument();
  });
});
