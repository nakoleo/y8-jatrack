import React from 'react';
import { ClipboardCheck, Copy, FileText, History, Moon, RefreshCw, Sun } from 'lucide-react';
import type { DailyReport, DailyReportType, WorkEntry } from '@/domain/types';

interface DailyTabProps {
  dailyTab: 'morning' | 'evening' | 'history';
  setDailyTab: React.Dispatch<React.SetStateAction<'morning' | 'evening' | 'history'>>;
  dailyDate: string;
  setDailyDate: (value: string) => void;
  displayName: string;
  morningCheckInTime: string;
  setMorningCheckInTime: (value: string) => void;
  morningFocusItems: string[];
  setMorningFocusItems: React.Dispatch<React.SetStateAction<string[]>>;
  eveningRoutineItems: string[];
  setEveningRoutineItems: React.Dispatch<React.SetStateAction<string[]>>;
  eveningResultItems: string[];
  setEveningResultItems: React.Dispatch<React.SetStateAction<string[]>>;
  eveningNextMoveItems: string[];
  setEveningNextMoveItems: React.Dispatch<React.SetStateAction<string[]>>;
  dailyIssues: string;
  setDailyIssues: (value: string) => void;
  dailyIssueStatus: 'resolved' | 'unresolved';
  setDailyIssueStatus: React.Dispatch<React.SetStateAction<'resolved' | 'unresolved'>>;
  dailyIssueDetail: string;
  setDailyIssueDetail: (value: string) => void;
  dailyIssueNextStep: string;
  setDailyIssueNextStep: (value: string) => void;
  dailyEntriesForDate: WorkEntry[];
  dailySaving: boolean;
  dailyCopySuccess: boolean;
  morningPreviewText: string;
  eveningPreviewText: string;
  dailyReportsLoading: boolean;
  dailyReports: DailyReport[];
  addDailyListItem: (setter: React.Dispatch<React.SetStateAction<string[]>>) => void;
  updateDailyListItem: (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => void;
  removeDailyListItem: (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => void;
  saveAndCopyDailyReport: (type: DailyReportType) => Promise<void>;
  copyDailyText: (text: string) => Promise<void>;
  handleCopyDailyHistory: (report: DailyReport) => Promise<void>;
  showToast: (message: string) => void;
  formatThaiDate: (dateStr: string, full?: boolean) => string;
  DailyListFieldComponent: React.ComponentType<any>;
}

export function DailyTab({
  dailyTab,
  setDailyTab,
  dailyDate,
  setDailyDate,
  displayName,
  morningCheckInTime,
  setMorningCheckInTime,
  morningFocusItems,
  setMorningFocusItems,
  eveningRoutineItems,
  setEveningRoutineItems,
  eveningResultItems,
  setEveningResultItems,
  eveningNextMoveItems,
  setEveningNextMoveItems,
  dailyIssues,
  setDailyIssues,
  dailyIssueStatus,
  setDailyIssueStatus,
  dailyIssueDetail,
  setDailyIssueDetail,
  dailyIssueNextStep,
  setDailyIssueNextStep,
  dailyEntriesForDate,
  dailySaving,
  dailyCopySuccess,
  morningPreviewText,
  eveningPreviewText,
  dailyReportsLoading,
  dailyReports,
  addDailyListItem,
  updateDailyListItem,
  removeDailyListItem,
  saveAndCopyDailyReport,
  copyDailyText,
  handleCopyDailyHistory,
  showToast,
  formatThaiDate,
  DailyListFieldComponent,
}: DailyTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="panel-card rounded-[26px] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-[#F4823C]" />
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2C2A28]">Daily Report</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'morning', label: 'Morning', icon: <Sun size={14} /> },
            { key: 'evening', label: 'Evening', icon: <Moon size={14} /> },
            { key: 'history', label: 'History', icon: <History size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDailyTab(tab.key as 'morning' | 'evening' | 'history')}
              className={`segmented-button py-3 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${dailyTab === tab.key ? 'active' : ''}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="section-kicker">วันที่รายงาน</label>
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => setDailyDate(e.target.value)}
            className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl font-semibold text-[#2C2A28] text-[13px] outline-none"
          />
        </div>
      </div>

      {dailyTab === 'morning' && (
        <div className="space-y-4">
          <section className="panel-card rounded-[24px] p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="panel-card-soft rounded-2xl px-4 py-3">
                <p className="section-kicker">ผู้รายงาน</p>
                <p className="text-[13px] font-bold text-[#2C2A28] mt-1">{displayName}</p>
              </div>
              <div className="space-y-1.5">
                <label className="section-kicker">Check-in</label>
                <input
                  type="time"
                  value={morningCheckInTime}
                  onChange={(e) => setMorningCheckInTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] font-semibold outline-none"
                />
              </div>
            </div>

            <DailyListFieldComponent
              label="Focus (งานที่โฟกัสหรือเร่งด่วนวันนี้)"
              prefix="F"
              items={morningFocusItems}
              onAdd={() => addDailyListItem(setMorningFocusItems)}
              onChange={(index: number, value: string) => updateDailyListItem(setMorningFocusItems, index, value)}
              onRemove={(index: number) => removeDailyListItem(setMorningFocusItems, index)}
            />

            <button
              onClick={() => void saveAndCopyDailyReport('morning')}
              disabled={dailySaving}
              className="btn-primary w-full rounded-2xl py-4 text-[13px] font-bold tracking-[0.08em] active:scale-[0.99] disabled:opacity-60"
            >
              {dailySaving ? 'กำลังบันทึก...' : dailyCopySuccess ? 'คัดลอกแล้ว' : 'บันทึกและคัดลอก'}
            </button>
          </section>

          <section className="rounded-[24px] border border-[#2C2A28] bg-[#2C2A28] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/72">Preview</p>
              <button
                onClick={() => void copyDailyText(morningPreviewText).then(() => showToast('คัดลอก Preview แล้ว ✓')).catch(() => showToast('❌ คัดลอกไม่สำเร็จ'))}
                className="btn-secondary-dark flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold"
              >
                {dailyCopySuccess ? <ClipboardCheck size={13} className="text-emerald-300" /> : <Copy size={13} />}
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/90 font-mono">{morningPreviewText}</pre>
          </section>
        </div>
      )}

      {dailyTab === 'evening' && (
        <div className="space-y-4">
          <section className="panel-card rounded-[24px] p-5 space-y-5">
            <div className="panel-card-soft rounded-2xl px-4 py-3">
              <p className="section-kicker">Auto Draft</p>
              <p className="text-[12px] font-bold text-[#2C2A28] mt-1">{dailyEntriesForDate.length} รายการในวันที่เลือก</p>
            </div>

            <DailyListFieldComponent
              label="Routine"
              prefix="✔️"
              items={eveningRoutineItems}
              onAdd={() => addDailyListItem(setEveningRoutineItems)}
              onChange={(index: number, value: string) => updateDailyListItem(setEveningRoutineItems, index, value)}
              onRemove={(index: number) => removeDailyListItem(setEveningRoutineItems, index)}
            />

            <DailyListFieldComponent
              label="Results (ผลลัพธ์ของงานวันนี้)"
              prefix="R"
              items={eveningResultItems}
              onAdd={() => addDailyListItem(setEveningResultItems)}
              onChange={(index: number, value: string) => updateDailyListItem(setEveningResultItems, index, value)}
              onRemove={(index: number) => removeDailyListItem(setEveningResultItems, index)}
            />

            <DailyListFieldComponent
              label="Next Move (พรุ่งนี้จะทำอะไรต่อ)"
              prefix="N"
              items={eveningNextMoveItems}
              onAdd={() => addDailyListItem(setEveningNextMoveItems)}
              onChange={(index: number, value: string) => updateDailyListItem(setEveningNextMoveItems, index, value)}
              onRemove={(index: number) => removeDailyListItem(setEveningNextMoveItems, index)}
            />

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="section-kicker">Issues</label>
                <input
                  type="text"
                  value={dailyIssues}
                  onChange={(e) => setDailyIssues(e.target.value)}
                  placeholder="มีปัญหาอะไรไหม? ถ้าไม่มีใส่ 'ไม่มี'"
                  className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDailyIssueStatus('resolved')}
                  className={`py-3 rounded-2xl border text-[11px] font-bold transition-colors ${
                    dailyIssueStatus === 'resolved' ? 'bg-emerald-500 text-white border-emerald-500' : 'btn-secondary'
                  }`}
                >
                  แก้ไขได้แล้ว
                </button>
                <button
                  type="button"
                  onClick={() => setDailyIssueStatus('unresolved')}
                  className={`py-3 rounded-2xl border text-[11px] font-bold transition-colors ${
                    dailyIssueStatus === 'unresolved' ? 'bg-rose-500 text-white border-rose-500' : 'btn-secondary'
                  }`}
                >
                  ยังแก้ไขไม่ได้
                </button>
              </div>
              <textarea
                value={dailyIssueDetail}
                onChange={(e) => setDailyIssueDetail(e.target.value)}
                placeholder="รายละเอียดปัญหา / การแก้ไข"
                rows={2}
                className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-2xl text-[13px] outline-none resize-none"
              />
              <textarea
                value={dailyIssueNextStep}
                onChange={(e) => setDailyIssueNextStep(e.target.value)}
                placeholder="แนวทางการดำเนินการต่อ"
                rows={2}
                className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-2xl text-[13px] outline-none resize-none"
              />
            </div>

            <button
              onClick={() => void saveAndCopyDailyReport('evening')}
              disabled={dailySaving}
              className="btn-primary w-full rounded-2xl py-4 text-[13px] font-bold tracking-[0.08em] active:scale-[0.99] disabled:opacity-60"
            >
              {dailySaving ? 'กำลังบันทึก...' : dailyCopySuccess ? 'คัดลอกแล้ว' : 'บันทึกและคัดลอก'}
            </button>
          </section>

          <section className="rounded-[24px] border border-[#2C2A28] bg-[#2C2A28] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/72">Preview</p>
              <button
                onClick={() => void copyDailyText(eveningPreviewText).then(() => showToast('คัดลอก Preview แล้ว ✓')).catch(() => showToast('❌ คัดลอกไม่สำเร็จ'))}
                className="btn-secondary-dark flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold"
              >
                {dailyCopySuccess ? <ClipboardCheck size={13} className="text-emerald-300" /> : <Copy size={13} />}
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-white/90 font-mono">{eveningPreviewText}</pre>
          </section>
        </div>
      )}

      {dailyTab === 'history' && (
        <div className="space-y-3">
          {dailyReportsLoading ? (
            <div className="panel-card rounded-[24px] py-16 text-center">
              <RefreshCw size={24} className="text-slate-200 mx-auto mb-3 animate-spin" />
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.18em]">กำลังโหลด Daily Reports</p>
            </div>
          ) : dailyReports.length === 0 ? (
            <div className="panel-card rounded-[24px] py-16 text-center">
              <History size={26} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.18em]">ยังไม่มี Daily Report</p>
            </div>
          ) : (
            dailyReports.map((report) => (
              <div key={report.id} className="panel-card rounded-[22px] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${report.type === 'morning' ? 'bg-orange-50 text-orange-500' : 'bg-pink-50 text-pink-500'}`}>
                        {report.type === 'morning' ? <Sun size={15} /> : <Moon size={15} />}
                      </span>
                      <div>
                        <p className="text-[12px] font-bold text-[#2C2A28]">{report.type === 'morning' ? 'Morning Report' : 'Evening Report'}</p>
                        <p className="text-[9px] text-slate-400">{formatThaiDate(report.date, true)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleCopyDailyHistory(report)}
                    className="btn-secondary shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold"
                  >
                    <Copy size={12} /> Copy Again
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
                  {report.generatedText.split('\n').slice(0, 6).join('\n')}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-300">
                  <span>อัปเดตล่าสุด {new Date(report.updatedAt).toLocaleString('th-TH')}</span>
                  <span>{report.lastCopiedAt ? `คัดลอกล่าสุด ${new Date(report.lastCopiedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : 'ยังไม่เคยคัดลอกซ้ำ'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
