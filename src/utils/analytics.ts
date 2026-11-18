import type { Room, UserProgress } from '../types/platform';
import { getRoomCompletion, loadProgressFromStorage } from './progress';
import { generateRandomHexToken, isSafeRecordKey } from './security';
import type { StoredUserRecord } from './userAuth';

export interface ActiveSessionHeartbeat {
  lastSeenAt: number;
  label: string;
}

export interface PlatformAnalyticsState {
  totalVisits: number;
  uniqueVisitorIds: string[];
  activeSessionsById: Record<string, ActiveSessionHeartbeat>;
  dailyVisitCounts: Record<string, number>;
}

export interface RoomAnalyticsBreakdown {
  roomId: string;
  titleAr: string;
  completionPercent: number;
  completedUsersCount: number;
}

export interface DailyVisitPoint {
  dateKey: string;
  labelAr: string;
  visits: number;
}

export interface PlatformAnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  activeOnlineSessions: number;
  totalRegisteredUsers: number;
  activeVipMembers: number;
  vipConversionRatePercent: number;
  challengeCompletionRatePercent: number;
  totalSolvedFlagsAcrossUsers: number;
  dailyVisits: DailyVisitPoint[];
  roomBreakdown: RoomAnalyticsBreakdown[];
}

const ANALYTICS_STORAGE_KEY = 'nawat_cyber_platform_analytics_v1';
const VISITOR_ID_STORAGE_KEY = 'nawat_cyber_visitor_token_v1';
const SESSION_TAB_ID_STORAGE_KEY = 'nawat_cyber_tab_session_id_v1';
export const ACTIVE_SESSION_TTL_MS = 2 * 60 * 1000;

export function formatUtcDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createInitialAnalyticsState(): PlatformAnalyticsState {
  return {
    totalVisits: 0,
    uniqueVisitorIds: [],
    activeSessionsById: {},
    dailyVisitCounts: {},
  };
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'vis_ssr_default';
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && /^vis_[a-f0-9]{16}$/.test(existing)) {
      return existing;
    }
    const created = `vis_${generateRandomHexToken(8)}`;
    window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return `vis_${generateRandomHexToken(8)}`;
  }
}

