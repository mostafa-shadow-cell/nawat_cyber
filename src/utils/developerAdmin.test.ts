import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from '../data/rooms';
import { buildLeaderboardEntries } from './leaderboard';
import {
  banUserAccount,
  buildAdminTrackedUsers,
  demoteUserAccount,
  sanitizeAdminAuditLog,
  sanitizeSpecialAccessRecords,
  upsertSpecialAccessRecord,
} from './developerAdmin';
import {
  createInitialProgress,
  markTaskSolved,
  USER_MAX_BOUNTY,
} from './progress';
import type { StoredUserRecord } from './userAuth';

const sampleUsers: StoredUserRecord[] = [
  {
    id: 'usr_1111111111111111',
    username: 'sara_sec',
    nickname: 'سارة التشفير',
    email: 'sara@example.com',
    passwordSalt: 'a'.repeat(32),
    passwordHash: 'b'.repeat(64),
    role: 'team_member',
    createdAt: 1_700_000_000_000,
  },
  {
    id: 'usr_2222222222222222',
    username: 'omar_30m',
    nickname: 'عمر النخبة',
    email: 'omar@example.com',
    passwordSalt: 'c'.repeat(32),
    passwordHash: 'd'.repeat(64),
    role: 'elite_king',
    createdAt: 1_700_000_100_000,
  },
];

test('upsertSpecialAccessRecord and buildAdminTrackedUsers track team (Shadow_666) and elite (The_king_30M) accounts accurately', () => {
  let records = upsertSpecialAccessRecord([], {
    userId: 'usr_1111111111111111',
    username: 'sara_sec',
    nickname: 'سارة التشفير',
    email: 'sara@example.com',
    kind: 'team_member',
    now: 1_700_000_200_000,
  });
  records = upsertSpecialAccessRecord(records, {
    userId: 'elite_king_30m',
    username: 'The_King_30M',
    nickname: 'ملك التحديات (30M)',
    email: 'elite@nawat.cyber',
    kind: 'elite_king',
    now: 1_700_000_300_000,
  });

  let saraProgress = createInitialProgress();
  saraProgress = markTaskSolved(saraProgress, ROOMS[0].id, ROOMS[0].tasks[0].id);

  const tracked = buildAdminTrackedUsers({
    rooms: ROOMS,
    registeredUsers: sampleUsers,
    specialAccessRecords: records,
    accountMetricsMap: {
      usr_1111111111111111: {
        firstSeenAt: 1_700_000_000_000,
        activeSeconds: 3600,
        loginCount: 4,
        lastActiveAt: 1_700_000_250_000,
      },
    },
    activeUserSession: null,
    activeProgress: createInitialProgress(),
    progressByUserId: {
      usr_1111111111111111: saraProgress,
      usr_2222222222222222: createInitialProgress(),
      elite_king_30m: createInitialProgress(),
    },
  });

  assert.equal(tracked.length, 3);
  const sara = tracked.find((u) => u.userId === 'usr_1111111111111111');
  assert.ok(sara);
  assert.equal(sara.role, 'team_member');
  assert.equal(sara.joinedTeamAt, 1_700_000_200_000);
  assert.equal(sara.activeSeconds, 3600);
  assert.ok(sara.bounty > 0);

  const standaloneElite = tracked.find((u) => u.userId === 'elite_king_30m');
  assert.ok(standaloneElite);
  assert.equal(standaloneElite.role, 'elite_king');
  assert.equal(standaloneElite.bounty, USER_MAX_BOUNTY);
  assert.equal(standaloneElite.unlockedEliteAt, 1_700_000_300_000);
});

test('demoteUserAccount strips rank and resets user progress & bounty to 0 in leaderboard', () => {
  const records = upsertSpecialAccessRecord([], {
    userId: 'usr_1111111111111111',
    username: 'sara_sec',
    nickname: 'سارة التشفير',
    email: 'sara@example.com',
    kind: 'team_member',
    now: 1_700_000_200_000,
  });

  const demoted = demoteUserAccount({
    targetUser: {
      userId: 'usr_1111111111111111',
      username: 'sara_sec',
      nickname: 'سارة التشفير',
    },
    registeredUsers: sampleUsers,
    specialAccessRecords: records,
    now: 1_700_000_500_000,
  });

  const updatedSara = demoted.nextUsers.find(
    (u) => u.id === 'usr_1111111111111111'
  );
  assert.ok(updatedSara);
  assert.equal(updatedSara.role, 'user');
  assert.equal(demoted.nextSpecialAccessRecords.length, 0);
  assert.deepEqual(demoted.resetProgress.solvedTaskIds, {});
  assert.equal(demoted.auditEntry.action, 'demote');

  const leaderboard = buildLeaderboardEntries({
    rooms: ROOMS,
    registeredUsers: demoted.nextUsers,
    activeUserSession: null,
    activeProgress: createInitialProgress(),
    progressByUserId: {
      usr_1111111111111111: demoted.resetProgress,
      usr_2222222222222222: createInitialProgress(),
    },
  });
  const saraRow = leaderboard.find((e) => e.userId === 'usr_1111111111111111');
  assert.ok(saraRow);
  assert.equal(saraRow.bounty, 0);
  assert.equal(saraRow.role, 'user');
});

