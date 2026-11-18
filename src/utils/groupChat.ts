import {
  detectMaliciousPayload,
  sanitizeTextInput,
} from './security';

export interface GroupChatMessage {
  id: string;
  senderName: string;
  roleLabelAr: string;
  text: string;
  timestamp: string;
  isSystemSeed?: boolean;
}

const GROUP_CHAT_STORAGE_KEY = 'nawat_cyber_team_group_chat_v1';

export const INITIAL_GROUP_CHAT_MESSAGES: GroupChatMessage[] = [
  {
    id: 'seed-1',
    senderName: 'Shadow',
    roleLabelAr: 'قائد الفريق',
    text: 'مرحباً بأعضاء الفريق في القناة المشفّرة. ننسّق هنا مراجعة الغرف الجديدة وتحديث اختبارات الاختراق.',
    timestamp: '09:30',
    isSystemSeed: true,
  },
  {
    id: 'seed-2',
    senderName: 'طارق-DFIR',
    roleLabelAr: 'عضو فريق',
    text: 'تمت مراجعة غرفة التحقيق الجنائي والتأكد من عمل جميع أوامر strings و grep بنجاح.',
    timestamp: '10:15',
    isSystemSeed: true,
  },
];

export function validateAndCreateGroupMessage(
  rawAuthor: string,
  rawMessage: string
): { valid: boolean; entry?: GroupChatMessage; errorAr?: string } {
  const authorThreat = detectMaliciousPayload(rawAuthor, {
    checkSqlInjection: true,
  });
  if (!authorThreat.safe) {
    return { valid: false, errorAr: authorThreat.reasonAr };
  }

  const msgThreat = detectMaliciousPayload(rawMessage, {
    checkSqlInjection: true,
  });
  if (!msgThreat.safe) {
    return { valid: false, errorAr: msgThreat.reasonAr };
  }

  const senderName = sanitizeTextInput(rawAuthor, {
    maxLength: 32,
    allowNewlines: false,
  });
  const text = sanitizeTextInput(rawMessage, {
    maxLength: 400,
    allowNewlines: false,
  });

  if (!senderName || senderName.length < 2) {
    return {
      valid: false,
      errorAr: 'يرجى إدخال اسم العرض (حرفان على الأقل).',
    };
  }
  if (!text || text.length < 2) {
    return {
      valid: false,
      errorAr: 'يرجى كتابة رسالة صالحة لإرسالها للمجموعة.',
    };
  }

  return {
    valid: true,
    entry: {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderName,
      roleLabelAr: 'عضو فريق',
      text,
      timestamp: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  };
}

export function sanitizeStoredGroupMessages(raw: unknown): GroupChatMessage[] {
  if (!Array.isArray(raw)) {
    return INITIAL_GROUP_CHAT_MESSAGES;
  }
  const clean: GroupChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<GroupChatMessage>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.senderName !== 'string' ||
      typeof candidate.text !== 'string' ||
      typeof candidate.timestamp !== 'string'
    ) {
      continue;
    }
    if (
      !detectMaliciousPayload(candidate.text, { checkSqlInjection: false }).safe ||
      !detectMaliciousPayload(candidate.senderName, { checkSqlInjection: false }).safe
    ) {
      continue;
    }
    clean.push({
      id: candidate.id.slice(0, 48),
      senderName: sanitizeTextInput(candidate.senderName, { maxLength: 32 }),
      roleLabelAr:
        typeof candidate.roleLabelAr === 'string'
          ? sanitizeTextInput(candidate.roleLabelAr, { maxLength: 24 })
          : 'عضو فريق',
      text: sanitizeTextInput(candidate.text, { maxLength: 400 }),
      timestamp: sanitizeTextInput(candidate.timestamp, { maxLength: 16 }),
      isSystemSeed: Boolean(candidate.isSystemSeed),
    });
  }
  return clean.length > 0 ? clean.slice(-50) : INITIAL_GROUP_CHAT_MESSAGES;
}

export function loadGroupMessagesFromStorage(): GroupChatMessage[] {
  if (typeof window === 'undefined') {
    return INITIAL_GROUP_CHAT_MESSAGES;
  }
  try {
    const raw = window.localStorage.getItem(GROUP_CHAT_STORAGE_KEY);
    if (!raw) return INITIAL_GROUP_CHAT_MESSAGES;
    return sanitizeStoredGroupMessages(JSON.parse(raw));
  } catch {
    return INITIAL_GROUP_CHAT_MESSAGES;
  }
}

export function saveGroupMessagesToStorage(messages: GroupChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      GROUP_CHAT_STORAGE_KEY,
      JSON.stringify(messages.slice(-50))
    );
  } catch {
    // Ignore storage quota errors
  }
}
