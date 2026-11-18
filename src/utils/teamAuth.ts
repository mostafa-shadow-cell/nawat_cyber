import {
  detectMaliciousPayload,
  generateRandomHexToken,
  sha256Hex,
  stripControlCharacters,
  timingSafeEqualStrings,
} from './security';

/**
 * Salted SHA-256 digests (zero plaintext passphrases stored in source code).
 */
const TEAM_AUTH_SALT = 'nawat-cyber-team-v1:';
const TEAM_PASSWORD_DIGEST_SHA256 =
  '2f8fe80758170f2e084785700baa591fa3797977bc32bb9658e390e323c84fd3';

const DEV_AUTH_SALT = 'nawat-cyber-dev-v1:';
const DEV_PASSWORD_DIGEST_SHA256 =
  '4c60fe08a2ca6fa6b8f3812e6cfdf983b39ea99a6aa62cbe4e7b2d335a5f3bc8';

const KING_AUTH_SALT = 'nawat-cyber-king-v1:';
const KING_PASSWORD_DIGEST_SHA256 =
  'f3ab1c5a8a06923921d7757701285e06828dc7af84e86fcad95a70530975c07c';

export const TEAM_MAX_FAILED_ATTEMPTS = 5;
export const TEAM_LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const PRIVILEGE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const TEAM_SESSION_STORAGE_KEY = 'nawat_cyber_team_session_v1';
const TEAM_RATE_LIMIT_STORAGE_KEY = 'nawat_cyber_team_ratelimit_v1';
const PRIVILEGE_STORAGE_KEY = 'nawat_cyber_adfree_privilege_v1';
const RUNTIME_SEAL_KEY_STORAGE = 'nawat_cyber_runtime_nonce_v1';

export type AccessRole = 'team_member' | 'developer';
export type AdFreePrivilegeKind = 'paid_pass' | 'king_30m';

export interface RateLimitState {
  failedAttempts: number;
  lockedUntil: number | null;
  signature: string;
}

export interface SignedTeamSession {
  tokenId: string;
  role: AccessRole;
  issuedAt: number;
  signature: string;
}

