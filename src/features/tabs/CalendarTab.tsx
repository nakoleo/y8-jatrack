import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LayoutGrid, List, Megaphone, Rocket, Sparkles, X } from 'lucide-react';

import type { NormalizedCalendarEvent, OrgCalendarConfig } from '@/domain/types';

type CalendarView = 'month' | 'agenda';
type CalendarFilter = 'all' | 'content' | 'launch' | 'upcoming';

interface CalendarTabProps {
  config: OrgCalendarConfig;
  events: NormalizedCalendarEvent[];
  loading: boolean;
  error: string;
}

const FILTERS: Array<{ key: CalendarFilter; label: string }> = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'content', label: 'Content' },
  { key: 'launch', label: 'Launch' },
  { key: 'upcoming', label: 'Upcoming' },
];

const WEEKDAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
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

const formatDayKeyThai = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(y, m - 1, d));
};

const kindDot = (kind: string) => {
  if (kind === 'launch') return 'bg-[#F4823C]';
  if (kind === 'content') return 'bg-indigo-400';
  return 'bg-slate-300';
};

const kindCard = (kind: string) => {
  if (kind === 'launch') return 'border-[#F6D3B8] bg-[#FFF6EE]';
  if (kind === 'content') return 'border-indigo-100 bg-indigo-50';
  return 'border-slate-200 bg-white';
};

const kindLabel = (kind: string) => {
  if (kind === 'launch') return 'Launch';
  if (kind === 'content') return 'Content';
  return 'General';
};

