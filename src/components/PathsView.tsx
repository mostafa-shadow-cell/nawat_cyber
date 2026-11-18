import { ArrowUpLeft, CheckCircle2 } from 'lucide-react';
import type { LearningPath, Room, UserProgress } from '../types/platform';
import { DIFFICULTY_META, getRoomCompletion } from '../utils/progress';

interface PathsViewProps {
  paths: LearningPath[];
  rooms: Room[];
  progress: UserProgress;
  onSelectRoom: (roomId: string) => void;
}

export function PathsView({
  paths,
  rooms,
  progress,
  onSelectRoom,
}: PathsViewProps) {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <main className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold text-cyan-400">
          خطة تعلم متدرجة
        </p>
        <h1 className="font-display mb-3 text-2xl font-bold text-slate-50 sm:text-3xl">
          المسارات التعليمية في الأمن السيبراني
        </h1>
        <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
          اتبع مساراً منظماً يجمع الغرف التدريبية المترابطة للانتقال من المبادئ الأساسية إلى التحليل الجنائي واستغلال الثغرات.
        </p>
      </div>

      <div className="space-y-6">
        {paths.map((path, index) => {
          const pathRooms = path.roomIds
            .map((id) => roomMap.get(id))
            .filter((r): r is Room => Boolean(r));
          const completedInPath = pathRooms.filter(
            (r) => getRoomCompletion(r, progress).isCompleted
          ).length;
          const percent =
            pathRooms.length === 0
              ? 0
              : Math.round((completedInPath / pathRooms.length) * 100);

          return (
            <section
              key={path.id}
              dir="rtl"
              className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-6"
            >
              <div className="mb-5 flex flex-col gap-4 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-cyan-400">
                      0{index + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>المستوى: {path.levelAr}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {pathRooms.length} غرف
                    </span>
                  </div>
                  <h2 className="font-display mb-1.5 text-xl font-bold text-slate-50">
                    {path.titleAr}
                  </h2>
                  <p className="text-sm text-slate-300">{path.descriptionAr}</p>
                </div>

                <div className="min-w-[180px] shrink-0">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">تقدم المسار</span>
                    <span className="font-mono tabular-nums text-emerald-300">
                      {percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {pathRooms.map((room) => {
                  const comp = getRoomCompletion(room, progress);
                  const diff = DIFFICULTY_META[room.difficulty];
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => onSelectRoom(room.id)}
                      className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090D] p-4 text-right transition-colors hover:border-cyan-500/50 focus-visible:outline-2 focus-visible:outline-cyan-400"
                    >
                      <div>
                        <div className="mb-2.5 flex items-center justify-between gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${diff.badgeClass}`}
                          >
                            {diff.labelAr}
                          </span>
                          {comp.isCompleted && (
                            <CheckCircle2
                              className="h-4 w-4 text-emerald-400"
                              aria-label="مكتملة"
                            />
                          )}
                        </div>
                        <h3 className="font-display mb-1 text-sm font-bold text-slate-100">
                          {room.titleAr}
                        </h3>
                        <p className="mb-3 text-xs text-slate-400">
                          {room.subtitleAr}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                        <span className="font-mono tabular-nums text-slate-400">
                          {comp.solvedCount}/{comp.totalCount} مهام
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-cyan-300">
                          <span>فتح</span>
                          <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
