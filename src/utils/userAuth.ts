import {
  detectMaliciousPayload,
  generateRandomHexToken,
  isSafeRecordKey,
  sanitizeTextInput,
  sha256Hex,
  stripControlCharacters,
  timingSafeEqualStrings,
} from './security';
import {
  TEAM_LOCKOUT_DURATION_MS,
  TEAM_MAX_FAILED_ATTEMPTS,
  createDefaultRateLimitState,
  getOrCreateRuntimeSealKey,
  matchesSpecialPassphrase,
  verifyAndNormalizeRateLimitState,
  type RateLimitState,
} from './teamAuth';

export type UserAccountRole =
  | 'user'
  | 'team_member'
  | 'developer'
  | 'elite_king';

export interface StoredUserRecord {
  id: string;
  username: string;
  nickname: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  role: UserAccountRole;
  createdAt: number;
}

export interface SignedUserSession {
  tokenId: string;
  userId: string;
  username: string;
  nickname: string;
  email: string;
  role: UserAccountRole;
  issuedAt: number;
  signature: string;
}

export interface RegistrationInput {
  username: string;
  nickname: string;
  email: string;
  password: string;
}

export interface RegistrationResult {
  success: boolean;
  user: StoredUserRecord | null;
  session: SignedUserSession | null;
  nextUsers: StoredUserRecord[];
  messageAr: string;
}

export interface LoginAttemptResult {
  authenticated: boolean;
  lockedOut: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
  session: SignedUserSession | null;
  shortcutKind: 'developer' | 'elite_king' | 'team_member' | null;
  messageAr: string;
}

const USERS_REGISTRY_STORAGE_KEY = 'nawat_cyber_users_registry_v1';
const ACTIVE_USER_SESSION_STORAGE_KEY = 'nawat_cyber_active_user_session_v1';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,24}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const RESERVED_HANDLES = new Set([
  'shadow',
  'lord_of_chaos',
  'lordofchaos',
  'the_king_30m',
  'admin',
  'root',
  'system',
  '__proto__',
  'constructor',
  'prototype',
]);

export const SHADOW_DEVELOPER_PROFILE = {
  userId: 'dev_shadow',
  username: 'SHADOW',
  nickname: 'Lord of Chaos',
  email: 'shadow@nawat.cyber',
  role: 'developer' as const,
};

export const ELITE_KING_PROFILE = {
  userId: 'elite_king_30m',
  username: 'The_King_30M',
  nickname: 'ملك التحديات (30M)',
  email: 'elite@nawat.cyber',
  role: 'elite_king' as const,
};

export const TEAM_OPERATOR_PROFILE = {
  userId: 'team_operator',
  username: 'Shadow_Team',
  nickname: 'عضو الفريق الأمني',
  email: 'team@nawat.cyber',
  role: 'team_member' as const,
};

async function signUserSessionPayload(
  payload: Omit<SignedUserSession, 'signature'>
): Promise<string> {
  const sealKey = getOrCreateRuntimeSealKey();
  return sha256Hex(
    `${sealKey}|user_session|${payload.tokenId}|${payload.userId}|${payload.username}|${payload.nickname}|${payload.email}|${payload.role}|${payload.issuedAt}`
  );
}

export async function createSignedUserSession(
  profile: {
    userId: string;
    username: string;
    nickname: string;
    email: string;
    role: UserAccountRole;
  },
  now = Date.now()
): Promise<SignedUserSession> {
  const base: Omit<SignedUserSession, 'signature'> = {
    tokenId: generateRandomHexToken(16),
    userId: profile.userId,
    username: profile.username,
    nickname: profile.nickname,
    email: profile.email,
    role: profile.role,
    issuedAt: now,
  };
  const signature = await signUserSessionPayload(base);
  return {
    ...base,
    signature,
  };
}

