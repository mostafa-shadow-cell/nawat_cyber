import { AlertOctagon, AlertTriangle, Megaphone } from 'lucide-react';
import type { SystemBroadcastAnnouncement } from '../utils/broadcastTicker';

interface BroadcastTickerProps {
  broadcast: SystemBroadcastAnnouncement;
}

const SEVERITY_META = {
  announcement: {
    containerClass:
      'border-cyan-500/35 bg-[#070B12] text-cyan-100',
    badgeClass:
      'border-cyan-500/45 bg-cyan-500/15 text-cyan-300',
    dotClass: 'bg-cyan-400',
    labelAr: 'بث اللورد SHADOW',
    Icon: Megaphone,
  },
  warning: {
    containerClass:
      'border-amber-500/40 bg-[#110D06] text-amber-100',
    badgeClass:
      'border-amber-500/50 bg-amber-500/15 text-amber-300',
    dotClass: 'bg-amber-400',
    labelAr: 'تحذير النظام',
    Icon: AlertTriangle,
  },
  alert: {
    containerClass:
      'border-rose-500/45 bg-[#13080C] text-rose-100',
    badgeClass:
      'border-rose-500/50 bg-rose-500/15 text-rose-300',
    dotClass: 'bg-rose-400',
    labelAr: 'تنبيه أمني عاجل',
    Icon: AlertOctagon,
  },
} as const;

export function BroadcastTicker({ broadcast }: BroadcastTickerProps) {
  if (!broadcast.active || !broadcast.messageAr.trim()) {
    return null;
  }

  const meta = SEVERITY_META[broadcast.severity];
  const Icon = meta.Icon;

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="شريط إعلانات اللورد"
      data-testid="system-broadcast-ticker"
      className={`relative z-40 border-b ${meta.containerClass}`}
    >
      <div className="mx-auto flex max-w-[1360px] items-center gap-3 px-4 py-2 sm:px-6">
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${meta.badgeClass}`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 animate-pulse rounded-full ${meta.dotClass}`}
          />
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{meta.labelAr}</span>
        </span>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="lord-ticker-track items-center gap-10 text-xs font-medium">
            <span data-testid="broadcast-ticker-message">
              {broadcast.messageAr}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ///
            </span>
            <span aria-hidden="true">{broadcast.messageAr}</span>
          </div>
        </div>

        <span
          dir="ltr"
          className="hidden shrink-0 font-mono text-[10px] tracking-wider text-slate-400 sm:inline"
        >
          BROADCAST · {broadcast.author}
        </span>
      </div>
    </div>
  );
}
