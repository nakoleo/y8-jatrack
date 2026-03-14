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
  <div className="min-h-[100dvh] bg-[#FDFAF7] px-5 py-6 sm:px-6 lg:px-10 lg:py-10">
    <ToastComponent {...toast} />
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute left-[14%] top-[12%] h-72 w-72 rounded-full bg-orange-200/20 blur-3xl lg:h-96 lg:w-96" />
      <div className="absolute right-[10%] bottom-[10%] h-64 w-64 rounded-full bg-[#f3dcc8]/35 blur-3xl lg:h-80 lg:w-80" />
    </div>
    <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl items-center justify-center rounded-[32px] border border-white/65 bg-white/40 px-5 py-8 shadow-[0_24px_80px_rgba(44,42,40,0.08)] backdrop-blur-xl lg:min-h-[calc(100dvh-5rem)] lg:px-10 lg:py-12">
      <main className="flex w-full items-center justify-center">
        <div className="panel-card w-full max-w-[420px] rounded-[30px] px-6 py-8 sm:px-8 sm:py-9">
          <div className="flex flex-col items-center animate-in zoom-in duration-500">
            <div className="relative mb-6 flex flex-col items-center">
              <div
                className="absolute inset-[-18px] rounded-[46px] animate-glow pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(244,130,60,0.28) 0%, transparent 70%)' }}
              />
              <div className="animate-float relative z-10"><AppLogo size={88} /></div>
              <div
                className="absolute bottom-[-14px] left-1/2 h-[10px] w-[56px] rounded-full blur-xl animate-shadow pointer-events-none"
                style={{ background: 'rgba(244,130,60,0.55)' }}
              />
            </div>
            <h1 className="text-[24px] font-bold text-[#F4823C] tracking-[0.08em]">JaTrack</h1>
            <p className="mt-1 text-[11px] font-medium tracking-[0.22em] text-slate-500">KPI Tracker by Y8PV</p>
            <p className="mt-4 max-w-[280px] text-center text-[13px] leading-6 text-slate-500">
              เข้าด้วยบัญชี Google ของทีมเพื่อเริ่มใช้งานและซิงก์ข้อมูลอัตโนมัติ
            </p>
          </div>

          <div className="mt-7 space-y-3 animate-in slide-in-from-bottom duration-500">
            <button
              onClick={onSignIn}
              disabled={loading}
              className="btn-secondary flex w-full items-center justify-center gap-3 rounded-[22px] px-5 py-4 text-[15px] font-bold text-[#2C2A28] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? <RefreshCw size={18} className="animate-spin text-orange-400" /> : (
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
            <p className="text-center text-[11px] text-slate-500">ระบบจะกำหนดสิทธิ์ตามบัญชีที่เข้าสู่ระบบ</p>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">Drive + Sheets</span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">Role-based</span>
          </div>

          <div className="mt-7 text-center text-[10px] tracking-[0.16em] text-slate-500 leading-5">
            <p>© 2026 Young Age Corporation Co., Ltd.</p>
            <p>&amp; Pharvia 2025 Co., Ltd.</p>
          </div>
        </div>
      </main>
    </div>
  </div>
);

export const NicknameSetupScreen = ({
  defaultValue,
  defaultTitle,
  onSave,
}: {
  defaultValue: string;
  defaultTitle: string;
  onSave: (nickname: string, customTitle: string) => Promise<boolean>;
}) => {
  const [nickname, setNickname] = useState(defaultValue);
  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    const trimmedTitle = customTitle.trim();
    if (!trimmed || !trimmedTitle) return;
    setSaving(true);
    try {
      await onSave(trimmed, trimmedTitle);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-[#FDFAF7] px-6 pt-[calc(3rem+env(safe-area-inset-top))] pb-10">
      <div className="flex flex-col items-center mb-8 animate-in zoom-in duration-400">
        <div className="mb-4"><AppLogo size={68} /></div>
        <h1 className="text-[16px] font-bold text-[#2C2A28] tracking-wide">ตั้งค่าโปรไฟล์ก่อนเริ่มใช้งาน</h1>
        <p className="mt-1 text-center text-[11px] leading-relaxed text-slate-500">ระบุชื่อเล่นและตำแหน่งงานให้ครบเพื่อใช้ในรายงานและหน้า Admin</p>
      </div>

      <div className="panel-card rounded-[22px] p-5 space-y-4">
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
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display title</label>
          <input
            value={customTitle}
            maxLength={40}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder="เช่น Art Director, Graphic Designer"
            className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[14px] font-semibold outline-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim() || !customTitle.trim()}
          className="btn-primary w-full rounded-xl py-3.5 text-[13px] font-bold disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
        </button>
      </div>
    </div>
  );
};
