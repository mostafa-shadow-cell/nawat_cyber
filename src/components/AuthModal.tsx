import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  TEAM_MAX_FAILED_ATTEMPTS,
  type RateLimitState,
} from '../utils/teamAuth';
import {
  authenticateUserAccount,
  registerUserAccount,
  type LoginAttemptResult,
  type RegistrationResult,
  type SignedUserSession,
  type StoredUserRecord,
} from '../utils/userAuth';

export type AuthModalMode = 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthModalMode;
  registeredUsers: StoredUserRecord[];
  rateLimit: RateLimitState;
  onClose: () => void;
  onRateLimitChange: (next: RateLimitState) => void;
  onRegisterSuccess: (result: {
    user: StoredUserRecord;
    session: SignedUserSession;
    nextUsers: StoredUserRecord[];
  }) => Promise<void> | void;
  onLoginSuccess: (result: LoginAttemptResult) => Promise<void> | void;
  onFailedAuthAttempt?: (payload: {
    identifier: string;
    contextLabelAr: string;
    reasonAr: string;
    remainingAttempts: number;
    lockedOut: boolean;
  }) => void;
}

function formatLockoutTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function AuthModal({
  isOpen,
  initialMode,
  registeredUsers,
  rateLimit,
  onClose,
  onRateLimitChange,
  onRegisterSuccess,
  onLoginSuccess,
  onFailedAuthAttempt,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Registration fields
  const [regUsername, setRegUsername] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFeedback(null);
      setNowTick(Date.now());
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !rateLimit.lockedUntil || rateLimit.lockedUntil <= nowTick) {
      return;
    }
    const id = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [isOpen, rateLimit.lockedUntil, nowTick]);

  if (!isOpen) return null;

  const isLockedOut = Boolean(
    rateLimit.lockedUntil && nowTick < rateLimit.lockedUntil
  );
  const lockoutRemainingMs =
    rateLimit.lockedUntil && nowTick < rateLimit.lockedUntil
      ? rateLimit.lockedUntil - nowTick
      : 0;
  const remainingAttempts =
    TEAM_MAX_FAILED_ATTEMPTS - rateLimit.failedAttempts;

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { result, nextRateLimit } = await authenticateUserAccount(
        { identifier: loginIdentifier, password: loginPassword },
        registeredUsers,
        rateLimit,
        Date.now()
      );
      onRateLimitChange(nextRateLimit);
      setNowTick(Date.now());

      if (result.authenticated && result.session) {
        setLoginPassword('');
        setLoginIdentifier('');
        await onLoginSuccess(result);
        onClose();
        return;
      }

      onFailedAuthAttempt?.({
        identifier: loginIdentifier.trim() || 'shortcut_key',
        contextLabelAr: 'نافذة تسجيل الدخول',
        reasonAr: result.messageAr,
        remainingAttempts: result.remainingAttempts,
        lockedOut: result.lockedOut,
      });
      setFeedback({ type: 'error', text: result.messageAr });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res: RegistrationResult = await registerUserAccount(
        {
          username: regUsername,
          nickname: regNickname,
          email: regEmail,
          password: regPassword,
        },
        registeredUsers,
        Date.now()
      );

      if (res.success && res.user && res.session) {
        setRegUsername('');
        setRegNickname('');
        setRegEmail('');
        setRegPassword('');
        await onRegisterSuccess({
          user: res.user,
          session: res.session,
          nextUsers: res.nextUsers,
        });
        onClose();
        return;
      }

      setFeedback({ type: 'error', text: res.messageAr });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#0B0F16] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#07090D] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              {mode === 'login' ? (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2
                id="auth-modal-title"
                className="font-display text-base font-bold text-slate-50"
              >
                {mode === 'login'
                  ? 'تسجيل الدخول إلى نواة سايبر'
                  : 'إنشاء حساب متدرب جديد'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'login'
                  ? 'أدخل بياناتك أو استخدم رمز الوصول الخاص'
                  : 'ابدأ رحلتك برصيد 0 نقطة وافتح مسارات التحدي'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الحساب"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-4">
          <div
            role="tablist"
            aria-label="وضع الحساب"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-[#07090D] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setFeedback(null);
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setFeedback(null);
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        </div>

        <div className="p-5">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-login-identifier"
                  className="mb-1.5 block text-xs text-slate-300"
                >
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <input
                  id="auth-login-identifier"
                  type="text"
                  dir="ltr"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  disabled={isLockedOut}
                  autoComplete="username"
                  placeholder="username or email (optional for shortcut)"
                  className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3.5 py-2.5 text-left font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label
                    htmlFor="auth-login-password"
                    className="text-slate-300"
                  >
                    كلمة المرور أو رمز الوصول الخاص
                  </label>
                  <span
                    dir="ltr"
                    className={`font-mono tabular-nums ${
                      remainingAttempts <= 2
                        ? 'text-amber-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {remainingAttempts} / {TEAM_MAX_FAILED_ATTEMPTS}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="auth-login-password"
                    type={showLoginPass ? 'text' : 'password'}
                    dir="ltr"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLockedOut}
                    autoComplete="current-password"
                    placeholder="Enter personal password or shortcut key"
                    className="w-full rounded-lg border border-slate-700 bg-[#05070A] py-2.5 pr-3.5 pl-10 text-left font-mono text-xs text-cyan-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((prev) => !prev)}
                    aria-label={
                      showLoginPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                    }
                    className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showLoginPass ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <p className="rounded-lg border border-slate-800 bg-[#07090D] px-3 py-2 text-[11px] leading-relaxed text-slate-400">
                يدعم تسجيل الدخول حسابك الشخصي المسجل، أو رموز الوصول الخاصة للمطور والنخبة والفريق كاختصار مباشر دون الحاجة لإدخال البريد.
              </p>

              {isLockedOut && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">
                      تم تفعيل القفل الأمني مؤقتاً (5 محاولات فاشلة)
                    </p>
                    <p className="mt-0.5 text-rose-300">
                      المتبقي:{' '}
                      <span dir="ltr" className="font-mono font-bold tabular-nums">
                        {formatLockoutTimer(lockoutRemainingMs)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {feedback && !isLockedOut && (
                <div
                  role="status"
                  className={`rounded-lg border p-3 text-xs leading-relaxed ${
                    feedback.type === 'error'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isLockedOut || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>دخول إلى المنصة</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="auth-reg-username"
                    className="mb-1 block text-xs text-slate-300"
                  >
                    اسم المستخدم (Username)
                  </label>
                  <input
                    id="auth-reg-username"
                    type="text"
                    dir="ltr"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="ahmad_sec"
                    className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-left font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-reg-nickname"
                    className="mb-1 block text-xs text-slate-300"
                  >
                    لقب المستخدم (Nickname)
                  </label>
                  <input
                    id="auth-reg-nickname"
                    type="text"
                    required
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="مثال: صياد الثغرات"
                    className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-reg-email"
                  className="mb-1 block text-xs text-slate-300"
                >
                  البريد الإلكتروني
                </label>
                <input
                  id="auth-reg-email"
                  type="email"
                  dir="ltr"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="operator@example.com"
                  className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-left font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-reg-password"
                  className="mb-1 block text-xs text-slate-300"
                >
                  كلمة المرور الشخصية (6 أحرف فأكثر)
                </label>
                <div className="relative">
                  <input
                    id="auth-reg-password"
                    type={showRegPass ? 'text' : 'password'}
                    dir="ltr"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    className="w-full rounded-lg border border-slate-700 bg-[#05070A] py-2 pr-3 pl-10 text-left font-mono text-xs text-emerald-200 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass((prev) => !prev)}
                    aria-label={
                      showRegPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'
                    }
                    className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showRegPass ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className={`rounded-lg border p-3 text-xs leading-relaxed ${
                    feedback.type === 'error'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span>إنشاء الحساب والبدء (0 Bounty)</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
