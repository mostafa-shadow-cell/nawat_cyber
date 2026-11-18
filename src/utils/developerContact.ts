import {
  detectMaliciousPayload,
  generateRandomHexToken,
  sanitizeTextInput,
} from './security';

export type ContactTopic =
  | 'challenge_inquiry'
  | 'vulnerability_report'
  | 'join_team'
  | 'feature_suggestion';

export interface ContactTopicOption {
  id: ContactTopic;
  labelAr: string;
}

export const CONTACT_TOPICS: ContactTopicOption[] = [
  { id: 'challenge_inquiry', labelAr: 'استفسار عن تحدي' },
  { id: 'vulnerability_report', labelAr: 'بلاغ ثغرة' },
  { id: 'join_team', labelAr: 'انضمام للفريق' },
  { id: 'feature_suggestion', labelAr: 'اقتراح ميزة جديدة' },
];

export const DEVELOPER_CONTACT_CONFIG = {
  developerName: 'Shadow',
  channelMode: 'internal_only',
} as const;

export type SupportTicketStatus = 'open' | 'resolved';

export interface InternalSupportTicket {
  id: string;
  ticketCode: string;
  senderName: string;
  senderUsername: string;
  topic: ContactTopic;
  message: string;
  automatedReplyAr: string;
  status: SupportTicketStatus;
  createdAt: number;
  resolvedAt: number | null;
}

export interface ContactFormInput {
  name: string;
  topic: ContactTopic;
  message: string;
}

export interface ContactValidationResult {
  valid: boolean;
  sanitized?: ContactFormInput;
  errorAr?: string;
}

const SUPPORT_TICKETS_STORAGE_KEY = 'nawat_cyber_support_tickets_v1';

export function validateContactForm(
  input: ContactFormInput
): ContactValidationResult {
  const nameThreat = detectMaliciousPayload(input.name, {
    checkSqlInjection: true,
  });
  if (!nameThreat.safe) {
    return { valid: false, errorAr: nameThreat.reasonAr };
  }

  const msgThreat = detectMaliciousPayload(input.message, {
    checkSqlInjection: true,
  });
  if (!msgThreat.safe) {
    return { valid: false, errorAr: msgThreat.reasonAr };
  }

  const name = sanitizeTextInput(input.name, {
    maxLength: 60,
    allowNewlines: false,
  });
  const message = sanitizeTextInput(input.message, {
    maxLength: 600,
    allowNewlines: true,
  });
  const isValidTopic = CONTACT_TOPICS.some((t) => t.id === input.topic);

  if (!isValidTopic) {
    return { valid: false, errorAr: 'الموضوع المختار غير صالح.' };
  }
  if (!name) {
    return { valid: false, errorAr: 'يرجى كتابة اسمك قبل الإرسال.' };
  }
  if (name.length < 2) {
    return { valid: false, errorAr: 'يجب أن يحتوي الاسم على حرفين على الأقل.' };
  }
  if (!message) {
    return { valid: false, errorAr: 'يرجى كتابة نص الرسالة.' };
  }
  if (message.length < 5) {
    return {
      valid: false,
      errorAr: 'يرجى كتابة رسالة أوضح (5 أحرف على الأقل).',
    };
  }
  return {
    valid: true,
    sanitized: { name, topic: input.topic, message },
  };
}

export function getTopicLabelAr(topicId: ContactTopic): string {
  return (
    CONTACT_TOPICS.find((t) => t.id === topicId)?.labelAr ?? 'استفسار عام'
  );
}

export function buildAutomatedReplyAr(
  input: ContactFormInput,
  ticketCode?: string
): string {
  const topicLabel = getTopicLabelAr(input.topic);
  const ticketSegment = ticketCode ? ` برقم تذكرة (${ticketCode})` : '';
  return `أهلاً ${input.name.trim()}! تم استلام تذكرتك الداخلية${ticketSegment} بخصوص (${topicLabel}) داخل المنصة وتوجيهها إلى المطور (${DEVELOPER_CONTACT_CONFIG.developerName})، سيتم الرد عليك قريباً!`;
}