export function getOrCreateTabSessionId(): string {
  if (typeof window === 'undefined') return 'tab_ssr_default';
  try {
    const existing = window.sessionStorage.getItem(SESSION_TAB_ID_STORAGE_KEY);
    if (existing && /^tab_[a-f0-9]{16}$/.test(existing)) {
      return existing;
    }
    const created = `tab_${generateRandomHexToken(8)}`;
    window.sessionStorage.setItem(SESSION_TAB_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return `tab_${generateRandomHexToken(8)}`;
  }
}

export function pruneStaleActiveSessions(
  sessions: Record<string, ActiveSessionHeartbeat>,
  now = Date.now()
): Record<string, ActiveSessionHeartbeat> {
  const next: Record<string, ActiveSessionHeartbeat> = {};
  for (const [id, entry] of Object.entries(sessions)) {
    if (
      isSafeRecordKey(id) &&
      entry &&
      typeof entry.lastSeenAt === 'number' &&
      now - entry.lastSeenAt <= ACTIVE_SESSION_TTL_MS
    ) {
      next[id] = entry;
    }
  }
  return next;
}

export function recordPlatformVisit(
  state: PlatformAnalyticsState,
  params: {
    visitorId: string;
    sessionId: string;
    sessionLabel?: string;
    now?: number;
  }
): PlatformAnalyticsState {
  const now = params.now ?? Date.now();
  const dateKey = formatUtcDateKey(now);
  const prunedSessions = pruneStaleActiveSessions(state.activeSessionsById, now);

  const uniqueSet = new Set(state.uniqueVisitorIds);
  if (isSafeRecordKey(params.visitorId)) {
    uniqueSet.add(params.visitorId);
  }

  const nextSessions = { ...prunedSessions };
  if (isSafeRecordKey(params.sessionId)) {
    nextSessions[params.sessionId] = {
      lastSeenAt: now,
      label: params.sessionLabel ?? 'visitor',
    };
  }

  return {
    totalVisits: state.totalVisits + 1,
    uniqueVisitorIds: Array.from(uniqueSet).slice(-1000),
    activeSessionsById: nextSessions,
    dailyVisitCounts: {
      ...state.dailyVisitCounts,
      [dateKey]: (state.dailyVisitCounts[dateKey] ?? 0) + 1,
    },
  };
}

export function touchAnalyticsHeartbeat(
  state: PlatformAnalyticsState,
  params: {
    visitorId?: string;
    sessionId: string;
    sessionLabel?: string;
    now?: number;
  }
): PlatformAnalyticsState {
  const now = params.now ?? Date.now();
  const pruned = pruneStaleActiveSessions(state.activeSessionsById, now);
  const uniqueSet = new Set(state.uniqueVisitorIds);
  if (params.visitorId && isSafeRecordKey(params.visitorId)) {
    uniqueSet.add(params.visitorId);
  }
  if (isSafeRecordKey(params.sessionId)) {
    pruned[params.sessionId] = {
      lastSeenAt: now,
      label: params.sessionLabel ?? 'visitor',
    };
  }
  return {
    ...state,
    uniqueVisitorIds: Array.from(uniqueSet).slice(-1000),
    activeSessionsById: pruned,
  };
}

export function computePlatformAnalyticsSummary(params: {
  analytics: PlatformAnalyticsState;
  rooms: Room[];
  registeredUsers: StoredUserRecord[];
  vipMap: Record<string, number>;
  activeUserId: string | null;
  activeProgress: UserProgress;
  progressByUserId?: Record<string, UserProgress>;
  now?: number;
}): PlatformAnalyticsSummary {
  const now = params.now ?? Date.now();
  const prunedSessions = pruneStaleActiveSessions(
    params.analytics.activeSessionsById,
    now
  );

  const totalFlagsPerUser = params.rooms.reduce(
    (sum, r) => sum + r.tasks.length,
    0
  );
  const totalRegisteredUsers = params.registeredUsers.length;
  const activeVipMembers = Object.keys(params.vipMap).length;
  const uniqueVisitors = Math.max(
    params.analytics.uniqueVisitorIds.length,
    totalRegisteredUsers
  );
  const activeOnlineSessions = Math.max(1, Object.keys(prunedSessions).length);

  const conversionBase = Math.max(uniqueVisitors, totalRegisteredUsers, 1);
  const vipConversionRatePercent =
    activeVipMembers > 0
      ? Math.min(
          100,
          Math.round((activeVipMembers / conversionBase) * 1000) / 10
        )
      : 0;

  // Aggregate challenge completion across registered users (or active guest if 0 registered)
  const sampleProgressList: UserProgress[] =
    totalRegisteredUsers > 0
      ? params.registeredUsers.map((u) =>
          u.id === params.activeUserId
            ? params.activeProgress
            : params.progressByUserId?.[u.id] ?? loadProgressFromStorage(u.id)
        )
      : [params.activeProgress];

  let totalSolvedFlagsAcrossUsers = 0;
  const roomCompletedCounts: Record<string, number> = {};
  const roomPercentSums: Record<string, number> = {};

  for (const room of params.rooms) {
    roomCompletedCounts[room.id] = 0;
    roomPercentSums[room.id] = 0;
  }

  for (const prog of sampleProgressList) {
    for (const room of params.rooms) {
      const comp = getRoomCompletion(room, prog);
      totalSolvedFlagsAcrossUsers += comp.solvedCount;
      roomPercentSums[room.id] += comp.percent;
      if (comp.isCompleted) {
        roomCompletedCounts[room.id] += 1;
      }
    }
  }

  const totalPossibleFlags =
    Math.max(1, sampleProgressList.length) * Math.max(1, totalFlagsPerUser);
  const challengeCompletionRatePercent =
    totalSolvedFlagsAcrossUsers > 0
      ? Math.min(
          100,
          Math.round((totalSolvedFlagsAcrossUsers / totalPossibleFlags) * 1000) /
            10
        )
      : 0;

  // Build 7-day visit series ending today
  const dailyVisits: DailyVisitPoint[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const dayMs = now - offset * 24 * 60 * 60 * 1000;
    const key = formatUtcDateKey(dayMs);
    let labelAr = key.slice(5);
    try {
      labelAr = new Intl.DateTimeFormat('ar-EG', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(dayMs));
    } catch {
      // keep fallback
    }
    dailyVisits.push({
      dateKey: key,
      labelAr,
      visits: params.analytics.dailyVisitCounts[key] ?? 0,
    });
  }

  const roomBreakdown: RoomAnalyticsBreakdown[] = params.rooms.map((room) => ({
    roomId: room.id,
    titleAr: room.titleAr,
    completionPercent: Math.round(
      roomPercentSums[room.id] / Math.max(1, sampleProgressList.length)
    ),
    completedUsersCount: roomCompletedCounts[room.id],
  }));

  return {
    totalVisits: params.analytics.totalVisits,
    uniqueVisitors,
    activeOnlineSessions,
    totalRegisteredUsers,
    activeVipMembers,
    vipConversionRatePercent,
    challengeCompletionRatePercent,
    totalSolvedFlagsAcrossUsers,
    dailyVisits,
    roomBreakdown,
  };
}

export function sanitizeAnalyticsState(raw: unknown): PlatformAnalyticsState {
  if (!raw || typeof raw !== 'object') return createInitialAnalyticsState();
  const c = raw as Partial<PlatformAnalyticsState>;

  const totalVisits =
    typeof c.totalVisits === 'number' &&
    Number.isFinite(c.totalVisits) &&
    c.totalVisits >= 0
      ? Math.floor(c.totalVisits)
      : 0;

  const uniqueVisitorIds = Array.isArray(c.uniqueVisitorIds)
    ? c.uniqueVisitorIds.filter(
        (id): id is string => typeof id === 'string' && isSafeRecordKey(id)
      )
    : [];

  const activeSessionsById: Record<string, ActiveSessionHeartbeat> = {};
  if (c.activeSessionsById && typeof c.activeSessionsById === 'object') {
    for (const [k, v] of Object.entries(c.activeSessionsById)) {
      if (
        isSafeRecordKey(k) &&
        v &&
        typeof v === 'object' &&
        typeof (v as ActiveSessionHeartbeat).lastSeenAt === 'number' &&
        Number.isFinite((v as ActiveSessionHeartbeat).lastSeenAt)
      ) {
        activeSessionsById[k] = {
          lastSeenAt: (v as ActiveSessionHeartbeat).lastSeenAt,
          label:
            typeof (v as ActiveSessionHeartbeat).label === 'string'
              ? (v as ActiveSessionHeartbeat).label.slice(0, 32)
              : 'visitor',
        };
      }
    }
  }

  const dailyVisitCounts: Record<string, number> = {};
  if (c.dailyVisitCounts && typeof c.dailyVisitCounts === 'object') {
    for (const [k, v] of Object.entries(c.dailyVisitCounts)) {
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(k) &&
        typeof v === 'number' &&
        Number.isFinite(v) &&
        v >= 0
      ) {
        dailyVisitCounts[k] = Math.floor(v);
      }
    }
  }

  return {
    totalVisits,
    uniqueVisitorIds,
    activeSessionsById,
    dailyVisitCounts,
  };
}

export function loadAnalyticsFromStorage(): PlatformAnalyticsState {
  if (typeof window === 'undefined') return createInitialAnalyticsState();
  try {
    const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return createInitialAnalyticsState();
    return sanitizeAnalyticsState(JSON.parse(raw));
  } catch {
    return createInitialAnalyticsState();
  }
}

export function saveAnalyticsToStorage(state: PlatformAnalyticsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
