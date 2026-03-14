import React from 'react';
import { Trash2, UserCircle } from 'lucide-react';
import type { UserProfile, WorkEntry } from '@/domain/types';
import { ROLE_DEFAULTS, ROLE_EMOJI } from '@/config/roleDefaults';

interface AdminSummaryRow {
  uid: string;
  credits: number;
  count: number;
  percent: number;
}

interface AdminTabProps {
  adminProfiles: UserProfile[];
  adminSummary: AdminSummaryRow[];
  adminEntries: WorkEntry[];
  adminLoading: boolean;
  currentUserUid?: string;
  handleDeleteAdminUser: (uid: string, nickname: string) => Promise<void>;
}

export function AdminTab({
  adminProfiles,
  adminSummary,
  adminEntries,
  adminLoading,
  currentUserUid,
  handleDeleteAdminUser,
}: AdminTabProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin Overview</p>
        <p className="text-[20px] font-light text-[#2C2A28]">{adminProfiles.length} Users ทั้งหมด</p>
        <p className="text-[11px] text-slate-400 mt-1">Active เดือนนี้ {adminSummary.length} คน · รวม {adminEntries.length} รายการ</p>
      </section>

      {adminLoading ? (
        <div className="text-center py-10 text-slate-300 text-[11px] font-bold uppercase tracking-widest">กำลังโหลดข้อมูลรวม...</div>
      ) : adminProfiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[24px] border border-dashed border-slate-200">
          <UserCircle size={26} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">ยังไม่มีผู้ใช้ในระบบ</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {adminProfiles.map((profile, index) => {
            const summary = adminSummary.find((row) => row.uid === profile.uid);
            const isSelf = profile.uid === currentUserUid;
            return (
              <div key={profile.uid} className="bg-white px-4 py-3.5 rounded-[18px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#2C2A28] truncate">
                      {index + 1}. {profile.nickname || profile.displayName || profile.email}
                      {isSelf && <span className="ml-1.5 text-[9px] font-bold text-[#F4823C] bg-orange-50 px-1.5 py-0.5 rounded-full">YOU</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {ROLE_EMOJI[profile.role] || '⚙️'} {ROLE_DEFAULTS[profile.role]?.meta.label || profile.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-[#F4823C]">{summary?.credits ?? 0} Cr.</p>
                      <p className="text-[9px] text-slate-300">{summary ? `${summary.count} รายการ · ${summary.percent}%` : 'ไม่มีข้อมูลเดือนนี้'}</p>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => void handleDeleteAdminUser(profile.uid, profile.nickname || profile.displayName || profile.email)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-400 active:bg-rose-100 transition-colors shrink-0"
                        title="ลบผู้ใช้"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
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
