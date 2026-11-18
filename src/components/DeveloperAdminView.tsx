import { useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDownToLine,
  Award,
  Ban,
  Banknote,
  BarChart3,
  CheckCircle2,
  Crown,
  Eye,
  History,
  Lock,
  Megaphone,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Ticket,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
} from 'lucide-react';
import type { Room, UserProgress } from '../types/platform';
import type { AccountMetricsRecord } from '../utils/accountMetrics';
import { formatActivityHoursAr } from '../utils/accountMetrics';
import {
  computePlatformAnalyticsSummary,
  type PlatformAnalyticsState,
} from '../utils/analytics';
import {
  BROADCAST_SEVERITY_OPTIONS,
  type BroadcastSeverity,
  type SystemBroadcastAnnouncement,
} from '../utils/broadcastTicker';
import {
  buildAdminTrackedUsers,
  formatAdminTimestampAr,
  type AdminAuditLogEntry,
  type AdminTrackedUser,
  type SpecialAccessRecord,
} from '../utils/developerAdmin';
import {
  getTopicLabelAr,
  type InternalSupportTicket,
} from '../utils/developerContact';
import {
  DEVELOPER_PAYOUT_METHODS,
  getAvailableBalances,
  getPaymentMethodLabelAr,
  getPayoutMethodLabelAr,
  type CurrencyCode,
  type DeveloperPayoutMethodId,
  type PlatformFinanceState,
} from '../utils/finance';
import { formatBounty } from '../utils/progress';
import type { SignedUserSession, StoredUserRecord } from '../utils/userAuth';

type AdminFilterTab = 'all' | 'team' | 'elite' | 'regular';
type AuditFilterTab = 'all' | 'auth' | 'failed' | 'moderation';

interface DeveloperAdminViewProps {
  isDeveloperMode: boolean;
  rooms: Room[];
  registeredUsers: StoredUserRecord[];
  specialAccessRecords: SpecialAccessRecord[];
  accountMetricsMap: Record<string, AccountMetricsRecord>;
  activeUserSession: SignedUserSession | null;
  activeProgress: UserProgress;
  auditLog: AdminAuditLogEntry[];
  financeState: PlatformFinanceState;
  analyticsState: PlatformAnalyticsState;
  vipMap: Record<string, number>;
  broadcast: SystemBroadcastAnnouncement;
  supportTickets: InternalSupportTicket[];
  onPublishBroadcast: (payload: {
    messageAr: string;
    severity: BroadcastSeverity;
  }) => { success: boolean; errorAr?: string };
  onToggleBroadcast: (active: boolean) => void;
  onResolveSupportTicket: (ticketId: string) => void;
  onWithdrawEarnings: (payload: {
    currency: CurrencyCode;
    amount: number;
    method: DeveloperPayoutMethodId;
    destination: string;
  }) => { success: boolean; errorAr?: string };
  onDemoteUser: (user: AdminTrackedUser) => void;
  onBanUser: (user: AdminTrackedUser) => void;
  onBackToRooms: () => void;
}

