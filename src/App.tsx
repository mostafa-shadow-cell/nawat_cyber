import { useEffect, useMemo, useState } from 'react';
import {
  AdFreeStoreModal,
  type VipCheckoutPayload,
} from './components/AdFreeStoreModal';
import { AuthModal, type AuthModalMode } from './components/AuthModal';
import { BountyNotificationPopup } from './components/BountyNotificationPopup';
import { BroadcastTicker } from './components/BroadcastTicker';
import { DeveloperAdminView } from './components/DeveloperAdminView';
import { DeveloperChatWidget } from './components/DeveloperChatWidget';
import type { WrongFlagPenaltyFeedback } from './components/FlagSubmissionBox';
import { LeaderboardView } from './components/LeaderboardView';
import { Navbar, type ActiveRoute } from './components/Navbar';
import { PathsView } from './components/PathsView';
import { ProgressView } from './components/ProgressView';
import { RoomDetail } from './components/RoomDetail';
import { RoomsDashboard } from './components/RoomsDashboard';
import { TeamModeView } from './components/TeamModeView';
import { LEARNING_PATHS, ROOMS } from './data/rooms';
import type { RoomTask, UserProgress } from './types/platform';
import {
  buildLoginNotificationData,
  incrementAccountActivityInMap,
  loadAccountMetricsMap,
  recordAccountLoginInMap,
  saveAccountMetricsMap,
  type AccountMetricsRecord,
  type BountyLoginNotification,
} from './utils/accountMetrics';
import {
  getOrCreateTabSessionId,
  getOrCreateVisitorId,
  loadAnalyticsFromStorage,
  recordPlatformVisit,
  saveAnalyticsToStorage,
  touchAnalyticsHeartbeat,
  type PlatformAnalyticsState,
} from './utils/analytics';
import {
  deactivateSystemBroadcast,
  loadBroadcastFromStorage,
  publishSystemBroadcast,
  saveBroadcastToStorage,
  type BroadcastSeverity,
  type SystemBroadcastAnnouncement,
} from './utils/broadcastTicker';
import {
  banUserAccount,
  createAuditEntry,
  demoteUserAccount,
  loadAdminAuditLog,
  loadSpecialAccessRecords,
  saveAdminAuditLog,
  saveSpecialAccessRecords,
  upsertSpecialAccessRecord,
  type AdminAuditAction,
  type AdminAuditLogEntry,
  type AdminTrackedUser,
  type SpecialAccessRecord,
} from './utils/developerAdmin';
import {
  createInternalSupportTicket,
  loadSupportTicketsFromStorage,
  resolveInternalSupportTicket,
  saveSupportTicketsToStorage,
  type ContactFormInput,
  type InternalSupportTicket,
} from './utils/developerContact';
import {
  loadPlatformFinanceFromStorage,
  loadVipStatusMapFromStorage,
  processDeveloperWithdrawal,
  recordVipPurchase,
  savePlatformFinanceToStorage,
  saveVipStatusMapToStorage,
  type CurrencyCode,
  type DeveloperPayoutMethodId,
  type PlatformFinanceState,
} from './utils/finance';
import {
  applyWrongFlagPenalty,
  clearProgressFromStorage,
  createInitialProgress,
  getPlatformStats,
  getRoomCompletion,
  loadProgressFromStorage,
  markTaskSolved,
  saveProgressToStorage,
} from './utils/progress';
import {
  clearTeamSessionFromStorage,
  createDefaultRateLimitState,
  createSignedAdFreePrivilege,
  createSignedTeamSession,
  loadTeamRateLimitFromStorage,
  loadVerifiedAdFreePrivilegeFromStorage,
  loadVerifiedTeamSessionFromStorage,
  saveAdFreePrivilegeToStorage,
  saveTeamRateLimitToStorage,
  saveTeamSessionToStorage,
  type RateLimitState,
  type SignedAdFreePrivilege,
  type SignedTeamSession,
} from './utils/teamAuth';
import {
  ELITE_KING_PROFILE,
  SHADOW_DEVELOPER_PROFILE,
  TEAM_OPERATOR_PROFILE,
  clearUserSessionFromStorage,
  createSignedUserSession,
  loadRegisteredUsersFromStorage,
  loadVerifiedUserSessionFromStorage,
  saveRegisteredUsersToStorage,
  saveUserSessionToStorage,
  type LoginAttemptResult,
  type SignedUserSession,
  type StoredUserRecord,
} from './utils/userAuth';

