import type { Room, UserProgress } from '../types/platform';
import {
  DEVELOPER_BOUNTY,
  getPlatformStats,
  loadProgressFromStorage,
} from './progress';
import {
  SHADOW_DEVELOPER_PROFILE,
  type SignedUserSession,
  type StoredUserRecord,
  type UserAccountRole,
} from './userAuth';

export type LeaderboardBadgeTone = 'developer' | 'elite' | 'team' | 'regular';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  nickname: string;
  role: UserAccountRole;
  bounty: number;
  solvedFlags: number;
  totalFlags: number;
  completedRooms: number;
  totalRooms: number;
  badgeLabelAr: string;
  badgeTone: LeaderboardBadgeTone;
  isDeveloper: boolean;
  isCurrentUser: boolean;
}

export interface BuildLeaderboardParams {
  rooms: Room[];
  registeredUsers: StoredUserRecord[];
  activeUserSession: SignedUserSession | null;
  activeProgress: UserProgress;
  progressByUserId?: Record<string, UserProgress>;
}

function resolveBadge(
  role: UserAccountRole,
  unlocked30M: boolean
): { labelAr: string; tone: LeaderboardBadgeTone } {
  if (role === 'developer') {
    return {
      labelAr: 'المطور الرئيسي · Lord of Chaos',
      tone: 'developer',
    };
  }
  if (role === 'elite_king' || unlocked30M) {
    return {
      labelAr: 'نخبة الـ 30 مليون · Elite 30M',
      tone: 'elite',
    };
  }
  if (role === 'team_member') {
    return {
      labelAr: 'عضو الفريق النخبوي · Elite Team',
      tone: 'team',
    };
  }
  return {
    labelAr: 'هاكر منتظم · Regular Hacker',
    tone: 'regular',
  };
}

export function buildLeaderboardEntries({
  rooms,
  registeredUsers,
  activeUserSession,
  activeProgress,
  progressByUserId,
}: BuildLeaderboardParams): LeaderboardEntry[] {
  const totalFlags = rooms.reduce((sum, r) => sum + r.tasks.length, 0);
  const totalRooms = rooms.length;

  // 1. Developer entry (SHADOW / Lord of Chaos) — permanently #1 at 3,000,000,000 Bounty
  const developerEntry: Omit<LeaderboardEntry, 'rank'> & { sortOrder: number } =
    {
      userId: SHADOW_DEVELOPER_PROFILE.userId,
      username: SHADOW_DEVELOPER_PROFILE.username,
      nickname: SHADOW_DEVELOPER_PROFILE.nickname,
      role: 'developer',
      bounty: DEVELOPER_BOUNTY,
      solvedFlags: totalFlags,
      totalFlags,
      completedRooms: totalRooms,
      totalRooms,
      ...(() => {
        const badge = resolveBadge('developer', false);
        return { badgeLabelAr: badge.labelAr, badgeTone: badge.tone };
      })(),
      isDeveloper: true,
      isCurrentUser: activeUserSession?.role === 'developer',
      sortOrder: -1,
    };

  // 2. Registered users with live or stored progress
  const competitorEntries: Array<
    Omit<LeaderboardEntry, 'rank'> & { createdAt: number }
  > = registeredUsers.map((user) => {
    const isCurrent = activeUserSession?.userId === user.id;
    const effectiveRole: UserAccountRole = isCurrent
      ? activeUserSession.role
      : user.role;

    const userProgress = isCurrent
      ? activeProgress
      : progressByUserId?.[user.id] ?? loadProgressFromStorage(user.id);

    const stats = getPlatformStats(rooms, userProgress, {
      isDeveloperMode: false,
      isEliteCompletion: effectiveRole === 'elite_king',
    });

    const badge = resolveBadge(effectiveRole, stats.unlocked30MAchievement);

    return {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      role: effectiveRole,
      bounty: stats.userBounty,
      solvedFlags: stats.solvedFlags,
      totalFlags: stats.totalFlags,
      completedRooms: stats.completedRooms,
      totalRooms: stats.totalRooms,
      badgeLabelAr: badge.labelAr,
      badgeTone: badge.tone,
      isDeveloper: false,
      isCurrentUser: isCurrent,
      createdAt: user.createdAt,
    };
  });

  // 3. Include active shortcut session (e.g., standalone The_king_30M or Shadow_666)
  // if it's not a registered user and not the developer (who is already #1)
  if (
    activeUserSession &&
    activeUserSession.role !== 'developer' &&
    !registeredUsers.some((u) => u.id === activeUserSession.userId)
  ) {
    const stats = getPlatformStats(rooms, activeProgress, {
      isDeveloperMode: false,
      isEliteCompletion: activeUserSession.role === 'elite_king',
    });
    const badge = resolveBadge(
      activeUserSession.role,
      stats.unlocked30MAchievement
    );
    competitorEntries.push({
      userId: activeUserSession.userId,
      username: activeUserSession.username,
      nickname: activeUserSession.nickname,
      role: activeUserSession.role,
      bounty: stats.userBounty,
      solvedFlags: stats.solvedFlags,
      totalFlags: stats.totalFlags,
      completedRooms: stats.completedRooms,
      totalRooms: stats.totalRooms,
      badgeLabelAr: badge.labelAr,
      badgeTone: badge.tone,
      isDeveloper: false,
      isCurrentUser: true,
      createdAt: activeUserSession.issuedAt,
    });
  }

  // Sort non-developer competitors highest -> lowest by Bounty, then solvedFlags, then createdAt
  competitorEntries.sort((a, b) => {
    if (b.bounty !== a.bounty) {
      return b.bounty - a.bounty;
    }
    if (b.solvedFlags !== a.solvedFlags) {
      return b.solvedFlags - a.solvedFlags;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return a.username.localeCompare(b.username);
  });

  const ordered = [developerEntry, ...competitorEntries];
  return ordered.map((entry, idx) => ({
    rank: idx + 1,
    userId: entry.userId,
    username: entry.username,
    nickname: entry.nickname,
    role: entry.role,
    bounty: entry.bounty,
    solvedFlags: entry.solvedFlags,
    totalFlags: entry.totalFlags,
    completedRooms: entry.completedRooms,
    totalRooms: entry.totalRooms,
    badgeLabelAr: entry.badgeLabelAr,
    badgeTone: entry.badgeTone,
    isDeveloper: entry.isDeveloper,
    isCurrentUser: entry.isCurrentUser,
  }));
}