export async function verifyStoredUserSession(
  raw: unknown,
  now = Date.now()
): Promise<SignedUserSession | null> {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const c = raw as Partial<SignedUserSession>;
  if (
    typeof c.tokenId !== 'string' ||
    !/^[a-f0-9]{32}$/.test(c.tokenId) ||
    typeof c.userId !== 'string' ||
    !c.userId ||
    !isSafeRecordKey(c.userId) ||
    typeof c.username !== 'string' ||
    !c.username ||
    typeof c.nickname !== 'string' ||
    !c.nickname ||
    typeof c.email !== 'string' ||
    !c.email ||
    (c.role !== 'user' &&
      c.role !== 'team_member' &&
      c.role !== 'developer' &&
      c.role !== 'elite_king') ||
    typeof c.issuedAt !== 'number' ||
    !Number.isFinite(c.issuedAt) ||
    c.issuedAt > now + 5000 ||
    typeof c.signature !== 'string'
  ) {
    return null;
  }

  const expectedSig = await signUserSessionPayload({
    tokenId: c.tokenId,
    userId: c.userId,
    username: c.username,
    nickname: c.nickname,
    email: c.email,
    role: c.role,
    issuedAt: c.issuedAt,
  });
  if (!timingSafeEqualStrings(c.signature, expectedSig)) {
    return null;
  }

  return {
    tokenId: c.tokenId,
    userId: c.userId,
    username: c.username,
    nickname: c.nickname,
    email: c.email,
    role: c.role,
    issuedAt: c.issuedAt,
    signature: c.signature,
  };
}

export function validateRegistrationInput(input: RegistrationInput): {
  valid: boolean;
  sanitized?: RegistrationInput;
  errorAr?: string;
} {
  const rawUsername = stripControlCharacters(input.username, false).trim();
  const rawNickname = stripControlCharacters(input.nickname, false).trim();
  const rawEmail = stripControlCharacters(input.email, false)
    .trim()
    .toLowerCase();
  const cleanPassword = stripControlCharacters(input.password, false);

  for (const field of [rawUsername, rawNickname, rawEmail, cleanPassword]) {
    const threat = detectMaliciousPayload(field, { checkSqlInjection: true });
    if (!threat.safe) {
      return { valid: false, errorAr: threat.reasonAr };
    }
  }

  const cleanNickname = sanitizeTextInput(rawNickname, { maxLength: 32 });

  if (!USERNAME_REGEX.test(rawUsername)) {
    return {
      valid: false,
      errorAr:
        'اسم المستخدم يجب أن يتكون من 3 إلى 24 حرفاً بالإنجليزية أو الأرقام أو (_ و -).',
    };
  }

  if (
    RESERVED_HANDLES.has(rawUsername.toLowerCase()) ||
    !isSafeRecordKey(rawUsername)
  ) {
    return {
      valid: false,
      errorAr: 'اسم المستخدم هذا محجوز للنظام ولا يمكن التسجيل به.',
    };
  }

  if (cleanNickname.length < 2 || cleanNickname.length > 32) {
    return {
      valid: false,
      errorAr: 'لقب المستخدم يجب أن يكون بين 2 و 32 حرفاً.',
    };
  }

  if (
    rawEmail.length > 120 ||
    !EMAIL_REGEX.test(rawEmail)
  ) {
    return {
      valid: false,
      errorAr: 'يرجى إدخال بريد إلكتروني صحيح.',
    };
  }

  if (cleanPassword.length < 6 || cleanPassword.length > 128) {
    return {
      valid: false,
      errorAr: 'كلمة المرور يجب أن لا تقل عن 6 أحرف ولا تتجاوز 128 حرفاً.',
    };
  }

  return {
    valid: true,
    sanitized: {
      username: rawUsername,
      nickname: cleanNickname,
      email: rawEmail,
      password: cleanPassword,
    },
  };
}

