import type { Room, UserProgress } from '../types/platform';
import { getPlatformStats } from './progress';
import type { UserAccountRole } from './userAuth';

export type AchievementBadgeId =
  | 'first_blood'
  | 'shadow_initiate'
  | 'bug_hunter'
  | 'elite_hacker'
  | 'platform_legend';

export type BadgeTierColor = 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';

export interface AchievementBadge {
  id: AchievementBadgeId;
  codeName: string;
  titleAr: string;
  descriptionAr: string;
  criteriaAr: string;
  tierColor: BadgeTierColor;
  earned: boolean;
  progressText: string;
}

export function evaluateAchievementBadges(params: {
  rooms: Room[];
  progress: UserProgress;
  role?: UserAccountRole | null;
  isDeveloperMode?: boolean;
  isEliteCompletion?: boolean;
}): AchievementBadge[] {
  const isDev = Boolean(params.isDeveloperMode || params.role === 'developer');
  const isElite = Boolean(
    params.isEliteCompletion || params.role === 'elite_king'
  );
  const isTeam =
    params.role === 'team_member' || isElite || isDev;

  const stats = getPlatformStats(params.rooms, params.progress, {
    isDeveloperMode: isDev,
    isEliteCompletion: isElite,
  });

  const mistakesCount =
    ((params.progress.bountyPenaltyPoints ?? 0) > 0 ? 1 : 0) +
    (params.progress.closeAttemptCount ?? 0);
  const hasZeroMistakes = mistakesCount === 0;

  const firstBloodEarned = stats.solvedFlags >= 1 || isDev;
  const shadowInitiateEarned = isTeam;
  const bugHunterEarned = stats.solvedFlags >= 5 || isDev;
  const eliteHackerEarned =
    (stats.solvedFlags >= 3 && hasZeroMistakes) || isDev;
  const platformLegendEarned =
    stats.unlocked30MAchievement || isElite || isDev;

  return [
    {
      id: 'first_blood',
      codeName: 'First Blood',
      titleAr: 'أول اختراق',
      descriptionAr: 'استخراج أول علم بنجاح من داخل الطرفية التفاعلية.',
      criteriaAr: 'حل تحدي واحد على الأقل',
      tierColor: 'cyan',
      earned: firstBloodEarned,
      progressText: `${Math.min(stats.solvedFlags, 1)} / 1`,
    },
    {
      id: 'shadow_initiate',
      codeName: 'Shadow Initiate',
      titleAr: 'مبتدئ الظل',
      descriptionAr: 'الانضمام الرسمي إلى فريق Shadow الأمني عبر كلمة مرور الفريق.',
      criteriaAr: 'الانضمام للفريق الأمني',
      tierColor: 'violet',
      earned: shadowInitiateEarned,
      progressText: shadowInitiateEarned ? 'مفعل' : 'عضوية الفريق مطلوبة',
    },
    {
      id: 'bug_hunter',
      codeName: 'Bug Hunter',
      titleAr: 'صائد الثغرات',
      descriptionAr: 'إتمام 5 تحديات أمنية بنجاح عبر مختبرات المنصة.',
      criteriaAr: 'إكمال 5 تحديات',
      tierColor: 'emerald',
      earned: bugHunterEarned,
      progressText: `${Math.min(stats.solvedFlags, 5)} / 5`,
    },
    {
      id: 'elite_hacker',
      codeName: 'Elite Hacker',
      titleAr: 'الهاكر النخبة',
      descriptionAr:
        'حل 3 تحديات أو أكثر بدقة جراحية دون أي خطأ أو خصم في المكافأة.',
      criteriaAr: '3+ تحديات بدون أخطاء',
      tierColor: 'amber',
      earned: eliteHackerEarned,
      progressText: !hasZeroMistakes
        ? 'تم رصد خطأ سابق'
        : `${Math.min(stats.solvedFlags, 3)} / 3 (0 أخطاء)`,
    },
    {
      id: 'platform_legend',
      codeName: '30M Master',
      titleAr: 'أسطورة الـ 30 مليون',
      descriptionAr:
        'إكمال جميع الغرف والتحديات في المنصة أو تفعيل امتياز النخبة النهائي.',
      criteriaAr: 'إكمال كامل المنصة',
      tierColor: 'rose',
      earned: platformLegendEarned,
      progressText: `${stats.completedRooms} / ${stats.totalRooms} غرف`,
    },
  ];
}
