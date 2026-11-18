/**
 * Core Input Sanitization, Injection Detection & Constant-Time Security Helpers
 */

export interface MaliciousCheckResult {
  safe: boolean;
  threatType?: 'xss' | 'sqli';
  reasonAr?: string;
}

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const XSS_PATTERNS: RegExp[] = [
  /<\s*\/?\s*(script|iframe|object|embed|svg|img|video|audio|style|link|meta|base|form)\b/i,
  /\bon(?:error|load|click|mouseover|focus|blur|submit|input|change|keydown|keyup)\s*=/i,
  /(?:javascript|vbscript)\s*:/i,
  /data\s*:\s*text\/html/i,
  /\b(?:document\.cookie|document\.write|window\.location|eval\s*\(|Function\s*\()\b/i,
];

const SQLI_PATTERNS: RegExp[] = [
  /(?:'|"|`)\s*(?:or|and)\s*(?:'?\d+'?\s*=\s*'?\d+'?|true|false)/i,
  /\bunion\s+(?:all\s+)?select\b/i,
  /;\s*(?:drop|delete|truncate|alter|insert|update|create|replace|exec(?:ute)?)\b/i,
  /(?:--|\/\*|\*\/)/,
  /\b(?:xp_cmdshell|information_schema|pg_sleep|waitfor\s+delay|sleep\s*\(|benchmark\s*\()\b/i,
];

export function stripControlCharacters(
  raw: string,
  allowNewlines = false
): string {
  const cleaned = raw.replace(CONTROL_CHARS_REGEX, '');
  if (allowNewlines) {
    return cleaned;
  }
  return cleaned.replace(/[\r\n]/g, ' ');
}

export function sanitizeTextInput(
  raw: string,
  options: { maxLength?: number; allowNewlines?: boolean } = {}
): string {
  const { maxLength = 500, allowNewlines = false } = options;
  let value = stripControlCharacters(raw, allowNewlines);

  // Neutralize angle brackets and dangerous URI schemes
  value = value
    .replace(/[<>]/g, '')
    .replace(/(?:javascript|vbscript)\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '');

  if (value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  return value.trim();
}

export function sanitizeSearchQuery(raw: string): string {
  return sanitizeTextInput(raw, { maxLength: 80, allowNewlines: false }).replace(
    /['";\\]/g,
    ''
  );
}

export function sanitizeTerminalCommand(raw: string): string {
  // Preserve valid lab commands (e.g., pipes, flags, curl URLs) while stripping HTML/control chars
  const cleaned = stripControlCharacters(raw, false)
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/[<>]/g, '');
  return cleaned.slice(0, 256).trim();
}

export function detectMaliciousPayload(
  raw: string,
  options: { checkSqlInjection?: boolean } = {}
): MaliciousCheckResult {
  const { checkSqlInjection = true } = options;
  const input = stripControlCharacters(raw, true);

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        threatType: 'xss',
        reasonAr:
          'تم رفض الإدخال: رُصدت أنماط حقن برمجي (XSS) أو وسوم HTML غير مسموح بها.',
      };
    }
  }

  if (checkSqlInjection) {
    for (const pattern of SQLI_PATTERNS) {
      if (pattern.test(input)) {
        return {
          safe: false,
          threatType: 'sqli',
          reasonAr:
            'تم رفض الإدخال: رُصدت أنماط حقن قواعد بيانات (SQL Injection) غير مصرح بها.',
        };
      }
    }
  }

  return { safe: true };
}

/**
 * Strict allowlist for CTF flags: e.g. FLAG{LINUX_BASICS_710}
 */
export const STRICT_FLAG_ALLOWLIST_REGEX = /^FLAG\{[A-Za-z0-9_-]{3,96}\}$/;

export function isStrictFlagFormat(flag: string): boolean {
  return STRICT_FLAG_ALLOWLIST_REGEX.test(flag.trim());
}

/**
 * Constant-time string comparison to avoid timing side-channels.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

export async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateRandomHexToken(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const DANGEROUS_OBJECT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export function isSafeRecordKey(key: string): boolean {
  return !DANGEROUS_OBJECT_KEYS.has(key);
}
