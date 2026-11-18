import { isSafeRecordKey } from './security';
import type { SignedUserSession } from './userAuth';

export interface AccountMetricsRecord {
  firstSeenAt: number;
  activeSeconds: number;
  loginCount: number;
  lastActiveAt: number;
}

export interface BountyLoginNotification {
  id: string;
  titleAr: string;
  subtitleAr: string;
  nickname: string;
  username: string;
  bounty: number;
  rankTitleAr: string;
  accountAgeAr: string;
  activityHoursAr: string;
  loginCount: number;
  solvedFlags: number;
  totalFlags: number;
  isEliteOrBountyPassword: boolean;
  isDeveloper: boolean;
}

const ACCOUNT_METRICS_STORAGE_KEY = 'nawat_cyber_account_metrics_v1';

export function formatAccountAgeAr(createdAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - createdAt);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) {
    return 'أقل من دقيقة (التسجيل الآن)';
  }
  if (mins < 60) {
    return `منذ ${mins} ${mins === 1 ? 'دقيقة' : mins <= 10 ? 'دقائق' : 'دقيقة'}`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `منذ ${hours} ${hours === 1 ? 'ساعة' : hours <= 10 ? 'ساعات' : 'ساعة'}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `منذ ${days} ${days === 1 ? 'يوم' : days <= 10 ? 'أيام' : 'يوماً'}`;
  }
  const months = Math.floor(days / 30);
  return `منذ ${months} ${months === 1 ? 'شهر' : months <= 10 ? 'أشهر' : 'شهراً'}`;
}

export function formatActivityHoursAr(activeSeconds: number): string {
  const safeSecs = Math.max(0, Math.floor(activeSeconds));
  const hours = safeSecs / 3600;
  const mins = Math.floor(safeSecs / 60);
  if (mins < 1) {
    return `0.0 ساعة (${safeSecs} ثانية نشطة)`;
  }
  return `${hours.toFixed(2)} ساعة (${mins} دقيقة)`;
}

export function sanitizeAccountMetricsMap(
  raw: unknown
): Record<string, AccountMetricsRecord> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, AccountMetricsRecord> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSafeRecordKey(key) || !val || typeof val !== 'object') continue;
    const c = val as Partial<AccountMetricsRecord>;
    if (
      typeof c.firstSeenAt === 'number' &&
      Number.isFinite(c.firstSeenAt) &&
      typeof c.activeSeconds === 'number' &&
      Number.isFinite(c.activeSeconds) &&
      c.activeSeconds >= 0 &&
      typeof c.loginCount === 'number' &&
      Number.isInteger(c.loginCount) &&
      c.loginCount >= 0 &&
      typeof c.lastActiveAt === 'number' &&
      Number.isFinite(c.lastActiveAt)
    ) {
      result[key] = {
        firstSeenAt: c.firstSeenAt,
        activeSeconds: c.activeSeconds,
        loginCount: c.loginCount,
        lastActiveAt: c.lastActiveAt,
      };
    }
  }
  return result;
}

export function loadAccountMetricsMap(): Record<string, AccountMetricsRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ACCOUNT_METRICS_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeAccountMetricsMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveAccountMetricsMap(
  map: Record<string, AccountMetricsRecord>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      ACCOUNT_METRICS_STORAGE_KEY,
      JSON.stringify(map)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function recordAccountLoginInMap(
  map: Record<string, AccountMetricsRecord>,
  userId: string,
  registeredAt: number,
  now = Date.now()
): {
  nextMap: Record<string, AccountMetricsRecord>;
  record: AccountMetricsRecord;
} {
  if (!isSafeRecordKey(userId)) {
    const fallback: AccountMetricsRecord = {
      firstSeenAt: registeredAt,
      activeSeconds: 0,
      loginCount: 1,
      lastActiveAt: now,
    };
    return { nextMap: map, record: fallback };
  }

  const prev = map[userId];
  const record: AccountMetricsRecord = prev
    ? {
        firstSeenAt: Math.min(prev.firstSeenAt, registeredAt),
        activeSeconds: prev.activeSeconds + 15,
        loginCount: prev.loginCount + 1,
        lastActiveAt: now,
      }
    : {
        firstSeenAt: registeredAt,
        activeSeconds: 15,
        loginCount: 1,
        lastActiveAt: now,
      };

  return {
    nextMap: { ...map, [userId]: record },
    record,
  };
}

export function incrementAccountActivityInMap(
  map: Record<string, AccountMetricsRecord>,
  userId: string,
  deltaSeconds: number,
  now = Date.now()
): Record<string, AccountMetricsRecord> {
  if (!isSafeRecordKey(userId) || deltaSeconds <= 0) return map;
  const prev = map[userId] ?? {
    firstSeenAt: now,
    activeSeconds: 0,
    loginCount: 1,
    lastActiveAt: now,
  };
  return {
    ...map,
    [userId]: {
      ...prev,
      activeSeconds: prev.activeSeconds + Math.floor(deltaSeconds),
      lastActiveAt: now,
    },
  };
}

export function buildLoginNotificationData(params: {
  session: SignedUserSession;
  bounty: number;
  rankTitleAr: string;
  solvedFlags: number;
  totalFlags: number;
  metrics: AccountMetricsRecord;
  shortcutKind: 'developer' | 'elite_king' | 'team_member' | null;
  now?: number;
}): BountyLoginNotification {
  const now = params.now ?? Date.now();
  const isDeveloper =
    params.shortcutKind === 'developer' || params.session.role === 'developer';
  const isEliteOrBountyPassword =
    isDeveloper ||
    params.shortcutKind === 'elite_king' ||
    params.shortcutKind === 'team_member' ||
    params.session.role === 'elite_king' ||
    params.session.role === 'team_member';

  let titleAr = `أهلاً بعودتك، ${params.session.nickname}`;
  let subtitleAr = 'تم التحقق من جلستك وتحديث إحصائيات المكافأة الخاصة بك.';

  if (isDeveloper) {
    titleAr = 'تم تفعيل دخول المطور الرئيسي (Lord of Chaos)';
    subtitleAr = 'امتياز المطور نشط — المكافأة القصوى 3,000,000,000 محمية دائماً.';
  } else if (
    params.shortcutKind === 'elite_king' ||
    params.session.role === 'elite_king'
  ) {
    titleAr = 'تم تفعيل كلمة مرور النخبة (The_king_30M)';
    subtitleAr = 'تم فتح شارة إتمام المنصة وإخفاء كافة الإعلانات.';
  } else if (
    params.shortcutKind === 'team_member' ||
    params.session.role === 'team_member'
  ) {
    titleAr = 'تم تفعيل دخول الفريق الأمني (Shadow_666)';
    subtitleAr = 'مرحباً بك في قناة الفريق النخبوية المغلقة.';
  }

  return {
    id: `notif_${now}`,
    titleAr,
    subtitleAr,
    nickname: params.session.nickname,
    username: params.session.username,
    bounty: params.bounty,
    rankTitleAr: params.rankTitleAr,
    accountAgeAr: formatAccountAgeAr(params.metrics.firstSeenAt, now),
    activityHoursAr: formatActivityHoursAr(params.metrics.activeSeconds),
    loginCount: params.metrics.loginCount,
    solvedFlags: params.solvedFlags,
    totalFlags: params.totalFlags,
    isEliteOrBountyPassword,
    isDeveloper,
  };
}