export async function registerUserAccount(
  input: RegistrationInput,
  existingUsers: StoredUserRecord[],
  now = Date.now()
): Promise<RegistrationResult> {
  const check = validateRegistrationInput(input);
  if (!check.valid || !check.sanitized) {
    return {
      success: false,
      user: null,
      session: null,
      nextUsers: existingUsers,
      messageAr: check.errorAr ?? 'بيانات التسجيل غير صالحة.',
    };
  }

  const { username, nickname, email, password } = check.sanitized;
  const lowerUsername = username.toLowerCase();

  const duplicateUsername = existingUsers.some(
    (u) => u.username.toLowerCase() === lowerUsername
  );
  if (duplicateUsername) {
    return {
      success: false,
      user: null,
      session: null,
      nextUsers: existingUsers,
      messageAr: 'اسم المستخدم مسجل مسبقاً. اختر اسماً آخر أو سجّل الدخول.',
    };
  }

  const duplicateEmail = existingUsers.some(
    (u) => u.email.toLowerCase() === email
  );
  if (duplicateEmail) {
    return {
      success: false,
      user: null,
      session: null,
      nextUsers: existingUsers,
      messageAr: 'البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة.',
    };
  }

  const passwordSalt = generateRandomHexToken(16);
  const passwordHash = await sha256Hex(`${passwordSalt}:${password}`);
  const newUser: StoredUserRecord = {
    id: `usr_${generateRandomHexToken(8)}`,
    username,
    nickname,
    email,
    passwordSalt,
    passwordHash,
    role: 'user',
    createdAt: now,
  };

  const session = await createSignedUserSession(
    {
      userId: newUser.id,
      username: newUser.username,
      nickname: newUser.nickname,
      email: newUser.email,
      role: 'user',
    },
    now
  );

  return {
    success: true,
    user: newUser,
    session,
    nextUsers: [...existingUsers, newUser],
    messageAr: `مرحباً ${nickname}! تم إنشاء حسابك بنجاح برصيد بداية 0 نقطة.`,
  };
}

function findUserByIdentifier(
  users: StoredUserRecord[],
  cleanedIdentifier: string
): StoredUserRecord | undefined {
  if (!cleanedIdentifier) return undefined;
  const lower = cleanedIdentifier.toLowerCase();
  return users.find(
    (u) => u.username.toLowerCase() === lower || u.email.toLowerCase() === lower
  );
}

