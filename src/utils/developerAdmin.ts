import type { Room, UserProgress } from '../types/platform';
import type { AccountMetricsRecord } from './accountMetrics';
import {
  createInitialProgress,
  getPlatformStats,
  loadProgressFromStorage,
} from './progress';
import {
  isSafeRecordKey,
  sanitizeTextInput,
} from './security';
import {
  SHADOW_DEVELOPER_PROFILE,
  type SignedUserSession,
  type StoredUserRecord,
  type UserAccountRole,
} from './userAuth';

export interface SpecialAccessRecord {
  userId: string;
  username: string;
  nickname: string;
  email: string;
  role: 'team_member' | 'elite_king';
  joinedTeamAt: number | null;
  unlockedEliteAt: number | null;
  updatedAt: number;
}

export type AdminAuditAction =
  | 'demote'
  | 'ban'
  | 'team_join'
  | 'elite_unlock'
  | 'user_register'
  | 'login_success'
  | 'login_failed'
  | 'broadcast_publish'
  | 'ticket_resolved';

export interface AdminAuditLogEntry {
  id: string;
  action: AdminAuditAction;
  targetUserId: string;
  targetUsername: string;
  targetNickname: string;
  summaryAr: string;
  timestamp: number;
}

export interface AdminTrackedUser {
  userId: string;
  username: string;
  nickname: string;
  email: string;
  role: UserAccountRole;
  isRegisteredUser: boolean;
  joinedAt: number;
  joinedTeamAt: number | null;
  unlockedEliteAt: number | null;
  bounty: number;
  solvedFlags: number;
  totalFlags: number;
  completedRooms: number;
  totalRooms: number;
  activeSeconds: number;
  loginCount: number;
  lastActiveAt: number | null;
  rankTitleAr: string;
}

const SPECIAL_ACCESS_STORAGE_KEY = 'nawat_cyber_special_access_log_v1';
const ADMIN_AUDIT_LOG_STORAGE_KEY = 'nawat_cyber_admin_audit_log_v1';

export function sanitizeSpecialAccessRecords(
  raw: unknown
): SpecialAccessRecord[] {
  if (!Array.isArray(raw)) return [];
  const valid: SpecialAccessRecord[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<SpecialAccessRecord>;
    if (
      typeof c.userId !== 'string' ||
      !c.userId ||
      !isSafeRecordKey(c.userId) ||
      c.userId === SHADOW_DEVELOPER_PROFILE.userId ||
      typeof c.username !== 'string' ||
      !c.username ||
      typeof c.nickname !== 'string' ||
      !c.nickname ||
      typeof c.email !== 'string' ||
      (c.role !== 'team_member' && c.role !== 'elite_king') ||
      typeof c.updatedAt !== 'number' ||
      !Number.isFinite(c.updatedAt)
    ) {
      continue;
    }

    if (seen.has(c.userId)) continue;
    seen.add(c.userId);

    valid.push({
      userId: c.userId,
      username: sanitizeTextInput(c.username, { maxLength: 32 }),
      nickname: sanitizeTextInput(c.nickname, { maxLength: 40 }),
      email: sanitizeTextInput(c.email, { maxLength: 120 }),
      role: c.role,
      joinedTeamAt:
        typeof c.joinedTeamAt === 'number' && Number.isFinite(c.joinedTeamAt)
          ? c.joinedTeamAt
          : null,
      unlockedEliteAt:
        typeof c.unlockedEliteAt === 'number' &&
        Number.isFinite(c.unlockedEliteAt)
          ? c.unlockedEliteAt
          : null,
      updatedAt: c.updatedAt,
    });
  }

  return valid;
}

export function loadSpecialAccessRecords(): SpecialAccessRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SPECIAL_ACCESS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeSpecialAccessRecords(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSpecialAccessRecords(
  records: SpecialAccessRecord[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SPECIAL_ACCESS_STORAGE_KEY,
      JSON.stringify(records)
    );
  } catch {
    // Ignore storage quota failures
  }
}

const VALID_AUDIT_ACTIONS = new Set<AdminAuditAction>([
  'demote',
  'ban',
  'team_join',
  'elite_unlock',
  'user_register',
  'login_success',
  'login_failed',
  'broadcast_publish',
  'ticket_resolved',
]);

export function sanitizeAdminAuditLog(raw: unknown): AdminAuditLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const valid: AdminAuditLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<AdminAuditLogEntry>;
    if (
      typeof c.id !== 'string' ||
      !c.id ||
      typeof c.action !== 'string' ||
      !VALID_AUDIT_ACTIONS.has(c.action as AdminAuditAction) ||
      typeof c.targetUserId !== 'string' ||
      !c.targetUserId ||
      typeof c.targetUsername !== 'string' ||
      typeof c.targetNickname !== 'string' ||
      typeof c.summaryAr !== 'string' ||
      typeof c.timestamp !== 'number' ||
      !Number.isFinite(c.timestamp)
    ) {
      continue;
    }
    valid.push({
      id: c.id,
      action: c.action,
      targetUserId: c.targetUserId,
      targetUsername: sanitizeTextInput(c.targetUsername, { maxLength: 32 }),
      targetNickname: sanitizeTextInput(c.targetNickname, { maxLength: 40 }),
      summaryAr: sanitizeTextInput(c.summaryAr, { maxLength: 200 }),
      timestamp: c.timestamp,
    });
  }
  return valid.slice(0, 100);
}

