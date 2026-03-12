import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import type { NormalizedCalendarEvent, WorkEntry, WorkGroups } from '@/domain/types';

interface TodayTabProps {
  todayLabel: string;
  todayEntries: WorkEntry[];
  kpiConfig: WorkGroups;
  setEditEntry: React.Dispatch<React.SetStateAction<WorkEntry | null>>;
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (message: string) => void;
  EntryCardComponent: React.ComponentType<any>;
  calendarEnabled: boolean;
  calendarLoading: boolean;
  calendarError: string;
  calendarEvents: NormalizedCalendarEvent[];
  openCalendarTab: () => void;
}

export function TodayTab({
  todayLabel,
  todayEntries,
  kpiConfig,
  setEditEntry,
  setDeleteId,
  showToast,
  EntryCardComponent,
  calendarEnabled,
  calendarLoading,
  calendarError,
  calendarEvents,
  openCalendarTab,
}: TodayTabProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] px-1">{todayLabel}</p>
      {todayEntries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-slate-200">
          <Clock size={26} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีรายการวันนี้</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {todayEntries.map((entry) => (
            <EntryCardComponent
              key={entry.id}
              entry={entry}
              workGroups={kpiConfig}
              onEdit={setEditEntry}
              onDelete={setDeleteId}
              onShowToast={showToast}
            />
          ))}
        </div>
      )}

      {calendarEnabled && (
        <section className="panel-card rounded-[24px] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarIcon size={14} className="text-[#F4823C]" />
                <p className="section-kicker">Y8 Calendar</p>
              </div>
              <p className="mt-2 text-[14px] font-semibold text-[#2C2A28]">Content calendar และ product launch</p>
            </div>
            <button onClick={openCalendarTab} className="btn-secondary rounded-2xl px-3 py-2 text-[11px] font-bold">
              เปิด Calendar
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {calendarLoading ? (
              <p className="text-[12px] text-slate-500">กำลังโหลดกำหนดการ...</p>
            ) : calendarError ? (
              <p className="text-[12px] text-rose-600">{calendarError}</p>
            ) : calendarEvents.length === 0 ? (
              <p className="text-[12px] text-slate-500">วันนี้ยังไม่มีกำหนดการจากปฏิทินกลาง</p>
            ) : (
              calendarEvents.slice(0, 3).map((event) => (
                <article key={event.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`calendar-kind ${event.kind}`}>{event.kind}</span>
                        {event.product && <span className="calendar-meta">{event.product}</span>}
                      </div>
                      <p className="mt-2 text-[13px] font-semibold leading-6 text-[#2C2A28]">{event.title}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      {event.launchDate || (event.allDay ? 'All day' : new Date(event.start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