export function DeveloperAdminView({
  isDeveloperMode,
  rooms,
  registeredUsers,
  specialAccessRecords,
  accountMetricsMap,
  activeUserSession,
  activeProgress,
  auditLog,
  financeState,
  analyticsState,
  vipMap,
  broadcast,
  supportTickets,
  onPublishBroadcast,
  onToggleBroadcast,
  onResolveSupportTicket,
  onWithdrawEarnings,
  onDemoteUser,
  onBanUser,
  onBackToRooms,
}: DeveloperAdminViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<AdminFilterTab>('all');
  const [auditFilterTab, setAuditFilterTab] = useState<AuditFilterTab>('all');
  const [broadcastText, setBroadcastText] = useState(broadcast.messageAr);
  const [broadcastSeverity, setBroadcastSeverity] =
    useState<BroadcastSeverity>(broadcast.severity);
  const [broadcastStatus, setBroadcastStatus] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    userId: string;
    type: 'demote' | 'ban';
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'warning' | 'danger';
    text: string;
  } | null>(null);

  const [withdrawCurrency, setWithdrawCurrency] = useState<CurrencyCode>('EGP');
  const [withdrawMethod, setWithdrawMethod] =
    useState<DeveloperPayoutMethodId>('instapay');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDestination, setWithdrawDestination] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const trackedUsers = useMemo(
    () =>
      buildAdminTrackedUsers({
        rooms,
        registeredUsers,
        specialAccessRecords,
        accountMetricsMap,
        activeUserSession,
        activeProgress,
      }),
    [
      rooms,
      registeredUsers,
      specialAccessRecords,
      accountMetricsMap,
      activeUserSession,
      activeProgress,
    ]
  );

  const analyticsSummary = useMemo(
    () =>
      computePlatformAnalyticsSummary({
        analytics: analyticsState,
        rooms,
        registeredUsers,
        vipMap,
        activeUserId: activeUserSession?.userId ?? null,
        activeProgress,
      }),
    [
      analyticsState,
      rooms,
      registeredUsers,
      vipMap,
      activeUserSession,
      activeProgress,
    ]
  );

  const teamCount = useMemo(
    () =>
      trackedUsers.filter(
        (u) => u.role === 'team_member' || u.joinedTeamAt !== null
      ).length,
    [trackedUsers]
  );

  const eliteCount = useMemo(
    () =>
      trackedUsers.filter(
        (u) => u.role === 'elite_king' || u.unlockedEliteAt !== null
      ).length,
    [trackedUsers]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trackedUsers.filter((user) => {
      if (
        filterTab === 'team' &&
        user.role !== 'team_member' &&
        user.joinedTeamAt === null
      ) {
        return false;
      }
      if (
        filterTab === 'elite' &&
        user.role !== 'elite_king' &&
        user.unlockedEliteAt === null
      ) {
        return false;
      }
      if (filterTab === 'regular' && user.role !== 'user') {
        return false;
      }
      if (!q) return true;
      return (
        user.username.toLowerCase().includes(q) ||
        user.nickname.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });
  }, [trackedUsers, filterTab, searchQuery]);

  if (!isDeveloperMode) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/40 bg-[#0B0F16] p-8">
          <Lock
            className="mx-auto mb-3 h-10 w-10 text-rose-400"
            aria-hidden="true"
          />
          <h1 className="font-display mb-2 text-xl font-bold text-slate-50">
            منطقة محظورة — مخصصة للمطور فقط
          </h1>
          <p className="mb-5 text-sm text-slate-400">
            لا تملك صلاحيات الجذر (SHADOW / Lord of Chaos) لعرض لوحة التحكم السرية.
          </p>
          <button
            type="button"
            onClick={onBackToRooms}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            العودة إلى الغرف التدريبية
          </button>
        </div>
      </main>
    );
  }

  const handleConfirmDemote = (user: AdminTrackedUser) => {
    onDemoteUser(user);
    setPendingAction(null);
    setStatusNotice({
      type: 'warning',
      text: `تم تجريد ${user.nickname} (@${user.username}) من رتبته وتصفير نقاطه وتقدمه إلى 0 فوراً.`,
    });
  };

  const handleConfirmBan = (user: AdminTrackedUser) => {
    onBanUser(user);
    setPendingAction(null);
    setStatusNotice({
      type: 'danger',
      text: `تم طرد ${user.nickname} (@${user.username}) وحذف سجله وبياناته نهائياً من قاعدة المنصة.`,
    });
  };

  return (
    <main
      data-testid="developer-admin-panel"
      className="mx-auto max-w-[1360px] space-y-8 px-4 py-8 sm:px-6 lg:py-10"
    >
      {/* Secret Root Console Header */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-[#0B0F16] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
              <span dir="ltr" className="font-mono tracking-wide">
                ROOT ADMIN CONSOLE · SHADOW // LORD OF CHAOS
              </span>
            </div>
            <h1 className="font-display mb-2 text-2xl font-bold text-slate-50 sm:text-3xl">
              لوحة تحكم المطور السرية
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              مركز قيادة حصري لحساب المطور <span dir="ltr" className="font-mono text-emerald-300">SHADOW</span> لمراقبة المنضمين للفريق وحاملي رمز النخبة، واستعراض ساعات النشاط والمكافآت مع صلاحية التجريد من الرتبة أو الطرد الفوري.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/35 bg-[#07090D] px-5 py-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
              <Crown className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>رصيد المطور المحمي</span>
            </div>
            <p
              dir="ltr"
              className="font-mono text-2xl font-bold text-emerald-300 tabular-nums"
            >
              3,000,000,000
            </p>
          </div>
        </div>
      </section>

      {/* Admin KPI Summary */}
      <section
        aria-label="ملخص إحصائيات المراقبة"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <span>إجمالي المستخدمين المرصودين</span>
          </div>
          <p
            dir="ltr"
            data-testid="admin-total-users"
            className="font-mono text-2xl font-bold text-slate-100 tabular-nums text-right"
          >
            {trackedUsers.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span>أعضاء الفريق (Shadow_666)</span>
          </div>
          <p
            dir="ltr"
            data-testid="admin-team-count"
            className="font-mono text-2xl font-bold text-cyan-300 tabular-nums text-right"
          >
            {teamCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
            <Award className="h-4 w-4 text-amber-300" aria-hidden="true" />
            <span>نخبة الإكمال (The_king_30M)</span>
          </div>
          <p
            dir="ltr"
            data-testid="admin-elite-count"
            className="font-mono text-2xl font-bold text-amber-300 tabular-nums text-right"
          >
            {eliteCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
            <History className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>سجلات الإشراف والتنفيذ</span>
          </div>
          <p
            dir="ltr"
            data-testid="admin-audit-count"
            className="font-mono text-2xl font-bold text-emerald-300 tabular-nums text-right"
          >
            {auditLog.length}
          </p>
        </div>
      </section>

      {statusNotice && (
        <div
          role="status"
          data-testid="admin-action-status"
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold ${
            statusNotice.type === 'danger'
              ? 'border-rose-500/45 bg-rose-500/10 text-rose-200'
              : 'border-amber-500/45 bg-amber-500/10 text-amber-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* System Broadcast Ticker Publisher (شريط إعلانات اللورد) */}
      <section
        data-testid="developer-broadcast-manager"
        aria-label="إدارة شريط إعلانات اللورد"
        className="rounded-2xl border border-cyan-500/35 bg-[#0B0F16] p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-100">
                شريط إعلانات اللورد (System Broadcast Ticker)
              </h2>
              <p className="text-xs text-slate-400">
                بث أحادي الاتجاه يظهر لجميع الزوار والأعضاء في أعلى المنصة (بدون دردشة عامة)
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="admin-broadcast-toggle"
            onClick={() => onToggleBroadcast(!broadcast.active)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              broadcast.active
                ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-300 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-200'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200'
            }`}
          >
            {broadcast.active ? 'البث مفعّل — إخفاء الشريط' : 'الشريط مخفي — تفعيل البث'}
          </button>
        </div>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const res = onPublishBroadcast({
              messageAr: broadcastText,
              severity: broadcastSeverity,
            });
            if (!res.success) {
              setBroadcastStatus({
                type: 'error',
                text: res.errorAr ?? 'تعذر نشر الإعلان.',
              });
              return;
            }
            setBroadcastStatus({
              type: 'success',
              text: 'تم بث إعلان اللورد بنجاح في الشريط العلوي لجميع المستخدمين.',
            });
          }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="lg:col-span-7">
            <label
              htmlFor="admin-broadcast-input"
              className="mb-1.5 block text-xs text-slate-300"
            >
              نص الإعلان أو التحذير الرسمي
            </label>
            <input
              id="admin-broadcast-input"
              type="text"
              required
              maxLength={240}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="اكتب تحذيراً أمنياً أو إعلاناً رسمياً من SHADOW..."
              className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="admin-broadcast-severity"
              className="mb-1.5 block text-xs text-slate-300"
            >
              مستوى التنبيه
            </label>
            <select
              id="admin-broadcast-severity"
              value={broadcastSeverity}
              onChange={(e) =>
                setBroadcastSeverity(e.target.value as BroadcastSeverity)
              }
              className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {BROADCAST_SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.labelAr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end lg:col-span-2">
            <button
              type="submit"
              data-testid="admin-broadcast-publish"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>نشر البث الآن</span>
            </button>
          </div>
        </form>

        {broadcastStatus && (
          <p
            role="status"
            data-testid="admin-broadcast-status"
            className={`mt-3 text-xs font-semibold ${
              broadcastStatus.type === 'success'
                ? 'text-emerald-300'
                : 'text-rose-300'
            }`}
          >
            {broadcastStatus.text}
          </p>
        )}
      </section>

      {/* User Management & Team/Elite Tracking Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-[#0B0F16] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-100">
              سجل إدارة المستخدمين وأعضاء الفريق والنخبة
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              متابعة تواريخ الانضمام، المكافآت، ساعات النشاط، والتحكم الفوري بالرتب والطرد
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <label htmlFor="admin-user-search" className="sr-only">
                بحث عن مستخدم
              </label>
              <input
                id="admin-user-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو اللقب..."
                className="w-full rounded-lg border border-slate-700 bg-[#05070A] py-2 pr-9 pl-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none sm:w-56"
              />
            </div>

            <div
              role="tablist"
              aria-label="تصفية المستخدمين"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#07090D] p-1"
            >
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'team', label: 'الفريق' },
                  { id: 'elite', label: 'النخبة 30M' },
                  { id: 'regular', label: 'المنتظمون' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filterTab === tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    filterTab === tab.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            data-testid="admin-users-table"
            className="w-full text-right text-sm"
          >
            <thead>
              <tr className="border-b border-slate-800 bg-[#07090D] text-xs text-slate-400">
                <th className="px-6 py-3.5 font-medium">المستخدم واللقب</th>
                <th className="px-4 py-3.5 font-medium">الصلاحية والشارة</th>
                <th className="px-4 py-3.5 font-medium">تاريخ الانضمام والتفعيل</th>
                <th className="px-4 py-3.5 font-medium">المكافأة والأعلام</th>
                <th className="px-4 py-3.5 font-medium">ساعات النشاط</th>
                <th className="px-6 py-3.5 font-medium">أوامر المطور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-xs text-slate-400"
                  >
                    لا توجد حسابات مطابقة في السجل حالياً.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isConfirmingDemote =
                    pendingAction?.userId === user.userId &&
                    pendingAction.type === 'demote';
                  const isConfirmingBan =
                    pendingAction?.userId === user.userId &&
                    pendingAction.type === 'ban';

                  return (
                    <tr
                      key={user.userId}
                      data-testid={`admin-user-row-${user.username}`}
                      className="transition-colors hover:bg-slate-800/25"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-100">
                          {user.nickname}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span dir="ltr" className="font-mono text-cyan-300">
                            @{user.username}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span dir="ltr" className="font-mono text-[11px]">
                            {user.email}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {user.role === 'elite_king' ? (
                            <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                              <Crown className="h-3 w-3" aria-hidden="true" />
                              <span>نخبة (The_king_30M)</span>
                            </span>
                          ) : user.role === 'team_member' ? (
                            <span className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                              <ShieldCheck
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span>عضو فريق (Shadow_666)</span>
                            </span>
                          ) : (
                            <span className="inline-flex rounded border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                              {user.rankTitleAr}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {user.isRegisteredUser ? 'حساب مسجل' : 'دخول اختصار'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500">الانضمام: </span>
                          <span>{formatAdminTimestampAr(user.joinedAt)}</span>
                        </div>
                        {user.joinedTeamAt && (
                          <div className="mt-0.5 text-[11px] text-cyan-300">
                            فريق Shadow_666:{' '}
                            {formatAdminTimestampAr(user.joinedTeamAt)}
                          </div>
                        )}
                        {user.unlockedEliteAt && (
                          <div className="mt-0.5 text-[11px] text-amber-300">
                            نخبة 30M:{' '}
                            {formatAdminTimestampAr(user.unlockedEliteAt)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p
                          dir="ltr"
                          className="text-right font-mono text-sm font-bold text-cyan-300 tabular-nums"
                        >
                          {formatBounty(user.bounty)}
                        </p>
                        <p
                          dir="ltr"
                          className="text-right font-mono text-[11px] text-slate-400 tabular-nums"
                        >
                          {user.solvedFlags}/{user.totalFlags} Flags
                        </p>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Activity
                            className="h-3.5 w-3.5 text-emerald-400"
                            aria-hidden="true"
                          />
                          <span>{formatActivityHoursAr(user.activeSeconds)}</span>
                        </div>
                        <p
                          dir="ltr"
                          className="mt-0.5 text-right font-mono text-[11px] text-slate-500 tabular-nums"
                        >
                          Sessions: {user.loginCount}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {isConfirmingDemote ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmDemote(user)}
                              aria-label={`تأكيد تجريد ${user.username}`}
                              className="rounded-md bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400"
                            >
                              تأكيد التجريد
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingAction(null)}
                              className="rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : isConfirmingBan ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmBan(user)}
                              aria-label={`تأكيد طرد ${user.username}`}
                              className="rounded-md bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-rose-400"
                            >
                              تأكيد الطرد
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingAction(null)}
                              className="rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  userId: user.userId,
                                  type: 'demote',
                                })
                              }
                              aria-label={`تجريد ${user.username} من الرتبة`}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
                            >
                              <UserMinus
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span>تجريد الرتبة</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({
                                  userId: user.userId,
                                  type: 'ban',
                                })
                              }
                              aria-label={`طرد ${user.username} من المنصة`}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
                            >
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>طرد</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security Audit Logs (سجل الأمان والنشاط) */}
      {(() => {
        const regCount = auditLog.filter(
          (e) => e.action === 'user_register'
        ).length;
        const loginCount = auditLog.filter(
          (e) => e.action === 'login_success'
        ).length;
        const failedCount = auditLog.filter(
          (e) => e.action === 'login_failed'
        ).length;

        const filteredAudit = auditLog.filter((entry) => {
          if (auditFilterTab === 'auth') {
            return (
              entry.action === 'user_register' ||
              entry.action === 'login_success' ||
              entry.action === 'login_failed'
            );
          }
          if (auditFilterTab === 'failed') {
            return entry.action === 'login_failed';
          }
          if (auditFilterTab === 'moderation') {
            return (
              entry.action === 'demote' ||
              entry.action === 'ban' ||
              entry.action === 'team_join' ||
              entry.action === 'elite_unlock' ||
              entry.action === 'broadcast_publish' ||
              entry.action === 'ticket_resolved'
            );
          }
          return true;
        });

        const getActionBadge = (action: AdminAuditLogEntry['action']) => {
          switch (action) {
            case 'ban':
              return {
                label: 'طرد نهائي',
                cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
              };
            case 'login_failed':
              return {
                label: 'محاولة دخول فاشلة',
                cls: 'border-rose-500/45 bg-rose-500/15 text-rose-200',
              };
            case 'demote':
              return {
                label: 'تجريد الرتبة',
                cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
              };
            case 'elite_unlock':
              return {
                label: 'تفعيل النخبة',
                cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
              };
            case 'user_register':
              return {
                label: 'تسجيل حساب جديد',
                cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
              };
            case 'login_success':
              return {
                label: 'دخول ناجح',
                cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
              };
            case 'broadcast_publish':
              return {
                label: 'بث اللورد',
                cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
              };
            case 'ticket_resolved':
              return {
                label: 'إغلاق تذكرة دعم',
                cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
              };
            default:
              return {
                label: 'انضمام للفريق',
                cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
              };
          }
        };

        return (
          <section
            data-testid="developer-security-audit-log"
            aria-label="سجل الأمان والنشاط"
            className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]"
          >
            <div className="flex flex-col gap-4 border-b border-slate-800 bg-[#0B0F16] px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <History
                    className="h-4 w-4 text-emerald-400"
                    aria-hidden="true"
                  />
                  <h2 className="font-display text-base font-bold text-slate-100">
                    سجل الأمان والنشاط (Security Audit Logs)
                  </h2>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span>
                    تسجيلات:{' '}
                    <strong dir="ltr" className="font-mono text-emerald-300">
                      {regCount}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    دخول ناجح:{' '}
                    <strong dir="ltr" className="font-mono text-cyan-300">
                      {loginCount}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    محاولات فاشلة:{' '}
                    <strong
                      dir="ltr"
                      data-testid="audit-failed-attempts-count"
                      className="font-mono text-rose-300"
                    >
                      {failedCount}
                    </strong>
                  </span>
                </div>
              </div>

              <div
                role="tablist"
                aria-label="تصفية سجل الأمان"
                className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#07090D] p-1"
              >
                {(
                  [
                    { id: 'all', label: 'الكل' },
                    { id: 'auth', label: 'التسجيل والدخول' },
                    { id: 'failed', label: 'محاولات فاشلة' },
                    { id: 'moderation', label: 'الإشراف والنظام' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={auditFilterTab === tab.id}
                    onClick={() => setAuditFilterTab(tab.id)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      auditFilterTab === tab.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-96 divide-y divide-slate-800/70 overflow-y-auto">
              {filteredAudit.length === 0 ? (
                <p className="px-6 py-8 text-center text-xs text-slate-400">
                  لا توجد أحداث أمنية مطابقة في هذا التصنيف حتى الآن. ستظهر هنا فوراً عمليات التسجيل، أوقات الدخول، ومحاولات كلمات المرور الفاشلة.
                </p>
              ) : (
                filteredAudit.slice(0, 40).map((entry) => {
                  const badge = getActionBadge(entry.action);
                  return (
                    <div
                      key={entry.id}
                      data-testid={`audit-entry-${entry.action}`}
                      className="flex flex-col justify-between gap-2 px-6 py-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs text-slate-200">
                          {entry.summaryAr}
                        </span>
                      </div>

                      <span
                        dir="ltr"
                        className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums"
                      >
                        {formatAdminTimestampAr(entry.timestamp)} ·{' '}
                        {new Date(entry.timestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })()}

      {/* Internal Support Tickets Inbox (صندوق تذاكر الدعم الداخلية) */}
      <section
        data-testid="developer-support-tickets"
        aria-label="صندوق تذاكر الدعم الداخلية"
        className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0B0F16] px-6 py-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-100">
              صندوق تذاكر الدعم الداخلية (Internal Support Inbox)
            </h2>
          </div>
          <span
            dir="ltr"
            className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs text-cyan-300 tabular-nums"
          >
            {supportTickets.filter((t) => t.status === 'open').length} Open /{' '}
            {supportTickets.length} Total
          </span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {supportTickets.length === 0 ? (
            <p className="px-6 py-8 text-center text-xs text-slate-400">
              لا توجد تذاكر دعم داخلية واردة حالياً.
            </p>
          ) : (
            supportTickets.slice(0, 12).map((ticket) => (
              <div
                key={ticket.id}
                data-testid={`admin-ticket-row-${ticket.ticketCode}`}
                className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      dir="ltr"
                      className="font-mono font-bold text-cyan-300"
                    >
                      {ticket.ticketCode}
                    </span>
                    <span className="font-semibold text-slate-100">
                      {ticket.senderName}
                    </span>
                    <span dir="ltr" className="font-mono text-slate-400">
                      (@{ticket.senderUsername})
                    </span>
                    <span className="rounded border border-slate-700 bg-[#07090D] px-2 py-0.5 text-[10px] text-slate-300">
                      {getTopicLabelAr(ticket.topic)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {ticket.message}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {ticket.status === 'resolved' ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>تمت المعالجة</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onResolveSupportTicket(ticket.id)}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500 hover:text-slate-950"
                    >
                      تحديد كـ تمت المعالجة
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Developer Financial & Payout Dashboard (لوحة أرباح المطور) */}
      {(() => {
        const { availableEgp, availableUsd } =
          getAvailableBalances(financeState);
        const activePayoutMeta =
          DEVELOPER_PAYOUT_METHODS.find((m) => m.id === withdrawMethod) ??
          DEVELOPER_PAYOUT_METHODS[0];
        const maxAvailableForSelected =
          withdrawCurrency === 'EGP' ? availableEgp : availableUsd;

        const handleWithdrawSubmit = (e: FormEvent) => {
          e.preventDefault();
          const parsedAmount = Number(withdrawAmount);
          const res = onWithdrawEarnings({
            currency: withdrawCurrency,
            amount: parsedAmount,
            method: withdrawMethod,
            destination: withdrawDestination,
          });
          if (!res.success) {
            setWithdrawStatus({
              type: 'error',
              text: res.errorAr ?? 'تعذر إتمام عملية السحب.',
            });
            return;
          }
          setWithdrawStatus({
            type: 'success',
            text: `تم سحب ${parsedAmount} ${withdrawCurrency} عبر ${activePayoutMeta.labelAr} بنجاح وتحديث الرصيد.`,
          });
          setWithdrawAmount('');
          setWithdrawDestination('');
        };

        return (
          <section
            data-testid="developer-finance-dashboard"
            aria-label="لوحة أرباح المطور والسحب"
            className="space-y-6 rounded-2xl border border-emerald-500/35 bg-[#0B0F16] p-6"
          >
            <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Banknote className="h-4 w-4" aria-hidden="true" />
                  <span>المركز المالي للمطور</span>
                </div>
                <h2 className="font-display text-xl font-bold text-slate-50">
                  لوحة أرباح المطور (Platform Revenue &amp; Payouts)
                </h2>
              </div>
              <span
                dir="ltr"
                data-testid="finance-sales-count"
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-300 tabular-nums"
              >
                VIP Sales: {financeState.sales.length}
              </span>
            </div>

            {/* Live Revenue KPI Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
                <p className="mb-1 text-xs text-slate-400">
                  إجمالي أرباح الجنيه (EGP)
                </p>
                <p
                  dir="ltr"
                  data-testid="finance-total-egp"
                  className="text-right font-mono text-xl font-bold text-emerald-300 tabular-nums"
                >
                  {financeState.totalRevenueEgp.toLocaleString('en-US')} EGP
                </p>
                <p
                  dir="ltr"
                  data-testid="finance-available-egp"
                  className="mt-1 text-right font-mono text-[11px] text-slate-400 tabular-nums"
                >
                  Available: {availableEgp.toLocaleString('en-US')} EGP
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
                <p className="mb-1 text-xs text-slate-400">
                  إجمالي أرباح الدولار (USD)
                </p>
                <p
                  dir="ltr"
                  data-testid="finance-total-usd"
                  className="text-right font-mono text-xl font-bold text-cyan-300 tabular-nums"
                >
                  ${financeState.totalRevenueUsd.toLocaleString('en-US')} USD
                </p>
                <p
                  dir="ltr"
                  data-testid="finance-available-usd"
                  className="mt-1 text-right font-mono text-[11px] text-slate-400 tabular-nums"
                >
                  Available: ${availableUsd.toLocaleString('en-US')} USD
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
                <p className="mb-1 text-xs text-slate-400">
                  المسحوبات (EGP)
                </p>
                <p
                  dir="ltr"
                  data-testid="finance-withdrawn-egp"
                  className="text-right font-mono text-xl font-bold text-amber-300 tabular-nums"
                >
                  {financeState.withdrawnEgp.toLocaleString('en-US')} EGP
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
                <p className="mb-1 text-xs text-slate-400">
                  المسحوبات (USD)
                </p>
                <p
                  dir="ltr"
                  data-testid="finance-withdrawn-usd"
                  className="text-right font-mono text-xl font-bold text-amber-300 tabular-nums"
                >
                  ${financeState.withdrawnUsd.toLocaleString('en-US')} USD
                </p>
              </div>
            </div>

            {/* Withdrawal Section (سحب الأرباح) + Live Sales Ledger */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleWithdrawSubmit}
                data-testid="developer-withdrawal-form"
                className="space-y-4 rounded-xl border border-slate-800 bg-[#0E131B] p-5 lg:col-span-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine
                      className="h-4 w-4 text-emerald-400"
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-base font-bold text-slate-100">
                      سحب الأرباح (Withdraw Earnings)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawAmount(String(maxAvailableForSelected))
                    }
                    className="text-[11px] font-semibold text-cyan-300 hover:underline"
                  >
                    سحب كامل المتاح
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="withdraw-currency-select"
                      className="mb-1 block text-xs text-slate-300"
                    >
                      عملة السحب
                    </label>
                    <select
                      id="withdraw-currency-select"
                      value={withdrawCurrency}
                      onChange={(e) =>
                        setWithdrawCurrency(e.target.value as CurrencyCode)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="EGP">
                        EGP — المتاح ({availableEgp.toLocaleString('en-US')})
                      </option>
                      <option value="USD">
                        USD — المتاح (${availableUsd.toLocaleString('en-US')})
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="withdraw-amount-input"
                      className="mb-1 block text-xs text-slate-300"
                    >
                      المبلغ المطلوب سحبه ({withdrawCurrency})
                    </label>
                    <input
                      id="withdraw-amount-input"
                      type="number"
                      min="1"
                      step="any"
                      dir="ltr"
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={withdrawCurrency === 'EGP' ? '500' : '15'}
                      className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-left font-mono text-xs text-emerald-200 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="withdraw-method-select"
                    className="mb-1 block text-xs text-slate-300"
                  >
                    طريقة استلام الأرباح
                  </label>
                  <select
                    id="withdraw-method-select"
                    value={withdrawMethod}
                    onChange={(e) =>
                      setWithdrawMethod(
                        e.target.value as DeveloperPayoutMethodId
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                  >
                    {DEVELOPER_PAYOUT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="withdraw-destination-input"
                    className="mb-1 block text-xs text-slate-300"
                  >
                    {activePayoutMeta.destinationLabelAr}
                  </label>
                  <input
                    id="withdraw-destination-input"
                    type="text"
                    dir="ltr"
                    required
                    value={withdrawDestination}
                    onChange={(e) => setWithdrawDestination(e.target.value)}
                    placeholder={activePayoutMeta.destinationPlaceholder}
                    className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3 py-2 text-left font-mono text-xs text-cyan-200 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {withdrawStatus && (
                  <div
                    role="status"
                    data-testid="withdraw-status-message"
                    className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
                      withdrawStatus.type === 'success'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    {withdrawStatus.type === 'success' && (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                    )}
                    <span>{withdrawStatus.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="withdraw-submit-btn"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  <span>سحب الأرباح الآن</span>
                </button>
              </form>

              {/* Sales & Payouts History */}
              <div className="space-y-4 lg:col-span-6">
                <div className="rounded-xl border border-slate-800 bg-[#0E131B] p-5">
                  <h3 className="font-display mb-3 text-sm font-bold text-slate-100">
                    أحدث مبيعات عضوية VIP
                  </h3>
                  {financeState.sales.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      لا توجد مبيعات VIP مسجلة حتى الآن.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {financeState.sales.slice(0, 6).map((sale) => (
                        <div
                          key={sale.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#07090D] px-3 py-2.5 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-100">
                              {sale.buyerNickname}
                            </span>{' '}
                            <span dir="ltr" className="font-mono text-cyan-300">
                              (@{sale.buyerUsername})
                            </span>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {getPaymentMethodLabelAr(sale.paymentMethod)} ·{' '}
                              <span dir="ltr" className="font-mono text-slate-500">
                                {sale.countryCode}
                              </span>
                            </p>
                          </div>
                          <div className="text-left">
                            <span
                              dir="ltr"
                              className="block font-mono font-bold text-emerald-300 tabular-nums"
                            >
                              +{sale.amount} {sale.currency}
                            </span>
                            {sale.localAmount &&
                              sale.localCurrency &&
                              sale.localCurrency !== sale.currency && (
                                <span
                                  dir="ltr"
                                  className="block font-mono text-[10px] text-slate-400 tabular-nums"
                                >
                                  ({sale.localAmount.toLocaleString('en-US')}{' '}
                                  {sale.localCurrency})
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0E131B] p-5">
                  <h3 className="font-display mb-3 text-sm font-bold text-slate-100">
                    سجل عمليات سحب الأرباح
                  </h3>
                  {financeState.payouts.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      لم يتم تنفيذ أي عمليات سحب أرباح بعد.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {financeState.payouts.slice(0, 6).map((payout) => (
                        <div
                          key={payout.id}
                          data-testid={`payout-row-${payout.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#07090D] px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-100">
                              {getPayoutMethodLabelAr(payout.method)}
                            </p>
                            <p
                              dir="ltr"
                              className="mt-0.5 text-right font-mono text-[11px] text-slate-400"
                            >
                              {payout.destination}
                            </p>
                          </div>
                          <span
                            dir="ltr"
                            className="font-mono font-bold text-amber-300 tabular-nums"
                          >
                            -{payout.amount} {payout.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Platform Analytics & Visitor Statistics (إحصائيات المنصة والزوار المباشرة) */}
      <section
        data-testid="developer-analytics-dashboard"
        aria-label="إحصائيات المنصة والزوار المباشرة"
        className="space-y-6 rounded-2xl border border-cyan-500/35 bg-[#0B0F16] p-6"
      >
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span>التحليلات الحية والنمو</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-50">
              إحصائيات المنصة والزوار المباشرة (Platform Analytics)
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
            <span>مباشر من LocalStorage</span>
          </div>
        </div>

        {/* 6 Live Visitor & Growth Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
              <Eye className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>إجمالي زيارات الموقع</span>
            </div>
            <p
              dir="ltr"
              data-testid="analytics-total-visits"
              className="text-right font-mono text-2xl font-bold text-cyan-300 tabular-nums"
            >
              {analyticsSummary.totalVisits.toLocaleString('en-US')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
              <UserCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>الزوار الفريدون (Unique Visitors)</span>
            </div>
            <p
              dir="ltr"
              data-testid="analytics-unique-visitors"
              className="text-right font-mono text-2xl font-bold text-emerald-300 tabular-nums"
            >
              {analyticsSummary.uniqueVisitors.toLocaleString('en-US')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
              <Radio className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>الجلسات النشطة حالياً (Online)</span>
            </div>
            <p
              dir="ltr"
              data-testid="analytics-active-sessions"
              className="text-right font-mono text-2xl font-bold text-slate-100 tabular-nums"
            >
              {analyticsSummary.activeOnlineSessions.toLocaleString('en-US')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
            <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <span>إجمالي المستخدمين المسجلين</span>
            </div>
            <p
              dir="ltr"
              data-testid="analytics-registered-users"
              className="text-right font-mono text-2xl font-bold text-slate-100 tabular-nums"
            >
              {analyticsSummary.totalRegisteredUsers.toLocaleString('en-US')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <span>أعضاء VIP المدفوعون</span>
              </span>
              <span
                dir="ltr"
                className="font-mono text-[11px] font-semibold text-amber-300 tabular-nums"
              >
                {analyticsSummary.vipConversionRatePercent}% تحويل
              </span>
            </div>
            <p
              dir="ltr"
              data-testid="analytics-vip-members"
              className="text-right font-mono text-2xl font-bold text-amber-300 tabular-nums"
            >
              {analyticsSummary.activeVipMembers.toLocaleString('en-US')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#07090D] p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp
                  className="h-4 w-4 text-emerald-400"
                  aria-hidden="true"
                />
                <span>معدل إكمال التحديات</span>
              </span>
              <span
                dir="ltr"
                className="font-mono text-[11px] text-slate-400 tabular-nums"
              >
                {analyticsSummary.totalSolvedFlagsAcrossUsers} Flags
              </span>
            </div>
            <p
              dir="ltr"
              data-testid="analytics-completion-rate"
              className="text-right font-mono text-2xl font-bold text-emerald-300 tabular-nums"
            >
              {analyticsSummary.challengeCompletionRatePercent}%
            </p>
          </div>
        </div>

        {/* Visual Cyber Graphs: Daily Visits Bar Chart + Room Completion & Conversion Funnel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 7-Day Daily Visits Bar Chart */}
          <div className="rounded-xl border border-slate-800 bg-[#0E131B] p-5 lg:col-span-5">
            <h3 className="font-display mb-4 text-sm font-bold text-slate-100">
              توزيع الزيارات اليومية (آخر 7 أيام)
            </h3>
            {(() => {
              const maxVisits = Math.max(
                1,
                ...analyticsSummary.dailyVisits.map((d) => d.visits)
              );
              return (
                <div className="flex h-44 items-end justify-between gap-2 border-b border-slate-800 pb-3 pt-4">
                  {analyticsSummary.dailyVisits.map((point) => {
                    const heightPct = Math.max(
                      point.visits > 0 ? 16 : 4,
                      Math.round((point.visits / maxVisits) * 100)
                    );
                    return (
                      <div
                        key={point.dateKey}
                        className="flex flex-1 flex-col items-center gap-2"
                      >
                        <span
                          dir="ltr"
                          className="font-mono text-[11px] font-semibold text-cyan-300 tabular-nums"
                        >
                          {point.visits}
                        </span>
                        <div className="flex h-28 w-full items-end justify-center">
                          <div
                            title={`${point.dateKey}: ${point.visits}`}
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[28px] rounded-t-md transition-all ${
                              point.visits > 0
                                ? 'bg-gradient-to-t from-cyan-500/80 to-emerald-400'
                                : 'bg-slate-800/70'
                            }`}
                          />
                        </div>
                        <span className="truncate text-[10px] text-slate-400">
                          {point.labelAr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Room Completion Rates & VIP Conversion Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-[#0E131B] p-5 lg:col-span-7">
            <h3 className="font-display mb-4 text-sm font-bold text-slate-100">
              معدل إكمال الغرف التدريبية ونسبة التحويل
            </h3>
            <div className="space-y-3">
              {analyticsSummary.roomBreakdown.map((item) => (
                <div key={item.roomId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-200">
                      {item.titleAr}
                    </span>
                    <span
                      dir="ltr"
                      className="shrink-0 font-mono text-[11px] font-semibold text-cyan-300 tabular-nums"
                    >
                      {item.completionPercent}% ({item.completedUsersCount} مكتمل)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-l from-cyan-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${item.completionPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
