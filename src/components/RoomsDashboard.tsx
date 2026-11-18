import { useMemo, useState } from 'react';
import { Award, Crown, LogIn, RotateCcw, Search, User, UserPlus } from 'lucide-react';
import type {
  Difficulty,
  Room,
  RoomCategory,
  UserProgress,
} from '../types/platform';
import {
  CATEGORY_LABELS,
  CLOSE_ATTEMPT_BADGE_TEXT,
  filterRooms,
  formatBounty,
  getPlatformStats,
} from '../utils/progress';
import { evaluateAchievementBadges } from '../utils/badges';
import type { SignedUserSession } from '../utils/userAuth';
import { AchievementBadgesGrid } from './AchievementBadgesGrid';
import { AdBanner } from './AdBanner';
import { RoomCard } from './RoomCard';

interface RoomsDashboardProps {
  rooms: Room[];
  progress: UserProgress;
  userSession: SignedUserSession | null;
  isDeveloperMode: boolean;
  isEliteCompletion: boolean;
  isAdFree: boolean;
  isVipMember: boolean;
  onSelectRoom: (roomId: string) => void;
  onOpenStore: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function RoomsDashboard({
  rooms,
  progress,
  userSession,
  isDeveloperMode,
  isEliteCompletion,
  isAdFree,
  isVipMember,
  onSelectRoom,
  onOpenStore,
  onOpenAuth,
}: RoomsDashboardProps) {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [category, setCategory] = useState<RoomCategory | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'completed' | 'incomplete'>('all');

  const stats = useMemo(
    () =>
      getPlatformStats(rooms, progress, {
        isDeveloperMode,
        isEliteCompletion,
      }),
    [rooms, progress, isDeveloperMode, isEliteCompletion]
  );

  const badges = useMemo(
    () =>
      evaluateAchievementBadges({
        rooms,
        progress,
        role: userSession?.role ?? null,
        isDeveloperMode,
        isEliteCompletion,
      }),
    [rooms, progress, userSession?.role, isDeveloperMode, isEliteCompletion]
  );

  const filteredRooms = useMemo(
    () =>
      filterRooms(
        rooms,
        { search, difficulty, category, status },
        progress
      ),
    [rooms, search, difficulty, category, status, progress]
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    difficulty !== 'all' ||
    category !== 'all' ||
    status !== 'all';

  const resetFilters = () => {
    setSearch('');
    setDifficulty('all');
    setCategory('all');
    setStatus('all');
  };

  const difficultyOptions: { id: Difficulty | 'all'; label: string }[] = [
    { id: 'all', label: 'جميع المستويات' },
    { id: 'beginner', label: 'مبتدئ' },
    { id: 'intermediate', label: 'متوسط' },
    { id: 'advanced', label: 'متقدم' },
  ];

  return (
    <main className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:py-10">
      {/* Hero Banner */}
      <section className="cyber-grid-bg mb-8 rounded-2xl border border-slate-800/90 bg-[#0B0F16] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold tracking-wide text-cyan-400">
              بيئة تدريب عملية للأمن السيبراني
            </p>
            <h1
              className="font-display mb-4 text-3xl font-bold leading-tight text-slate-50 sm:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              أتقن مهارات الاختبار الاختراقي والدفاع السيبراني بالعربية
            </h1>
            <p className="text-base leading-relaxed text-slate-300">
              اختر غرفة تدريبية، اتبع الشرح العربي خطوة بخطوة، نفّذ أوامر لينكس والشبكات داخل الطرفية التفاعلية، واجمع مكافآت التحديات حتى حد الـ 30 مليون نقطة.
            </p>
          </div>

          {/* Active Profile Card / Quick Auth Card */}
          <div
            data-testid="dashboard-profile-card"
            className="w-full shrink-0 rounded-xl border border-slate-800 bg-[#07090D]/90 p-4 lg:w-72"
          >
            {userSession ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      isDeveloperMode
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    }`}
                  >
                    {isDeveloperMode ? (
                      <Crown className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <User className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-100">
                      {userSession.nickname}
                    </p>
                    <p
                      dir="ltr"
                      className="truncate text-right font-mono text-[11px] text-cyan-300"
                    >
                      @{userSession.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                  <span className="text-slate-400">الرتبة</span>
                  <span className="font-semibold text-slate-200">
                    {stats.rankTitleAr}
                  </span>
                </div>
                <div className="border-t border-slate-800/80 pt-2">
                  <p className="mb-1.5 text-[11px] text-slate-400">
                    الشارات المكتسبة
                  </p>
                  <AchievementBadgesGrid badges={badges} compact />
                </div>
                {!isDeveloperMode && (
                  <div className="border-t border-slate-800/80 pt-2.5">
                    {isVipMember ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>عضوية VIP / Pro مفعّلة</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenStore}
                        data-testid="dashboard-vip-upgrade-btn"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/45 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500 hover:text-slate-950"
                      >
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>ترقية إلى VIP / Pro</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-100">
                    حساب المتدرب الشخصي
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    سجّل حسابك باسمك ولقبك الخاص لحفظ تقدمك ومكافآتك بأمان.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500 hover:text-slate-950"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>دخول</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>تسجيل جديد</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onOpenStore}
                  data-testid="dashboard-vip-upgrade-btn"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500 hover:text-slate-950"
                >
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>ترقية العضوية إلى VIP</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4-Column Stat Strip */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-800/90 pt-6 sm:grid-cols-4 sm:gap-6">
          <div>
            <p className="mb-1 text-xs text-slate-400">الرتبة الحالية</p>
            <p className="font-display text-base font-bold text-slate-100 sm:text-lg">
              {stats.rankTitleAr}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">
              {isDeveloperMode ? 'مكافأة المطور (Bounty)' : 'رصيد المكافأة (Bounty)'}
            </p>
            <p
              dir="ltr"
              data-testid="dashboard-bounty-value"
              className={`font-mono text-lg font-bold tabular-nums sm:text-xl text-right ${
                isDeveloperMode ? 'text-emerald-300' : 'text-cyan-300'
              }`}
            >
              {isDeveloperMode
                ? formatBounty(stats.displayBounty)
                : `${formatBounty(stats.userBounty)} / ${formatBounty(stats.maxUserBounty)}`}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">الأعلام المستخرجة</p>
            <p
              dir="ltr"
              className="font-mono text-lg font-bold tabular-nums text-emerald-300 sm:text-xl text-right"
            >
              {stats.solvedFlags} / {stats.totalFlags}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-slate-400">الغرف المكتملة</p>
            <p
              dir="ltr"
              className="font-mono text-lg font-bold tabular-nums text-slate-100 sm:text-xl text-right"
            >
              {stats.completedRooms} / {stats.totalRooms}
            </p>
          </div>
        </div>

        {/* Bounty Progress Bar with Encouraging Close-Attempt Badge */}
        {!isDeveloperMode && (
          <div className="mt-5 border-t border-slate-800/70 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  شريط تقدم المكافأة (30M Bounty)
                </span>
                {progress.closeAttemptBonusVisible && (
                  <span
                    data-testid="close-attempt-badge"
                    className="inline-flex items-center rounded-md border border-amber-500/45 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200"
                  >
                    {CLOSE_ATTEMPT_BADGE_TEXT}
                  </span>
                )}
              </div>
              <span
                dir="ltr"
                className="font-mono text-xs tabular-nums text-cyan-300"
              >
                {Math.min(
                  100,
                  Math.round((stats.userBounty / stats.maxUserBounty) * 100)
                )}
                %
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  stats.unlocked30MAchievement ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((stats.userBounty / stats.maxUserBounty) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 30M Achievement Banner upon beating the entire platform */}
      {stats.unlocked30MAchievement && !isDeveloperMode && (
        <section
          aria-label="إنجاز إكمال المنصة"
          className="mb-8 flex flex-col justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <Award className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-emerald-200">
                إنجاز خاص مفتوح: بطل المنصة (30,000,000 Bounty)
              </h2>
              <p className="mt-0.5 text-xs text-slate-300">
                أكملت جميع الغرف والتحديات ووصلت إلى الحد الأقصى! يمكنك الآن استخدام رمز النخبة لإخفاء الإعلانات من لوحة التقدم أو وضع الفريق.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Sponsored Ad Banner (Hidden completely when Ad-Free Pass, The_king_30M, or Developer Mode is active) */}
      {!isAdFree && <AdBanner onOpenStore={onOpenStore} />}

      {/* Filter & Search Toolbar */}
      <section
        aria-label="تصفية الغرف التدريبية"
        className="mb-8 flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-[#0E131B] p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <label htmlFor="rooms-search" className="sr-only">
              ابحث عن غرفة أو أداة
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="rooms-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الغرفة أو الأداة (مثل nmap)..."
              className="w-full rounded-lg border border-slate-700/80 bg-[#07090D] py-2 pr-9 pl-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Segmented Difficulty Tabs */}
          <div
            role="group"
            aria-label="تصفية حسب مستوى الصعوبة"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#07090D] p-1"
          >
            {difficultyOptions.map((opt) => {
              const active = difficulty === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDifficulty(opt.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="category-filter" className="sr-only">
              التخصص
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as RoomCategory | 'all')
              }
              className="rounded-lg border border-slate-700/80 bg-[#07090D] px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">جميع التخصصات</option>
              {(Object.keys(CATEGORY_LABELS) as RoomCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Completion Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="sr-only">
              حالة الإنجاز
            </label>
            <select
              id="status-filter"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as 'all' | 'completed' | 'incomplete'
                )
              }
              className="rounded-lg border border-slate-700/80 bg-[#07090D] px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="incomplete">قيد التقدم</option>
              <option value="completed">المكتملة فقط</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section Heading & Count */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-slate-100">
          الغرف التدريبية المتاحة
        </h2>
        <span className="font-mono text-xs tabular-nums text-slate-400">
          عرض {filteredRooms.length} من {rooms.length} غرفة
        </span>
      </div>

      {/* Rooms Grid or Empty State */}
      {filteredRooms.length > 0 ? (
        <div
          data-testid="rooms-grid"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              progress={progress}
              onSelectRoom={onSelectRoom}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0E131B] px-6 py-16 text-center">
          <p className="font-display mb-2 text-lg font-semibold text-slate-200">
            لم يتم العثور على غرف مطابقة لخيارات البحث
          </p>
          <p className="mb-6 max-w-md text-sm text-slate-400">
            جرّب تعديل كلمات البحث أو إعادة تعيين مرشحات الصعوبة والتخصص لعرض جميع الغرف التدريبية.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500 hover:text-slate-950"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>
      )}
    </main>
  );
}
