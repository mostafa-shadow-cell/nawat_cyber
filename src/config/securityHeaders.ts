/**
 * Enterprise HTTP Security Headers Configuration
 *
 * Used by Vite dev/preview servers and ready for Node/Express/Reverse-Proxy
 * production deployments (Nginx, Cloudflare, Cloud Run).
 */

export interface SecurityHeaderEntry {
  name: string;
  value: string;
  descriptionAr: string;
}

export const CONTENT_SECURITY_POLICY_DIRECTIVES = [
  "default-src 'self'",
  // 'unsafe-inline' is avoided in strict production builds using nonces;
  // in Vite dev mode or static hosts, restrict script origins strictly to 'self'.
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Standalone deployment default: "frame-ancestors 'none'".
  // When embedded inside an authorized preview host, restrict explicitly to trusted origins.
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const PRODUCTION_HTTP_SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY_DIRECTIVES,
  // Standalone production recommendation: 'DENY' (use 'SAMEORIGIN' only when framed by same origin)
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * Vite dev server headers placeholder.
 * Keeps Vite HMR/preamble scripts and preview iframe functional while enforcing
 * nosniff, referrer policy, permissions policy, and baseline CSP rules.
 */
export const VITE_DEV_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  // Production Express / Nginx deployments should enforce full strict CSP & X-Frame-Options: DENY
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

export const SECURITY_HEADERS_AUDIT_LIST: SecurityHeaderEntry[] = [
  {
    name: 'Content-Security-Policy',
    value: PRODUCTION_HTTP_SECURITY_HEADERS['Content-Security-Policy'],
    descriptionAr: 'تقييد مصادر السكربتات والخطوط لمنع تنفيذ XSS وحقن الموارد.',
  },
  {
    name: 'X-Frame-Options',
    value: 'DENY (Standalone) / SAMEORIGIN (Embedded)',
    descriptionAr: 'الحماية من هجمات اختطاف النقرات (Clickjacking) داخل الإطارات.',
  },
  {
    name: 'X-Content-Type-Options',
    value: 'nosniff',
    descriptionAr: 'منع المتصفح من تخمين نوع الملفات (MIME Sniffing).',
  },
  {
    name: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
    descriptionAr: 'تقليل تسرب المسارات الحساسة عبر ترويسة المرجع.',
  },
  {
    name: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
    descriptionAr: 'تعطيل واجهات الأجهزة الحساسة غير المستخدمة في المنصة.',
  },
];
