import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Settings2, UserCircle } from 'lucide-react';

import { ROLE_DEFAULTS, ROLE_EMOJI } from '@/config/roleDefaults';

export interface AdminSummaryRow {
  uid: string;
  nickname: string;
  role: string;
  displayTitle: string;
  email?: string;
  photoURL?: string;
  target: number;
  credits: number;
  count: number;
  percent: number;
  sortOrder: number;
}

interface AdminTabProps {
  adminSummary: AdminSummaryRow[];
  totalUsers: number;
  totalEntries: number;
  adminLoading: boolean;
  currentUserUid?: string;
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onManageUser: (uid: string) => void;
  onMoveUp: (uid: string) => void;
  onMoveDown: (uid: string) => void;
}

const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function AdminTab({
  adminSummary,
  totalUsers,
  totalEntries,
  adminLoading,
  currentUserUid,
  month,
  year,
  onPrevMonth,
  onNextMonth,
  onManageUser,
  onMoveUp,
  onMoveDown,
}: AdminTabProps) {
  const activeUsers = adminSummary.filter((row) => row.count > 0).length;
  const monthLabel = `${MONTH_TH[month]} ${year + 543}`;

  return (
    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Overview</p>
            <p className="text-[20px] font-light text-[#2C2A28]">{totalUsers} Users ทั้งหมด</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Active เดือนนี้ {activeUsers} คน · รวม {totalEntries} รายการ
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
            <button
              type="button"
              onClick={onPrevMonth}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-[#2C2A28]"
              aria-label="ดูเดือนก่อนหน้า"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center min-w-[110px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly KPI</p>
              <p className="text-[13px] font-semibold text-[#2C2A28] mt-1">{monthLabel}</p>
            </div>
            <button
              type="button"
              onClick={onNextMonth}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-[#2C2A28]"
              aria-label="ดูเดือนถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {adminLoading ? (
        <div className="text-center py-10 text-slate-300 text-[11px] font-bold uppercase tracking-widest">กำลังโหลดข้อมูลรวม...</div>
      ) : adminSummary.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
          <UserCircle size={26} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีผู้ใช้ในระบบ</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {adminSummary.map((row, index) => {
            const isSelf = row.uid === currentUserUid;
            return (
              <div key={row.uid} className="bg-white px-4 py-3.5 rounded-[18px] border border-slate-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onManageUser(row.uid)}
                    className="flex flex-1 items-start gap-3 min-w-0 text-left"
                  >
                    {row.photoURL ? (
                      <img
                        src={row.photoURL}
                        alt={row.nickname}
                        className="w-10 h-10 rounded-[14px] object-cover border border-orange-100 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-[14px] bg-orange-50 text-[#F4823C] flex items-center justify-center text-[12px] font-black shrink-0">
                        {index + 1}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-bold text-[#2C2A28] truncate">{row.nickname}</p>
                        {isSelf && (
                          <span className="text-[9px] font-bold text-[#F4823C] bg-orange-50 px-1.5 py-0.5 rounded-full">YOU</span>
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">จัดการ</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {ROLE_EMOJI[row.role] || '⚙️'} {row.displayTitle || ROLE_DEFAULTS[row.role]?.meta.label || row.role}
                      </p>
                      {row.email && <p className="text-[10px] text-slate-300 truncate mt-0.5">{row.email}</p>}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Month</p>
                          <p className="mt-1 text-[13px] font-semibold text-[#2C2A28]">{row.credits} Cr.</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Target</p>
                          <p className="mt-1 text-[13px] font-semibold text-[#2C2A28]">{row.target} Cr.</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">% KPI</p>
                          <p className="mt-1 text-[13px] font-semibold text-[#F4823C]">{row.percent}%</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Entries</p>
                          <p className="mt-1 text-[13px] font-semibold text-[#2C2A28]">{row.count}</p>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveUp(row.uid)}
                      disabled={index === 0}
                      className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`เลื่อน ${row.nickname} ขึ้น`}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDown(row.uid)}
                      disabled={index === adminSummary.length - 1}
                      className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`เลื่อน ${row.nickname} ลง`}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onManageUser(row.uid)}
                      className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-[#F4823C] flex items-center justify-center"
                      aria-label={`จัดการ ${row.nickname}`}
                    >
                      <Settings2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