export function createInternalSupportTicket(
  tickets: InternalSupportTicket[],
  input: ContactFormInput,
  options: { senderUsername?: string; now?: number } = {}
): {
  success: boolean;
  ticket?: InternalSupportTicket;
  nextTickets: InternalSupportTicket[];
  errorAr?: string;
} {
  const validation = validateContactForm(input);
  if (!validation.valid || !validation.sanitized) {
    return {
      success: false,
      nextTickets: tickets,
      errorAr: validation.errorAr ?? 'تعذر التحقق من بيانات التذكرة.',
    };
  }

  const now = options.now ?? Date.now();
  const shortCode = generateRandomHexToken(3).toUpperCase();
  const ticketCode = `TCK-${shortCode}`;
  const cleanSenderUsername = sanitizeTextInput(
    options.senderUsername ?? 'guest',
    { maxLength: 32, allowNewlines: false }
  ) || 'guest';

  const ticket: InternalSupportTicket = {
    id: `tck_${now}_${shortCode.toLowerCase()}`,
    ticketCode,
    senderName: validation.sanitized.name,
    senderUsername: cleanSenderUsername,
    topic: validation.sanitized.topic,
    message: validation.sanitized.message,
    automatedReplyAr: buildAutomatedReplyAr(validation.sanitized, ticketCode),
    status: 'open',
    createdAt: now,
    resolvedAt: null,
  };

  return {
    success: true,
    ticket,
    nextTickets: [ticket, ...tickets].slice(0, 60),
  };
}

export function resolveInternalSupportTicket(
  tickets: InternalSupportTicket[],
  ticketId: string,
  now = Date.now()
): InternalSupportTicket[] {
  return tickets.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          status: 'resolved',
          resolvedAt: t.resolvedAt ?? now,
        }
      : t
  );
}

export function sanitizeStoredSupportTickets(
  raw: unknown
): InternalSupportTicket[] {
  if (!Array.isArray(raw)) return [];
  const valid: InternalSupportTicket[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<InternalSupportTicket>;
    const validatedTopic = CONTACT_TOPICS.find((t) => t.id === c.topic)?.id;
    if (
      typeof c.id !== 'string' ||
      !c.id ||
      seen.has(c.id) ||
      typeof c.ticketCode !== 'string' ||
      !c.ticketCode ||
      typeof c.senderName !== 'string' ||
      !c.senderName ||
      typeof c.message !== 'string' ||
      !c.message ||
      !validatedTopic ||
      (c.status !== 'open' && c.status !== 'resolved') ||
      typeof c.createdAt !== 'number' ||
      !Number.isFinite(c.createdAt)
    ) {
      continue;
    }

    const nameThreat = detectMaliciousPayload(c.senderName, {
      checkSqlInjection: true,
    });
    const msgThreat = detectMaliciousPayload(c.message, {
      checkSqlInjection: true,
    });
    if (!nameThreat.safe || !msgThreat.safe) {
      continue;
    }

    seen.add(c.id);
    const cleanName = sanitizeTextInput(c.senderName, {
      maxLength: 60,
      allowNewlines: false,
    });
    const cleanMessage = sanitizeTextInput(c.message, {
      maxLength: 600,
      allowNewlines: true,
    });
    const cleanCode = sanitizeTextInput(c.ticketCode, {
      maxLength: 20,
      allowNewlines: false,
    });
    valid.push({
      id: c.id,
      ticketCode: cleanCode,
      senderName: cleanName,
      senderUsername: sanitizeTextInput(c.senderUsername ?? 'guest', {
        maxLength: 32,
        allowNewlines: false,
      }) || 'guest',
      topic: validatedTopic,
      message: cleanMessage,
      automatedReplyAr: sanitizeTextInput(
        c.automatedReplyAr ??
          buildAutomatedReplyAr(
            { name: cleanName, topic: validatedTopic, message: cleanMessage },
            cleanCode
          ),
        { maxLength: 300 }
      ),
      status: c.status,
      createdAt: c.createdAt,
      resolvedAt:
        typeof c.resolvedAt === 'number' && Number.isFinite(c.resolvedAt)
          ? c.resolvedAt
          : null,
    });
  }

  return valid.slice(0, 60);
}

export function loadSupportTicketsFromStorage(): InternalSupportTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeStoredSupportTickets(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSupportTicketsToStorage(
  tickets: InternalSupportTicket[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SUPPORT_TICKETS_STORAGE_KEY,
      JSON.stringify(tickets.slice(0, 60))
    );
  } catch {
    // Ignore storage quota errors
  }
}
