import { Award, Bug, Crown, Flame, Lock, ShieldCheck, Terminal } from 'lucide-react';
import type { AchievementBadge, BadgeTierColor } from '../utils/badges';

interface AchievementBadgesGridProps {
  badges: AchievementBadge[];
  compact?: boolean;
}

const COLOR_STYLES: Record<
  BadgeTierColor,
  { unlockedCard: string; iconBox: string; tag: string }
> = {
  cyan: {
    unlockedCard: 'border-cyan-500/45 bg-cyan-500/[0.07]',
    iconBox: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300',
    tag: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  },
  emerald: {
    unlockedCard: 'border-emerald-500/45 bg-emerald-500/[0.07]',
    iconBox: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    tag: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  },
  amber: {
    unlockedCard: 'border-amber-500/45 bg-amber-500/[0.07]',
    iconBox: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    tag: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
  violet: {
    unlockedCard: 'border-violet-500/45 bg-violet-500/[0.07]',
    iconBox: 'border-violet-500/50 bg-violet-500/15 text-violet-300',
    tag: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
  },
  rose: {
    unlockedCard: 'border-rose-500/45 bg-rose-500/[0.07]',
    iconBox: 'border-rose-500/50 bg-rose-500/15 text-rose-300',
    tag: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  },
};

function BadgeIcon({ id, className }: { id: AchievementBadge['id']; className?: string }) {
  switch (id) {
    case 'first_blood':
      return <Flame className={className} aria-hidden="true" />;
    case 'shadow_initiate':
      return <ShieldCheck className={className} aria-hidden="true" />;
    case 'bug_hunter':
      return <Bug className={className} aria-hidden="true" />;
    case 'elite_hacker':
      return <Terminal className={className} aria-hidden="true" />;
    case 'platform_legend':
      return <Crown className={className} aria-hidden="true" />;
  }
}

export function AchievementBadgesGrid({
  badges,
  compact = false,
}: AchievementBadgesGridProps) {
  const earnedCount = badges.filter((b) => b.earned).length;

  if (compact) {
    const earnedBadges = badges.filter((b) => b.earned);
    return (
      <div
        data-testid="compact-achievement-badges"
        className="flex flex-wrap items-center gap-1.5"
      >
        {earnedBadges.length === 0 ? (
          <span className="text-[11px] text-slate-500">
            لا توجد شارات إنجاز مكتسبة بعد
          </span>
        ) : (
          earnedBadges.map((badge) => {
            const style = COLOR_STYLES[badge.tierColor];
            return (
              <span
                key={badge.id}
                data-testid={`earned-badge-pill-${badge.id}`}
                title={`${badge.codeName} — ${badge.descriptionAr}`}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${style.tag}`}
              >
                <BadgeIcon id={badge.id} className="h-3 w-3" />
                <span dir="ltr" className="font-mono">
                  {badge.codeName}
                </span>
              </span>
            );
          })
        )}
      </div>
    );
  }

  return (
    <section
      data-testid="achievement-badges-section"
      aria-label="شارات الإنجازات السيبرانية"
      className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
            <Award className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-100">
              شارات الإنجازات السيبرانية (Achievement Badges)
            </h2>
            <p className="text-xs text-slate-400">
              تُمنح تلقائياً عند تحقيق معالم القوة والدقة والانضمام للفريق داخل المنصة
            </p>
          </div>
        </div>

        <span
          dir="ltr"
          data-testid="achievement-badges-count"
          className="rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-bold text-cyan-300 tabular-nums"
        >
          {earnedCount} / {badges.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {badges.map((badge) => {
          const style = COLOR_STYLES[badge.tierColor];
          return (
            <article
              key={badge.id}
              data-testid={`achievement-badge-${badge.id}`}
              data-earned={badge.earned ? 'true' : 'false'}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                badge.earned
                  ? style.unlockedCard
                  : 'border-slate-800/80 bg-[#07090D] opacity-75'
              }`}
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                      badge.earned
                        ? style.iconBox
                        : 'border-slate-700 bg-slate-800/70 text-slate-500'
                    }`}
                  >
                    <BadgeIcon id={badge.id} className="h-4 w-4" />
                  </span>

                  {badge.earned ? (
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold ${style.tag}`}
                    >
                      مفتوحة
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                      <span>مغلقة</span>
                    </span>
                  )}
                </div>

                <h3
                  dir="ltr"
                  className="text-right font-mono text-xs font-bold text-slate-100"
                >
                  {badge.codeName}
                </h3>
                <p className="font-display mt-0.5 text-sm font-bold text-cyan-200">
                  {badge.titleAr}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  {badge.descriptionAr}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-2.5 flex items-center justify-between gap-2 text-[10px]">
                <span className="text-slate-500">{badge.criteriaAr}</span>
                <span
                  dir="ltr"
                  className={`font-mono font-semibold tabular-nums ${
                    badge.earned ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {badge.progressText}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