export interface SignedAdFreePrivilege {
  tokenId: string;
  kind: AdFreePrivilegeKind;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export interface TeamAuthAttemptResult {
  authenticated: boolean;
  lockedOut: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
  session: SignedTeamSession | null;
  messageAr: string;
}

export interface KingUnlockResult {
  unlocked: boolean;
  lockedOut: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
  privilege: SignedAdFreePrivilege | null;
  messageAr: string;
}

export function getOrCreateRuntimeSealKey(): string {
  if (typeof window === 'undefined') {
    return 'test-runtime-seal-key';
  }
  try {
    const existingLocal = window.localStorage.getItem(RUNTIME_SEAL_KEY_STORAGE);
    if (existingLocal && /^[a-f0-9]{32,64}$/.test(existingLocal)) {
      return existingLocal;
    }
    const existingSession = window.sessionStorage.getItem(
      RUNTIME_SEAL_KEY_STORAGE
    );
    if (existingSession && /^[a-f0-9]{32,64}$/.test(existingSession)) {
      window.localStorage.setItem(RUNTIME_SEAL_KEY_STORAGE, existingSession);
      return existingSession;
    }
    const created = generateRandomHexToken(16);
    window.localStorage.setItem(RUNTIME_SEAL_KEY_STORAGE, created);
    return created;
  } catch {
    return 'fallback-runtime-seal-key';
  }
}

async function signTeamSessionPayload(
  tokenId: string,
  role: AccessRole,
  issuedAt: number
): Promise<string> {
  const sealKey = getOrCreateRuntimeSealKey();
  return sha256Hex(`${sealKey}|session|${tokenId}|${role}|${issuedAt}`);
}

async function signPrivilegePayload(
  tokenId: string,
  kind: AdFreePrivilegeKind,
  issuedAt: number,
  expiresAt: number
): Promise<string> {
  const sealKey = getOrCreateRuntimeSealKey();
  return sha256Hex(
    `${sealKey}|privilege|${tokenId}|${kind}|${issuedAt}|${expiresAt}`
  );
}

async function signRateLimitPayload(
  failedAttempts: number,
  lockedUntil: number | null
): Promise<string> {
  const sealKey = getOrCreateRuntimeSealKey();
  return sha256Hex(
    `${sealKey}|ratelimit|${failedAttempts}|${lockedUntil ?? 'none'}`
  );
}

export async function createDefaultRateLimitState(): Promise<RateLimitState> {
  const signature = await signRateLimitPayload(0, null);
  return {
    failedAttempts: 0,
    lockedUntil: null,
    signature,
  };
}

export async function verifyAndNormalizeRateLimitState(
  raw: unknown,
  now = Date.now()
): Promise<RateLimitState> {
  if (!raw || typeof raw !== 'object') {
    return createDefaultRateLimitState();
  }
  const candidate = raw as Partial<RateLimitState>;
  const failedAttempts =
    typeof candidate.failedAttempts === 'number' &&
    Number.isInteger(candidate.failedAttempts) &&
    candidate.failedAttempts >= 0 &&
    candidate.failedAttempts <= TEAM_MAX_FAILED_ATTEMPTS
      ? candidate.failedAttempts
      : null;

  const lockedUntil =
    candidate.lockedUntil === null ||
    (typeof candidate.lockedUntil === 'number' &&
      Number.isFinite(candidate.lockedUntil))
      ? candidate.lockedUntil
      : undefined;

  if (
    failedAttempts === null ||
    lockedUntil === undefined ||
    typeof candidate.signature !== 'string'
  ) {
    return createDefaultRateLimitState();
  }

  const expectedSig = await signRateLimitPayload(failedAttempts, lockedUntil);
  if (!timingSafeEqualStrings(candidate.signature, expectedSig)) {
    return createDefaultRateLimitState();
  }

  if (lockedUntil !== null && now >= lockedUntil) {
    return createDefaultRateLimitState();
  }

  return {
    failedAttempts,
    lockedUntil,
    signature: candidate.signature,
  };
}

export async function createSignedTeamSession(
  now = Date.now(),
  role: AccessRole = 'team_member'
): Promise<SignedTeamSession> {
  const tokenId = generateRandomHexToken(16);
  const issuedAt = now;
  const signature = await signTeamSessionPayload(tokenId, role, issuedAt);
  return {
    tokenId,
    role,
    issuedAt,
    signature,
  };
}

export async function verifyStoredTeamSession(
  raw: unknown,
  now = Date.now()
): Promise<SignedTeamSession | null> {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Partial<SignedTeamSession>;
  if (
    typeof candidate.tokenId !== 'string' ||
    !/^[a-f0-9]{32}$/.test(candidate.tokenId) ||
    (candidate.role !== 'team_member' && candidate.role !== 'developer') ||
    typeof candidate.issuedAt !== 'number' ||
    !Number.isFinite(candidate.issuedAt) ||
    typeof candidate.signature !== 'string'
  ) {
    return null;
  }

  if (candidate.issuedAt > now + 5000) {
    return null;
  }

  const expectedSig = await signTeamSessionPayload(
    candidate.tokenId,
    candidate.role,
    candidate.issuedAt
  );
  if (!timingSafeEqualStrings(candidate.signature, expectedSig)) {
    return null;
  }

  return {
    tokenId: candidate.tokenId,
    role: candidate.role,
    issuedAt: candidate.issuedAt,
    signature: candidate.signature,
  };
}

export async function createSignedAdFreePrivilege(
  kind: AdFreePrivilegeKind,
  now = Date.now()
): Promise<SignedAdFreePrivilege> {
  const tokenId = generateRandomHexToken(16);
  const issuedAt = now;
  const expiresAt = now + PRIVILEGE_TOKEN_TTL_MS;
  const signature = await signPrivilegePayload(
    tokenId,
    kind,
    issuedAt,
    expiresAt
  );
  return {
    tokenId,
    kind,
    issuedAt,
    expiresAt,
    signature,
  };
}

export async function verifyStoredAdFreePrivilege(
  raw: unknown,
  now = Date.now()
): Promise<SignedAdFreePrivilege | null> {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Partial<SignedAdFreePrivilege>;
  if (
    typeof candidate.tokenId !== 'string' ||
    !/^[a-f0-9]{32}$/.test(candidate.tokenId) ||
    (candidate.kind !== 'paid_pass' && candidate.kind !== 'king_30m') ||
    typeof candidate.issuedAt !== 'number' ||
    typeof candidate.expiresAt !== 'number' ||
    typeof candidate.signature !== 'string'
  ) {
    return null;
  }

  if (
    candidate.expiresAt <= now ||
    candidate.issuedAt > now + 5000 ||
    candidate.expiresAt - candidate.issuedAt > PRIVILEGE_TOKEN_TTL_MS + 1000
  ) {
    return null;
  }

  const expectedSig = await signPrivilegePayload(
    candidate.tokenId,
    candidate.kind,
    candidate.issuedAt,
    candidate.expiresAt
  );
  if (!timingSafeEqualStrings(candidate.signature, expectedSig)) {
    return null;
  }

  return {
    tokenId: candidate.tokenId,
    kind: candidate.kind,
    issuedAt: candidate.issuedAt,
    expiresAt: candidate.expiresAt,
    signature: candidate.signature,
  };
}

/**
 * Verifies Team Mode (Shadow_666) or Developer Mode (Lord of Chaos) with 5-attempt rate limiting.
 */
export async function verifyAccessPasswordAttempt(
  rawPassword: string,
  targetRole: AccessRole,
  currentRateLimit: RateLimitState,
  now = Date.now()
): Promise<{
  result: TeamAuthAttemptResult;
  nextRateLimit: RateLimitState;
}> {
  const normalizedState = await verifyAndNormalizeRateLimitState(
    currentRateLimit,
    now
  );

  if (
    normalizedState.lockedUntil !== null &&
    now < normalizedState.lockedUntil
  ) {
    return {
      result: {
        authenticated: false,
        lockedOut: true,
        remainingAttempts: 0,
        lockedUntil: normalizedState.lockedUntil,
        session: null,
        messageAr:
          'تم قفل التحقق مؤقتاً بعد تجاوز الحد الأقصى للمحاولات الفاشلة.',
      },
      nextRateLimit: normalizedState,
    };
  }

  const cleaned = stripControlCharacters(rawPassword, false).trim();
  if (!cleaned || cleaned.length > 128) {
    return {
      result: {
        authenticated: false,
        lockedOut: false,
        remainingAttempts:
          TEAM_MAX_FAILED_ATTEMPTS - normalizedState.failedAttempts,
        lockedUntil: null,
        session: null,
        messageAr: 'يرجى إدخال كلمة مرور صالحة.',
      },
      nextRateLimit: normalizedState,
    };
  }

  const threat = detectMaliciousPayload(cleaned, { checkSqlInjection: true });
  const expectedSalt =
    targetRole === 'developer' ? DEV_AUTH_SALT : TEAM_AUTH_SALT;
  const expectedDigest =
    targetRole === 'developer'
      ? DEV_PASSWORD_DIGEST_SHA256
      : TEAM_PASSWORD_DIGEST_SHA256;

  const digest = await sha256Hex(`${expectedSalt}${cleaned}`);
  const isMatch = threat.safe && timingSafeEqualStrings(digest, expectedDigest);

  if (isMatch) {
    const cleanLimit = await createDefaultRateLimitState();
    const session = await createSignedTeamSession(now, targetRole);
    return {
      result: {
        authenticated: true,
        lockedOut: false,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
        session,
        messageAr:
          targetRole === 'developer'
            ? 'تم تسجيل الدخول بحساب المطور الرئيسي وتفعيل مكافأة 3,000,000,000 نقطة!'
            : 'تم التحقق بنجاح وفتح الدردشة الجماعية الخاصة للفريق.',
      },
      nextRateLimit: cleanLimit,
    };
  }

  const nextFailed = normalizedState.failedAttempts + 1;
  const reachedLockout = nextFailed >= TEAM_MAX_FAILED_ATTEMPTS;
  const nextLockedUntil = reachedLockout
    ? now + TEAM_LOCKOUT_DURATION_MS
    : null;
  const nextSig = await signRateLimitPayload(nextFailed, nextLockedUntil);

  const nextRateLimit: RateLimitState = {
    failedAttempts: nextFailed,
    lockedUntil: nextLockedUntil,
    signature: nextSig,
  };

  if (reachedLockout) {
    return {
      result: {
        authenticated: false,
        lockedOut: true,
        remainingAttempts: 0,
        lockedUntil: nextLockedUntil,
        session: null,
        messageAr:
          'تم استنفاد 5 محاولات فاشلة. تم تفعيل القفل الأمني لمدة 5 دقائق.',
      },
      nextRateLimit,
    };
  }

  const remaining = TEAM_MAX_FAILED_ATTEMPTS - nextFailed;
  return {
    result: {
      authenticated: false,
      lockedOut: false,
      remainingAttempts: remaining,
      lockedUntil: null,
      session: null,
      messageAr: !threat.safe
        ? `تم رفض الإدخال المشبوه. المحاولات المتبقية: ${remaining}`
        : `كلمة المرور غير صحيحة. المحاولات المتبقية: ${remaining}`,
    },
    nextRateLimit,
  };
}

/**
 * Backward-compatible alias for Team Mode (Shadow_666) verification.
 */
export function verifyTeamPasswordAttempt(
  rawPassword: string,
  currentRateLimit: RateLimitState,
  now = Date.now()
) {
  return verifyAccessPasswordAttempt(
    rawPassword,
    'team_member',
    currentRateLimit,
    now
  );
}

/**
 * Checks whether a password matches one of the special shortcut passphrases
 * (developer 'Lord of Chaos', elite 'The_king_30M', or team 'Shadow_666')
 * using constant-time comparison against salted SHA-256 digests.
 */
export async function matchesSpecialPassphrase(
  rawPassword: string
): Promise<'developer' | 'elite_king' | 'team_member' | null> {
  const cleaned = stripControlCharacters(rawPassword, false).trim();
  if (!cleaned || cleaned.length > 128) {
    return null;
  }
  const threat = detectMaliciousPayload(cleaned, { checkSqlInjection: true });
  if (!threat.safe) {
    return null;
  }

  const [devDigest, kingDigest, teamDigest] = await Promise.all([
    sha256Hex(`${DEV_AUTH_SALT}${cleaned}`),
    sha256Hex(`${KING_AUTH_SALT}${cleaned}`),
    sha256Hex(`${TEAM_AUTH_SALT}${cleaned}`),
  ]);

  if (timingSafeEqualStrings(devDigest, DEV_PASSWORD_DIGEST_SHA256)) {
    return 'developer';
  }
  if (timingSafeEqualStrings(kingDigest, KING_PASSWORD_DIGEST_SHA256)) {
    return 'elite_king';
  }
  if (timingSafeEqualStrings(teamDigest, TEAM_PASSWORD_DIGEST_SHA256)) {
    return 'team_member';
  }
  return null;
}

/**
 * Verifies post-completion elite password (The_king_30M) only after beating all platform challenges (30M Bounty).
 */
export async function verifyKing30MAttempt(
  rawPassword: string,
  hasReached30MMilestone: boolean,
  currentRateLimit: RateLimitState,
  now = Date.now()
): Promise<{
  result: KingUnlockResult;
  nextRateLimit: RateLimitState;
}> {
  const normalizedState = await verifyAndNormalizeRateLimitState(
    currentRateLimit,
    now
  );

  if (
    normalizedState.lockedUntil !== null &&
    now < normalizedState.lockedUntil
  ) {
    return {
      result: {
        unlocked: false,
        lockedOut: true,
        remainingAttempts: 0,
        lockedUntil: normalizedState.lockedUntil,
        privilege: null,
        messageAr:
          'تم قفل التحقق مؤقتاً بعد تجاوز الحد الأقصى للمحاولات الفاشلة.',
      },
      nextRateLimit: normalizedState,
    };
  }

  if (!hasReached30MMilestone) {
    return {
      result: {
        unlocked: false,
        lockedOut: false,
        remainingAttempts:
          TEAM_MAX_FAILED_ATTEMPTS - normalizedState.failedAttempts,
        lockedUntil: null,
        privilege: null,
        messageAr:
          'هذا الرمز متاح فقط بعد إكمال جميع تحديات المنصة والوصول إلى 30,000,000 نقطة.',
      },
      nextRateLimit: normalizedState,
    };
  }

  const cleaned = stripControlCharacters(rawPassword, false).trim();
  if (!cleaned || cleaned.length > 128) {
    return {
      result: {
        unlocked: false,
        lockedOut: false,
        remainingAttempts:
          TEAM_MAX_FAILED_ATTEMPTS - normalizedState.failedAttempts,
        lockedUntil: null,
        privilege: null,
        messageAr: 'يرجى إدخال رمز النخبة بشكل صحيح.',
      },
      nextRateLimit: normalizedState,
    };
  }

  const threat = detectMaliciousPayload(cleaned, { checkSqlInjection: true });
  const digest = await sha256Hex(`${KING_AUTH_SALT}${cleaned}`);
  const isMatch =
    threat.safe && timingSafeEqualStrings(digest, KING_PASSWORD_DIGEST_SHA256);

  if (isMatch) {
    const cleanLimit = await createDefaultRateLimitState();
    const privilege = await createSignedAdFreePrivilege('king_30m', now);
    return {
      result: {
        unlocked: true,
        lockedOut: false,
        remainingAttempts: TEAM_MAX_FAILED_ATTEMPTS,
        lockedUntil: null,
        privilege,
        messageAr:
          'تم تفعيل رمز النخبة! تم إخفاء جميع الإعلانات مع الحفاظ على نقاطك الكاملة (30,000,000).',
      },
      nextRateLimit: cleanLimit,
    };
  }

  const nextFailed = normalizedState.failedAttempts + 1;
  const reachedLockout = nextFailed >= TEAM_MAX_FAILED_ATTEMPTS;
  const nextLockedUntil = reachedLockout
    ? now + TEAM_LOCKOUT_DURATION_MS
    : null;
  const nextSig = await signRateLimitPayload(nextFailed, nextLockedUntil);
  const nextRateLimit: RateLimitState = {
    failedAttempts: nextFailed,
    lockedUntil: nextLockedUntil,
    signature: nextSig,
  };

  if (reachedLockout) {
    return {
      result: {
        unlocked: false,
        lockedOut: true,
        remainingAttempts: 0,
        lockedUntil: nextLockedUntil,
        privilege: null,
        messageAr:
          'تم استنفاد 5 محاولات فاشلة. تم تفعيل القفل الأمني لمدة 5 دقائق.',
      },
      nextRateLimit,
    };
  }

  const remaining = TEAM_MAX_FAILED_ATTEMPTS - nextFailed;
  return {
    result: {
      unlocked: false,
      lockedOut: false,
      remainingAttempts: remaining,
      lockedUntil: null,
      privilege: null,
      messageAr: `رمز النخبة غير صحيح. المحاولات المتبقية: ${remaining}`,
    },
    nextRateLimit,
  };
}

export async function loadTeamRateLimitFromStorage(): Promise<RateLimitState> {
  if (typeof window === 'undefined') {
    return createDefaultRateLimitState();
  }
  try {
    const raw = window.localStorage.getItem(TEAM_RATE_LIMIT_STORAGE_KEY);
    if (!raw) return createDefaultRateLimitState();
    const parsed = JSON.parse(raw);
    return await verifyAndNormalizeRateLimitState(parsed);
  } catch {
    return createDefaultRateLimitState();
  }
}

export function saveTeamRateLimitToStorage(state: RateLimitState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      TEAM_RATE_LIMIT_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage failures
  }
}

