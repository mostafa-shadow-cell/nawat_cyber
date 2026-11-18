import { Sparkles } from 'lucide-react';

interface AdBannerProps {
  onOpenStore: () => void;
}

export function AdBanner({ onOpenStore }: AdBannerProps) {
  return (
    <aside
      dir="rtl"
      aria-label="مساحة إعلانية"
      data-testid="platform-ad-banner"
      className="mb-8 flex flex-col justify-between gap-4 rounded-xl border border-amber-500/30 bg-[#0D1017] p-4 sm:flex-row sm:items-center sm:px-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300 shrink-0">
          AD
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-100">
            رعاية مختبرات الشبكات الافتراضية — بيئات تدريب سحابية عالية الأداء
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            يمكنك إزالة الإعلانات عبر تذكرة التصفح أو مجاناً عند إكمال جميع التحديات والوصول إلى{' '}
            <span dir="ltr" className="font-mono text-cyan-300">
              30,000,000
            </span>{' '}
            نقطة.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenStore}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 whitespace-nowrap shrink-0 transition-colors hover:bg-cyan-500 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>إزالة الإعلانات (Google Checkout)</span>
      </button>
    </aside>
  );
}
