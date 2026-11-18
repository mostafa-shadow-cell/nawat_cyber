import { ROOMS } from '../data/rooms';
import type {
  Difficulty,
  Room,
  RoomCategory,
  RoomTask,
  UserProgress,
} from '../types/platform';
import {
  detectMaliciousPayload,
  isSafeRecordKey,
  isStrictFlagFormat,
  sanitizeSearchQuery,
  stripControlCharacters,
  timingSafeEqualStrings,
} from './security';

export const STORAGE_KEY = 'nawat_cyber_progress_v1';
export const USER_MAX_BOUNTY = 30_000_000;
export const DEVELOPER_BOUNTY = 3_000_000_000;
export const CLOSE_ATTEMPT_PENALTY = 100;
export const CLOSE_ATTEMPT_BADGE_TEXT = 'علاوة المحاولة +50 تقدم يا بطل كنت قريب';

export function formatBounty(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

export const DIFFICULTY_META: Record<
  Difficulty,
  { labelAr: string; badgeClass: string; dotLabel: string }
> = {
  beginner: {
    labelAr: 'مبتدئ',
    badgeClass:
      'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
    dotLabel: 'سهل',
  },
  intermediate: {
    labelAr: 'متوسط',
    badgeClass: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
    dotLabel: 'متوسط',
  },
  advanced: {
    labelAr: 'متقدم',
    badgeClass: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
    dotLabel: 'صعب',
  },
};

export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  network: 'أمن الشبكات',
  linux: 'أنظمة لينكس',
  web: 'أمن تطبيقات الويب',
  forensics: 'التحليل الجنائي الرقمي',
  crypto: 'التشفير وفك الرموز',
};

export function createInitialProgress(): UserProgress {
  return {
    solvedTaskIds: {},
    lastActiveRoomId: null,
    bountyPenaltyPoints: 0,
    closeAttemptBonusVisible: false,
    closeAttemptCount: 0,
  };
}

export function normalizeFlag(input: string): string {
  return stripControlCharacters(input, false).trim();
}

export function getTaskIntendedBounty(
  taskXp: number,
  rooms: Room[] = ROOMS
): number {
  const maxXp = rooms.reduce((sum, r) => sum + r.totalXp, 0);
  if (maxXp <= 0 || taskXp <= 0) return 0;
  return Math.round((taskXp / maxXp) * USER_MAX_BOUNTY);
}

