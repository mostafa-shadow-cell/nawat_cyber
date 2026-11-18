import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from '../data/rooms';
import {
  CLOSE_ATTEMPT_PENALTY,
  DEVELOPER_BOUNTY,
  USER_MAX_BOUNTY,
  applyWrongFlagPenalty,
  createInitialProgress,
  filterRooms,
  getPlatformStats,
  getRoomCompletion,
  getTaskIntendedBounty,
  isCloseFlagAttempt,
  markTaskSolved,
  sanitizeStoredProgress,
  validateFlagSubmission,
} from './progress';

test('validateFlagSubmission rejects empty, malicious, invalid format, and mismatched flags', () => {
  const emptyRes = validateFlagSubmission('   ', 'FLAG{TEST_1}');
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.reason, 'empty');

  const xssRes = validateFlagSubmission('<script>alert(1)</script>', 'FLAG{TEST_1}');
  assert.equal(xssRes.valid, false);
  assert.equal(xssRes.reason, 'malicious');

  const sqliRes = validateFlagSubmission("' OR '1'='1", 'FLAG{TEST_1}');
  assert.equal(sqliRes.valid, false);
  assert.equal(sqliRes.reason, 'malicious');

  const formatRes = validateFlagSubmission('invalid-flag', 'FLAG{TEST_1}');
  assert.equal(formatRes.valid, false);
  assert.equal(formatRes.reason, 'invalid_format');

  const wrongRes = validateFlagSubmission('FLAG{WRONG}', 'FLAG{TEST_1}');
  assert.equal(wrongRes.valid, false);
  assert.equal(wrongRes.reason, 'mismatch');
});

test('validateFlagSubmission accepts exact flag with surrounding whitespace', () => {
  assert.deepEqual(validateFlagSubmission('  FLAG{TEST_1} \n', 'FLAG{TEST_1}'), {
    valid: true,
    reason: 'matched',
  });
});

test('sanitizeStoredProgress strips unknown rooms, tasks, and prototype keys', () => {
  const poisoned = JSON.parse(
    '{"solvedTaskIds":{"linux-essentials":["linux-t1","fake-task"],"unknown-room":["t1"],"__proto__":["evil"]},"lastActiveRoomId":"__proto__"}'
  );
  const clean = sanitizeStoredProgress(poisoned, ROOMS);
  assert.deepEqual(clean.solvedTaskIds, {
    'linux-essentials': ['linux-t1'],
  });
  assert.equal(clean.lastActiveRoomId, null);
});

test('markTaskSolved is idempotent and updates room completion and platform stats', () => {
  const linuxRoom = ROOMS[0];
  let progress = createInitialProgress();

  progress = markTaskSolved(progress, linuxRoom.id, linuxRoom.tasks[0].id);
  progress = markTaskSolved(progress, linuxRoom.id, linuxRoom.tasks[0].id); // duplicate check

  const partial = getRoomCompletion(linuxRoom, progress);
  assert.equal(partial.solvedCount, 1);
  assert.equal(partial.totalCount, linuxRoom.tasks.length);
  assert.equal(partial.isCompleted, false);
  assert.equal(partial.earnedXp, linuxRoom.tasks[0].xp);

  for (const task of linuxRoom.tasks) {
    progress = markTaskSolved(progress, linuxRoom.id, task.id);
  }
  const done = getRoomCompletion(linuxRoom, progress);
  assert.equal(done.percent, 100);
  assert.equal(done.isCompleted, true);
  assert.equal(done.earnedXp, linuxRoom.totalXp);

  const stats = getPlatformStats(ROOMS, progress);
  assert.equal(stats.completedRooms, 1);
  assert.equal(stats.totalXp, linuxRoom.totalXp);
  assert.equal(stats.solvedFlags, linuxRoom.tasks.length);
});

test('filterRooms filters by difficulty, category, completion status, and search query', () => {
  let progress = createInitialProgress();
  const linuxRoom = ROOMS[0];
  for (const task of linuxRoom.tasks) {
    progress = markTaskSolved(progress, linuxRoom.id, task.id);
  }

  const intermediate = filterRooms(
    ROOMS,
    { search: '', difficulty: 'intermediate', category: 'all', status: 'all' },
    progress
  );
  assert.ok(intermediate.length > 0);
  assert.ok(intermediate.every((r) => r.difficulty === 'intermediate'));

  const nmapSearch = filterRooms(
    ROOMS,
    { search: 'nmap', difficulty: 'all', category: 'all', status: 'all' },
    progress
  );
  assert.equal(nmapSearch.length, 1);
  assert.equal(nmapSearch[0].id, 'nmap-network-recon');

  const completedOnly = filterRooms(
    ROOMS,
    { search: '', difficulty: 'all', category: 'all', status: 'completed' },
    progress
  );
  assert.equal(completedOnly.length, 1);
  assert.equal(completedOnly[0].id, linuxRoom.id);
});