export function CalendarTab({ config, events, loading, error }: CalendarTabProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayKey = useMemo(() => buildDayKey(new Date().toISOString(), config.timezone), [config.timezone]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      if (filter === 'content') return event.kind === 'content';
      if (filter === 'launch') return event.kind === 'launch';
      if (filter === 'upcoming') return new Date(event.start).getTime() >= now;
      return true;
    });
  }, [events, filter]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, NormalizedCalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const key = buildDayKey(event.start, config.timezone);
      map.set(key, [...(map.get(key) || []), event]);
    });
    return map;
  }, [filteredEvents, config.timezone]);

  // Build calendar grid (Sun–Sat)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ key: string; day: number; inMonth: boolean }> = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      days.push({ key: `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ key: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: true });
    }
    const trailing = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      days.push({ key: `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, inMonth: false });
    }
    return days;
  }, [currentMonth]);

  const selectedEvents = useMemo(
    () => (selectedDate ? eventsByDay.get(selectedDate) || [] : []),
    [selectedDate, eventsByDay],
  );

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, NormalizedCalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const key = buildDayKey(event.start, config.timezone);
      groups.set(key, [...(groups.get(key) || []), event]);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [config.timezone, filteredEvents]);

  const launches = useMemo(
    () => filteredEvents.filter((e) => e.kind === 'launch').slice(0, 6),
    [filteredEvents],
  );

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── Header ─────────────────────────────────────── */}
      <section className="panel-card rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Central Calendar</p>
            <h2 className="mt-2 text-[24px] font-light tracking-[0.03em] text-[#2C2A28]">{config.label}</h2>
            <p className="mt-1 text-[12px] text-slate-500">ทีม Y8 ดูปฏิทินเดียวกันแบบ read-only จาก Google Calendar กลาง</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-[16px] border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setView('month')}
                className={`flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200
                  ${view === 'month' ? 'bg-white text-[#2C2A28] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={13} />
                ภาพรวมเดือน
              </button>
              <button
                type="button"
                onClick={() => setView('agenda')}
                className={`flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-[12px] font-semibold transition-all duration-200
                  ${view === 'agenda' ? 'bg-white text-[#2C2A28] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={13} />
                Agenda
              </button>
            </div>
            {/* Filters */}
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

      {/* ── Month Grid View ─────────────────────────────── */}
      {view === 'month' && (
        <div className="space-y-4">
          <section className="panel-card overflow-hidden rounded-[28px]">

            {/* Month nav */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-[14px] p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#2C2A28]"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex-1 text-center">
                <p className="text-[18px] font-semibold tracking-tight text-[#2C2A28]">
                  {MONTH_TH[currentMonth.getMonth()]}
                </p>
                <p className="text-[11px] text-slate-400">{currentMonth.getFullYear() + 543}</p>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-[14px] p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#2C2A28]"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Today shortcut */}
            <div className="flex justify-center pb-3">
              <button
                type="button"
                onClick={goToday}
                className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#2C2A28]"
              >
                วันนี้
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-t border-slate-100">
              {WEEKDAY_TH.map((d, i) => (
                <div
                  key={d}
                  className={`py-2.5 text-center text-[11px] font-bold tracking-wider
                    ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-indigo-400' : 'text-slate-400'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 border-t border-slate-100">
              {calendarDays.map(({ key, day, inMonth }, idx) => {
                const dayEvents = eventsByDay.get(key) || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDate;
                const col = idx % 7;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`group relative flex flex-col items-center border-b border-r border-slate-100 py-2 px-1 transition-colors duration-150
                      min-h-[60px] sm:min-h-[70px]
                      ${!inMonth ? 'opacity-25' : ''}
                      ${isSelected ? 'bg-orange-50' : 'hover:bg-slate-50'}
                    `}
                  >
                    {/* Date number */}
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-150
                        ${isToday
                          ? 'bg-[#F4823C] text-white shadow-sm'
                          : isSelected
                          ? 'bg-[#F4823C]/10 text-[#F4823C]'
                          : col === 0
                          ? 'text-rose-500'
                          : col === 6
                          ? 'text-indigo-500'
                          : 'text-[#2C2A28]'
                        }`}
                    >
                      {day}
                    </span>

                    {/* Event dots */}
                    {dayEvents.length > 0 && inMonth && (
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${kindDot(e.kind)}`} />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] leading-none text-slate-400">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#F4823C]" />
                <span className="text-[11px] text-slate-500">Launch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <span className="text-[11px] text-slate-500">Content</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="text-[11px] text-slate-500">General</span>
              </div>
              <p className="ml-auto text-[11px] text-slate-400">กดวันเพื่อดูรายละเอียด</p>
            </div>
          </section>

          {/* Selected day detail */}
          {selectedDate && (
            <section className="panel-card animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-[28px] p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="section-kicker">กำหนดการ</p>
                  <h3 className="mt-1 text-[17px] font-semibold text-[#2C2A28]">
                    {formatDayKeyThai(selectedDate)}
                  </h3>
                  {selectedEvents.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-slate-400">{selectedEvents.length} รายการ</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="rounded-[12px] p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-200 py-8 text-center">
                  <p className="text-[12px] text-slate-400">ไม่มีกำหนดการในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((event) => (
                    <article key={event.id} className={`rounded-[20px] border px-4 py-4 ${kindCard(event.kind)}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`calendar-kind ${event.kind}`}>{kindLabel(event.kind)}</span>
                        {event.brand && <span className="calendar-meta">{event.brand}</span>}
                        {event.product && <span className="calendar-meta">{event.product}</span>}
                      </div>
                      <h4 className="mt-2 text-[14px] font-semibold text-[#2C2A28]">{event.title}</h4>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="calendar-meta">
                          <Clock3 size={11} />
                          {event.allDay ? 'ทั้งวัน' : formatEventDate(event.start, event.timezone || config.timezone, true)}
                        </span>
                        {event.contentType && <span className="calendar-meta">{event.contentType}</span>}
                      </div>
                      {event.description && (
                        <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-slate-600">{event.description}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ── Agenda View ─────────────────────────────────── */}
      {view === 'agenda' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.95fr)]">
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <CalendarDays size={14} className="text-slate-400" />
              <p className="section-kicker">Agenda</p>
            </div>

            {loading ? (
              <div className="panel-card rounded-[24px] p-8 text-center text-[12px] text-slate-500">
                กำลังโหลดกำหนดการ...
              </div>
            ) : groupedEvents.length === 0 ? (
              <div className="panel-card rounded-[24px] p-8 text-center text-[12px] text-slate-500">
                ยังไม่มีกำหนดการในช่วงนี้
              </div>
            ) : (
              groupedEvents.map(([dateKey, items]) => (
                <div key={dateKey} className="panel-card rounded-[24px] p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[16px] font-semibold text-[#2C2A28]">
                        {formatEventDate(items[0].start, config.timezone)}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{items.length} events</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {items.map((event) => {
                      const isLaunch = event.kind === 'launch';
                      return (
                        <article
                          key={event.id}
                          className={`rounded-[22px] border px-4 py-4 ${kindCard(event.kind)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`calendar-kind ${event.kind}`}>{kindLabel(event.kind)}</span>
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
                            <div className={`shrink-0 rounded-[18px] px-3 py-2 text-right ${isLaunch ? 'bg-[#F4823C] text-white' : 'bg-slate-100 text-slate-700'}`}>
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
      )}
    </div>
  );
}
