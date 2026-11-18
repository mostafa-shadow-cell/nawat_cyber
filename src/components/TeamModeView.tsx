import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { SECURITY_HEADERS_AUDIT_LIST } from '../config/securityHeaders';
import type { Room, UserProgress } from '../types/platform';
import { formatBounty, getPlatformStats } from '../utils/progress';
import { isStrictFlagFormat } from '../utils/security';
import {
  TEAM_MAX_FAILED_ATTEMPTS,
  clearTeamSessionFromStorage,
  createDefaultRateLimitState,
  saveAdFreePrivilegeToStorage,
  saveTeamRateLimitToStorage,
  saveTeamSessionToStorage,
  verifyAccessPasswordAttempt,
  verifyKing30MAttempt,
  type AccessRole,
  type RateLimitState,
  type SignedAdFreePrivilege,
  type SignedTeamSession,
} from '../utils/teamAuth';
import type { SignedUserSession } from '../utils/userAuth';
import { GroupChatPanel } from './GroupChatPanel';

interface TeamModeViewProps {
  rooms: Room[];
  progress: UserProgress;
  userSession: SignedUserSession | null;
  session: SignedTeamSession | null;
  rateLimit: RateLimitState;
  adFreePrivilege: SignedAdFreePrivilege | null;
  isEliteCompletion: boolean;
  onSessionChange: (session: SignedTeamSession | null) => void;
  onLogoutAll: () => void;
  onRateLimitChange: (state: RateLimitState) => void;
  onAdFreePrivilegeChange: (priv: SignedAdFreePrivilege | null) => void;
  onSelectRoom: (roomId: string) => void;
  onKingUnlockSuccess?: (priv: SignedAdFreePrivilege) => void;
  onFailedAuthAttempt?: (payload: {
    identifier: string;
    contextLabelAr: string;
    reasonAr: string;
    remainingAttempts: number;
    lockedOut: boolean;
  }) => void;
}

