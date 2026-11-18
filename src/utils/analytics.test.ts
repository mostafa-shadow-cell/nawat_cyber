import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from '../data/rooms';
import {
  ACTIVE_SESSION_TTL_MS,
  computePlatformAnalyticsSummary,
  createInitialAnalyticsState,
  recordPlatformVisit,
  sanitizeAnalyticsState,
  touchAnalyticsHeartbeat,
} from './analytics';
import { createInitialProgress, markTaskSolved } from './progress';
import type { StoredUserRecord } from './userAuth';

const users: StoredUserRecord[] = [
  {
    id: 'usr_1',
    username: 'ali_sec',
    nickname: 'علي',
    email: 'ali@example.com',
    passwordSalt: 'a'.repeat(32),
    passwordHash: 'b'.repeat(64),
    role: 'user',
    createdAt: 1_700_000_000_000,
  },
  {
    id: 'usr_2',
    username: 'mona_vip',
    nickname: 'منى',
    email: 'mona@example.com',
    passwordSalt: 'c'.repeat(32),
    passwordHash: 'd'.repeat(64),
    role: 'user',
    createdAt: 1_700_000_100_000,
  },
];

test('recordPlatformVisit and touchAnalyticsHeartbeat track total visits, unique visitors, and active sessions', () => {
  const t0 = 1_700_000_000_000;
  let state = createInitialAnalyticsState();

  state = recordPlatformVisit(state, {
    visitorId: 'vis_1',
    sessionId: 'tab_1',
    now: t0,
  });
  state = recordPlatformVisit(state, {
    visitorId: 'vis_1',
    sessionId: 'tab_2',
    now: t0 + 10_000,
  });
  state = recordPlatformVisit(state, {
    visitorId: 'vis_2',
    sessionId: 'tab_3',
    now: t0 + 20_000,
  });

  assert.equal(state.totalVisits, 3);
  assert.equal(state.uniqueVisitorIds.length, 2);
  assert.equal(Object.keys(state.activeSessionsById).length, 3);

  // Advance past TTL so tab_1 and tab_2 expire, only tab_3 gets refreshed
  const later = t0 + ACTIVE_SESSION_TTL_MS + 30_000;
  state = touchAnalyticsHeartbeat(state, {
    visitorId: 'vis_2',
    sessionId: 'tab_3',
    now: later,
  });
  assert.equal(Object.keys(state.activeSessionsById).length, 1);
});

test('computePlatformAnalyticsSummary calculates VIP conversion and challenge completion rates accurately', () => {
  const now = 1_700_000_000_000;
  let state = createInitialAnalyticsState();
  state = recordPlatformVisit(state, {
    visitorId: 'vis_1',
    sessionId: 'tab_1',
    now,
  });
  state = recordPlatformVisit(state, {
    visitorId: 'vis_2',
    sessionId: 'tab_2',
    now,
  });

  let aliProgress = createInitialProgress();
  for (const task of ROOMS[0].tasks) {
    aliProgress = markTaskSolved(aliProgress, ROOMS[0].id, task.id);
  }

  const summary = computePlatformAnalyticsSummary({
    analytics: state,
    rooms: ROOMS,
    registeredUsers: users,
    vipMap: { usr_2: now },
    activeUserId: 'usr_1',
    activeProgress: aliProgress,
    progressByUserId: {
      usr_1: aliProgress,
      usr_2: createInitialProgress(),
    },
    now,
  });

  assert.equal(summary.totalVisits, 2);
  assert.equal(summary.uniqueVisitors, 2);
  assert.equal(summary.activeOnlineSessions, 2);
  assert.equal(summary.totalRegisteredUsers, 2);
  assert.equal(summary.activeVipMembers, 1);
  assert.equal(summary.vipConversionRatePercent, 50);
  assert.ok(summary.challengeCompletionRatePercent > 0);
  assert.equal(summary.dailyVisits.length, 7);
  assert.equal(summary.roomBreakdown.length, ROOMS.length);
  assert.equal(summary.roomBreakdown[0].completedUsersCount, 1);
});

test('sanitizeAnalyticsState discards poisoned keys and invalid numbers', () => {
  const clean = sanitizeAnalyticsState({
    totalVisits: 5,
    uniqueVisitorIds: ['vis_1', '__proto__'],
    activeSessionsById: {
      tab_1: { lastSeenAt: 1000, label: 'user' },
      __proto__: { lastSeenAt: 1000, label: 'evil' },
    },
    dailyVisitCounts: {
      '2026-11-18': 5,
      bad_date: 99,
    },
  });
  assert.equal(clean.totalVisits, 5);
  assert.deepEqual(clean.uniqueVisitorIds, ['vis_1']);
  assert.deepEqual(Object.keys(clean.activeSessionsById), ['tab_1']);
  assert.deepEqual(clean.dailyVisitCounts, { '2026-11-18': 5 });
});
