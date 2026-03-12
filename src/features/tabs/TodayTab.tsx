import React from 'react';
import { Calendar as CalendarIcon, ChevronDown, Clock } from 'lucide-react';
import type { WorkEntry, WorkGroups } from '@/domain/types';

interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  brand: 'y8' | 'pv';
}

interface TodayTabProps {
  todayLabel: string;
  todayEntries: WorkEntry[];
  kpiConfig: WorkGroups;
  setEditEntry: React.Dispatch<React.SetStateAction<WorkEntry | null>>;
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (message: string) => void;
  EntryCardComponent: React.ComponentType<any>;
  calY8Url: string;
  calPvUrl: string;
  showCalSection: boolean;
  setShowCalSection: React.Dispatch<React.SetStateAction<boolean>>;
  calLoading: boolean;
  calEvents: CalendarEvent[];
}

export function TodayTab({
  todayLabel,
  todayEntries,
  kpiConfig,
  setEditEntry,
  setDeleteId,
  showToast,
  EntryCardComponent,
  calY8Url,
  calPvUrl,
  showCalSection,
  setShowCalSection,
  calLoading,
  calEvents,
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

      {(calY8Url || calPvUrl) && (
        <div className="mt-2">
          <button
            onClick={() => setShowCalSection((current) => !current)}
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
                calEvents.map((event) => (
                  <div
                    key={event.uid}
                    className="flex items-start gap-3 px-4 py-3 bg-white rounded-[16px] border shadow-sm"
                    style={{ borderColor: event.brand === 'y8' ? 'rgba(244,130,60,0.25)' : 'rgba(232,122,165,0.25)' }}
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: event.brand === 'y8' ? '#F4823C' : '#E87AA5' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2C2A28] text-[12px] leading-tight">{event.title}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {event.start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {event.end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded text-white shrink-0"
                      style={{ background: event.brand === 'y8' ? '#F4823C' : '#E87AA5' }}
                    >
                      {event.brand.toUpperCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
