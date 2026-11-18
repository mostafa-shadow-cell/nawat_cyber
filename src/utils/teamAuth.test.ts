import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAM_LOCKOUT_DURATION_MS,
  TEAM_MAX_FAILED_ATTEMPTS,
  createDefaultRateLimitState,
  createSignedAdFreePrivilege,
  createSignedTeamSession,
  verifyAccessPasswordAttempt,
  verifyKing30MAttempt,
  verifyStoredAdFreePrivilege,
  verifyStoredTeamSession,
  verifyTeamPasswordAttempt,
} from './teamAuth';

test('verifyTeamPasswordAttempt authenticates Shadow_666 via SHA-256 and issues signed session', async () => {
  const initialLimit = await createDefaultRateLimitState();
  const { result, nextRateLimit } = await verifyTeamPasswordAttempt(
    'Shadow_666',
    initialLimit,
    1000
  );

  assert.equal(result.authenticated, true);
  assert.equal(result.lockedOut, false);
  assert.ok(result.session);
  assert.equal(result.session?.role, 'team_member');
  assert.equal(nextRateLimit.failedAttempts, 0);

  const verified = await verifyStoredTeamSession(result.session, 2000);
  assert.ok(verified);
  assert.equal(verified?.role, 'team_member');
});

test('verifyAccessPasswordAttempt authenticates Lord of Chaos as developer role', async () => {
  const initialLimit = await createDefaultRateLimitState();
  const { result } = await verifyAccessPasswordAttempt(
    'Lord of Chaos',
    'developer',
    initialLimit,
    1000
  );

  assert.equal(result.authenticated, true);
  assert.equal(result.session?.role, 'developer');

  // Shadow_666 should not work on developer gate and vice versa
  const crossCheck = await verifyAccessPasswordAttempt(
    'Shadow_666',
    'developer',
    initialLimit,
    1000
  );
  assert.equal(crossCheck.result.authenticated, false);
});

test('verifyKing30MAttempt requires 30M milestone and rejects tampered privilege tokens', async () => {
  const limit = await createDefaultRateLimitState();

  // Blocked before reaching 30M milestone
  const beforeCap = await verifyKing30MAttempt(
    'The_king_30M',
    false,
    limit,
    1000
  );
  assert.equal(beforeCap.result.unlocked, false);

  // Unlocks after beating the entire platform (30M milestone)
  const afterCap = await verifyKing30MAttempt(
    'The_king_30M',
    true,
    limit,
    2000
  );
  assert.equal(afterCap.result.unlocked, true);
  assert.equal(afterCap.result.privilege?.kind, 'king_30m');

  const validPriv = await verifyStoredAdFreePrivilege(
    afterCap.result.privilege,
    3000
  );
  assert.ok(validPriv);

  // Tampered privilege token is rejected
  const tampered = {
    ...(await createSignedAdFreePrivilege('paid_pass', 1000)),
    kind: 'king_30m',
  };
  assert.equal(await verifyStoredAdFreePrivilege(tampered, 2000), null);
});

test('rate limiter locks out after 5 consecutive failed attempts and rejects attempts during lockout', async () => {
  let limit = await createDefaultRateLimitState();
  const baseTime = 10_000;

  for (let i = 1; i <= 4; i++) {
    const attempt = await verifyTeamPasswordAttempt(
      `wrong_${i}`,
      limit,
      baseTime + i * 100
    );
    limit = attempt.nextRateLimit;
    assert.equal(attempt.result.authenticated, false);
    assert.equal(attempt.result.lockedOut, false);
    assert.equal(
      attempt.result.remainingAttempts,
      TEAM_MAX_FAILED_ATTEMPTS - i
    );
  }

  const fifth = await verifyTeamPasswordAttempt(
    'wrong_5',
    limit,
    baseTime + 500
  );
  assert.equal(fifth.result.authenticated, false);
  assert.equal(fifth.result.lockedOut, true);
  assert.equal(fifth.result.remainingAttempts, 0);
  assert.ok(fifth.result.lockedUntil);

  const duringLockout = await verifyTeamPasswordAttempt(
    'Shadow_666',
    fifth.nextRateLimit,
    baseTime + 1000
  );
  assert.equal(duringLockout.result.authenticated, false);
  assert.equal(duringLockout.result.lockedOut, true);

  const afterLockout = await verifyTeamPasswordAttempt(
    'Shadow_666',
    fifth.nextRateLimit,
    baseTime + 500 + TEAM_LOCKOUT_DURATION_MS + 1
  );
  assert.equal(afterLockout.result.authenticated, true);
  assert.ok(afterLockout.result.session);
});

test('verifyStoredTeamSession keeps sessions permanently active and rejects tampered tokens', async () => {
  const teamSession = await createSignedTeamSession(1000, 'team_member');
  const devSession = await createSignedTeamSession(1000, 'developer');

  assert.equal('expiresAt' in teamSession, false);
  assert.equal('expiresAt' in devSession, false);

  const oneYearLater = 1000 + 365 * 24 * 60 * 60 * 1000;
  const verifiedTeam = await verifyStoredTeamSession(teamSession, oneYearLater);
  const verifiedDev = await verifyStoredTeamSession(devSession, oneYearLater);

  assert.ok(verifiedTeam);
  assert.equal(verifiedTeam?.role, 'team_member');
  assert.ok(verifiedDev);
  assert.equal(verifiedDev?.role, 'developer');

  const tamperedRole = { ...teamSession, role: 'developer' as const };
  assert.equal(await verifyStoredTeamSession(tamperedRole, 2000), null);

  const tamperedIssuedAt = { ...teamSession, issuedAt: 1500 };
  assert.equal(await verifyStoredTeamSession(tamperedIssuedAt, 2000), null);

  const tamperedSig = {
    ...teamSession,
    signature: 'a'.repeat(teamSession.signature.length),
  };
  assert.equal(await verifyStoredTeamSession(tamperedSig, 2000), null);
});
