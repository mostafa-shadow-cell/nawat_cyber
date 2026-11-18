import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from '../data/rooms';
import { evaluateAchievementBadges } from './badges';
import { createInitialProgress, markTaskSolved } from './progress';

test('evaluateAchievementBadges awards Shadow Initiate when joining team', () => {
  const badgesRegular = evaluateAchievementBadges({
    rooms: ROOMS,
    progress: createInitialProgress(),
    role: 'user',
  });
  assert.equal(
    badgesRegular.find((b) => b.id === 'shadow_initiate')?.earned,
    false
  );

  const badgesTeam = evaluateAchievementBadges({
    rooms: ROOMS,
    progress: createInitialProgress(),
    role: 'team_member',
  });
  assert.equal(
    badgesTeam.find((b) => b.id === 'shadow_initiate')?.earned,
    true
  );
});

test('evaluateAchievementBadges awards Bug Hunter at 5 solved challenges and Elite Hacker only with zero mistakes', () => {
  let progress = createInitialProgress();
  // Solve 3 tasks cleanly
  progress = markTaskSolved(progress, ROOMS[0].id, ROOMS[0].tasks[0].id);
  progress = markTaskSolved(progress, ROOMS[0].id, ROOMS[0].tasks[1].id);
  progress = markTaskSolved(progress, ROOMS[0].id, ROOMS[0].tasks[2].id);

  let badges = evaluateAchievementBadges({
    rooms: ROOMS,
    progress,
    role: 'user',
  });
  assert.equal(badges.find((b) => b.id === 'first_blood')?.earned, true);
  assert.equal(badges.find((b) => b.id === 'elite_hacker')?.earned, true);
  assert.equal(badges.find((b) => b.id === 'bug_hunter')?.earned, false);

  // Solve 2 more tasks -> total 5 challenges -> Bug Hunter unlocked
  progress = markTaskSolved(progress, ROOMS[1].id, ROOMS[1].tasks[0].id);
  progress = markTaskSolved(progress, ROOMS[1].id, ROOMS[1].tasks[1].id);

  badges = evaluateAchievementBadges({
    rooms: ROOMS,
    progress,
    role: 'user',
  });
  assert.equal(badges.find((b) => b.id === 'bug_hunter')?.earned, true);
  assert.equal(badges.find((b) => b.id === 'elite_hacker')?.earned, true);

  // Introducing a penalty revokes Elite Hacker (zero mistakes rule)
  const penalized = {
    ...progress,
    bountyPenaltyPoints: 500,
  };
  const penalizedBadges = evaluateAchievementBadges({
    rooms: ROOMS,
    progress: penalized,
    role: 'user',
  });
  assert.equal(
    penalizedBadges.find((b) => b.id === 'elite_hacker')?.earned,
    false
  );
  assert.equal(
    penalizedBadges.find((b) => b.id === 'bug_hunter')?.earned,
    true
  );
});