export function loadAdminAuditLog(): AdminAuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ADMIN_AUDIT_LOG_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeAdminAuditLog(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveAdminAuditLog(entries: AdminAuditLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      ADMIN_AUDIT_LOG_STORAGE_KEY,
      JSON.stringify(entries.slice(0, 100))
    );
  } catch {
    // Ignore storage quota failures
  }
}

export function upsertSpecialAccessRecord(
  records: SpecialAccessRecord[],
  params: {
    userId: string;
    username: string;
    nickname: string;
    email: string;
    kind: 'team_member' | 'elite_king';
    now?: number;
  }
): SpecialAccessRecord[] {
  if (
    !isSafeRecordKey(params.userId) ||
    params.userId === SHADOW_DEVELOPER_PROFILE.userId
  ) {
    return records;
  }

  const now = params.now ?? Date.now();
  const existing = records.find((r) => r.userId === params.userId);
  const nextRole: 'team_member' | 'elite_king' =
    existing?.role === 'elite_king' || params.kind === 'elite_king'
      ? 'elite_king'
      : 'team_member';

  const updated: SpecialAccessRecord = {
    userId: params.userId,
    username: params.username,
    nickname: params.nickname,
    email: params.email,
    role: nextRole,
    joinedTeamAt:
      params.kind === 'team_member'
        ? existing?.joinedTeamAt ?? now
        : existing?.joinedTeamAt ?? null,
    unlockedEliteAt:
      params.kind === 'elite_king'
        ? existing?.unlockedEliteAt ?? now
        : existing?.unlockedEliteAt ?? null,
    updatedAt: now,
  };

  const filtered = records.filter((r) => r.userId !== params.userId);
  return [updated, ...filtered];
}

export function createAuditEntry(params: {
  action: AdminAuditLogEntry['action'];
  targetUserId: string;
  targetUsername: string;
  targetNickname: string;
  summaryAr: string;
  now?: number;
}): AdminAuditLogEntry {
  const now = params.now ?? Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return {
    id: `adm_${now}_${rand}`,
    action: params.action,
    targetUserId: params.targetUserId,
    targetUsername: params.targetUsername,
    targetNickname: params.targetNickname,
    summaryAr: params.summaryAr,
    timestamp: now,
  };
}

export function buildAdminTrackedUsers(params: {
  rooms: Room[];
  registeredUsers: StoredUserRecord[];
  specialAccessRecords: SpecialAccessRecord[];
  accountMetricsMap: Record<string, AccountMetricsRecord>;
  activeUserSession: SignedUserSession | null;
  activeProgress: UserProgress;
  progressByUserId?: Record<string, UserProgress>;
}): AdminTrackedUser[] {
  const specialByUserId = new Map<string, SpecialAccessRecord>();
  for (const rec of params.specialAccessRecords) {
    specialByUserId.set(rec.userId, rec);
  }

  const trackedMap = new Map<string, AdminTrackedUser>();

  // 1. Registered users
  for (const user of params.registeredUsers) {
    if (user.id === SHADOW_DEVELOPER_PROFILE.userId) continue;

    const isCurrent = params.activeUserSession?.userId === user.id;
    const special = specialByUserId.get(user.id);
    const effectiveRole: UserAccountRole = isCurrent
      ? params.activeUserSession!.role
      : special?.role === 'elite_king' || user.role === 'elite_king'
        ? 'elite_king'
        : special?.role === 'team_member' || user.role === 'team_member'
          ? 'team_member'
          : 'user';

    const userProgress = isCurrent
      ? params.activeProgress
      : params.progressByUserId?.[user.id] ?? loadProgressFromStorage(user.id);

    const stats = getPlatformStats(params.rooms, userProgress, {
      isDeveloperMode: false,
      isEliteCompletion: effectiveRole === 'elite_king',
    });

    const metrics = params.accountMetricsMap[user.id];

    trackedMap.set(user.id, {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      role: effectiveRole,
      isRegisteredUser: true,
      joinedAt: user.createdAt,
      joinedTeamAt:
        special?.joinedTeamAt ??
        (effectiveRole === 'team_member' ? user.createdAt : null),
      unlockedEliteAt:
        special?.unlockedEliteAt ??
        (effectiveRole === 'elite_king' || stats.unlocked30MAchievement
          ? user.createdAt
          : null),
      bounty: stats.userBounty,
      solvedFlags: stats.solvedFlags,
      totalFlags: stats.totalFlags,
      completedRooms: stats.completedRooms,
      totalRooms: stats.totalRooms,
      activeSeconds: metrics?.activeSeconds ?? 0,
      loginCount: metrics?.loginCount ?? 0,
      lastActiveAt: metrics?.lastActiveAt ?? null,
      rankTitleAr: stats.rankTitleAr,
    });
  }

  // 2. Standalone Team / Elite users (e.g. Shadow_666 / The_king_30M shortcut accounts)
  for (const rec of params.specialAccessRecords) {
    if (
      rec.userId === SHADOW_DEVELOPER_PROFILE.userId ||
      trackedMap.has(rec.userId)
    ) {
      continue;
    }

    const isCurrent = params.activeUserSession?.userId === rec.userId;
    const userProgress = isCurrent
      ? params.activeProgress
      : params.progressByUserId?.[rec.userId] ??
        loadProgressFromStorage(rec.userId);

    const stats = getPlatformStats(params.rooms, userProgress, {
      isDeveloperMode: false,
      isEliteCompletion: rec.role === 'elite_king',
    });

    const metrics = params.accountMetricsMap[rec.userId];
    const joinedAt =
      metrics?.firstSeenAt ??
      rec.joinedTeamAt ??
      rec.unlockedEliteAt ??
      rec.updatedAt;

    trackedMap.set(rec.userId, {
      userId: rec.userId,
      username: rec.username,
      nickname: rec.nickname,
      email: rec.email,
      role: rec.role,
      isRegisteredUser: false,
      joinedAt,
      joinedTeamAt: rec.joinedTeamAt,
      unlockedEliteAt: rec.unlockedEliteAt,
      bounty: stats.userBounty,
      solvedFlags: stats.solvedFlags,
      totalFlags: stats.totalFlags,
      completedRooms: stats.completedRooms,
      totalRooms: stats.totalRooms,
      activeSeconds: metrics?.activeSeconds ?? 0,
      loginCount: metrics?.loginCount ?? 1,
      lastActiveAt: metrics?.lastActiveAt ?? rec.updatedAt,
      rankTitleAr: stats.rankTitleAr,
    });
  }

  return Array.from(trackedMap.values()).sort((a, b) => {
    if (b.bounty !== a.bounty) return b.bounty - a.bounty;
    const aTime = a.lastActiveAt ?? a.joinedAt;
    const bTime = b.lastActiveAt ?? b.joinedAt;
    return bTime - aTime;
  });
}

