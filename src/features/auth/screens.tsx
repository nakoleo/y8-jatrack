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
      <div className="absolute left-[12%] top-[14%] h-72 w-72 rounded-full bg-orange-200/25 blur-3xl lg:h-96 lg:w-96" />
      <div className="absolute right-[8%] bottom-[8%] h-64 w-64 rounded-full bg-[#f0d8c4]/40 blur-3xl lg:h-80 lg:w-80" />
    </div>
    <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/65 bg-white/40 shadow-[0_24px_80px_rgba(44,42,40,0.08)] backdrop-blur-xl lg:min-h-[calc(100dvh-5rem)]">
      <aside className="hidden lg:flex lg:w-[48%] flex-col justify-between bg-[linear-gradient(160deg,#2c2a28_0%,#403b37_52%,#6a5a4f_100%)] px-12 py-14 text-white">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-2">
            <AppLogo size={46} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Jatrack</p>
              <p className="text-[13px] font-medium text-white/82">KPI Tracker</p>
            </div>
          </div>
          <div className="mt-12 max-w-sm">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#f5a855]">Workspace Access</p>
            <h1 className="mt-4 text-[42px] font-light leading-[1.08] tracking-[0.04em]">Track output with one clean workspace.</h1>
            <p className="mt-5 text-[15px] leading-7 text-white/72">
              Google sign-in keeps Drive, Sheets, and team permissions aligned from the first step.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Connected</p>
            <p className="mt-2 text-[18px] font-medium text-white/92">Drive + Sheets</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Access</p>
            <p className="mt-2 text-[18px] font-medium text-white/92">Role-based</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="panel-card w-full max-w-[430px] rounded-[32px] px-6 py-8 sm:px-8 sm:py-10">
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
            <h1 className="text-[22px] font-light text-[#2C2A28] tracking-[0.14em]">Jatrack</h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.32em] text-[#F4823C]">KPI Tracker</p>
          </div>

          <div className="panel-card-soft mt-8 rounded-[24px] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d96f2d]">Google Access</p>
            <p className="mt-2 text-[13px] leading-6 text-slate-600">
              ใช้บัญชี Google ของทีมเพื่อเข้าใช้งานและเชื่อมข้อมูลอัตโนมัติ
            </p>
          </div>

          <div className="mt-6 space-y-3 animate-in slide-in-from-bottom duration-500">
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
            <p className="text-center text-[11px] text-slate-500">เชื่อม Drive และ Sheets ตามบัญชีนี้</p>
          </div>

          <p className="mt-8 text-center text-[10px] tracking-[0.16em] text-slate-500 lg:mt-10">
            © 2026 Young Age Corporation Co., Ltd. &amp; Pharvia 2025 Co., Ltd.
          </p>
        </div>
      </main>
    </div>
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
        <p className="mt-1 text-center text-[11px] leading-relaxed text-slate-500">ใช้สำหรับชื่อรายงานและการอ้างอิงในระบบ</p>
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
        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim()}
          className="btn-primary w-full rounded-xl py-3.5 text-[13px] font-bold disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกชื่อเล่น'}
        </button>
      </div>
    </div>
  );
};
