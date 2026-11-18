import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Flag,
  HelpCircle,
  Send,
} from 'lucide-react';
import type { RoomTask } from '../types/platform';
import {
  CLOSE_ATTEMPT_BADGE_TEXT,
  formatBounty,
  validateFlagSubmission,
} from '../utils/progress';

import { ArabicText } from './ArabicText';

export interface WrongFlagPenaltyFeedback {
  isClose: boolean;
  penaltyApplied: number;
  intendedBounty: number;
}

interface FlagSubmissionBoxProps {
  task: RoomTask;
  isSolved: boolean;
  onSubmitValidFlag: (taskId: string) => void;
  onWrongFlagAttempt?: (
    task: RoomTask,
    submitted: string
  ) => WrongFlagPenaltyFeedback | void;
}

export function FlagSubmissionBox({
  task,
  isSolved,
  onSubmitValidFlag,
  onWrongFlagAttempt,
}: FlagSubmissionBoxProps) {
  const [flagInput, setFlagInput] = useState(isSolved ? task.flag : '');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'warm' | 'success';
    message: string;
  } | null>(null);

  // Reset form state only when switching to a different task
  useEffect(() => {
    setFlagInput(isSolved ? task.flag : '');
    setShowHint(false);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateFlagSubmission(flagInput, task.flag);

    if (!result.valid) {
      if (
        (result.reason === 'mismatch' || result.reason === 'invalid_format') &&
        onWrongFlagAttempt
      ) {
        const penaltyInfo = onWrongFlagAttempt(task, flagInput);
        if (penaltyInfo) {
          if (penaltyInfo.isClose) {
            setFeedback({
              type: 'warm',
              message: `${CLOSE_ATTEMPT_BADGE_TEXT} — إجابة قريبة جداً! تم خصم ${formatBounty(penaltyInfo.penaltyApplied)} نقطة فقط بدلاً من عقوبة 50%.`,
            });
            return;
          }
          setFeedback({
            type: 'error',
            message:
              penaltyInfo.penaltyApplied > 0
                ? `إجابة خاطئة! تم تطبيق نظام المخاطرة وخصم 50% من مكافأة التحدي (-${formatBounty(penaltyInfo.penaltyApplied)} نقطة).`
                : `إجابة خاطئة! عقوبة التحدي هي خصم 50% من مكافأته (${formatBounty(Math.round(penaltyInfo.intendedBounty * 0.5))} نقطة).`,
          });
          return;
        }
      }

      setFeedback({
        type: 'error',
        message:
          result.messageAr ??
          'قيمة العلم غير صحيحة. تأكد من تنفيذ الأوامر في الطرفية ونسخ العلم كاملاً.',
      });
      return;
    }

    onSubmitValidFlag(task.id);
    setFeedback({
      type: 'success',
      message: `إجابة صحيحة! تم تسجيل ${task.xp} نقطة خبرة لهذه الخطوة.`,
    });
  };

  return (
    <section
      dir="rtl"
      aria-label="صندوق تسليم العلم"
      className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-slate-100">
            تحدي الخطوة {task.stepNumber}
          </h2>
        </div>

        {isSolved ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>مكتمل</span>
            <span dir="ltr" className="font-mono tabular-nums">
              (+{task.xp} XP)
            </span>
          </span>
        ) : (
          <span
            dir="ltr"
            className="font-mono text-xs tabular-nums text-cyan-300"
          >
            +{task.xp} XP
          </span>
        )}
      </div>

      <p className="mb-4 text-sm leading-relaxed text-slate-200">
        <ArabicText text={task.questionAr} highlightCode />
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
            <label htmlFor="flag-input">أدخل العلم المكتشف</label>
            <span dir="ltr" className="font-mono text-slate-400">
              {task.flagFormat}
            </span>
          </div>
          {/* Strict LTR input for technical flags */}
          <input
            id="flag-input"
            type="text"
            dir="ltr"
            value={flagInput}
            onChange={(e) => {
              setFlagInput(e.target.value);
              if (feedback) {
                setFeedback(null);
              }
            }}
            placeholder="FLAG{EXAMPLE_TEXT_123}"
            disabled={isSolved}
            className="w-full rounded-lg border border-slate-700 bg-[#05070A] px-3.5 py-2.5 text-left font-mono text-sm text-emerald-300 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-80"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={isSolved}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-emerald-500/20 disabled:text-emerald-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>{isSolved ? 'تم التحقق من العلم' : 'إرسال العلم'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            aria-expanded={showHint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>{showHint ? 'إخفاء التلميح' : 'عرض التلميح'}</span>
          </button>
        </div>
      </form>

      {showHint && (
        <div
          dir="rtl"
          className="mt-4 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3.5 text-xs leading-relaxed text-cyan-100"
        >
          <span className="font-semibold text-cyan-300">تلميح: </span>
          {task.hintAr}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          dir="rtl"
          className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : feedback.type === 'warm'
                ? 'border-amber-500/45 bg-amber-500/10 text-amber-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                feedback.type === 'warm' ? 'text-amber-400' : 'text-rose-400'
              }`}
              aria-hidden="true"
            />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </section>
  );
}
