import React from 'react';
import { History } from 'lucide-react';
import type { WorkEntry, WorkGroups } from '@/domain/types';

interface HistoryTabProps {
  historyDates: string[];
  historyEntries: WorkEntry[];
  kpiConfig: WorkGroups;
  setEditEntry: React.Dispatch<React.SetStateAction<WorkEntry | null>>;
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (message: string) => void;
  EntryCardComponent: React.ComponentType<any>;
  formatThaiDate: (dateStr: string, full?: boolean) => string;
}

export function HistoryTab({
  historyDates,
  historyEntries,
  kpiConfig,
  setEditEntry,
  setDeleteId,
  showToast,
  EntryCardComponent,
  formatThaiDate,
}: HistoryTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {historyDates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-slate-200">
          <History size={26} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีประวัติ</p>
        </div>
      ) : (
        historyDates.map((date) => {
          const dayEntries = historyEntries.filter((entry) => entry.date === date);
          const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.credits, 0);

          return (
            <div key={date} className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{formatThaiDate(date, true)}</p>
                <span className="text-[11px] font-bold text-[#F4823C]">{dayTotal} Cr.</span>
              </div>
              {dayEntries.map((entry) => (
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
          );
        })
      )}
    </div>
  );
}