export default function App() {
  const [registeredUsers, setRegisteredUsers] = useState<StoredUserRecord[]>(() =>
    loadRegisteredUsersFromStorage()
  );
  const [userSession, setUserSession] = useState<SignedUserSession | null>(
    null
  );
  const [activeProgressUserId, setActiveProgressUserId] = useState<
    string | null
  >(null);
  const [progress, setProgress] = useState<UserProgress>(() =>
    loadProgressFromStorage(null)
  );
  const [isAuthHydrated, setIsAuthHydrated] = useState(false);

  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('rooms');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [teamSession, setTeamSession] = useState<SignedTeamSession | null>(null);
  const [adFreePrivilege, setAdFreePrivilege] =
    useState<SignedAdFreePrivilege | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    failedAttempts: 0,
    lockedUntil: null,
    signature: '',
  });
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(
    null
  );
  const [accountMetricsMap, setAccountMetricsMap] = useState<
    Record<string, AccountMetricsRecord>
  >(() => loadAccountMetricsMap());
  const [specialAccessRecords, setSpecialAccessRecords] = useState<
    SpecialAccessRecord[]
  >(() => loadSpecialAccessRecords());
  const [adminAuditLog, setAdminAuditLog] = useState<AdminAuditLogEntry[]>(() =>
    loadAdminAuditLog()
  );
  const [financeState, setFinanceState] = useState<PlatformFinanceState>(() =>
    loadPlatformFinanceFromStorage()
  );
  const [vipMap, setVipMap] = useState<Record<string, number>>(() =>
    loadVipStatusMapFromStorage()
  );
  const [analyticsState, setAnalyticsState] = useState<PlatformAnalyticsState>(
    () => loadAnalyticsFromStorage()
  );
  const [broadcast, setBroadcast] = useState<SystemBroadcastAnnouncement>(() =>
    loadBroadcastFromStorage()
  );
  const [supportTickets, setSupportTickets] = useState<InternalSupportTicket[]>(
    () => loadSupportTicketsFromStorage()
  );
  const [loginNotification, setLoginNotification] =
    useState<BountyLoginNotification | null>(null);

  useEffect(() => {
    if (!isAuthHydrated) return;
    saveProgressToStorage(progress, activeProgressUserId);
  }, [progress, activeProgressUserId, isAuthHydrated]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [loadedUserSession, loadedTeamSession, loadedPrivilege, loadedLimit] =
        await Promise.all([
          loadVerifiedUserSessionFromStorage(),
          loadVerifiedTeamSessionFromStorage(),
          loadVerifiedAdFreePrivilegeFromStorage(),
          loadTeamRateLimitFromStorage(),
        ]);
      if (!active) return;

      let effectiveUserSession = loadedUserSession;
      if (!effectiveUserSession && loadedTeamSession) {
        effectiveUserSession = await createSignedUserSession(
          loadedTeamSession.role === 'developer'
            ? SHADOW_DEVELOPER_PROFILE
            : TEAM_OPERATOR_PROFILE
        );
        saveUserSessionToStorage(effectiveUserSession);
      }

      const progressOwnerId = effectiveUserSession?.userId ?? null;
      setUserSession(effectiveUserSession);
      setActiveProgressUserId(progressOwnerId);
      setProgress(loadProgressFromStorage(progressOwnerId));
      setTeamSession(loadedTeamSession);
      setAdFreePrivilege(loadedPrivilege);
      setRateLimit(loadedLimit);
      setIsAuthHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Track site visits, unique visitors, and active online sessions
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateTabSessionId();

    const initial = recordPlatformVisit(loadAnalyticsFromStorage(), {
      visitorId,
      sessionId,
      sessionLabel: userSession?.username ?? 'guest',
    });
    setAnalyticsState(initial);
    saveAnalyticsToStorage(initial);

    const heartbeatId = window.setInterval(() => {
      const next = touchAnalyticsHeartbeat(loadAnalyticsFromStorage(), {
        visitorId,
        sessionId,
      });
      setAnalyticsState(next);
      saveAnalyticsToStorage(next);
    }, 15_000);

    const onStorageSync = (e: StorageEvent) => {
      if (!e.key) return;
      setAnalyticsState(loadAnalyticsFromStorage());
      setFinanceState(loadPlatformFinanceFromStorage());
      setVipMap(loadVipStatusMapFromStorage());
      setBroadcast(loadBroadcastFromStorage());
      setSupportTickets(loadSupportTicketsFromStorage());
    };
    window.addEventListener('storage', onStorageSync);

    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener('storage', onStorageSync);
    };
  }, []);

  // Track active session hours while a user is logged in
  useEffect(() => {
    if (!userSession) return;
    const intervalId = window.setInterval(() => {
      setAccountMetricsMap((prev) => {
        const next = incrementAccountActivityInMap(
          prev,
          userSession.userId,
          15,
          Date.now()
        );
        saveAccountMetricsMap(next);
        return next;
      });
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [userSession]);

  const isDeveloperMode =
    userSession?.role === 'developer' || teamSession?.role === 'developer';
  const isEliteCompletion = userSession?.role === 'elite_king';
  const vipOwnerKey = userSession?.userId ?? 'guest_session';
  const isVipMember = Boolean(vipMap[vipOwnerKey]);
  const isAdFree =
    adFreePrivilege?.kind === 'king_30m' ||
    isVipMember ||
    isDeveloperMode ||
    isEliteCompletion;

  const platformStats = useMemo(
    () =>
      getPlatformStats(ROOMS, progress, {
        isDeveloperMode,
        isEliteCompletion,
      }),
    [progress, isDeveloperMode, isEliteCompletion]
  );

  const handleOpenRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveRoute('room-detail');
    setProgress((prev) => ({
      ...prev,
      lastActiveRoomId: roomId,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (
    route: 'rooms' | 'paths' | 'leaderboard' | 'progress' | 'team' | 'admin'
  ) => {
    if (route === 'admin' && !isDeveloperMode) {
      setActiveRoute('rooms');
      return;
    }
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartRecommended = () => {
    if (progress.lastActiveRoomId) {
      const lastRoom = ROOMS.find((r) => r.id === progress.lastActiveRoomId);
      if (lastRoom && !getRoomCompletion(lastRoom, progress).isCompleted) {
        handleOpenRoom(lastRoom.id);
        return;
      }
    }
    const nextIncomplete = ROOMS.find(
      (r) => !getRoomCompletion(r, progress).isCompleted
    );
    handleOpenRoom((nextIncomplete ?? ROOMS[0]).id);
  };

  const handleSolveTask = (roomId: string, taskId: string) => {
    setProgress((prev) => markTaskSolved(prev, roomId, taskId));
  };

  const handleWrongFlagAttempt = (
    task: RoomTask,
    submitted: string
  ): WrongFlagPenaltyFeedback => {
    const res = applyWrongFlagPenalty(progress, ROOMS, task, submitted, {
      isDeveloperMode,
    });
    if (res.nextProgress !== progress) {
      setProgress(res.nextProgress);
    }
    return {
      isClose: res.isClose,
      penaltyApplied: res.penaltyApplied,
      intendedBounty: res.intendedBounty,
    };
  };

  const triggerLoginNotification = (
    session: SignedUserSession,
    progressForUser: UserProgress,
    shortcutKind: 'developer' | 'elite_king' | 'team_member' | null,
    usersSnapshot: StoredUserRecord[] = registeredUsers
  ) => {
    const now = Date.now();
    const matchedUser = usersSnapshot.find((u) => u.id === session.userId);
    const registeredAt =
      matchedUser?.createdAt ??
      accountMetricsMap[session.userId]?.firstSeenAt ??
      now;

    const { nextMap, record } = recordAccountLoginInMap(
      accountMetricsMap,
      session.userId,
      registeredAt,
      now
    );
    setAccountMetricsMap(nextMap);
    saveAccountMetricsMap(nextMap);

    const isDev =
      shortcutKind === 'developer' || session.role === 'developer';
    const isElite =
      shortcutKind === 'elite_king' || session.role === 'elite_king';
    const liveStats = getPlatformStats(ROOMS, progressForUser, {
      isDeveloperMode: isDev,
      isEliteCompletion: isElite,
    });

    setLoginNotification(
      buildLoginNotificationData({
        session,
        bounty: liveStats.displayBounty,
        rankTitleAr: liveStats.rankTitleAr,
        solvedFlags: liveStats.solvedFlags,
        totalFlags: liveStats.totalFlags,
        metrics: record,
        shortcutKind,
        now,
      })
    );
  };

  const handleResetProgress = async () => {
    const fresh = createInitialProgress();
    setProgress(fresh);
    saveProgressToStorage(fresh, activeProgressUserId);
    const freshLimit = await createDefaultRateLimitState();
    setRateLimit(freshLimit);
    saveTeamRateLimitToStorage(freshLimit);
  };

  const handleActivatePaidPass = async (
    payload: VipCheckoutPayload
  ): Promise<{ success: boolean; errorAr?: string }> => {
    const buyerUserId = userSession?.userId ?? 'guest_session';
    const buyerUsername = userSession?.username ?? 'guest';
    const buyerNickname = userSession?.nickname ?? 'زائر المنصة';

    const purchaseRes = recordVipPurchase(financeState, {
      buyerUserId,
      buyerUsername,
      buyerNickname,
      countryCode: payload.countryCode,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference,
    });

    if (!purchaseRes.success) {
      return { success: false, errorAr: purchaseRes.errorAr };
    }

    setFinanceState(purchaseRes.nextState);
    savePlatformFinanceToStorage(purchaseRes.nextState);

    const nextVipMap = {
      ...vipMap,
      [buyerUserId]: Date.now(),
    };
    setVipMap(nextVipMap);
    saveVipStatusMapToStorage(nextVipMap);

    const privilege = await createSignedAdFreePrivilege('paid_pass');
    saveAdFreePrivilegeToStorage(privilege);
    setAdFreePrivilege(privilege);
    return { success: true };
  };

  const handleDeveloperWithdrawal = (payload: {
    currency: CurrencyCode;
    amount: number;
    method: DeveloperPayoutMethodId;
    destination: string;
  }): { success: boolean; errorAr?: string } => {
    const res = processDeveloperWithdrawal(financeState, payload);
    if (!res.success) {
      return { success: false, errorAr: res.errorAr };
    }
    setFinanceState(res.nextState);
    savePlatformFinanceToStorage(res.nextState);
    return { success: true };
  };

  const appendAuditLog = (params: {
    action: AdminAuditAction;
    targetUserId: string;
    targetUsername: string;
    targetNickname: string;
    summaryAr: string;
    now?: number;
  }) => {
    const entry = createAuditEntry(params);
    setAdminAuditLog((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      saveAdminAuditLog(next);
      return next;
    });
  };

  const handleFailedAuthAttempt = (payload: {
    identifier: string;
    contextLabelAr: string;
    reasonAr: string;
    remainingAttempts: number;
    lockedOut: boolean;
  }) => {
    appendAuditLog({
      action: 'login_failed',
      targetUserId: 'auth_security_gate',
      targetUsername: payload.identifier || 'unknown',
      targetNickname: payload.contextLabelAr,
      summaryAr: payload.lockedOut
        ? `قفل أمني (5 محاولات فاشلة) عبر ${payload.contextLabelAr} للمُعرف (@${payload.identifier || 'unknown'}).`
        : `محاولة كلمة مرور فاشلة عبر ${payload.contextLabelAr} (@${payload.identifier || 'unknown'}) — المتبقي ${payload.remainingAttempts}.`,
    });
  };

  const handlePublishBroadcast = (payload: {
    messageAr: string;
    severity: BroadcastSeverity;
  }): { success: boolean; errorAr?: string } => {
    const res = publishSystemBroadcast({
      messageAr: payload.messageAr,
      severity: payload.severity,
      isDeveloperMode,
    });
    if (!res.success || !res.broadcast) {
      return { success: false, errorAr: res.errorAr };
    }
    setBroadcast(res.broadcast);
    saveBroadcastToStorage(res.broadcast);
    appendAuditLog({
      action: 'broadcast_publish',
      targetUserId: 'dev_shadow',
      targetUsername: 'SHADOW',
      targetNickname: 'Lord of Chaos',
      summaryAr: `نشر اللورد SHADOW إعلاناً رسمياً في الشريط العلوي: "${res.broadcast.messageAr}"`,
    });
    return { success: true };
  };

  const handleToggleBroadcast = (active: boolean) => {
    if (!isDeveloperMode) return;
    const next = active
      ? { ...broadcast, active: true, updatedAt: Date.now() }
      : deactivateSystemBroadcast(broadcast, isDeveloperMode);
    setBroadcast(next);
    saveBroadcastToStorage(next);
  };

  const handleSubmitInternalTicket = (input: ContactFormInput) => {
    const res = createInternalSupportTicket(supportTickets, input, {
      senderUsername: userSession?.username ?? 'guest',
    });
    if (res.success && res.ticket) {
      setSupportTickets(res.nextTickets);
      saveSupportTicketsToStorage(res.nextTickets);
    }
    return {
      success: res.success,
      ticket: res.ticket,
      errorAr: res.errorAr,
    };
  };

  const handleResolveSupportTicket = (ticketId: string) => {
    if (!isDeveloperMode) return;
    const target = supportTickets.find((t) => t.id === ticketId);
    const next = resolveInternalSupportTicket(supportTickets, ticketId);
    setSupportTickets(next);
    saveSupportTicketsToStorage(next);
    if (target) {
      appendAuditLog({
        action: 'ticket_resolved',
        targetUserId: target.id,
        targetUsername: target.senderUsername,
        targetNickname: target.senderName,
        summaryAr: `تمت معالجة وإغلاق تذكرة الدعم الداخلية (${target.ticketCode}) من @${target.senderUsername}.`,
      });
    }
  };

  const handleRegisterSuccess = async ({
    user,
    session,
    nextUsers,
  }: {
    user: StoredUserRecord;
    session: SignedUserSession;
    nextUsers: StoredUserRecord[];
  }) => {
    setRegisteredUsers(nextUsers);
    saveRegisteredUsersToStorage(nextUsers);

    const userProgress = loadProgressFromStorage(session.userId);
    saveUserSessionToStorage(session);
    setUserSession(session);
    setActiveProgressUserId(session.userId);
    setProgress(userProgress);

    clearTeamSessionFromStorage();
    setTeamSession(null);

    const freshLimit = await createDefaultRateLimitState();
    setRateLimit(freshLimit);
    saveTeamRateLimitToStorage(freshLimit);

    appendAuditLog({
      action: 'user_register',
      targetUserId: user.id,
      targetUsername: user.username,
      targetNickname: user.nickname,
      summaryAr: `تسجيل متدرب جديد: ${user.nickname} (@${user.username}) عبر البريد ${user.email}.`,
      now: user.createdAt,
    });

    triggerLoginNotification(session, userProgress, null, nextUsers);
  };

  const recordSpecialPrivilege = (
    profile: {
      userId: string;
      username: string;
      nickname: string;
      email: string;
    },
    kind: 'team_member' | 'elite_king'
  ) => {
    const now = Date.now();
    setSpecialAccessRecords((prev) => {
      const next = upsertSpecialAccessRecord(prev, {
        ...profile,
        kind,
        now,
      });
      saveSpecialAccessRecords(next);
      return next;
    });
    const entry = createAuditEntry({
      action: kind === 'elite_king' ? 'elite_unlock' : 'team_join',
      targetUserId: profile.userId,
      targetUsername: profile.username,
      targetNickname: profile.nickname,
      summaryAr:
        kind === 'elite_king'
          ? `فعّل ${profile.nickname} (@${profile.username}) كلمة مرور النخبة (The_king_30M).`
          : `انضم ${profile.nickname} (@${profile.username}) إلى الفريق عبر كلمة مرور (Shadow_666).`,
      now,
    });
    setAdminAuditLog((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      saveAdminAuditLog(next);
      return next;
    });
  };

  const handleLoginSuccess = async (result: LoginAttemptResult) => {
    if (!result.session) return;
    const session = result.session;
    const userProgress = loadProgressFromStorage(session.userId);
    saveUserSessionToStorage(session);
    setUserSession(session);
    setActiveProgressUserId(session.userId);
    setProgress(userProgress);

    let nextUsers = registeredUsers;
    // Persist elevated team_member / elite_king role on matching registered user for Leaderboard badges
    if (
      (result.shortcutKind === 'team_member' ||
        result.shortcutKind === 'elite_king') &&
      registeredUsers.some((u) => u.id === session.userId)
    ) {
      nextUsers = registeredUsers.map((u) =>
        u.id === session.userId ? { ...u, role: session.role } : u
      );
      setRegisteredUsers(nextUsers);
      saveRegisteredUsersToStorage(nextUsers);
    }

    if (
      result.shortcutKind === 'team_member' ||
      result.shortcutKind === 'elite_king'
    ) {
      recordSpecialPrivilege(session, result.shortcutKind);
    }

    if (result.shortcutKind === 'developer') {
      const devTeamSession = await createSignedTeamSession(
        Date.now(),
        'developer'
      );
      saveTeamSessionToStorage(devTeamSession);
      setTeamSession(devTeamSession);
    } else if (result.shortcutKind === 'team_member') {
      const memberTeamSession = await createSignedTeamSession(
        Date.now(),
        'team_member'
      );
      saveTeamSessionToStorage(memberTeamSession);
      setTeamSession(memberTeamSession);
    } else {
      clearTeamSessionFromStorage();
      setTeamSession(null);
    }

    const freshLimit = await createDefaultRateLimitState();
    setRateLimit(freshLimit);
    saveTeamRateLimitToStorage(freshLimit);

    appendAuditLog({
      action: 'login_success',
      targetUserId: session.userId,
      targetUsername: session.username,
      targetNickname: session.nickname,
      summaryAr: `تسجيل دخول ناجح للحساب ${session.nickname} (@${session.username}) بصلاحية (${session.role}).`,
    });

    triggerLoginNotification(
      session,
      userProgress,
      result.shortcutKind ?? null,
      nextUsers
    );
  };

  const handleTeamSessionChange = async (
    nextTeamSession: SignedTeamSession | null
  ) => {
    setTeamSession(nextTeamSession);
    if (!nextTeamSession) return;

    if (nextTeamSession.role === 'developer') {
      const devSession = await createSignedUserSession(SHADOW_DEVELOPER_PROFILE);
      const devProgress = loadProgressFromStorage(devSession.userId);
      saveUserSessionToStorage(devSession);
      setUserSession(devSession);
      setActiveProgressUserId(devSession.userId);
      setProgress(devProgress);
      triggerLoginNotification(devSession, devProgress, 'developer');
    } else if (nextTeamSession.role === 'team_member') {
      if (!userSession) {
        const opSession = await createSignedUserSession(TEAM_OPERATOR_PROFILE);
        const opProgress = loadProgressFromStorage(opSession.userId);
        saveUserSessionToStorage(opSession);
        setUserSession(opSession);
        setActiveProgressUserId(opSession.userId);
        setProgress(opProgress);
        recordSpecialPrivilege(opSession, 'team_member');
        triggerLoginNotification(opSession, opProgress, 'team_member');
      } else {
        let updatedSession = userSession;
        if (userSession.role === 'user') {
          updatedSession = await createSignedUserSession({
            userId: userSession.userId,
            username: userSession.username,
            nickname: userSession.nickname,
            email: userSession.email,
            role: 'team_member',
          });
          saveUserSessionToStorage(updatedSession);
          setUserSession(updatedSession);
          if (registeredUsers.some((u) => u.id === userSession.userId)) {
            const nextUsers = registeredUsers.map((u) =>
              u.id === userSession.userId
                ? { ...u, role: 'team_member' as const }
                : u
            );
            setRegisteredUsers(nextUsers);
            saveRegisteredUsersToStorage(nextUsers);
          }
        }
        recordSpecialPrivilege(updatedSession, 'team_member');
        triggerLoginNotification(updatedSession, progress, 'team_member');
      }
    }
  };

  const handleKingUnlockSuccess = async () => {
    let activeSession =
      userSession ?? (await createSignedUserSession(ELITE_KING_PROFILE));
    if (
      userSession &&
      userSession.role !== 'developer' &&
      userSession.role !== 'elite_king'
    ) {
      activeSession = await createSignedUserSession({
        userId: userSession.userId,
        username: userSession.username,
        nickname: userSession.nickname,
        email: userSession.email,
        role: 'elite_king',
      });
      saveUserSessionToStorage(activeSession);
      setUserSession(activeSession);
      if (registeredUsers.some((u) => u.id === userSession.userId)) {
        const nextUsers = registeredUsers.map((u) =>
          u.id === userSession.userId
            ? { ...u, role: 'elite_king' as const }
            : u
        );
        setRegisteredUsers(nextUsers);
        saveRegisteredUsersToStorage(nextUsers);
      }
    }
    recordSpecialPrivilege(activeSession, 'elite_king');
    triggerLoginNotification(activeSession, progress, 'elite_king');
  };

  const handleAdminDemoteUser = (targetUser: AdminTrackedUser) => {
    const res = demoteUserAccount({
      targetUser,
      registeredUsers,
      specialAccessRecords,
    });
    setRegisteredUsers(res.nextUsers);
    saveRegisteredUsersToStorage(res.nextUsers);

    setSpecialAccessRecords(res.nextSpecialAccessRecords);
    saveSpecialAccessRecords(res.nextSpecialAccessRecords);

    saveProgressToStorage(res.resetProgress, targetUser.userId);
    if (activeProgressUserId === targetUser.userId) {
      setProgress(res.resetProgress);
    }

    setAdminAuditLog((prev) => {
      const next = [res.auditEntry, ...prev].slice(0, 100);
      saveAdminAuditLog(next);
      return next;
    });
  };

  const handleAdminBanUser = (targetUser: AdminTrackedUser) => {
    const res = banUserAccount({
      targetUser,
      registeredUsers,
      specialAccessRecords,
      accountMetricsMap,
    });
    setRegisteredUsers(res.nextUsers);
    saveRegisteredUsersToStorage(res.nextUsers);

    setSpecialAccessRecords(res.nextSpecialAccessRecords);
    saveSpecialAccessRecords(res.nextSpecialAccessRecords);

    setAccountMetricsMap(res.nextMetricsMap);
    saveAccountMetricsMap(res.nextMetricsMap);

    clearProgressFromStorage(targetUser.userId);

    setAdminAuditLog((prev) => {
      const next = [res.auditEntry, ...prev].slice(0, 100);
      saveAdminAuditLog(next);
      return next;
    });
  };

  const handleLogoutAll = () => {
    clearUserSessionFromStorage();
    clearTeamSessionFromStorage();
    setUserSession(null);
    setTeamSession(null);
    setActiveProgressUserId(null);
    setProgress(loadProgressFromStorage(null));
    setLoginNotification(null);
    if (activeRoute === 'admin') {
      setActiveRoute('rooms');
    }
  };

  const handleRateLimitUpdate = (next: RateLimitState) => {
    setRateLimit(next);
    saveTeamRateLimitToStorage(next);
  };

  const activeRoom =
    ROOMS.find((r) => r.id === selectedRoomId) ?? ROOMS[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#07090D] text-slate-100">
      <BroadcastTicker broadcast={broadcast} />
      <Navbar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        onStartRecommended={handleStartRecommended}
        hasResumeRoom={Boolean(progress.lastActiveRoomId)}
        userSession={userSession}
        isDeveloperMode={isDeveloperMode}
        displayBounty={platformStats.displayBounty}
        rankTitleAr={platformStats.rankTitleAr}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onLogout={handleLogoutAll}
      />

      <div className="flex-1">
        {activeRoute === 'rooms' && (
          <RoomsDashboard
            rooms={ROOMS}
            progress={progress}
            userSession={userSession}
            isDeveloperMode={isDeveloperMode}
            isEliteCompletion={isEliteCompletion}
            isAdFree={isAdFree}
            isVipMember={isVipMember}
            onSelectRoom={handleOpenRoom}
            onOpenStore={() => setIsStoreOpen(true)}
            onOpenAuth={(mode) => setAuthModalMode(mode)}
          />
        )}

        {activeRoute === 'paths' && (
          <PathsView
            paths={LEARNING_PATHS}
            rooms={ROOMS}
            progress={progress}
            onSelectRoom={handleOpenRoom}
          />
        )}

        {activeRoute === 'leaderboard' && (
          <LeaderboardView
            rooms={ROOMS}
            registeredUsers={registeredUsers}
            userSession={userSession}
            progress={progress}
            onOpenAuth={(mode) => setAuthModalMode(mode)}
          />
        )}

        {activeRoute === 'progress' && (
          <ProgressView
            rooms={ROOMS}
            progress={progress}
            userSession={userSession}
            isDeveloperMode={isDeveloperMode}
            isEliteCompletion={isEliteCompletion}
            isAdFree={isAdFree}
            isVipMember={isVipMember}
            adFreePrivilege={adFreePrivilege}
            rateLimit={rateLimit}
            onRateLimitChange={handleRateLimitUpdate}
            onAdFreePrivilegeChange={setAdFreePrivilege}
            onSelectRoom={handleOpenRoom}
            onResetProgress={handleResetProgress}
            onOpenStore={() => setIsStoreOpen(true)}
            onKingUnlockSuccess={handleKingUnlockSuccess}
            onFailedAuthAttempt={handleFailedAuthAttempt}
          />
        )}

        {activeRoute === 'team' && (
          <TeamModeView
            rooms={ROOMS}
            progress={progress}
            userSession={userSession}
            session={teamSession}
            rateLimit={rateLimit}
            adFreePrivilege={adFreePrivilege}
            isEliteCompletion={isEliteCompletion}
            onSessionChange={handleTeamSessionChange}
            onLogoutAll={handleLogoutAll}
            onRateLimitChange={handleRateLimitUpdate}
            onAdFreePrivilegeChange={setAdFreePrivilege}
            onSelectRoom={handleOpenRoom}
            onKingUnlockSuccess={handleKingUnlockSuccess}
            onFailedAuthAttempt={handleFailedAuthAttempt}
          />
        )}

        {activeRoute === 'admin' && (
          <DeveloperAdminView
            isDeveloperMode={isDeveloperMode}
            rooms={ROOMS}
            registeredUsers={registeredUsers}
            specialAccessRecords={specialAccessRecords}
            accountMetricsMap={accountMetricsMap}
            activeUserSession={userSession}
            activeProgress={progress}
            auditLog={adminAuditLog}
            financeState={financeState}
            analyticsState={analyticsState}
            vipMap={vipMap}
            broadcast={broadcast}
            supportTickets={supportTickets}
            onPublishBroadcast={handlePublishBroadcast}
            onToggleBroadcast={handleToggleBroadcast}
            onResolveSupportTicket={handleResolveSupportTicket}
            onWithdrawEarnings={handleDeveloperWithdrawal}
            onDemoteUser={handleAdminDemoteUser}
            onBanUser={handleAdminBanUser}
            onBackToRooms={() => handleNavigate('rooms')}
          />
        )}

        {activeRoute === 'room-detail' && (
          <RoomDetail
            room={activeRoom}
            progress={progress}
            isAdFree={isAdFree}
            isDeveloperMode={isDeveloperMode}
            onBackToRooms={() => handleNavigate('rooms')}
            onSolveTask={handleSolveTask}
            onWrongFlagAttempt={handleWrongFlagAttempt}
            onOpenStore={() => setIsStoreOpen(true)}
          />
        )}
      </div>

      <footer className="mt-16 border-t border-slate-800/80 bg-[#07090D]">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>نواة سايبر — منصة تعليمية لتطبيق مفاهيم الأمن السيبراني باللغة العربية</p>
          <p className="font-mono" dir="ltr">
            Local Lab Sandbox · RTL/LTR Verified
          </p>
        </div>
      </footer>

      {authModalMode !== null && (
        <AuthModal
          key={authModalMode}
          isOpen={true}
          initialMode={authModalMode}
          registeredUsers={registeredUsers}
          rateLimit={rateLimit}
          onClose={() => setAuthModalMode(null)}
          onRateLimitChange={handleRateLimitUpdate}
          onRegisterSuccess={handleRegisterSuccess}
          onLoginSuccess={handleLoginSuccess}
          onFailedAuthAttempt={handleFailedAuthAttempt}
        />
      )}

      <AdFreeStoreModal
        isOpen={isStoreOpen}
        isAdFree={isAdFree}
        isVipMember={isVipMember}
        onClose={() => setIsStoreOpen(false)}
        onActivatePaidPass={handleActivatePaidPass}
      />

      <BountyNotificationPopup
        notification={loginNotification}
        onDismiss={() => setLoginNotification(null)}
      />

      <DeveloperChatWidget
        tickets={supportTickets}
        currentUsername={userSession?.username}
        currentNickname={userSession?.nickname}
        onSubmitTicket={handleSubmitInternalTicket}
      />
    </div>
  );
}
