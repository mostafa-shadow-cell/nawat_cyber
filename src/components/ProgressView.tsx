import { useState, type FormEvent } from 'react';
import {
  Award,
  CheckCircle2,
  CreditCard,
  Crown,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import type { Room, UserProgress } from '../types/platform';
import {
  CLOSE_ATTEMPT_BADGE_TEXT,
  DIFFICULTY_META,
  formatBounty,
  getPlatformStats,
  getRoomCompletion,
} from '../utils/progress';
import {
  saveAdFreePrivilegeToStorage,
  saveTeamRateLimitToStorage,
  verifyKing30MAttempt,
  type RateLimitState,
  type SignedAdFreePrivilege,
} from '../utils/teamAuth';
import { evaluateAchievementBadges } from '../utils/badges';
import type { SignedUserSession } from '../utils/userAuth';
import { AchievementBadgesGrid } from './AchievementBadgesGrid';

interface ProgressViewProps {
  rooms: Room[];
  progress: UserProgress;
  userSession: SignedUserSession | null;
  isDeveloperMode: boolean;
  isEliteCompletion: boolean;
  isAdFree: boolean;
  isVipMember: boolean;
  adFreePrivilege: SignedAdFreePrivilege | null;
  rateLimit: RateLimitState;
  onRateLimitChange: (state: RateLimitState) => void;
  onAdFreePrivilegeChange: (priv: SignedAdFreePrivilege | null) => void;
  onSelectRoom: (roomId: string) => void;
  onResetProgress: () => void;
  onOpenStore: () => void;
  onKingUnlockSuccess?: (priv: SignedAdFreePrivilege) => void;
  onFailedAuthAttempt?: (payload: {
    identifier: string;
    contextLabelAr: string;
    reasonAr: string;
    remainingAttempts: number;
    lockedOut: boolean;
  }) => void;
}

export function ProgressView({
  rooms,
  progress,
  userSession,
  isDeveloperMode,
  isEliteCompletion,
  isAdFree,
  isVipMember,
  adFreePrivilege,
  rateLimit,
  onRateLimitChange,
  onAdFreePrivilegeChange,
  onSelectRoom,
  onResetProgress,
  onOpenStore,
  onKingUnlockSuccess,
  onFailedAuthAttempt,
}: ProgressViewProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [kingInput, setKingInput] = useState('');
  const [kingStatus, setKingStatus] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const stats = getPlatformStats(rooms, progress, {
    isDeveloperMode,
    isEliteCompletion,
  });
  const badges = evaluateAchievementBadges({
    rooms,
    progress,
    role: userSession?.role ?? null,
    isDeveloperMode,
    isEliteCompletion,
  });
  const bountyPercent = Math.min(
    100,
    Math.round((stats.userBounty / stats.maxUserBounty) * 100)
  );

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

    if (result.unlocked && result.privilege) {
      saveAdFreePrivilegeToStorage(result.privilege);
      onAdFreePrivilegeChange(result.privilege);
      onKingUnlockSuccess?.(result.privilege);
      setKingInput('');
      setKingStatus({ type: 'success', text: result.messageAr });
      return;
    }

    onFailedAuthAttempt?.({
      identifier: userSession?.username ?? 'progress_king_gate',
      contextLabelAr: 'لوحة التقدم (رمز النخبة)',
      reasonAr: result.messageAr,
      remainingAttempts: result.remainingAttempts,
      lockedOut: result.lockedOut,
    });
    setKingStatus({ type: 'error', text: result.messageAr });
  };

  return (
    <main className="mx-auto max-w-[1360px] space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      {/* Rank & Bounty Summary */}
      <section className="flex flex-col gap-6 rounded-2xl border border-slate-800/90 bg-[#0B0F16] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-400">
            <Award className="h-4 w-4" aria-hidden="true" />
            <span>
              {userSession
                ? `ملف المتدرب: ${userSession.nickname}`
                : 'سجل الإنجاز والمكافآت'}
            </span>
            {userSession && (
              <span dir="ltr" className="font-mono text-slate-400">
                (@{userSession.username})
              </span>
            )}
            {isVipMember && (
              <span className="inline-flex items-center gap-1 rounded border border-amber-500/45 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                <Crown className="h-3 w-3" aria-hidden="true" />
                <span>VIP / Pro</span>
              </span>
            )}
          </div>
          <h1 className="font-display mb-2 text-2xl font-bold text-slate-50 sm:text-3xl">
            {stats.rankTitleAr}
          </h1>
          <p className="text-sm text-slate-300">
            {isDeveloperMode
              ? 'حساب المطور الرئيسي SHADOW نشط — يظهر رصيد المكافأة الكامل للمطور.'
              : 'اكسب نقاط المكافأة تدريجياً بحل التحديات والغرف حتى تصل إلى الحد الأقصى 30,000,000 نقطة.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-slate-400">
              {isDeveloperMode ? 'مكافأة المطور' : 'رصيد المكافأة (Bounty)'}
            </p>
            <p
              dir="ltr"
              className={`font-mono text-2xl font-bold tabular-nums ${
                isDeveloperMode ? 'text-emerald-300' : 'text-cyan-300'
              }`}
            >
              {formatBounty(stats.displayBounty)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">الأعلام المحلولة</p>
            <p
              dir="ltr"
              className="font-mono text-2xl font-bold tabular-nums text-emerald-300"
            >
              {stats.solvedFlags}/{stats.totalFlags}
            </p>
          </div>
        </div>
      </section>

      {/* 30M Bounty Milestone + Post-Completion The_king_30M Gate */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-300" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-100">
                تقدم مكافأة الـ 30 مليون
              </h2>
            </div>
            <span
              dir="ltr"
              className="font-mono text-xs tabular-nums text-cyan-300"
            >
              {bountyPercent}%
            </span>
          </div>

          {progress.closeAttemptBonusVisible && !isDeveloperMode && (
            <div
              data-testid="progress-close-attempt-badge"
              className="mb-2.5 inline-flex items-center rounded-md border border-amber-500/45 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200"
            >
              {CLOSE_ATTEMPT_BADGE_TEXT}
            </div>
          )}

          <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                stats.unlocked30MAchievement ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${bountyPercent}%` }}
            />
          </div>

          <p className="text-xs leading-relaxed text-slate-400">
            الحد الأقصى لمكافأة المستخدمين وأعضاء الفريق هو{' '}
            <span dir="ltr" className="font-mono text-slate-200">
              30,000,000
            </span>{' '}
            نقطة. عند إكمال جميع الغرف تفتح وسام بطل المنصة وإمكانية استخدام رمز النخبة بعد الإكمال.
          </p>
        </div>

        {/* Ad-Free & Elite Privilege Panel */}
        <div className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-slate-100">
              حالة الإعلانات وامتياز النخبة
            </h2>
            {isAdFree ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>بدون إعلانات</span>
              </span>
            ) : (
              <span className="text-xs text-amber-300">إعلانات مفعّلة</span>
            )}
          </div>

          {isAdFree ? (
            <p className="text-xs leading-relaxed text-emerald-200">
              {isDeveloperMode
                ? 'تم إخفاء الإعلانات تلقائياً داخل حساب المطور الرئيسي.'
                : adFreePrivilege?.kind === 'king_30m'
                  ? 'امتياز النخبة مفعّل — جميع الإعلانات مخفية مع الحفاظ على كامل رصيدك (30,000,000).'
                  : 'عضوية Ad-Free Access Pass مفعّلة عبر Google Checkout.'}
            </p>
          ) : (
            <div className="space-y-3">
              <form onSubmit={handleKingUnlock} className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="progress-king-input" className="sr-only">
                  رمز النخبة بعد الإكمال
                </label>
                <input
                  id="progress-king-input"
                  type="password"
                  dir="ltr"
                  value={kingInput}
                  onChange={(e) => setKingInput(e.target.value)}
                  disabled={Boolean(
                    rateLimit.lockedUntil && Date.now() < rateLimit.lockedUntil
                  )}
                  placeholder={
                    stats.unlocked30MAchievement
                      ? 'Enter post-completion privilege code'
                      : 'Complete all rooms (30M) to unlock code'
                  }
                  className="flex-1 rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-left font-mono text-xs text-amber-200 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-200 whitespace-nowrap shrink-0 hover:bg-amber-500 hover:text-slate-950"
                >
                  تفعيل رمز النخبة
                </button>
              </form>

              {kingStatus && (
                <p
                  role="status"
                  className={`text-xs ${
                    kingStatus.type === 'success'
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}
                >
                  {kingStatus.text}
                </p>
              )}

              <button
                type="button"
                onClick={onOpenStore}
                data-testid="progress-vip-upgrade-btn"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500 hover:text-slate-950"
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ترقية إلى عضوية VIP / Pro (500 EGP أو $15 USD)</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Cyberpunk Achievement Badges */}
      <AchievementBadgesGrid badges={badges} />

      {/* Room-by-Room Progress Table */}
      <section className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#0E131B]">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-100">
            تفاصيل التقدم حسب الغرفة
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-[#07090D] text-xs text-slate-400">
                <th className="px-6 py-3.5 font-medium">الغرفة التدريبية</th>
                <th className="px-4 py-3.5 font-medium">المستوى</th>
                <th className="px-4 py-3.5 font-medium">المهام</th>
                <th className="px-4 py-3.5 font-medium">النقاط المكتسبة</th>
                <th className="px-6 py-3.5 font-medium">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rooms.map((room) => {
                const comp = getRoomCompletion(room, progress);
                const diff = DIFFICULTY_META[room.difficulty];
                return (
                  <tr
                    key={room.id}
                    className="transition-colors hover:bg-slate-800/30"
                  >
                    <td className="px-6 py-4 font-medium text-slate-100">
                      <div className="flex items-center gap-2">
                        {comp.isCompleted && (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-400"
                            aria-hidden="true"
                          />
                        )}
                        <span>{room.titleAr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${diff.badgeClass}`}
                      >
                        {diff.labelAr}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs tabular-nums text-slate-300">
                      {comp.solvedCount} / {comp.totalCount} ({comp.percent}%)
                    </td>
                    <td className="px-4 py-4 font-mono text-xs tabular-nums text-cyan-300">
                      {comp.earnedXp} / {room.totalXp} XP
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => onSelectRoom(room.id)}
                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline"
                      >
                        {comp.isCompleted ? 'مراجعة' : 'متابعة'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Safe Progress Reset Control */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-800/80 bg-[#0E131B] p-6 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-200">
            إعادة ضبط سجل التدريب
          </h3>
          <p className="text-xs text-slate-400">
            سيؤدي هذا الإجراء إلى مسح جميع الأعلام المحلولة ونقاط الخبرة للبدء من جديد.
          </p>
        </div>

        {!confirmingReset ? (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>إعادة تعيين التقدم</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResetProgress();
                setConfirmingReset(false);
              }}
              className="rounded-lg bg-rose-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-rose-400"
            >
              تأكيد المسح
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-slate-100"
            >
              إلغاء
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
