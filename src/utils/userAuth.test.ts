import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultRateLimitState } from './teamAuth';
import {
  authenticateUserAccount,
  registerUserAccount,
  sanitizeStoredUsersRegistry,
  verifyStoredUserSession,
} from './userAuth';

test('registerUserAccount validates inputs, hashes password with salt, and starts user at regular role', async () => {
  const reg = await registerUserAccount(
    {
      username: 'cyb_ahmad',
      nickname: 'صياد الثغرات',
      email: 'Ahmad@Example.COM',
      password: 'MyStrongPassword123',
    },
    [],
    5000
  );

  assert.equal(reg.success, true);
  assert.ok(reg.user);
  assert.ok(reg.session);
  assert.equal(reg.user?.username, 'cyb_ahmad');
  assert.equal(reg.user?.nickname, 'صياد الثغرات');
  assert.equal(reg.user?.email, 'ahmad@example.com');
  assert.equal(reg.user?.role, 'user');
  assert.notEqual(reg.user?.passwordHash, 'MyStrongPassword123');
  assert.equal(reg.session?.nickname, 'صياد الثغرات');
  assert.equal(reg.nextUsers.length, 1);

  // Rejects duplicate username or email
  const dup = await registerUserAccount(
    {
      username: 'CYB_AHMAD',
      nickname: 'مستخدم آخر',
      email: 'other@example.com',
      password: 'AnotherPassword123',
    },
    reg.nextUsers,
    6000
  );
  assert.equal(dup.success, false);
});

test('registerUserAccount blocks reserved developer handles and XSS/SQLi payloads', async () => {
  const reserved = await registerUserAccount(
    {
      username: 'SHADOW',
      nickname: 'Fake Shadow',
      email: 'fake@example.com',
      password: 'Password123!',
    },
    []
  );
  assert.equal(reserved.success, false);

  const xss = await registerUserAccount(
    {
      username: 'validuser',
      nickname: '<script>alert(1)</script>',
      email: 'xss@example.com',
      password: 'Password123!',
    },
    []
  );
  assert.equal(xss.success, false);
});

test('authenticateUserAccount verifies registered users and preserves permanent signed session', async () => {
  const limit = await createDefaultRateLimitState();
  const reg = await registerUserAccount(
    {
      username: 'nora_sec',
      nickname: 'نورة سايبر',
      email: 'nora@nawat.cyber',
      password: 'NoraSecretPassword!',
    },
    [],
    1000
  );
  assert.ok(reg.user);

  const loginByEmail = await authenticateUserAccount(
    {
      identifier: 'NORA@NAWAT.CYBER',
      password: 'NoraSecretPassword!',
    },
    reg.nextUsers,
    limit,
    2000
  );

  assert.equal(loginByEmail.result.authenticated, true);
  assert.equal(loginByEmail.result.session?.username, 'nora_sec');
  assert.equal(loginByEmail.result.session?.nickname, 'نورة سايبر');
  assert.equal(loginByEmail.result.session?.role, 'user');

  // Session stays permanently active even 1 year later
  const verified = await verifyStoredUserSession(
    loginByEmail.result.session,
    2000 + 365 * 24 * 60 * 60 * 1000
  );
  assert.ok(verified);

  // Wrong password fails cleanly and decrements remaining attempts
  const wrong = await authenticateUserAccount(
    {
      identifier: 'nora_sec',
      password: 'WrongPassword',
    },
    reg.nextUsers,
    limit,
    3000
  );
  assert.equal(wrong.result.authenticated, false);
  assert.equal(wrong.result.remainingAttempts, 4);
});

test('authenticateUserAccount supports Lord of Chaos (SHADOW 3B) and The_king_30M shortcuts', async () => {
  const limit = await createDefaultRateLimitState();

  const devLogin = await authenticateUserAccount(
    { identifier: 'SHADOW', password: 'Lord of Chaos' },
    [],
    limit,
    1000
  );
  assert.equal(devLogin.result.authenticated, true);
  assert.equal(devLogin.result.shortcutKind, 'developer');
  assert.equal(devLogin.result.session?.username, 'SHADOW');
  assert.equal(devLogin.result.session?.nickname, 'Lord of Chaos');
  assert.equal(devLogin.result.session?.role, 'developer');

  const kingLogin = await authenticateUserAccount(
    { identifier: '', password: 'The_king_30M' },
    [],
    limit,
    2000
  );
  assert.equal(kingLogin.result.authenticated, true);
  assert.equal(kingLogin.result.shortcutKind, 'elite_king');
  assert.equal(kingLogin.result.session?.role, 'elite_king');
});

test('sanitizeStoredUsersRegistry strips corrupted or forged user entries', async () => {
  const reg = await registerUserAccount(
    {
      username: 'clean_user',
      nickname: 'مستخدم نظيف',
      email: 'clean@example.com',
      password: 'CleanPassword99',
    },
    []
  );
  const sanitized = sanitizeStoredUsersRegistry([
    reg.user,
    { id: 'bad', username: 'SHADOW', role: 'developer' },
    null,
  ]);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].username, 'clean_user');
});