export async function loadVerifiedTeamSessionFromStorage(): Promise<SignedTeamSession | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TEAM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const verified = await verifyStoredTeamSession(parsed);
    if (!verified) {
      window.localStorage.removeItem(TEAM_SESSION_STORAGE_KEY);
      return null;
    }
    return verified;
  } catch {
    window.localStorage.removeItem(TEAM_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveTeamSessionToStorage(session: SignedTeamSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      TEAM_SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );
  } catch {
    // Ignore storage failures
  }
}

export function clearTeamSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TEAM_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

export async function loadVerifiedAdFreePrivilegeFromStorage(): Promise<SignedAdFreePrivilege | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PRIVILEGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const verified = await verifyStoredAdFreePrivilege(parsed);
    if (!verified) {
      window.localStorage.removeItem(PRIVILEGE_STORAGE_KEY);
      return null;
    }
    return verified;
  } catch {
    window.localStorage.removeItem(PRIVILEGE_STORAGE_KEY);
    return null;
  }
}

export function saveAdFreePrivilegeToStorage(
  privilege: SignedAdFreePrivilege
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PRIVILEGE_STORAGE_KEY,
      JSON.stringify(privilege)
    );
  } catch {
    // Ignore storage failures
  }
}

export function clearAdFreePrivilegeFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PRIVILEGE_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}
