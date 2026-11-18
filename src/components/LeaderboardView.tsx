import { useMemo } from 'react';
import { Award, Crown, Shield, Terminal, Trophy, UserPlus } from 'lucide-react';
import type { Room, UserProgress } from '../types/platform';
import {
  buildLeaderboardEntries,
  type LeaderboardBadgeTone,
} from '../utils/leaderboard';
import { formatBounty } from '../utils/progress';
import type { SignedUserSession, StoredUserRecord } from '../utils/userAuth';

interface LeaderboardViewProps {
  rooms: Room[];
  registeredUsers: StoredUserRecord[];
  userSession: SignedUserSession | null;
  progress: UserProgress;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const BADGE_STYLE_MAP: Record<LeaderboardBadgeTone, string> = {
  developer:
    'border-emerald-500/45 bg-emerald-500/15 text-emerald-300',
  elite: 'border-amber-500/45 bg-amber-500/15 text-amber-200',
  team: 'border-cyan-500/45 bg-cyan-500/15 text-cyan-200',
  regular: 'border-slate-700 bg-slate-800/70 text-slate-300',
};

export function LeaderboardView({
  rooms,
  registeredUsers,
  userSession,
  progress,
  onOpenAuth,
}: LeaderboardViewProps) {
  const entries = useMemo(
    () =>
      buildLeaderboardEntries({
        rooms,
        registeredUsers,
        activeUserSession: userSession,
        activeProgress: progress,
      }),
    [rooms, registeredUsers, userSession, progress]
  );

  const currentUserEntry = entries.find((e) => e.isCurrentUser) ?? null;

  return (
    <main className="mx-auto max-w-[1360px] space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      {/* Header & Summary Strip */}
      <section className="cyber-grid-bg rounded-2xl border border-slate-800/90 bg-[#0B0F16] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span>الترتيب الحي للمنافسين</span>
            </div>
            <h1 className="font-display mb-2 text-2xl font-bold text-slate-50 sm:text-3xl">
              لوحة المنافسين (Leaderboard)
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              تصنيف تلقائي ومباشر لجميع الأعضاء المسجلين من الأعلى إلى الأقل بناءً على إجمالي نقاط المكافأة (Bounty) المحققة من التحديات، مع بقاء المطور الرئيسي في الصدارة الدائمة.
            </p>
          </div>

          {!userSession && (
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-400"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>سجّل حسابك لدخول الترتيب</span>
            </button>
          )}
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 border-t border-slate-800/90 pt-6 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/30 bg-[#07090D]/90 p-4">
            <p className="mb-1 text-xs text-slate-400">الصدارة الدائمة (#1)</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold text-emerald-300">
                SHADOW · Lord of Chaos
              </span>
              <span
                dir="ltr"
                className="font-mono text-sm font-bold tabular-nums text-emerald-300"
              >
                {formatBounty(entries[0]?.bounty ?? 3_000_000_000)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090D]/90 p-4">
            <p className="mb-1 text-xs text-slate-400">إجمالي المنافسين</p>
            <p
              dir="ltr"
              data-testid="leaderboard-total-count"
              className="font-mono text-xl font-bold tabular-nums text-slate-100 text-right"
            >
              {entries.length}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-[#07090D]/90 p-4">
            <p className="mb-1 text-xs text-slate-400">ترتيبك الحالي</p>
            {currentUserEntry ? (
              <div className="flex items-center justify-between gap-2">
                <span
                  dir="ltr"
                  className="font-mono text-lg font-bold tabular-nums text-cyan-300"
                >
                  #{currentUserEntry.rank}
                </span>
                <span
                  dir="ltr"
                  className="font-mono text-sm font-semibold tabular-nums text-slate-200"
                >
                  {formatBounty(currentUserEntry.bounty)} Bounty
                </span>
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-400">
                زائر — سجّل الدخول للظهور في القائمة
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Dynamic Ranking Table */}
      <section className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#0E131B]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-100">
            جدول الترتيب التنافسي
          </h2>
          <span className="text-xs text-slate-400">
            يُحدَّث تلقائياً عند حل التحديات أو تسجيل حساب جديد
          </span>
        </div>

        <div className="overflow-x-auto">
          <table
            data-testid="leaderboard-table"
            className="w-full text-right text-sm"
          >
            <thead>
              <tr className="border-b border-slate-800 bg-[#07090D] text-xs text-slate-400">
                <th className="px-6 py-3.5 font-medium">المركز</th>
                <th className="px-4 py-3.5 font-medium">المنافس (اللقب)</th>
                <th className="px-4 py-3.5 font-medium">التصنيف والشارة</th>
                <th className="px-4 py-3.5 font-medium">الأعلام</th>
                <th className="px-6 py-3.5 font-medium">النقاط (Bounty)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {entries.map((entry) => {
                const rowHighlight = entry.isDeveloper
                  ? 'bg-emerald-500/[0.06]'
                  : entry.isCurrentUser
                    ? 'bg-cyan-500/[0.06]'
                    : 'hover:bg-slate-800/30';

                return (
                  <tr
                    key={entry.userId}
                    data-testid={`leaderboard-row-${entry.username}`}
                    className={`transition-colors ${rowHighlight}`}
                  >
                    {/* Rank #1, #2, #3... */}
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2">
                        <span
                          dir="ltr"
                          className={`inline-flex min-w-[2.4rem] items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
                            entry.rank === 1
                              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                              : entry.rank === 2
                                ? 'border-amber-500/45 bg-amber-500/10 text-amber-200'
                                : entry.rank === 3
                                  ? 'border-cyan-500/45 bg-cyan-500/10 text-cyan-200'
                                  : 'border-slate-700 bg-[#07090D] text-slate-300'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        {entry.rank === 1 && (
                          <Crown
                            className="h-4 w-4 text-emerald-400"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </td>

                    {/* Nickname + @username */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            entry.isDeveloper
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : entry.badgeTone === 'elite'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                : 'border-slate-700 bg-[#07090D] text-cyan-300'
                          }`}
                        >
                          {entry.isDeveloper ? (
                            <Crown className="h-4 w-4" aria-hidden="true" />
                          ) : entry.badgeTone === 'team' ? (
                            <Shield className="h-4 w-4" aria-hidden="true" />
                          ) : entry.badgeTone === 'elite' ? (
                            <Award className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Terminal className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-100">
                              {entry.nickname}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="rounded border border-cyan-500/40 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                                أنت
                              </span>
                            )}
                          </div>
                          <p
                            dir="ltr"
                            className="text-right font-mono text-[11px] text-slate-400"
                          >
                            @{entry.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE_STYLE_MAP[entry.badgeTone]}`}
                      >
                        {entry.badgeLabelAr}
                      </span>
                    </td>

                    {/* Solved Flags */}
                    <td className="px-4 py-4">
                      <span
                        dir="ltr"
                        className="font-mono text-xs tabular-nums text-slate-300"
                      >
                        {entry.solvedFlags} / {entry.totalFlags}
                      </span>
                    </td>

                    {/* Earned Bounty / Points */}
                    <td className="px-6 py-4">
                      <span
                        dir="ltr"
                        className={`font-mono text-sm font-bold tabular-nums ${
                          entry.isDeveloper
                            ? 'text-emerald-300'
                            : entry.bounty > 0
                              ? 'text-cyan-300'
                              : 'text-slate-400'
                        }`}
                      >
                        {formatBounty(entry.bounty)} Bounty
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
