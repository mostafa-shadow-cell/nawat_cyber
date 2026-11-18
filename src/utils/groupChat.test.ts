import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeStoredGroupMessages,
  validateAndCreateGroupMessage,
} from './groupChat';

test('validateAndCreateGroupMessage blocks XSS/SQLi and accepts clean team messages', () => {
  const xss = validateAndCreateGroupMessage(
    'سارة',
    '<script>alert(1)</script>'
  );
  assert.equal(xss.valid, false);

  const sqli = validateAndCreateGroupMessage(
    'سارة',
    "hello'; DROP TABLE messages;--"
  );
  assert.equal(sqli.valid, false);

  const ok = validateAndCreateGroupMessage(
    'سارة',
    'أنهيت مراجعة غرفة التصعيد بنجاح'
  );
  assert.equal(ok.valid, true);
  assert.equal(ok.entry?.senderName, 'سارة');
});

test('sanitizeStoredGroupMessages filters out poisoned stored items', () => {
  const sanitized = sanitizeStoredGroupMessages([
    {
      id: '1',
      senderName: 'Shadow',
      roleLabelAr: 'قائد الفريق',
      text: '<img src=x onerror=alert(1)>',
      timestamp: '10:00',
    },
    {
      id: '2',
      senderName: 'أحمد',
      roleLabelAr: 'عضو فريق',
      text: 'تحديث الغرفة جاهز',
      timestamp: '10:05',
    },
  ]);

  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].senderName, 'أحمد');
});