export async function authenticateUserAccount(
  credentials: { identifier: string; password: string },
  existingUsers: StoredUserRecord[],
  currentRateLimit: RateLimitState,
  now = Date.now()
): Promise<{
  result: LoginAttemptResult;
  nextRateLimit: RateLimitState;
}> {
  const normalizedLimit = await verifyAndNormalizeRateLimitState(
    currentRateLimit,
    now
  );

  if (normalizedLimit.lockedUntil !== null && now < normalizedLimit.lockedUntil) {
    return {
      result: {
        authenticated: false,
        lockedOut: true,
        remainingAttempts: 0,
        lockedUntil: normalizedLimit.lockedUntil,
        session: null,
        shortcutKind: null,
        messageAr:
          'تم قفل تسجيل الدخول مؤقتاً بعد تجاوز الحد الأقصى للمحاولات الفاشلة.',
      },
      nextRateLimit: normalizedLimit,
    };
  }

  const cleanIdentifier = stripControlCharacters(
    credentials.identifier,
    false
  ).trim();
  const cleanPassword = stripControlCharacters(credentials.password, false);

  const idThreat = cleanIdentifier
    ? detectMaliciousPayload(cleanIdentifier, { checkSqlInjection: true })
    : { safe: true };
  const passThreat = detectMaliciousPayload(cleanPassword, {
    checkSqlInjection: true,
  });

  if (!idThreat.safe || !passThreat.safe) {
    const nextFailed = normalizedLimit.failedAttempts + 1;
    const reachedLockout = nextFailed >= TEAM_MAX_FAILED_ATTEMPTS;
    const lockedUntil = reachedLockout
      ? now + TEAM_LOCKOUT_DURATION_MS
      : null;
    const baseRate = await createDefaultRateLimitState();
    const nextRateLimit: RateLimitState = {
      ...baseRate,
      failedAttempts: nextFailed,
      lockedUntil,
    };
    return {
      result: {
        authenticated: false,
        lockedOut: reachedLockout,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS - nextFailed,
        lockedUntil,
        session: null,
        shortcutKind: null,
        messageAr: 'تم رفض الإدخال المشبوه لأسباب أمنية.',
      },
      nextRateLimit,
    };
  }

  // 1. Check Special Shortcut Passwords (Lord of Chaos, The_king_30M, Shadow_666)
  const shortcut = await matchesSpecialPassphrase(cleanPassword);
  if (shortcut === 'developer') {
    const cleanLimit = await createDefaultRateLimitState();
    const session = await createSignedUserSession(
      SHADOW_DEVELOPER_PROFILE,
      now
    );
    return {
      result: {
        authenticated: true,
        lockedOut: false,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
        session,
        shortcutKind: 'developer',
        messageAr:
          'تم تسجيل الدخول بحساب المطور الرئيسي SHADOW (Lord of Chaos) برصيد 3,000,000,000 نقطة!',
      },
      nextRateLimit: cleanLimit,
    };
  }

  if (shortcut === 'elite_king') {
    const cleanLimit = await createDefaultRateLimitState();
    const matchedUser = findUserByIdentifier(existingUsers, cleanIdentifier);
    const profile = matchedUser
      ? {
          userId: matchedUser.id,
          username: matchedUser.username,
          nickname: matchedUser.nickname,
          email: matchedUser.email,
          role: 'elite_king' as const,
        }
      : ELITE_KING_PROFILE;
    const session = await createSignedUserSession(profile, now);
    return {
      result: {
        authenticated: true,
        lockedOut: false,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
        session,
        shortcutKind: 'elite_king',
        messageAr:
          'تم تفعيل دخول النخبة (The_king_30M)! جميع الإعلانات مخفية مع صلاحية إكمال المنصة (30,000,000).',
      },
      nextRateLimit: cleanLimit,
    };
  }

  if (shortcut === 'team_member') {
    const cleanLimit = await createDefaultRateLimitState();
    const matchedUser = findUserByIdentifier(existingUsers, cleanIdentifier);
    const profile = matchedUser
      ? {
          userId: matchedUser.id,
          username: matchedUser.username,
          nickname: matchedUser.nickname,
          email: matchedUser.email,
          role: 'team_member' as const,
        }
      : TEAM_OPERATOR_PROFILE;
    const session = await createSignedUserSession(profile, now);
    return {
      result: {
        authenticated: true,
        lockedOut: false,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
        session,
        shortcutKind: 'team_member',
        messageAr:
          'تم تفعيل دخول عضو الفريق بنجاح وفتح الدردشة الجماعية الخاصة.',
      },
      nextRateLimit: cleanLimit,
    };
  }

  // 2. Standard Registered User Login
  if (!cleanIdentifier || !cleanPassword) {
    return {
      result: {
        authenticated: false,
        lockedOut: false,
        remainingAttempts:
          TEAM_MAX_FAILED_ATTEMPTS - normalizedLimit.failedAttempts,
        lockedUntil: null,
        session: null,
        shortcutKind: null,
        messageAr:
          'يرجى إدخال اسم المستخدم أو البريد الإلكتروني مع كلمة المرور.',
      },
      nextRateLimit: normalizedLimit,
    };
  }

  const matchedUser = findUserByIdentifier(existingUsers, cleanIdentifier);
  let passwordMatches = false;
  if (matchedUser) {
    const candidateHash = await sha256Hex(
      `${matchedUser.passwordSalt}:${cleanPassword}`
    );
    passwordMatches = timingSafeEqualStrings(
      candidateHash,
      matchedUser.passwordHash
    );
  }

  if (matchedUser && passwordMatches) {
    const cleanLimit = await createDefaultRateLimitState();
    const session = await createSignedUserSession(
      {
        userId: matchedUser.id,
        username: matchedUser.username,
        nickname: matchedUser.nickname,
        email: matchedUser.email,
        role: matchedUser.role,
      },
      now
    );
    return {
      result: {
        authenticated: true,
        lockedOut: false,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
        session,
        shortcutKind: null,
        messageAr: `أهلاً بعودتك يا ${matchedUser.nickname}!`,
      },
      nextRateLimit: cleanLimit,
    };
  }

  // Failed authentication attempt -> increment rate limiter
  const nextFailed = normalizedLimit.failedAttempts + 1;
  const reachedLockout = nextFailed >= TEAM_MAX_FAILED_ATTEMPTS;
  const nextLockedUntil = reachedLockout
    ? now + TEAM_LOCKOUT_DURATION_MS
    : null;

  // Sign updated rate limit via verifyAccess-compatible helper
  const sealed = await signRateLimitRecord(nextFailed, nextLockedUntil);
  const remaining = Math.max(0, TEAM_MAX_FAILED_ATTEMPTS - nextFailed);

  return {
    result: {
      authenticated: false,
      lockedOut: reachedLockout,
      remainingAttempts: remaining,
      lockedUntil: nextLockedUntil,
      session: null,
      shortcutKind: null,
      messageAr: reachedLockout
        ? 'تم استنفاد 5 محاولات فاشلة. تم تفعيل القفل الأمني لمدة 5 دقائق.'
        : `بيانات الدخول غير صحيحة. المحاولات المتبقية: ${remaining}`,
    },
    nextRateLimit: sealed,
  };
}

