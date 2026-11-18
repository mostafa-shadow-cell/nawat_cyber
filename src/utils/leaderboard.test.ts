import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from '../data/rooms';
import {
  DEVELOPER_BOUNTY,
  USER_MAX_BOUNTY,
  createInitialProgress,
  markTaskSolved,
} from './progress';
import { buildLeaderboardEntries } from './leaderboard';
import {
  createSignedUserSession,
  registerUserAccount,
} from './userAuth';

test('buildLeaderboardEntries keeps SHADOW / Lord of Chaos permanently at #1 with 3B bounty', () => {
  const entries = buildLeaderboardEntries({
    rooms: ROOMS,
    registeredUsers: [],
    activeUserSession: null,
    activeProgress: createInitialProgress(),
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].rank, 1);
  assert.equal(entries[0].username, 'SHADOW');
  assert.equal(entries[0].nickname, 'Lord of Chaos');
  assert.equal(entries[0].bounty, DEVELOPER_BOUNTY);
  assert.equal(entries[0].badgeTone, 'developer');
});

test('buildLeaderboardEntries sorts registered users highest to lowest and updates rank in real time', async () => {
  const reg1 = await registerUserAccount(
    {
      username: 'user_alpha',
      nickname: 'الهاكر ألفا',
      email: 'alpha@nawat.cyber',
      password: 'Password123!',
    },
    [],
    1000
  );
  const reg2 = await registerUserAccount(
    {
      username: 'user_beta',
      nickname: 'الهاكر بيتا',
      email: 'beta@nawat.cyber',
      password: 'Password123!',
    },
    reg1.nextUsers,
    2000
  );
  assert.ok(reg1.user && reg2.user);

  // Give user_beta solved tasks while user_alpha is active with 0 tasks
  let betaProgress = createInitialProgress();
  betaProgress = markTaskSolved(
    betaProgress,
    ROOMS[0].id,
    ROOMS[0].tasks[0].id
  );

  // Also elevate user_alpha to team_member to check badge resolution
  const usersWithTeam = reg2.nextUsers.map((u) =>
    u.id === reg1.user!.id ? { ...u, role: 'team_member' as const } : u
  );

  const alphaSession = await createSignedUserSession(
    {
      userId: reg1.user.id,
      username: reg1.user.username,
      nickname: reg1.user.nickname,
      email: reg1.user.email,
      role: 'team_member',
    },
    3000
  );

  const initialBoard = buildLeaderboardEntries({
    rooms: ROOMS,
    registeredUsers: usersWithTeam,
    activeUserSession: alphaSession,
    activeProgress: createInitialProgress(),
    progressByUserId: {
      [reg2.user.id]: betaProgress,
    },
  });

  // #1 SHADOW (3B), #2 user_beta (has solved task), #3 user_alpha (0 bounty)
  assert.equal(initialBoard[0].username, 'SHADOW');
  assert.equal(initialBoard[0].rank, 1);
  assert.equal(initialBoard[1].username, 'user_beta');
  assert.equal(initialBoard[1].rank, 2);
  assert.equal(initialBoard[1].badgeTone, 'regular');
  assert.equal(initialBoard[2].username, 'user_alpha');
  assert.equal(initialBoard[2].rank, 3);
  assert.equal(initialBoard[2].bounty, 0);
  assert.equal(initialBoard[2].badgeTone, 'team');
  assert.equal(initialBoard[2].isCurrentUser, true);

  // Now user_alpha solves ALL tasks -> hits 30M cap and jumps to #2 (still below SHADOW #1!)
  let fullProgress = createInitialProgress();
  for (const room of ROOMS) {
    for (const task of room.tasks) {
      fullProgress = markTaskSolved(fullProgress, room.id, task.id);
    }
  }

  const updatedBoard = buildLeaderboardEntries({
    rooms: ROOMS,
    registeredUsers: usersWithTeam,
    activeUserSession: alphaSession,
    activeProgress: fullProgress,
    progressByUserId: {
      [reg2.user.id]: betaProgress,
    },
  });

  assert.equal(updatedBoard[0].username, 'SHADOW');
  assert.equal(updatedBoard[0].rank, 1);
  assert.equal(updatedBoard[1].username, 'user_alpha');
  assert.equal(updatedBoard[1].rank, 2);
  assert.equal(updatedBoard[1].bounty, USER_MAX_BOUNTY);
  assert.equal(updatedBoard[1].badgeTone, 'elite');
  assert.equal(updatedBoard[2].username, 'user_beta');
  assert.equal(updatedBoard[2].rank, 3);
});
