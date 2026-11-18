import { Activity, Award, Clock, Crown, ShieldCheck, X } from 'lucide-react';
import type { BountyLoginNotification } from '../utils/accountMetrics';
import { formatBounty } from '../utils/progress';

interface BountyNotificationPopupProps {
  notification: BountyLoginNotification | null;
  onDismiss: () => void;
}

export function BountyNotificationPopup({
  notification,
  onDismiss,
}: BountyNotificationPopupProps) {
  if (!notification) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="إشعار الدخول والمكافأة"
      data-testid="bounty-login-notification"
      dir="rtl"
      className={`fixed top-20 left-4 sm:left-6 z-50 w-[calc(100vw-2rem)] max-w-md rounded-2xl border bg-[#0B0F16]/98 p-5 shadow-2xl backdrop-blur-md transition-all ${
        notification.isDeveloper
          ? 'border-emerald-500/50 shadow-emerald-500/10'
          : 'border-cyan-500/50 shadow-cyan-500/10'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              notification.isDeveloper
                ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
                : 'border-cyan-500/45 bg-cyan-500/15 text-cyan-300'
            }`}
          >
            {notification.isDeveloper ? (
              <Crown className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-slate-50">
              {notification.titleAr}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {notification.subtitleAr}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق إشعار الحساب"
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Total Bounty */}
        <div className="rounded-xl border border-slate-800 bg-[#07090D] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Award className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>رصيد المكافأة</span>
          </div>
          <p
            dir="ltr"
            data-testid="notification-bounty-value"
            className={`font-mono text-sm font-bold tabular-nums text-right ${
              notification.isDeveloper ? 'text-emerald-300' : 'text-cyan-300'
            }`}
          >
            {formatBounty(notification.bounty)}
          </p>
        </div>

        {/* Account Age / Time Registered */}
        <div className="rounded-xl border border-slate-800 bg-[#07090D] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            <span>مدة التسجيل</span>
          </div>
          <p
            data-testid="notification-account-age"
            className="text-xs font-semibold text-slate-100"
          >
            {notification.accountAgeAr}
          </p>
        </div>

        {/* Activity Hours / Session Metrics */}
        <div className="rounded-xl border border-slate-800 bg-[#07090D] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Activity className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>ساعات النشاط</span>
          </div>
          <p
            data-testid="notification-activity-hours"
            className="text-xs font-semibold text-slate-100"
          >
            {notification.activityHoursAr}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
        <span>
          المستخدم:{' '}
          <span dir="ltr" className="font-mono text-cyan-300">
            @{notification.username}
          </span>
        </span>
        <span dir="ltr" className="font-mono tabular-nums">
          Sessions: {notification.loginCount} · Flags: {notification.solvedFlags}/
          {notification.totalFlags}
        </span>
      </div>
    </aside>
  );
}
