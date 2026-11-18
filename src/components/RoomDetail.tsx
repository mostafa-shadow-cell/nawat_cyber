import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Server,
} from 'lucide-react';
import type { Room, RoomTask, UserProgress } from '../types/platform';
import {
  CATEGORY_LABELS,
  CLOSE_ATTEMPT_BADGE_TEXT,
  DIFFICULTY_META,
  getRoomCompletion,
} from '../utils/progress';
import { AdBanner } from './AdBanner';
import { ArabicText } from './ArabicText';
import { CodeBlock } from './CodeBlock';
import {
  FlagSubmissionBox,
  type WrongFlagPenaltyFeedback,
} from './FlagSubmissionBox';
import { LabTerminal } from './LabTerminal';

interface RoomDetailProps {
  room: Room;
  progress: UserProgress;
  isDeveloperMode: boolean;
  isAdFree: boolean;
  onBackToRooms: () => void;
  onSolveTask: (roomId: string, taskId: string) => void;
  onWrongFlagAttempt: (
    task: RoomTask,
    submitted: string
  ) => WrongFlagPenaltyFeedback;
  onOpenStore: () => void;
}

export function RoomDetail({
  room,
  progress,
  isDeveloperMode,
  isAdFree,
  onBackToRooms,
  onSolveTask,
  onWrongFlagAttempt,
  onOpenStore,
}: RoomDetailProps) {
  const solvedIds = progress.solvedTaskIds[room.id] ?? [];
  const firstUnsolvedIdx = room.tasks.findIndex(
    (t) => !solvedIds.includes(t.id)
  );
  const [activeTaskIndex, setActiveTaskIndex] = useState(
    firstUnsolvedIdx >= 0 ? firstUnsolvedIdx : 0
  );
  const [copiedIp, setCopiedIp] = useState(false);
  const [queuedCommand, setQueuedCommand] = useState<{
    cmd: string;
    nonce: number;
  } | null>(null);

  // Sync active task index when switching to another room
  useEffect(() => {
    const solved = progress.solvedTaskIds[room.id] ?? [];
    const idx = room.tasks.findIndex((t) => !solved.includes(t.id));
    setActiveTaskIndex(idx >= 0 ? idx : 0);
    setQueuedCommand(null);
  }, [room.id]);

  const activeTask = room.tasks[activeTaskIndex] ?? room.tasks[0];
  const diff = DIFFICULTY_META[room.difficulty];
  const completion = getRoomCompletion(room, progress);
  const isCurrentSolved = solvedIds.includes(activeTask.id);

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(room.targetIp);
      setCopiedIp(true);
      window.setTimeout(() => setCopiedIp(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleRunInTerminal = (command: string) => {
    setQueuedCommand({ cmd: command, nonce: Date.now() });
  };

  return (
    <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:py-8">
      {/* Breadcrumb & Back Navigation */}
      <div
        dir="rtl"
        className="mb-6 flex flex-wrap items-center justify-between gap-4"
      >
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onBackToRooms}
            className="inline-flex items-center gap-1.5 font-medium text-cyan-300 transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span>الغرف التدريبية</span>
          </button>
          <span aria-hidden="true" className="text-slate-600">
            /
          </span>
          <span className="text-slate-300">{room.titleAr}</span>
        </nav>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${diff.badgeClass}`}
          >
            {diff.labelAr}
          </span>
          <span className="text-xs text-slate-400">
            {CATEGORY_LABELS[room.category]}
          </span>
        </div>
      </div>

      {/* Room Overview Header */}
      <section
        dir="rtl"
        className="mb-8 rounded-2xl border border-slate-800/90 bg-[#0B0F16] p-6 sm:p-7"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display mb-2 text-2xl font-bold text-slate-50 sm:text-3xl">
              {room.titleAr}
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              {room.descriptionAr}
            </p>
          </div>

          {/* Target Machine Info & Progress */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#07090D] p-4 sm:min-w-[280px]">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Server className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>عنوان الهدف</span>
              </span>
              <button
                type="button"
                dir="ltr"
                onClick={handleCopyIp}
                aria-label="نسخ عنوان IP الهدف"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-xs tabular-nums text-cyan-300 transition-colors hover:border-cyan-500/50"
              >
                <span>{room.targetIp}</span>
                {copiedIp ? (
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-400" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">إنجاز الغرفة</span>
              <span
                dir="ltr"
                className="font-mono tabular-nums text-emerald-300"
              >
                {completion.solvedCount}/{completion.totalCount} ({completion.percent}%)
              </span>
            </div>
            {progress.closeAttemptBonusVisible && !isDeveloperMode && (
              <div
                data-testid="room-close-attempt-badge"
                className="rounded-md border border-amber-500/45 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200"
              >
                {CLOSE_ATTEMPT_BADGE_TEXT}
              </div>
            )}
            <div
              aria-hidden="true"
              className="h-2 w-full overflow-hidden rounded-full bg-slate-800"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  completion.isCompleted ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${completion.percent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Split Workspace:
          Outer grid uses dir="ltr" so on desktop:
          - Left column = Step-by-step Arabic Guidance (strict dir="rtl" inside)
          - Right column = Flag Submission Box + Interactive Lab Terminal
          And on mobile (< lg):
          - Top = Step-by-step Arabic Guidance
          - Bottom = Challenge/Flag Submission Box + Terminal */}
      <div
        dir="ltr"
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
      >
        {/* LEFT / TOP: Step-by-step Arabic Guidance */}
        <section
          dir="rtl"
          aria-label="الشرح التفاعلي خطوة بخطوة"
          className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-5 sm:p-6 lg:col-span-7"
        >
          {/* Step Selector Tabs */}
          <div
            role="tablist"
            aria-label="خطوات الغرفة"
            className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4"
          >
            {room.tasks.map((task, idx) => {
              const solved = solvedIds.includes(task.id);
              const isActive = idx === activeTaskIndex;
              return (
                <button
                  key={task.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTaskIndex(idx)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950'
                      : solved
                        ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        : 'border border-slate-700/80 bg-[#07090D] text-slate-300 hover:border-slate-600 hover:text-slate-100'
                  }`}
                >
                  {solved && (
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        isActive ? 'text-slate-950' : 'text-emerald-400'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <span>الخطوة {task.stepNumber}</span>
                </button>
              );
            })}
          </div>

          {/* Active Step Arabic Explanation */}
          <article className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-slate-50">
                {activeTask.stepNumber}. {activeTask.titleAr}
              </h2>
              <span
                dir="ltr"
                className="font-mono text-xs tabular-nums text-cyan-300"
              >
                +{activeTask.xp} XP
              </span>
            </div>

            <div className="space-y-3 text-sm leading-7 text-slate-300 sm:text-[15px]">
              {activeTask.explanationAr.map((paragraph, idx) => (
                <p key={idx}>
                  <ArabicText text={paragraph} highlightCode />
                </p>
              ))}
            </div>

            {/* Strict LTR Code Snippets */}
            {activeTask.snippets && activeTask.snippets.length > 0 && (
              <div className="space-y-4 pt-2">
                {activeTask.snippets.map((snippet) => (
                  <CodeBlock
                    key={snippet.id}
                    snippet={snippet}
                    onRunInTerminal={handleRunInTerminal}
                  />
                ))}
              </div>
            )}
          </article>

          {/* Step Footer Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-800/90 pt-5">
            <button
              type="button"
              onClick={() =>
                setActiveTaskIndex((idx) => Math.max(0, idx - 1))
              }
              disabled={activeTaskIndex === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span>الخطوة السابقة</span>
            </button>

            <span
              dir="ltr"
              className="font-mono text-xs tabular-nums text-slate-400"
            >
              {activeTaskIndex + 1} / {room.tasks.length}
            </span>

            <button
              type="button"
              onClick={() =>
                setActiveTaskIndex((idx) =>
                  Math.min(room.tasks.length - 1, idx + 1)
                )
              }
              disabled={activeTaskIndex === room.tasks.length - 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>الخطوة التالية</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* RIGHT / BOTTOM: Challenge / Flag Submission + Interactive Lab Terminal */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <FlagSubmissionBox
            task={activeTask}
            isSolved={isCurrentSolved}
            onSubmitValidFlag={(taskId) => onSolveTask(room.id, taskId)}
            onWrongFlagAttempt={onWrongFlagAttempt}
          />

          <LabTerminal
            config={room.terminal}
            queuedCommand={queuedCommand}
          />
        </div>
      </div>

      {!isAdFree && (
        <div className="mt-8">
          <AdBanner onOpenStore={onOpenStore} />
        </div>
      )}
    </main>
  );
}
