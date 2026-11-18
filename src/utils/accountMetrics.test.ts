import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLoginNotificationData,
  formatAccountAgeAr,
  formatActivityHoursAr,
  incrementAccountActivityInMap,
  recordAccountLoginInMap,
} from './accountMetrics';
import { DEVELOPER_BOUNTY } from './progress';
import { SHADOW_DEVELOPER_PROFILE, createSignedUserSession } from './userAuth';

test('formatAccountAgeAr and formatActivityHoursAr format durations cleanly in Arabic', () => {
  const now = 1_000_000_000;
  assert.match(formatAccountAgeAr(now - 20_000, now), /أقل من دقيقة/);
  assert.match(formatAccountAgeAr(now - 15 * 60_000, now), /15/);
  assert.match(formatAccountAgeAr(now - 3 * 3600_000, now), /3/);
  assert.match(formatAccountAgeAr(now - 5 * 86400_000, now), /5/);

  assert.match(formatActivityHoursAr(30), /0\.0 ساعة/);
  assert.match(formatActivityHoursAr(5400), /1\.50 ساعة/);
});

test('recordAccountLoginInMap and buildLoginNotificationData build rich bounty notification', async () => {
  const start = 10_000;
  const { nextMap, record } = recordAccountLoginInMap(
    {},
    SHADOW_DEVELOPER_PROFILE.userId,
    start,
    start + 2 * 3600_000
  );
  const updatedMap = incrementAccountActivityInMap(
    nextMap,
    SHADOW_DEVELOPER_PROFILE.userId,
    3600,
    start + 3 * 3600_000
  );

  assert.equal(record.loginCount, 1);
  assert.equal(
    updatedMap[SHADOW_DEVELOPER_PROFILE.userId].activeSeconds,
    3615
  );

  const session = await createSignedUserSession(
    SHADOW_DEVELOPER_PROFILE,
    start
  );
  const notif = buildLoginNotificationData({
    session,
    bounty: DEVELOPER_BOUNTY,
    rankTitleAr: 'المطور الرئيسي (Lord of Chaos)',
    solvedFlags: 13,
    totalFlags: 13,
    metrics: updatedMap[SHADOW_DEVELOPER_PROFILE.userId],
    shortcutKind: 'developer',
    now: start + 3 * 3600_000,
  });

  assert.equal(notif.bounty, 3_000_000_000);
  assert.equal(notif.isDeveloper, true);
  assert.equal(notif.isEliteOrBountyPassword, true);
  assert.match(notif.accountAgeAr, /3/);
  assert.match(notif.activityHoursAr, /1\.00 ساعة/);
});
