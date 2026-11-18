import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectMaliciousPayload,
  isStrictFlagFormat,
  sanitizeSearchQuery,
  sanitizeTerminalCommand,
  sanitizeTextInput,
  timingSafeEqualStrings,
} from './security';
import { validateContactForm } from './developerContact';

test('detectMaliciousPayload blocks XSS and SQL Injection payloads', () => {
  assert.equal(detectMaliciousPayload('<script>alert(1)</script>').safe, false);
  assert.equal(detectMaliciousPayload('<img src=x onerror=alert(1)>').safe, false);
  assert.equal(detectMaliciousPayload('javascript:alert(1)').safe, false);
  assert.equal(detectMaliciousPayload("admin' OR '1'='1").safe, false);
  assert.equal(detectMaliciousPayload('1; DROP TABLE users;--').safe, false);
  assert.equal(detectMaliciousPayload('1 UNION SELECT username, password FROM users').safe, false);

  assert.equal(detectMaliciousPayload('مرحبا فريق نواة سايبر').safe, true);
  assert.equal(detectMaliciousPayload('FLAG{LINUX_BASICS_710}').safe, true);
});

test('sanitizers strip angle brackets and control characters cleanly', () => {
  assert.equal(sanitizeTextInput('  <b>Shadow</b>\x00 '), 'bShadow/b');
  assert.equal(sanitizeSearchQuery("nmap';--<script>"), 'nmap--script');
  assert.equal(sanitizeTerminalCommand('ls -la\x00<script>'), 'ls -lascript');
});

test('strict flag format and constant-time comparison work accurately', () => {
  assert.equal(isStrictFlagFormat('FLAG{LINUX_BASICS_710}'), true);
  assert.equal(isStrictFlagFormat('FLAG{BAD}'), true);
  assert.equal(isStrictFlagFormat('FLAG{BAD!}'), false);
  assert.equal(isStrictFlagFormat("FLAG{A' OR '1'='1}"), false);

  assert.equal(timingSafeEqualStrings('abc123', 'abc123'), true);
  assert.equal(timingSafeEqualStrings('abc123', 'abc124'), false);
  assert.equal(timingSafeEqualStrings('abc', 'abcd'), false);
});

test('validateContactForm rejects XSS and SQLi inputs in chat form', () => {
  const xssAttempt = validateContactForm({
    name: '<script>alert(1)</script>',
    topic: 'challenge_inquiry',
    message: 'سؤال عادي جداً',
  });
  assert.equal(xssAttempt.valid, false);

  const sqliAttempt = validateContactForm({
    name: 'خالد',
    topic: 'vulnerability_report',
    message: "test'; DROP TABLE users;--",
  });
  assert.equal(sqliAttempt.valid, false);
});