test('bounty system starts at 0, caps at 30M for users, and shows 3B for developer mode', () => {
  let progress = createInitialProgress();
  const initialStats = getPlatformStats(ROOMS, progress);
  assert.equal(initialStats.userBounty, 0);
  assert.equal(initialStats.displayBounty, 0);
  assert.equal(initialStats.unlocked30MAchievement, false);

  const devStats = getPlatformStats(ROOMS, progress, { isDeveloperMode: true });
  assert.equal(devStats.displayBounty, DEVELOPER_BOUNTY);
  assert.equal(devStats.displayBounty, 3_000_000_000);

  // Complete every task across all rooms
  for (const room of ROOMS) {
    for (const task of room.tasks) {
      progress = markTaskSolved(progress, room.id, task.id);
    }
  }
  const completedStats = getPlatformStats(ROOMS, progress);
  assert.equal(completedStats.userBounty, USER_MAX_BOUNTY);
  assert.equal(completedStats.userBounty, 30_000_000);
  assert.equal(completedStats.hasCompletedAllChallenges, true);
  assert.equal(completedStats.unlocked30MAchievement, true);
});

test('isCloseFlagAttempt recognizes close/warm attempts and rejects cold or malicious input', () => {
  assert.equal(isCloseFlagAttempt('LINUX_BASICS_710', 'FLAG{LINUX_BASICS_710}'), true);
  assert.equal(isCloseFlagAttempt('flag{linux_basics_710}', 'FLAG{LINUX_BASICS_710}'), true);
  assert.equal(isCloseFlagAttempt('FLAG{LINUX_BASICS_711}', 'FLAG{LINUX_BASICS_710}'), true);
  assert.equal(isCloseFlagAttempt('FLAG{HIDDEN_SHADOW_999}', 'FLAG{HIDDEN_SHADOW_402}'), true);

  assert.equal(isCloseFlagAttempt('FLAG{TOTALLY_WRONG_999}', 'FLAG{LINUX_BASICS_710}'), false);
  assert.equal(isCloseFlagAttempt('<script>alert(1)</script>', 'FLAG{LINUX_BASICS_710}'), false);
});

test('applyWrongFlagPenalty deducts 50% for cold wrong answers, 100 for close attempts, and 0 for SHADOW developer mode', () => {
  const room = ROOMS[0];
  const task1 = room.tasks[0];
  const task2 = room.tasks[1];

  // Solve task1 first so user has positive bounty
  let progress = createInitialProgress();
  progress = markTaskSolved(progress, room.id, task1.id);
  const startStats = getPlatformStats(ROOMS, progress);
  assert.ok(startStats.userBounty > 0);

  // Cold wrong answer on task2 -> deducts 50% of task2's intended bounty
  const intendedTask2 = getTaskIntendedBounty(task2.xp, ROOMS);
  const expectedColdPenalty = Math.min(
    startStats.userBounty,
    Math.round(intendedTask2 * 0.5)
  );
  const coldResult = applyWrongFlagPenalty(
    progress,
    ROOMS,
    task2,
    'FLAG{COMPLETELY_WRONG_XYZ}'
  );
  assert.equal(coldResult.isClose, false);
  assert.equal(coldResult.penaltyApplied, expectedColdPenalty);
  assert.equal(coldResult.nextProgress.closeAttemptBonusVisible, false);

  const afterColdStats = getPlatformStats(ROOMS, coldResult.nextProgress);
  assert.equal(
    afterColdStats.userBounty,
    startStats.userBounty - expectedColdPenalty
  );

  // Close wrong answer on task2 -> deducts CLOSE_ATTEMPT_PENALTY (100) and activates encouraging badge
  const closeResult = applyWrongFlagPenalty(
    coldResult.nextProgress,
    ROOMS,
    task2,
    'FLAG{HIDDEN_DOTFILE_999}'
  );
  assert.equal(closeResult.isClose, true);
  assert.equal(closeResult.penaltyApplied, CLOSE_ATTEMPT_PENALTY);
  assert.equal(closeResult.nextProgress.closeAttemptBonusVisible, true);
  assert.equal(closeResult.nextProgress.closeAttemptCount, 1);

  const afterCloseStats = getPlatformStats(ROOMS, closeResult.nextProgress);
  assert.equal(
    afterCloseStats.userBounty,
    afterColdStats.userBounty - CLOSE_ATTEMPT_PENALTY
  );

  // Solving another task preserves penalty and closeAttemptBonusVisible
  const afterSolve = markTaskSolved(closeResult.nextProgress, room.id, task2.id);
  assert.equal(afterSolve.closeAttemptBonusVisible, true);
  assert.equal(
    afterSolve.bountyPenaltyPoints,
    closeResult.nextProgress.bountyPenaltyPoints
  );

  // Developer mode (SHADOW) is completely unaffected by wrong flag penalties
  const devResult = applyWrongFlagPenalty(
    progress,
    ROOMS,
    task2,
    'FLAG{COMPLETELY_WRONG_XYZ}',
    { isDeveloperMode: true }
  );
  assert.equal(devResult.penaltyApplied, 0);
  assert.equal(devResult.remainingBounty, DEVELOPER_BOUNTY);
  const devStats = getPlatformStats(ROOMS, devResult.nextProgress, {
    isDeveloperMode: true,
  });
  assert.equal(devStats.displayBounty, 3_000_000_000);
});