function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TeamModeView({
  rooms,
  progress,
  userSession,
  session,
  rateLimit,
  adFreePrivilege,
  isEliteCompletion,
  onSessionChange,
  onLogoutAll,
  onRateLimitChange,
  onAdFreePrivilegeChange,
  onSelectRoom,
  onKingUnlockSuccess,
  onFailedAuthAttempt,
}: TeamModeViewProps) {
  const [targetRole, setTargetRole] = useState<AccessRole>('team_member');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const [kingInput, setKingInput] = useState('');
  const [kingStatus, setKingStatus] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());

  const stats = useMemo(
    () =>
      getPlatformStats(rooms, progress, {
        isDeveloperMode: session?.role === 'developer',
        isEliteCompletion,
      }),
    [rooms, progress, session, isEliteCompletion]
  );

  // Countdown tick for active failed-attempt rate-limit lockout
  useEffect(() => {
    if (!rateLimit.lockedUntil || rateLimit.lockedUntil <= nowTick) return;

    const id = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (rateLimit.lockedUntil && now >= rateLimit.lockedUntil) {
        createDefaultRateLimitState().then((fresh) => {
          onRateLimitChange(fresh);
          saveTeamRateLimitToStorage(fresh);
        });
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [rateLimit, nowTick, onRateLimitChange]);

  const isLockedOut = Boolean(
    rateLimit.lockedUntil && nowTick < rateLimit.lockedUntil
  );
  const lockoutRemainingMs =
    rateLimit.lockedUntil && nowTick < rateLimit.lockedUntil
      ? rateLimit.lockedUntil - nowTick
      : 0;
  const remainingAttempts =
    TEAM_MAX_FAILED_ATTEMPTS - rateLimit.failedAttempts;

  const handleAuthenticate = async (e: FormEvent) => {
    e.preventDefault();
    const { result, nextRateLimit } = await verifyAccessPasswordAttempt(
      password,
      targetRole,
      rateLimit,
      Date.now()
    );

    onRateLimitChange(nextRateLimit);
    saveTeamRateLimitToStorage(nextRateLimit);
    setNowTick(Date.now());

    if (result.authenticated && result.session) {
      saveTeamSessionToStorage(result.session);
      onSessionChange(result.session);
      setPassword('');
      setStatusMessage({ type: 'success', text: result.messageAr });
      return;
    }

    onFailedAuthAttempt?.({
      identifier: userSession?.username ?? targetRole,
      contextLabelAr:
        targetRole === 'developer'
          ? 'بوابة المطور (أوضاع أخرى)'
          : 'بوابة الفريق (Shadow_666)',
      reasonAr: result.messageAr,
      remainingAttempts: result.remainingAttempts,
      lockedOut: result.lockedOut,
    });
    setStatusMessage({ type: 'error', text: result.messageAr });
  };

  const handleKingUnlock = async (e: FormEvent) => {
    e.preventDefault();
    const { result, nextRateLimit } = await verifyKing30MAttempt(
      kingInput,
      stats.unlocked30MAchievement,
      rateLimit,
      Date.now()
    );

    onRateLimitChange(nextRateLimit);
    saveTeamRateLimitToStorage(nextRateLimit);
    setNowTick(Date.now());

    if (result.unlocked && result.privilege) {
      saveAdFreePrivilegeToStorage(result.privilege);
      onAdFreePrivilegeChange(result.privilege);
      onKingUnlockSuccess?.(result.privilege);
      setKingInput('');
      setKingStatus({ type: 'success', text: result.messageAr });
      return;
    }

    onFailedAuthAttempt?.({
      identifier: userSession?.username ?? 'king_gate',
      contextLabelAr: 'بوابة النخبة (The_king_30M)',
      reasonAr: result.messageAr,
      remainingAttempts: result.remainingAttempts,
      lockedOut: result.lockedOut,
    });
    setKingStatus({ type: 'error', text: result.messageAr });
  };

  const handleLogout = () => {
    clearTeamSessionFromStorage();
    onLogoutAll();
    setPassword('');
    setStatusMessage({
      type: 'success',
      text: 'تم إنهاء الجلسة ومسح الرمز الموقّع بأمان.',
    });
  };

  return (
    <main className="mx-auto max-w-[1360px] space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      {!session ? (
        <section
          aria-label="بوابة التحقق لوضع الفريق والمطور"
          className="mx-auto max-w-xl rounded-2xl border border-slate-800/90 bg-[#0B0F16] p-6 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-50">
                بوابة الوصول الموثّق
              </h1>
              <p className="text-xs text-slate-400">
                دخول الفريق للدردشة الجماعية الخاصة أو حساب المطور الرئيسي
              </p>
            </div>
          </div>

          {/* Role Switcher */}
          <div
            role="tablist"
            aria-label="نوع حساب الدخول"
            className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-[#07090D] p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={targetRole === 'team_member'}
              onClick={() => {
                setTargetRole('team_member');
                setStatusMessage(null);
              }}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                targetRole === 'team_member'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              دخول الفريق (الدردشة الخاصة)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={targetRole === 'developer'}
              onClick={() => {
                setTargetRole('developer');
                setStatusMessage(null);
              }}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                targetRole === 'developer'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              حساب المطور (3B Bounty)
            </button>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-slate-300">
            {targetRole === 'team_member'
              ? 'أدخل كلمة مرور الفريق لفتح الدردشة الجماعية الخاصة ولوحة التدقيق. يبدأ أعضاء الفريق رحلتهم من 0 نقطة وحتى حد 30,000,000 نقطة.'
              : 'أدخل كلمة مرور المطور الرئيسي لتفعيل ملف المطور بمكافأة 3,000,000,000 نقطة وإخفاء الإعلانات تلقائياً.'}
          </p>

          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <label htmlFor="team-password-input" className="text-slate-300">
                  {targetRole === 'developer'
                    ? 'كلمة مرور المطور'
                    : 'كلمة مرور الفريق'}
                </label>
                <span
                  dir="ltr"
                  className={`font-mono tabular-nums ${
                    remainingAttempts <= 2
                      ? 'text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  {remainingAttempts} / {TEAM_MAX_FAILED_ATTEMPTS} attempts
                </span>
              </div>

              <div className="relative">
                <input
                  id="team-password-input"
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLockedOut}
                  autoComplete="off"
                  placeholder={
                    targetRole === 'developer'
                      ? 'Enter developer passphrase'
                      : 'Enter team access passphrase'
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#05070A] py-2.5 pr-3.5 pl-10 text-left font-mono text-sm text-cyan-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                  }
                  className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {isLockedOut && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs leading-relaxed text-rose-200"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">
                    تم تفعيل القفل الأمني مؤقتاً (5 محاولات فاشلة)
                  </p>
                  <p className="mt-1 text-rose-300">
                    الوقت المتبقي لإعادة المحاولة:{' '}
                    <span dir="ltr" className="font-mono font-bold tabular-nums">
                      {formatRemainingTime(lockoutRemainingMs)}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {statusMessage && !isLockedOut && (
              <div
                role="status"
                className={`rounded-lg border p-3 text-xs leading-relaxed ${
                  statusMessage.type === 'error'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLockedOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>
                {targetRole === 'developer'
                  ? 'تسجيل دخول المطور'
                  : 'تفعيل وضع الفريق'}
              </span>
            </button>
          </form>
        </section>
      ) : (
        <div className="space-y-8">
          {/* Authenticated Header */}
          <section className="flex flex-col gap-4 rounded-2xl border border-emerald-500/35 bg-[#0B0F16] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                {session.role === 'developer' ? (
                  <Crown className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-bold text-slate-50">
                    {session.role === 'developer'
                      ? 'لوحة المطور الرئيسي (Lord of Chaos)'
                      : 'لوحة الفريق الأمني'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>جلسة موقّعة</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  المكافأة الحالية:{' '}
                  <span
                    dir="ltr"
                    className="font-mono font-bold text-cyan-300 tabular-nums"
                  >
                    {formatBounty(stats.displayBounty)} Bounty
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>إنهاء الجلسة</span>
            </button>
          </section>

          {/* Private Group Chat: Strictly accessible only when authenticated with Shadow_666 (team_member) */}
          {session.role === 'team_member' ? (
            <GroupChatPanel defaultSenderName={userSession?.nickname ?? ''} />
          ) : (
            <section className="rounded-xl border border-slate-800 bg-[#0E131B] p-5 text-xs text-slate-300">
              <p className="font-semibold text-cyan-300">
                الدردشة الجماعية الخاصة محمية بكلمة مرور الفريق
              </p>
              <p className="mt-1 text-slate-400">
                أنت حالياً داخل وضع المطور الرئيسي (مكافأة{' '}
                <span dir="ltr" className="font-mono text-emerald-300">
                  3,000,000,000
                </span>{' '}
                نقطة). للوصول إلى الدردشة الجماعية الخاصة للفريق، سجّل الخروج وادخل عبر تبويب «دخول الفريق».
              </p>
            </section>
          )}

          {/* Room Integrity & Flag Allowlist Audit */}
          <section className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#0E131B]">
            <div className="border-b border-slate-800 px-6 py-4">
              <h2 className="font-display text-base font-bold text-slate-100">
                تدقيق سلامة الغرف والأعلام التقنية
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#07090D] text-xs text-slate-400">
                    <th className="px-6 py-3 font-medium">الغرفة</th>
                    <th className="px-4 py-3 font-medium">عنوان الهدف</th>
                    <th className="px-4 py-3 font-medium">الأعلام</th>
                    <th className="px-4 py-3 font-medium">مطابقة الصيغة</th>
                    <th className="px-6 py-3 font-medium">فتح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {rooms.map((room) => {
                    const allFlagsValid = room.tasks.every((t) =>
                      isStrictFlagFormat(t.flag)
                    );
                    return (
                      <tr key={room.id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-3.5 font-medium text-slate-100">
                          {room.titleAr}
                        </td>
                        <td
                          dir="ltr"
                          className="px-4 py-3.5 text-right font-mono text-xs text-cyan-300 tabular-nums"
                        >
                          {room.targetIp}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-300 tabular-nums">
                          {room.tasks.length}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{allFlagsValid ? 'صالح (Strict)' : 'تحقق'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <button
                            type="button"
                            onClick={() => onSelectRoom(room.id)}
                            className="text-xs font-semibold text-cyan-300 hover:underline"
                          >
                            معاينة
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* HTTP Security Headers Config Summary */}
          <section className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-6">
            <h2 className="font-display mb-4 text-base font-bold text-slate-100">
              ترويسات الحماية HTTP المُعدّة
            </h2>
            <div className="space-y-3">
              {SECURITY_HEADERS_AUDIT_LIST.map((header) => (
                <div
                  key={header.name}
                  className="rounded-lg border border-slate-800 bg-[#07090D] p-3.5"
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span dir="ltr" className="font-mono text-xs font-semibold text-cyan-300">
                      {header.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {header.descriptionAr}
                    </span>
                  </div>
                  <p
                    dir="ltr"
                    className="break-all font-mono text-[11px] text-slate-300"
                  >
                    {header.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Post-Completion Elite Privilege Gate (The_king_30M) */}
      <section
        aria-label="بوابة رمز النخبة بعد الإكمال"
        className="mx-auto max-w-xl rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-100">
              امتياز نخبة الـ 30 مليون (إزالة الإعلانات بعد الإكمال)
            </h2>
          </div>
          <span
            dir="ltr"
            className="font-mono text-xs tabular-nums text-cyan-300"
          >
            {formatBounty(stats.userBounty)} / 30,000,000
          </span>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-slate-300">
          عند إكمال 100% من تحديات المنصة والوصول إلى الحد الأقصى (30,000,000 نقطة)، يفتح لك رمز النخبة الثانوي لإزالة جميع الإعلانات نهائياً مع الاحتفاظ بإنجازاتك.
        </p>

        {adFreePrivilege?.kind === 'king_30m' ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>امتياز النخبة مفعّل — جميع الإعلانات مخفية مع بقاء رصيدك كاملاً.</span>
          </div>
        ) : (
          <form onSubmit={handleKingUnlock} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="king-30m-input" className="sr-only">
                رمز النخبة بعد الإكمال
              </label>
              <input
                id="king-30m-input"
                type="password"
                dir="ltr"
                value={kingInput}
                onChange={(e) => setKingInput(e.target.value)}
                disabled={isLockedOut}
                placeholder={
                  stats.unlocked30MAchievement
                    ? 'Enter post-completion privilege code'
                    : 'Complete all rooms (30M Bounty) to unlock'
                }
                className="flex-1 rounded-lg border border-slate-700 bg-[#05070A] px-3.5 py-2 text-left font-mono text-xs text-amber-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLockedOut}
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 whitespace-nowrap shrink-0 transition-colors hover:bg-amber-500 hover:text-slate-950 disabled:opacity-50"
              >
                تفعيل رمز النخبة
              </button>
            </div>

            {kingStatus && (
              <div
                role="status"
                className={`rounded-lg border p-3 text-xs ${
                  kingStatus.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                }`}
              >
                {kingStatus.text}
              </div>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
