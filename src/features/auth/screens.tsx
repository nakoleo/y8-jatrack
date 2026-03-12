import { RefreshCw } from 'lucide-react';
import { useState, type ComponentType } from 'react';

const AppLogo = ({ size = 80 }: { size?: number }) => (
  <img
    src="/icon-512.png"
    alt="Jatrack"
    width={size}
    height={size}
    className="rounded-[24px] shadow-lg"
  />
);

export const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-[100dvh] max-w-md mx-auto bg-[#FDFAF7]">
    <div className="relative flex flex-col items-center">
      <div
        className="absolute inset-[-16px] rounded-[44px] animate-glow pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,130,60,0.24) 0%, transparent 70%)' }}
      />
      <div className="animate-float relative z-10">
        <AppLogo size={80} />
      </div>
      <div
        className="absolute bottom-[-12px] left-1/2 w-[52px] h-[9px] rounded-full blur-xl animate-shadow pointer-events-none"
        style={{ background: 'rgba(244,130,60,0.50)' }}
      />
    </div>
    <RefreshCw size={18} className="text-orange-300 animate-spin" />
    <p className="text-[10px] text-slate-300 mt-3 tracking-widest uppercase">Loading...</p>
  </div>
);

export const SignInScreen = ({
  onSignIn,
  loading,
  toast,
  ToastComponent,
}: {
  onSignIn: () => void;
  loading: boolean;
  toast: { show: boolean; message: string };
  ToastComponent: ComponentType<{ message: string; show: boolean }>;
}) => (
  <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-[#FDFAF7] items-center justify-center px-7">
    <ToastComponent {...toast} />
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl" />
    </div>

    <div className="flex flex-col items-center mb-10 animate-in zoom-in duration-500 relative z-10">
      <div className="relative flex flex-col items-center mb-6">
        <div
          className="absolute inset-[-18px] rounded-[46px] animate-glow pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(244,130,60,0.28) 0%, transparent 70%)' }}
        />
        <div className="animate-float relative z-10"><AppLogo size={88} /></div>
        <div
          className="absolute bottom-[-14px] left-1/2 w-[56px] h-[10px] rounded-full blur-xl animate-shadow pointer-events-none"
          style={{ background: 'rgba(244,130,60,0.55)' }}
        />
      </div>
      <h1 className="text-[20px] font-light text-[#2C2A28] tracking-[0.15em]">Jatrack</h1>
      <p className="text-[11px] text-[#F4823C] font-bold mt-0.5 tracking-[0.35em] uppercase">KPI Tracker</p>
    </div>

    <div className="w-full bg-white/70 border border-orange-100 rounded-2xl px-4 py-3 mb-5 relative z-10 shadow-sm">
      <p className="text-[10px] font-bold text-[#F4823C] uppercase tracking-widest mb-1">Google Only</p>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        เข้าใช้งานด้วยบัญชี Google เท่านั้น เพื่อให้เชื่อม Drive, Sheets และสิทธิ์ผู้ใช้สอดคล้องกันทั้งระบบ
      </p>
    </div>

    <div className="w-full space-y-3 animate-in slide-in-from-bottom duration-500 relative z-10">
      <button
        onClick={onSignIn}
        disabled={loading}
        className="w-full py-4 bg-white border border-orange-100 rounded-2xl font-bold text-[14px] text-[#2C2A28] tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
        style={{ boxShadow: '0 4px 20px rgba(244,130,60,0.12)' }}
      >
        {loading ? <RefreshCw size={18} className="animate-spin text-orange-300" /> : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </>
        )}
      </button>
      <p className="text-center text-[10px] text-slate-300">
        รองรับ Google Drive, Google Sheets และสิทธิ์ตามบัญชีโดยตรง
      </p>
    </div>

    <p className="absolute bottom-6 left-0 right-0 text-center text-[9px] text-slate-300 tracking-widest">
      © 2026 Young Age Corporation Co., Ltd. &amp; Pharvia 2025 Co., Ltd.
    </p>
  </div>
);

export const NicknameSetupScreen = ({
  defaultValue,
  onSave,
}: {
  defaultValue: string;
  onSave: (nickname: string) => Promise<boolean>;
}) => {
  const [nickname, setNickname] = useState(defaultValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-[#FDFAF7] px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-10">
      <div className="flex flex-col items-center mb-8 animate-in zoom-in duration-400">
        <div className="mb-4"><AppLogo size={68} /></div>
        <h1 className="text-[16px] font-bold text-[#2C2A28] tracking-wide">ตั้งชื่อเล่นก่อนเริ่มใช้งาน</h1>
        <p className="text-[11px] text-slate-400 mt-1 text-center leading-relaxed">
          ชื่อเล่นจะใช้สร้างชื่อ Sheet และรายงานอัตโนมัติ
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[22px] p-5 space-y-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nickname</label>
          <input
            autoFocus
            value={nickname}
            maxLength={40}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="เช่น Gift, Aof, Mymint"
            className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[14px] font-semibold outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim()}
          className="w-full py-3.5 text-white rounded-xl font-bold text-[13px] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกชื่อเล่น'}
        </button>
      </div>
    </div>
  );
};
