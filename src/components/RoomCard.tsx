import { ArrowUpLeft, CheckCircle2, Clock } from 'lucide-react';
import type { Room, UserProgress } from '../types/platform';
import {
  CATEGORY_LABELS,
  DIFFICULTY_META,
  getRoomCompletion,
} from '../utils/progress';

interface RoomCardProps {
  room: Room;
  progress: UserProgress;
  onSelectRoom: (roomId: string) => void;
}

export function RoomCard({ room, progress, onSelectRoom }: RoomCardProps) {
  const diff = DIFFICULTY_META[room.difficulty];
  const completion = getRoomCompletion(room, progress);

  return (
    <article
      dir="rtl"
      className="group flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0E131B] p-6 transition-colors duration-150 hover:border-cyan-500/50"
    >
      <div>
        {/* Header Row: Explicit Difficulty Badge + Completion Status */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${diff.badgeClass}`}
          >
            {diff.labelAr}
          </span>

          {completion.isCompleted ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 whitespace-nowrap shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>مكتملة</span>
            </span>
          ) : (
            <span
              dir="ltr"
              className="font-mono text-xs tabular-nums text-cyan-300/90 whitespace-nowrap shrink-0"
            >
              +{room.totalXp} XP
            </span>
          )}
        </div>

        {/* Arabic Title & Description */}
        <h3 className="font-display mb-2 text-lg font-bold leading-snug text-slate-50 group-hover:text-cyan-200 transition-colors">
          {room.titleAr}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          {room.subtitleAr}
        </p>

        {/* Clean Unboxed Metadata with Typographic Separators */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{CATEGORY_LABELS[room.category]}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>{room.estimatedMinutes} دقيقة</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{room.tasks.length} مهام</span>
        </div>

        {/* Strict LTR Tools Row */}
        <div
          dir="ltr"
          className="mb-5 flex flex-wrap items-center justify-end gap-2 font-mono text-xs text-slate-400"
        >
          {room.tools.map((tool, idx) => (
            <span key={tool} className="inline-flex items-center gap-2">
              <span className="text-cyan-300/90">{tool}</span>
              {idx < room.tools.length - 1 && (
                <span aria-hidden="true" className="text-slate-600">
                  /
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Progress & Action */}
      <div className="border-t border-slate-800/80 pt-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            التقدم: {completion.solvedCount} من {completion.totalCount}
          </span>
          <span className="font-mono tabular-nums text-slate-300">
            {completion.percent}%
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
        >
          <div
            className={`h-full transition-all duration-300 ${
              completion.isCompleted ? 'bg-emerald-400' : 'bg-cyan-400'
            }`}
            style={{ width: `${completion.percent}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => onSelectRoom(room.id)}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
            completion.isCompleted
              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              : 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500 hover:text-slate-950'
          }`}
        >
          <span>{completion.isCompleted ? 'مراجعة الغرفة' : 'دخول الغرفة'}</span>
          <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
