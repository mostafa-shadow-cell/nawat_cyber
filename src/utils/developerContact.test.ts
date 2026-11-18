import test from 'node:test';
import assert from 'node:assert/strict';
import * as developerContact from './developerContact';
import {
  buildAutomatedReplyAr,
  createInternalSupportTicket,
  resolveInternalSupportTicket,
  sanitizeStoredSupportTickets,
  validateContactForm,
} from './developerContact';

test('validateContactForm rejects empty or too-short name and message', () => {
  assert.equal(
    validateContactForm({
      name: '',
      topic: 'challenge_inquiry',
      message: 'مرحبا كيف أحل التحدي؟',
    }).valid,
    false
  );
  assert.equal(
    validateContactForm({
      name: 'أ',
      topic: 'challenge_inquiry',
      message: 'مرحبا كيف أحل التحدي؟',
    }).valid,
    false
  );
  assert.equal(
    validateContactForm({
      name: 'سارة',
      topic: 'vulnerability_report',
      message: 'هلا',
    }).valid,
    false
  );
  assert.equal(
    validateContactForm({
      name: 'سارة',
      topic: 'vulnerability_report',
      message: 'وجدت ملاحظة أمنية في صفحة التحدي',
    }).valid,
    true
  );
});

test('buildAutomatedReplyAr includes sender name, topic, ticket code, and Shadow developer signature', () => {
  const reply = buildAutomatedReplyAr(
    {
      name: 'أحمد',
      topic: 'join_team',
      message: 'أرغب بالانضمام لفريق المحتوى',
    },
    'TCK-ABC123'
  );
  assert.ok(reply.includes('أحمد'));
  assert.ok(reply.includes('انضمام للفريق'));
  assert.ok(reply.includes('TCK-ABC123'));
  assert.ok(reply.includes('Shadow'));
});

test('Internal-only support tickets replace external WhatsApp/Telegram links and enforce sanitization', () => {
  assert.equal(
    developerContact.DEVELOPER_CONTACT_CONFIG.channelMode,
    'internal_only'
  );
  assert.equal('buildWhatsAppDirectUrl' in developerContact, false);
  assert.equal('buildTelegramDirectUrl' in developerContact, false);

  const xssAttempt = createInternalSupportTicket([], {
    name: 'Tester',
    topic: 'vulnerability_report',
    message: '<script>alert(1)</script>',
  });
  assert.equal(xssAttempt.success, false);

  const created = createInternalSupportTicket(
    [],
    {
      name: 'علي',
      topic: 'challenge_inquiry',
      message: 'أحتاج مساعدة في تحدي Nmap داخل المختبر',
    },
    { senderUsername: 'ali_sec', now: 1_700_000_000_000 }
  );
  assert.equal(created.success, true);
  assert.ok(created.ticket);
  assert.equal(created.ticket.status, 'open');
  assert.ok(created.ticket.ticketCode.startsWith('TCK-'));

  const resolved = resolveInternalSupportTicket(
    created.nextTickets,
    created.ticket.id,
    1_700_000_050_000
  );
  assert.equal(resolved[0].status, 'resolved');
  assert.equal(resolved[0].resolvedAt, 1_700_000_050_000);

  const sanitized = sanitizeStoredSupportTickets([
    {
      id: 'bad',
      ticketCode: 'TCK-BAD',
      senderName: '<img src=x onerror=alert(1)>',
      topic: 'challenge_inquiry',
      message: 'bad payload',
      status: 'open',
      createdAt: 1,
    },
    created.ticket,
  ]);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].id, created.ticket.id);
});
