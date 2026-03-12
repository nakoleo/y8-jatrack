import React from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Download, FileText, RefreshCw, Sparkles, TrendingUp, X } from 'lucide-react';

interface SummaryGroup {
  key: string;
  name: string;
  credits: number;
  color: string;
  bg: string;
}

interface SummaryData {
  monthName: string;
  totalCredits: number;
  isTargetSet: boolean;
  isComplete: boolean;
  percent: number;
  entryCount: number;
  isCurrentMonth: boolean;
  dailyNeeded: number;
  remainingCredits: number;
  remainingDays: number;
  groups: SummaryGroup[];
  maxGroupCredits: number;
}

interface SummaryTabProps {
  summaryData: SummaryData;
  summaryYear: number;
  monthlyTarget: number;
  isAtCurrentMonth: boolean;
  navSummaryMonth: (delta: number) => void;
  handleExportToGoogleSheets: () => Promise<void>;
  sheetsExporting: boolean;
  handleGeminiSummary: () => Promise<void>;
  geminiLoading: boolean;
  setShowExportModal: React.Dispatch<React.SetStateAction<boolean>>;
  showGemini: boolean;
  setShowGemini: React.Dispatch<React.SetStateAction<boolean>>;
  geminiResult: string;
  showToast: (message: string) => void;
  GroupBarComponent: React.ComponentType<any>;
}

export function SummaryTab({
  summaryData,
  summaryYear,
  monthlyTarget,
  isAtCurrentMonth,
  navSummaryMonth,
  handleExportToGoogleSheets,
  sheetsExporting,
  handleGeminiSummary,
  geminiLoading,
  setShowExportModal,
  showGemini,
  setShowGemini,
  geminiResult,
  showToast,
  GroupBarComponent,
}: SummaryTabProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between bg-white rounded-[18px] p-1.5 border border-slate-100 shadow-sm">
        <button onClick={() => navSummaryMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 active:bg-slate-50 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-bold text-[#2C2A28] text-[14px]">{summaryData.monthName}</p>
          <p className="text-[10px] text-slate-400">{summaryYear}</p>
        </div>
        <button
          onClick={() => navSummaryMonth(1)}
          disabled={isAtCurrentMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 active:bg-slate-50 disabled:opacity-25 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progress</p>
            <div className="flex items-end gap-2">
              <p className="text-[38px] font-light text-[#2C2A28] leading-none">{summaryData.totalCredits}</p>
              <p className="text-[14px] text-slate-300 mb-0.5">/ {monthlyTarget} Cr.</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${summaryData.isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
              {summaryData.isTargetSet ? (summaryData.isComplete ? '✓ ถึงเป้าแล้ว' : `${Math.round(summaryData.percent)}%`) : 'ยังไม่ตั้งเป้า'}
            </div>
            <p className="text-[9px] text-slate-300 mt-1.5">{summaryData.entryCount} รายการ</p>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${summaryData.percent}%`,
              backgroundColor: summaryData.isComplete ? '#34d399' : '#F4823C',
            }}
          />
        </div>
      </section>

      {summaryData.isCurrentMonth && summaryData.isTargetSet && !summaryData.isComplete && (
        <section className="bg-[#2C2A28] px-5 py-4 rounded-[24px] shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-[#F4823C]" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">ต้องทำต่อวัน</p>
              <p className="text-white font-bold leading-none mt-0.5">
                <span className="text-[24px] font-light">{summaryData.dailyNeeded}</span>
                <span className="text-[12px] ml-1 text-white/50">Cr./วัน</span>
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">เหลืออีก</p>
              <p className="text-white font-bold leading-none mt-0.5">
                <span className="text-[24px] font-light">{summaryData.remainingCredits}</span>
                <span className="text-[12px] ml-1 text-white/50">Cr.</span>
              </p>
              <p className="text-[9px] text-white/40 mt-1">{summaryData.remainingDays} วันที่เหลือ</p>
            </div>
          </div>
        </section>
      )}

      {summaryData.groups.length > 0 ? (
        <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-slate-300" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สัดส่วนงาน</p>
          </div>
          <div className="space-y-4">
            {summaryData.groups.map((group) => (
              <GroupBarComponent
                key={group.key}
                groupKey={group.key}
                name={group.name}
                credits={group.credits}
                maxCredits={summaryData.maxGroupCredits}
                color={group.color}
                bg={group.bg}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
          <BarChart3 size={26} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ไม่มีข้อมูลในเดือนนี้</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => void handleExportToGoogleSheets()}
          disabled={sheetsExporting}
          className="py-5 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
        >
          {sheetsExporting ? <RefreshCw size={18} className="animate-spin text-emerald-400" /> : <FileText size={18} className="text-emerald-500" />}
          <span className="font-bold text-[9px] tracking-widest text-[#2C2A28] uppercase">{sheetsExporting ? 'กำลังส่ง...' : 'Google Sheet'}</span>
        </button>
        <button
          onClick={() => void handleGeminiSummary()}
          className="py-5 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Sparkles size={18} className={geminiLoading ? 'animate-spin text-violet-400' : 'text-violet-500'} />
          <span className="font-bold text-[9px] tracking-widest text-[#2C2A28] uppercase">Gemini AI</span>
        </button>
        <button
          onClick={() => setShowExportModal(true)}
          className="py-5 bg-white rounded-[20px] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Download size={18} className="text-sky-500" />
          <span className="font-bold text-[9px] tracking-widest text-[#2C2A28] uppercase">Export</span>
        </button>
      </div>

      {showGemini && (
        <section className="bg-white p-5 rounded-[24px] border border-violet-100 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-violet-500" />
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Gemini AI Summary</p>
            </div>
            <button onClick={() => setShowGemini(false)} className="text-slate-300 hover:text-slate-500">
              <X size={16} />
            </button>
          </div>
          {geminiLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-[12px]">
              <RefreshCw size={14} className="animate-spin" />
              กำลังวิเคราะห์...
            </div>
          ) : (
            <p className="text-[13px] text-[#2C2A28] leading-relaxed whitespace-pre-wrap">{geminiResult}</p>
          )}
          {!geminiLoading && geminiResult && (
            <button
              onClick={() => {
                void navigator.clipboard.writeText(geminiResult);
                showToast('คัดลอกแล้ว ✓');
              }}
              className="mt-3 w-full py-2 bg-violet-50 rounded-xl text-[11px] font-bold text-violet-600 active:bg-violet-100 transition-colors"
            >
              📋 คัดลอกข้อความ
            </button>
          )}
        </section>
      )}
    </div>
  );
}