async function signRateLimitRecord(
  failedAttempts: number,
  lockedUntil: number | null
): Promise<RateLimitState> {
  const sealKey = getOrCreateRuntimeSealKey();
  const signature = await sha256Hex(
    `${sealKey}|ratelimit|${failedAttempts}|${lockedUntil ?? 'none'}`
  );
  return {
    failedAttempts,
    lockedUntil,
    signature,
  };
}

export function sanitizeStoredUsersRegistry(raw: unknown): StoredUserRecord[] {
  if (!Array.isArray(raw)) return [];
  const valid: StoredUserRecord[] = [];
  const seenUsernames = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<StoredUserRecord>;
    if (
      typeof c.id !== 'string' ||
      !/^usr_[a-f0-9]{16}$/.test(c.id) ||
      !isSafeRecordKey(c.id) ||
      typeof c.username !== 'string' ||
      !USERNAME_REGEX.test(c.username) ||
      RESERVED_HANDLES.has(c.username.toLowerCase()) ||
      typeof c.nickname !== 'string' ||
      c.nickname.trim().length < 2 ||
      c.nickname.trim().length > 32 ||
      typeof c.email !== 'string' ||
      !EMAIL_REGEX.test(c.email) ||
      typeof c.passwordSalt !== 'string' ||
      !/^[a-f0-9]{32}$/.test(c.passwordSalt) ||
      typeof c.passwordHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(c.passwordHash) ||
      typeof c.createdAt !== 'number'
    ) {
      continue;
    }

    const lower = c.username.toLowerCase();
    if (seenUsernames.has(lower)) continue;
    seenUsernames.add(lower);

    const safeRole: UserAccountRole =
      c.role === 'team_member' || c.role === 'elite_king' ? c.role : 'user';

    valid.push({
      id: c.id,
      username: c.username,
      nickname: sanitizeTextInput(c.nickname, { maxLength: 32 }),
      email: c.email.toLowerCase(),
      passwordSalt: c.passwordSalt,
      passwordHash: c.passwordHash,
      role: safeRole,
      createdAt: c.createdAt,
    });
  }

  return valid;
}

export function loadRegisteredUsersFromStorage(): StoredUserRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(USERS_REGISTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeStoredUsersRegistry(parsed);
  } catch {
    return [];
  }
}

export function saveRegisteredUsersToStorage(users: StoredUserRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      USERS_REGISTRY_STORAGE_KEY,
      JSON.stringify(users)
    );
  } catch {
    // Ignore storage quota failures
  }
}

export async function loadVerifiedUserSessionFromStorage(): Promise<SignedUserSession | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_USER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const verified = await verifyStoredUserSession(parsed);
    if (!verified) {
      window.localStorage.removeItem(ACTIVE_USER_SESSION_STORAGE_KEY);
      return null;
    }
    return verified;
  } catch {
    window.localStorage.removeItem(ACTIVE_USER_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveUserSessionToStorage(session: SignedUserSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      ACTIVE_USER_SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );
  } catch {
    // Ignore storage failures
  }
}

export function clearUserSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_USER_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}