function stripFlagWrapper(raw: string): string {
  const trimmed = raw.trim();
  const match = /^flag\{([\s\S]*)\}$/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

/**
 * Determines whether a non-matching submission is a warm/close attempt
 * (e.g. case mismatch, missing FLAG{} wrapper, shared segments, or small typo).
 */
export function isCloseFlagAttempt(
  submitted: string,
  expectedFlag: string
): boolean {
  const cleaned = normalizeFlag(submitted);
  const expected = expectedFlag.trim();
  if (!cleaned || !expected) return false;
  if (timingSafeEqualStrings(cleaned, expected)) return false;

  const threat = detectMaliciousPayload(cleaned, { checkSqlInjection: true });
  if (!threat.safe) return false;

  const subUpper = cleaned.toUpperCase();
  const expUpper = expected.toUpperCase();
  if (subUpper === expUpper) return true;

  const innerSub = stripFlagWrapper(subUpper);
  const innerExp = stripFlagWrapper(expUpper);
  if (!innerSub || !innerExp) return false;
  if (innerSub === innerExp) return true;

  const expTokens = innerExp.split(/[_-]+/).filter((t) => t.length >= 3);
  const subTokens = new Set(innerSub.split(/[_-]+/).filter((t) => t.length >= 3));
  let sharedCount = 0;
  for (const tok of expTokens) {
    if (subTokens.has(tok)) sharedCount += 1;
  }
  if (sharedCount >= 2) return true;

  const dist = levenshteinDistance(innerSub, innerExp);
  const threshold = Math.max(3, Math.floor(innerExp.length * 0.35));
  return dist <= threshold;
}

export function validateFlagSubmission(
  submitted: string,
  expectedFlag: string
): {
  valid: boolean;
  reason: 'empty' | 'malicious' | 'invalid_format' | 'mismatch' | 'matched';
  messageAr?: string;
} {
  const cleaned = normalizeFlag(submitted);
  if (!cleaned) {
    return {
      valid: false,
      reason: 'empty',
      messageAr: 'يرجى إدخال قيمة العلم (Flag) قبل الإرسال.',
    };
  }

  const threat = detectMaliciousPayload(cleaned, { checkSqlInjection: true });
  if (!threat.safe) {
    return {
      valid: false,
      reason: 'malicious',
      messageAr: threat.reasonAr,
    };
  }

  if (!isStrictFlagFormat(cleaned)) {
    return {
      valid: false,
      reason: 'invalid_format',
      messageAr:
        'صيغة العلم غير صالحة. يجب أن يطابق التنسيق القياسي FLAG{...} بأحرف وأرقام مسموحة فقط.',
    };
  }

  if (timingSafeEqualStrings(cleaned, expectedFlag.trim())) {
    return { valid: true, reason: 'matched' };
  }
  return {
    valid: false,
    reason: 'mismatch',
    messageAr:
      'قيمة العلم غير صحيحة. تأكد من تنفيذ الأوامر في الطرفية ونسخ العلم كاملاً.',
  };
}

export function markTaskSolved(
  progress: UserProgress,
  roomId: string,
  taskId: string
): UserProgress {
  const existing = progress.solvedTaskIds[roomId] ?? [];
  if (existing.includes(taskId)) {
    return {
      ...progress,
      lastActiveRoomId: roomId,
    };
  }
  return {
    ...progress,
    solvedTaskIds: {
      ...progress.solvedTaskIds,
      [roomId]: [...existing, taskId],
    },
    lastActiveRoomId: roomId,
  };
}

export function getRoomCompletion(room: Room, progress: UserProgress): {
  solvedCount: number;
  totalCount: number;
  percent: number;
  isCompleted: boolean;
  earnedXp: number;
} {
  const solvedIds = new Set(progress.solvedTaskIds[room.id] ?? []);
  const solvedTasks = room.tasks.filter((task) => solvedIds.has(task.id));
  const totalCount = room.tasks.length;
  const solvedCount = solvedTasks.length;
  const percent =
    totalCount === 0 ? 0 : Math.round((solvedCount / totalCount) * 100);
  const earnedXp = solvedTasks.reduce((sum, task) => sum + task.xp, 0);

  return {
    solvedCount,
    totalCount,
    percent,
    isCompleted: totalCount > 0 && solvedCount === totalCount,
    earnedXp,
  };
}

export function getPlatformStats(
  rooms: Room[],
  progress: UserProgress,
  options: { isDeveloperMode?: boolean; isEliteCompletion?: boolean } = {}
): {
  totalXp: number;
  maxXp: number;
  completedRooms: number;
  totalRooms: number;
  solvedFlags: number;
  totalFlags: number;
  rankTitleAr: string;
  userBounty: number;
  displayBounty: number;
  maxUserBounty: number;
  hasCompletedAllChallenges: boolean;
  unlocked30MAchievement: boolean;
} {
  let totalXp = 0;
  let maxXp = 0;
  let completedRooms = 0;
  let solvedFlags = 0;
  let totalFlags = 0;

  for (const room of rooms) {
    maxXp += room.totalXp;
    totalFlags += room.tasks.length;
    const status = getRoomCompletion(room, progress);
    totalXp += status.earnedXp;
    solvedFlags += status.solvedCount;
    if (status.isCompleted) {
      completedRooms += 1;
    }
  }

  const isEliteCompletion = Boolean(options.isEliteCompletion);
  const hasCompletedAllChallenges =
    isEliteCompletion ||
    (rooms.length > 0 && completedRooms === rooms.length && totalXp >= maxXp);

  let grossUserBounty = 0;
  if (hasCompletedAllChallenges) {
    grossUserBounty = USER_MAX_BOUNTY;
  } else if (maxXp > 0 && totalXp > 0) {
    grossUserBounty = Math.min(
      USER_MAX_BOUNTY,
      Math.round((totalXp / maxXp) * USER_MAX_BOUNTY)
    );
  }

  const penaltyPoints = Math.max(
    0,
    Math.floor(progress.bountyPenaltyPoints ?? 0)
  );
  const userBounty = isEliteCompletion
    ? USER_MAX_BOUNTY
    : Math.max(0, grossUserBounty - penaltyPoints);

  const isDeveloperMode = Boolean(options.isDeveloperMode);
  const displayBounty = isDeveloperMode ? DEVELOPER_BOUNTY : userBounty;
  const unlocked30MAchievement = hasCompletedAllChallenges;

  let rankTitleAr = 'متدرب استطلاع';
  if (isDeveloperMode) {
    rankTitleAr = 'المطور الرئيسي (Lord of Chaos)';
  } else if (unlocked30MAchievement) {
    rankTitleAr = 'بطل المنصة (30M Bounty)';
  } else if (totalXp >= 1000) {
    rankTitleAr = 'محلل أمني متقدم';
  } else if (totalXp >= 600) {
    rankTitleAr = 'مختبر اختراق ميداني';
  } else if (totalXp >= 250) {
    rankTitleAr = 'باحث ثغرات مبتدئ';
  }

  return {
    totalXp,
    maxXp,
    completedRooms,
    totalRooms: rooms.length,
    solvedFlags,
    totalFlags,
    rankTitleAr,
    userBounty,
    displayBounty,
    maxUserBounty: USER_MAX_BOUNTY,
    hasCompletedAllChallenges,
    unlocked30MAchievement,
  };
}

/**
 * Applies the Risk & Reward penalty rules on a wrong flag submission:
 * - Developer mode (SHADOW) is completely unaffected (0 penalty).
 * - Close/warm wrong attempt: deducts a small fixed 100-point penalty and activates the encouraging badge.
 * - Regular wrong attempt: deducts 50% (half) of the challenge's intended bounty reward from current total bounty.
 */
export function applyWrongFlagPenalty(
  progress: UserProgress,
  rooms: Room[],
  task: RoomTask,
  submitted: string,
  options: { isDeveloperMode?: boolean } = {}
): {
  nextProgress: UserProgress;
  isClose: boolean;
  penaltyApplied: number;
  intendedBounty: number;
  remainingBounty: number;
} {
  const intendedBounty = getTaskIntendedBounty(task.xp, rooms);
  const isClose = isCloseFlagAttempt(submitted, task.flag);

  if (options.isDeveloperMode) {
    return {
      nextProgress: progress,
      isClose,
      penaltyApplied: 0,
      intendedBounty,
      remainingBounty: DEVELOPER_BOUNTY,
    };
  }

  const currentStats = getPlatformStats(rooms, progress);
  const currentBounty = currentStats.userBounty;
  const rawDeduction = isClose
    ? CLOSE_ATTEMPT_PENALTY
    : Math.round(intendedBounty * 0.5);

  const actualDeduction = Math.min(currentBounty, Math.max(0, rawDeduction));
  const currentPenalty = Math.max(
    0,
    Math.floor(progress.bountyPenaltyPoints ?? 0)
  );

  const nextProgress: UserProgress = {
    ...progress,
    bountyPenaltyPoints: currentPenalty + actualDeduction,
    closeAttemptBonusVisible: isClose
      ? true
      : Boolean(progress.closeAttemptBonusVisible),
    closeAttemptCount: isClose
      ? (progress.closeAttemptCount ?? 0) + 1
      : progress.closeAttemptCount ?? 0,
  };

  return {
    nextProgress,
    isClose,
    penaltyApplied: actualDeduction,
    intendedBounty,
    remainingBounty: Math.max(0, currentBounty - actualDeduction),
  };
}

export interface RoomFilters {
  search: string;
  difficulty: Difficulty | 'all';
  category: RoomCategory | 'all';
  status: 'all' | 'completed' | 'incomplete';
}

export function filterRooms(
  rooms: Room[],
  filters: RoomFilters,
  progress: UserProgress
): Room[] {
  const query = sanitizeSearchQuery(filters.search).toLowerCase();

  return rooms.filter((room) => {
    if (filters.difficulty !== 'all' && room.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters.category !== 'all' && room.category !== filters.category) {
      return false;
    }
    const completion = getRoomCompletion(room, progress);
    if (filters.status === 'completed' && !completion.isCompleted) {
      return false;
    }
    if (filters.status === 'incomplete' && completion.isCompleted) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      room.titleAr,
      room.subtitleAr,
      room.descriptionAr,
      ...room.tools,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function sanitizeStoredProgress(
  raw: unknown,
  rooms: Room[] = ROOMS
): UserProgress {
  if (!raw || typeof raw !== 'object') {
    return createInitialProgress();
  }
  const parsed = raw as Partial<UserProgress>;
  if (!parsed.solvedTaskIds || typeof parsed.solvedTaskIds !== 'object') {
    return createInitialProgress();
  }

  const roomTaskAllowlist = new Map<string, Set<string>>();
  for (const room of rooms) {
    roomTaskAllowlist.set(
      room.id,
      new Set(room.tasks.map((task) => task.id))
    );
  }

  const sanitizedSolved: Record<string, string[]> = {};
  for (const [roomId, taskList] of Object.entries(parsed.solvedTaskIds)) {
    if (!isSafeRecordKey(roomId) || !roomTaskAllowlist.has(roomId)) {
      continue;
    }
    if (!Array.isArray(taskList)) {
      continue;
    }
    const allowedTasks = roomTaskAllowlist.get(roomId)!;
    const cleanTasks = Array.from(
      new Set(
        taskList.filter(
          (id): id is string => typeof id === 'string' && allowedTasks.has(id)
        )
      )
    );
    if (cleanTasks.length > 0) {
      sanitizedSolved[roomId] = cleanTasks;
    }
  }

  const lastActiveRoomId =
    typeof parsed.lastActiveRoomId === 'string' &&
    isSafeRecordKey(parsed.lastActiveRoomId) &&
    roomTaskAllowlist.has(parsed.lastActiveRoomId)
      ? parsed.lastActiveRoomId
      : null;

  const bountyPenaltyPoints =
    typeof parsed.bountyPenaltyPoints === 'number' &&
    Number.isFinite(parsed.bountyPenaltyPoints) &&
    parsed.bountyPenaltyPoints >= 0
      ? Math.min(USER_MAX_BOUNTY, Math.floor(parsed.bountyPenaltyPoints))
      : 0;

  const closeAttemptBonusVisible = Boolean(parsed.closeAttemptBonusVisible);
  const closeAttemptCount =
    typeof parsed.closeAttemptCount === 'number' &&
    Number.isInteger(parsed.closeAttemptCount) &&
    parsed.closeAttemptCount >= 0
      ? parsed.closeAttemptCount
      : 0;

  return {
    solvedTaskIds: sanitizedSolved,
    lastActiveRoomId,
    bountyPenaltyPoints,
    closeAttemptBonusVisible,
    closeAttemptCount,
  };
}

function resolveProgressStorageKey(userId?: string | null): string {
  if (userId && /^[a-zA-Z0-9_-]{3,48}$/.test(userId) && isSafeRecordKey(userId)) {
    return `${STORAGE_KEY}_user_${userId}`;
  }
  return STORAGE_KEY;
}

export function loadProgressFromStorage(userId?: string | null): UserProgress {
  if (typeof window === 'undefined') {
    return createInitialProgress();
  }
  try {
    const key = resolveProgressStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return createInitialProgress();
    }
    const parsed = JSON.parse(raw);
    return sanitizeStoredProgress(parsed, ROOMS);
  } catch {
    return createInitialProgress();
  }
}

export function saveProgressToStorage(
  progress: UserProgress,
  userId?: string | null
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const key = resolveProgressStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearProgressFromStorage(userId?: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const key = resolveProgressStorageKey(userId);
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors cleanly
  }
}
