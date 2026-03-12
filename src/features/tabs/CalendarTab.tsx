import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Megaphone, Rocket, Sparkles } from 'lucide-react';

import type { NormalizedCalendarEvent, OrgCalendarConfig } from '@/domain/types';

type CalendarFilter = 'all' | 'content' | 'launch' | 'upcoming';

interface CalendarTabProps {
  config: OrgCalendarConfig;
  events: NormalizedCalendarEvent[];
  loading: boolean;
  error: string;
}

const FILTERS: Array<{ key: CalendarFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'content', label: 'Content' },
  { key: 'launch', label: 'Launch' },
  { key: 'upcoming', label: 'Upcoming' },
];

const formatEventDate = (value: string, timezone: string, includeTime = false) =>
  new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: includeTime ? undefined : 'numeric',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    timeZone: timezone,
  }).format(new Date(value));

const buildDayKey = (value: string, timezone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));

export function CalendarTab({ config, events, loading, error }: CalendarTabProps) {
  const [filter, setFilter] = useState<CalendarFilter>('all');

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      if (filter === 'content') return event.kind === 'content';
      if (filter === 'launch') return event.kind === 'launch';
      if (filter === 'upcoming') return new Date(event.start).getTime() >= now;
      return true;
    });
  }, [events, filter]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, NormalizedCalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const key = buildDayKey(event.start, config.timezone);
      const current = groups.get(key) || [];
      current.push(event);
      groups.set(key, current);
    });
    return [...groups.entries()];
  }, [config.timezone, filteredEvents]);

  const launches = useMemo(
    () => filteredEvents.filter((event) => event.kind === 'launch').slice(0, 6),
    [filteredEvents],
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="panel-card rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Central Calendar</p>
            <h2 className="mt-2 text-[24px] font-light tracking-[0.03em] text-[#2C2A28]">{config.label}</h2>
            <p className="mt-1 text-[12px] text-slate-600">ทีม Y8 ดูปฏิทินเดียวกันแบบ read-only จาก Google Calendar กลาง</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`filter-chip ${filter === item.key ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-[12px] text-rose-700">
          ไม่สามารถโหลดปฏิทินได้ตอนนี้: {error}
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.95fr)]">
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <CalendarDays size={14} className="text-slate-400" />
            <p className="section-kicker">Agenda</p>
          </div>

          {loading ? (
            <div className="panel-card rounded-[24px] p-8 text-center text-[12px] text-slate-500">กำลังโหลดกำหนดการ...</div>
          ) : groupedEvents.length === 0 ? (
            <div className="panel-card rounded-[24px] p-8 text-center text-[12px] text-slate-500">ยังไม่มีกำหนดการในช่วงนี้</div>
          ) : (
            groupedEvents.map(([dateKey, items]) => (
              <div key={dateKey} className="panel-card rounded-[24px] p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[16px] font-semibold text-[#2C2A28]">{formatEventDate(items[0].start, config.timezone)}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{items.length} events</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {items.map((event) => {
                    const isLaunch = event.kind === 'launch';
                    return (
                      <article
                        key={event.id}
                        className={`rounded-[22px] border px-4 py-4 ${isLaunch ? 'border-[#F6D3B8] bg-[#FFF6EE]' : 'border-slate-200 bg-white'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`calendar-kind ${event.kind}`}>
                                {isLaunch ? 'Launch' : event.kind === 'content' ? 'Content' : 'General'}
                              </span>
                              {event.brand && <span className="calendar-meta">{event.brand}</span>}
                            </div>
                            <h3 className="mt-2 text-[14px] font-semibold leading-6 text-[#2C2A28]">{event.title}</h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                              <span className="calendar-meta">
                                <Clock3 size={12} />
                                {event.allDay ? 'All day' : formatEventDate(event.start, event.timezone || config.timezone, true)}
                              </span>
                              {event.product && <span className="calendar-meta">{event.product}</span>}
                              {event.contentType && <span className="calendar-meta">{event.contentType}</span>}
                            </div>
                            {event.description && (
                              <p className="mt-3 line-clamp-3 text-[12px] leading-6 text-slate-600">{event.description}</p>
                            )}
                          </div>
                          <div className={`rounded-[18px] px-3 py-2 text-right ${isLaunch ? 'bg-[#F4823C] text-white' : 'bg-slate-100 text-slate-700'}`}>
                            <p className="text-[9px] uppercase tracking-[0.16em] opacity-75">{isLaunch ? 'Launch' : 'Start'}</p>
                            <p className="mt-1 text-[12px] font-semibold">
                              {event.launchDate || formatEventDate(event.start, config.timezone)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        <aside className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Rocket size={14} className="text-[#F4823C]" />
            <p className="section-kicker">Launch Spotlight</p>
          </div>

          <section className="panel-card rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#F4823C]" />
              <p className="text-[13px] font-semibold text-[#2C2A28]">Upcoming launches</p>
            </div>
            <div className="mt-4 space-y-3">
              {launches.length === 0 ? (
                <p className="text-[12px] text-slate-500">ยังไม่มี launch ที่ใกล้เข้ามา</p>
              ) : (
                launches.map((event) => (
                  <div key={event.id} className="rounded-[20px] border border-[#F6D3B8] bg-[#FFF6EE] px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Rocket size={13} className="text-[#F4823C]" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8702B]">
                        {event.launchDate || formatEventDate(event.start, config.timezone)}
                      </p>
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-[#2C2A28]">{event.product || event.title}</p>
                    {event.contentType && <p className="mt-1 text-[12px] text-slate-600">{event.contentType}</p>}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel-card-soft rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Megaphone size={14} className="text-slate-500" />
              <p className="section-kicker">Feed Status</p>
            </div>
            <div className="mt-3 space-y-2 text-[12px] text-slate-600">
              <p>Timezone: {config.timezone}</p>
              <p>Status: {config.lastSyncStatus || 'ok'}</p>
              <p>Last checked: {config.lastValidatedAt ? new Date(config.lastValidatedAt).toLocaleString('th-TH') : 'ยังไม่มีข้อมูล'}</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
