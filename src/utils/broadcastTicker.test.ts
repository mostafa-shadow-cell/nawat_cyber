import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultBroadcast,
  deactivateSystemBroadcast,
  publishSystemBroadcast,
  sanitizeStoredBroadcast,
} from './broadcastTicker';

test('publishSystemBroadcast allows only SHADOW developer mode and rejects XSS/SQLi', () => {
  const denied = publishSystemBroadcast({
    messageAr: 'إعلان تجريبي من غير المطور',
    severity: 'warning',
    isDeveloperMode: false,
  });
  assert.equal(denied.success, false);

  const xssDenied = publishSystemBroadcast({
    messageAr: '<script>alert(1)</script> تحذير',
    severity: 'alert',
    isDeveloperMode: true,
  });
  assert.equal(xssDenied.success, false);

  const published = publishSystemBroadcast({
    messageAr: 'تنبيه هام من اللورد: تم إطلاق تحديات جديدة اليوم!',
    severity: 'warning',
    isDeveloperMode: true,
    now: 1_700_000_100_000,
  });
  assert.equal(published.success, true);
  assert.ok(published.broadcast);
  assert.equal(published.broadcast.author, 'SHADOW');
  assert.equal(published.broadcast.severity, 'warning');
  assert.equal(published.broadcast.active, true);
});

test('deactivateSystemBroadcast and sanitizeStoredBroadcast handle valid and poisoned state safely', () => {
  const def = createDefaultBroadcast();
  assert.equal(def.active, true);

  const ignoredForUser = deactivateSystemBroadcast(def, false);
  assert.equal(ignoredForUser.active, true);

  const deactivated = deactivateSystemBroadcast(def, true, 1_700_000_200_000);
  assert.equal(deactivated.active, false);

  const sanitizedBad = sanitizeStoredBroadcast({
    messageAr: 'SELECT * FROM users UNION SELECT password',
    severity: 'alert',
    active: true,
    updatedAt: 100,
  });
  assert.equal(sanitizedBad.id, def.id);
});