test('banUserAccount removes user from registry, special records, metrics, and leaderboard', () => {
  const records = upsertSpecialAccessRecord([], {
    userId: 'usr_1111111111111111',
    username: 'sara_sec',
    nickname: 'سارة التشفير',
    email: 'sara@example.com',
    kind: 'team_member',
    now: 1_700_000_200_000,
  });

  const banned = banUserAccount({
    targetUser: {
      userId: 'usr_1111111111111111',
      username: 'sara_sec',
      nickname: 'سارة التشفير',
    },
    registeredUsers: sampleUsers,
    specialAccessRecords: records,
    accountMetricsMap: {
      usr_1111111111111111: {
        firstSeenAt: 1_700_000_000_000,
        activeSeconds: 300,
        loginCount: 2,
        lastActiveAt: 1_700_000_200_000,
      },
    },
    now: 1_700_000_600_000,
  });

  assert.equal(banned.nextUsers.length, 1);
  assert.equal(
    banned.nextUsers.some((u) => u.id === 'usr_1111111111111111'),
    false
  );
  assert.equal(banned.nextSpecialAccessRecords.length, 0);
  assert.equal(banned.nextMetricsMap['usr_1111111111111111'], undefined);
  assert.equal(banned.auditEntry.action, 'ban');

  const leaderboard = buildLeaderboardEntries({
    rooms: ROOMS,
    registeredUsers: banned.nextUsers,
    activeUserSession: null,
    activeProgress: createInitialProgress(),
    progressByUserId: {
      usr_2222222222222222: createInitialProgress(),
    },
  });
  assert.equal(
    leaderboard.some((e) => e.userId === 'usr_1111111111111111'),
    false
  );
});

test('sanitizeSpecialAccessRecords and sanitizeAdminAuditLog reject poisoned entries', () => {
  const cleanRecords = sanitizeSpecialAccessRecords([
    { userId: 'dev_shadow', username: 'SHADOW', nickname: 'Lord', email: 'a@b.c', role: 'team_member', updatedAt: 1 },
    { userId: '__proto__', username: 'x', nickname: 'x', email: 'a@b.c', role: 'team_member', updatedAt: 1 },
    { userId: 'team_operator', username: 'Shadow_Team', nickname: 'عضو الفريق', email: 'team@nawat.cyber', role: 'team_member', joinedTeamAt: 100, updatedAt: 100 },
  ]);
  assert.equal(cleanRecords.length, 1);
  assert.equal(cleanRecords[0].userId, 'team_operator');

  const cleanLogs = sanitizeAdminAuditLog([
    { id: '1', action: 'evil', targetUserId: 'x', targetUsername: 'x', targetNickname: 'x', summaryAr: 'x', timestamp: 1 },
    { id: '2', action: 'ban', targetUserId: 'u1', targetUsername: 'u1', targetNickname: 'User 1', summaryAr: 'Banned', timestamp: 2 },
    { id: '3', action: 'user_register', targetUserId: 'u2', targetUsername: 'u2', targetNickname: 'User 2', summaryAr: 'Registered', timestamp: 3 },
    { id: '4', action: 'login_success', targetUserId: 'u2', targetUsername: 'u2', targetNickname: 'User 2', summaryAr: 'Logged in', timestamp: 4 },
    { id: '5', action: 'login_failed', targetUserId: 'auth_gate', targetUsername: 'u2', targetNickname: 'فشل', summaryAr: 'Failed password', timestamp: 5 },
  ]);
  assert.equal(cleanLogs.length, 4);
  assert.equal(cleanLogs[0].id, '2');
  assert.equal(cleanLogs[3].action, 'login_failed');
});