export function demoteUserAccount(params: {
  targetUser: Pick<AdminTrackedUser, 'userId' | 'username' | 'nickname'>;
  registeredUsers: StoredUserRecord[];
  specialAccessRecords: SpecialAccessRecord[];
  now?: number;
}): {
  nextUsers: StoredUserRecord[];
  nextSpecialAccessRecords: SpecialAccessRecord[];
  resetProgress: UserProgress;
  auditEntry: AdminAuditLogEntry;
} {
  const now = params.now ?? Date.now();
  const { targetUser } = params;

  const nextUsers = params.registeredUsers.map((u) =>
    u.id === targetUser.userId ? { ...u, role: 'user' as const } : u
  );

  // Strip special team / elite privileges
  const nextSpecialAccessRecords = params.specialAccessRecords.filter(
    (r) => r.userId !== targetUser.userId
  );

  return {
    nextUsers,
    nextSpecialAccessRecords,
    resetProgress: createInitialProgress(),
    auditEntry: createAuditEntry({
      action: 'demote',
      targetUserId: targetUser.userId,
      targetUsername: targetUser.username,
      targetNickname: targetUser.nickname,
      summaryAr: `تم تجريد ${targetUser.nickname} (@${targetUser.username}) من رتبته وتصفير تقدمه إلى 0 نقطة.`,
      now,
    }),
  };
}

export function banUserAccount(params: {
  targetUser: Pick<AdminTrackedUser, 'userId' | 'username' | 'nickname'>;
  registeredUsers: StoredUserRecord[];
  specialAccessRecords: SpecialAccessRecord[];
  accountMetricsMap: Record<string, AccountMetricsRecord>;
  now?: number;
}): {
  nextUsers: StoredUserRecord[];
  nextSpecialAccessRecords: SpecialAccessRecord[];
  nextMetricsMap: Record<string, AccountMetricsRecord>;
  auditEntry: AdminAuditLogEntry;
} {
  const now = params.now ?? Date.now();
  const { targetUser } = params;

  const nextUsers = params.registeredUsers.filter(
    (u) => u.id !== targetUser.userId
  );
  const nextSpecialAccessRecords = params.specialAccessRecords.filter(
    (r) => r.userId !== targetUser.userId
  );

  const nextMetricsMap = { ...params.accountMetricsMap };
  delete nextMetricsMap[targetUser.userId];

  return {
    nextUsers,
    nextSpecialAccessRecords,
    nextMetricsMap,
    auditEntry: createAuditEntry({
      action: 'ban',
      targetUserId: targetUser.userId,
      targetUsername: targetUser.username,
      targetNickname: targetUser.nickname,
      summaryAr: `تم طرد المستخدم ${targetUser.nickname} (@${targetUser.username}) وحذف بياناته نهائياً من المنصة.`,
      now,
    }),
  };
}

export function formatAdminTimestampAr(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
  }
}
