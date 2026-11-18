import { detectMaliciousPayload, sanitizeTextInput } from './security';

export type BroadcastSeverity = 'announcement' | 'warning' | 'alert';

export interface SystemBroadcastAnnouncement {
  id: string;
  messageAr: string;
  severity: BroadcastSeverity;
  author: string;
  active: boolean;
  updatedAt: number;
}

const BROADCAST_STORAGE_KEY = 'nawat_cyber_lord_broadcast_v1';

export const BROADCAST_SEVERITY_OPTIONS: {
  id: BroadcastSeverity;
  labelAr: string;
}[] = [
  { id: 'announcement', labelAr: 'إعلان رسمي من اللورد' },
  { id: 'warning', labelAr: 'تحذير نظام' },
  { id: 'alert', labelAr: 'تنبيه أمني عاجل' },
];

export function createDefaultBroadcast(): SystemBroadcastAnnouncement {
  return {
    id: 'lord_default_broadcast',
    messageAr:
      'أهلاً بكم في نواة سايبر — جميع غرف الاختبار والمختبرات متاحة الآن. التزموا بقواعد المنصة ولا تشاركوا الأعلام خارج الحساب الشخصي.',
    severity: 'announcement',
    author: 'SHADOW',
    active: true,
    updatedAt: 0,
  };
}

export function publishSystemBroadcast(params: {
  messageAr: string;
  severity: BroadcastSeverity;
  isDeveloperMode: boolean;
  now?: number;
}): {
  success: boolean;
  broadcast?: SystemBroadcastAnnouncement;
  errorAr?: string;
} {
  if (!params.isDeveloperMode) {
    return {
      success: false,
      errorAr: 'صلاحية البث الرسمي مقتصرة على حساب المطور (SHADOW) فقط.',
    };
  }

  const threat = detectMaliciousPayload(params.messageAr, {
    checkSqlInjection: true,
  });
  if (!threat.safe) {
    return {
      success: false,
      errorAr: threat.reasonAr ?? 'تم رفض نص الإعلان لاحتوائه على مدخلات غير آمنة.',
    };
  }

  const cleanMessage = sanitizeTextInput(params.messageAr, {
    maxLength: 240,
    allowNewlines: false,
  });

  if (cleanMessage.length < 5) {
    return {
      success: false,
      errorAr: 'يجب أن يحتوي نص الإعلان على 5 أحرف على الأقل.',
    };
  }

  const isValidSeverity = BROADCAST_SEVERITY_OPTIONS.some(
    (opt) => opt.id === params.severity
  );
  const now = params.now ?? Date.now();

  return {
    success: true,
    broadcast: {
      id: `brd_${now}`,
      messageAr: cleanMessage,
      severity: isValidSeverity ? params.severity : 'announcement',
      author: 'SHADOW',
      active: true,
      updatedAt: now,
    },
  };
}

export function deactivateSystemBroadcast(
  current: SystemBroadcastAnnouncement,
  isDeveloperMode: boolean,
  now = Date.now()
): SystemBroadcastAnnouncement {
  if (!isDeveloperMode) return current;
  return {
    ...current,
    active: false,
    updatedAt: now,
  };
}

export function sanitizeStoredBroadcast(
  raw: unknown
): SystemBroadcastAnnouncement {
  if (!raw || typeof raw !== 'object') {
    return createDefaultBroadcast();
  }
  const c = raw as Partial<SystemBroadcastAnnouncement>;
  if (
    typeof c.messageAr !== 'string' ||
    typeof c.active !== 'boolean' ||
    (c.severity !== 'announcement' &&
      c.severity !== 'warning' &&
      c.severity !== 'alert') ||
    typeof c.updatedAt !== 'number' ||
    !Number.isFinite(c.updatedAt)
  ) {
    return createDefaultBroadcast();
  }

  const threat = detectMaliciousPayload(c.messageAr, {
    checkSqlInjection: true,
  });
  if (!threat.safe) {
    return createDefaultBroadcast();
  }

  const cleanMessage = sanitizeTextInput(c.messageAr, {
    maxLength: 240,
    allowNewlines: false,
  });
  if (!cleanMessage) {
    return createDefaultBroadcast();
  }

  return {
    id: typeof c.id === 'string' && c.id ? c.id : 'lord_broadcast',
    messageAr: cleanMessage,
    severity: c.severity,
    author: 'SHADOW',
    active: c.active,
    updatedAt: c.updatedAt,
  };
}

export function loadBroadcastFromStorage(): SystemBroadcastAnnouncement {
  if (typeof window === 'undefined') return createDefaultBroadcast();
  try {
    const raw = window.localStorage.getItem(BROADCAST_STORAGE_KEY);
    if (!raw) return createDefaultBroadcast();
    return sanitizeStoredBroadcast(JSON.parse(raw));
  } catch {
    return createDefaultBroadcast();
  }
}

export function saveBroadcastToStorage(
  broadcast: SystemBroadcastAnnouncement
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      BROADCAST_STORAGE_KEY,
      JSON.stringify(broadcast)
    );
  } catch {
    // Ignore storage quota errors
  }
}
