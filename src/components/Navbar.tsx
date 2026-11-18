import { Crown, LogIn, LogOut, Terminal, User } from 'lucide-react';
import { formatBounty } from '../utils/progress';
import type { SignedUserSession } from '../utils/userAuth';

export type ActiveRoute =
  | 'rooms'
  | 'paths'
  | 'leaderboard'
  | 'progress'
  | 'team'
  | 'admin'
  | 'room-detail';

interface NavbarProps {
  activeRoute: ActiveRoute;
  onNavigate: (
    route: 'rooms' | 'paths' | 'leaderboard' | 'progress' | 'team' | 'admin'
  ) => void;
  onStartRecommended: () => void;
  hasResumeRoom: boolean;
  userSession: SignedUserSession | null;
  isDeveloperMode: boolean;
  displayBounty: number;
  rankTitleAr: string;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export function Navbar({
  activeRoute,
  onNavigate,
  onStartRecommended,
  hasResumeRoom,
  userSession,
  isDeveloperMode,
  displayBounty,
  rankTitleAr,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const navItems: {
    id: 'rooms' | 'paths' | 'leaderboard' | 'progress' | 'team' | 'admin';
    label: string;
  }[] = [
    { id: 'rooms', label: 'الغرف التدريبية' },
    { id: 'paths', label: 'المسارات التعليمية' },
    { id: 'leaderboard', label: 'لوحة المنافسين' },
    { id: 'progress', label: 'لوحة التقدم' },
    { id: 'team', label: 'أوضاع أخرى' },
    ...(isDeveloperMode
      ? [{ id: 'admin' as const, label: 'لوحة المطور السرية' }]
      : []),
  ];

  const isDev = isDeveloperMode;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#07090D]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('rooms')}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display">نواة سايبر</span>
        </button>

        {/* Zone 2: Concise Single-line Navigation Links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.id ||
              (activeRoute === 'room-detail' && item.id === 'rooms');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'text-cyan-300'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[14px] h-0.5 bg-cyan-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Dynamic User Profile Display / Auth Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {userSession ? (
            <>
              <button
                type="button"
                data-testid="navbar-user-profile"
                onClick={() => onNavigate('progress')}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-right transition-colors ${
                  isDev
                    ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                    : 'border-cyan-500/35 bg-[#0E131B] hover:border-cyan-400/60'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                    isDev
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                  }`}
                >
                  {isDev ? (
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="max-w-[110px] truncate text-xs font-bold text-slate-100">
                      {userSession.nickname}
                    </span>
                    <span
                      dir="ltr"
                      className={`font-mono text-[11px] font-bold tabular-nums ${
                        isDev ? 'text-emerald-300' : 'text-cyan-300'
                      }`}
                    >
                      {formatBounty(displayBounty)}
                    </span>
                  </div>
                  <p className="hidden lg:block max-w-[190px] truncate text-[10px] text-slate-400">
                    {rankTitleAr}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="إنهاء الجلسة"
                aria-label="إنهاء الجلسة"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-xs font-semibold text-rose-200 whitespace-nowrap shrink-0 transition-colors hover:bg-rose-500/20"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">إنهاء الجلسة</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-testid="navbar-auth-button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0E131B] px-3 py-2 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-cyan-400/60 hover:text-cyan-200"
              >
                <LogIn className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                <span>دخول / تسجيل</span>
              </button>

              <button
                type="button"
                onClick={onStartRecommended}
                className="hidden sm:inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                {hasResumeRoom ? 'استكمال التحدي' : 'ابدأ التحدي الآن'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Compact Navigation Row */}
      <nav
        aria-label="تنقل الجوال"
        className="flex md:hidden flex-wrap items-center justify-around gap-1 border-t border-slate-800/70 px-2 py-2 text-[11px] font-medium"
      >
        {navItems.map((item) => {
          const isActive =
            activeRoute === item.id ||
            (activeRoute === 'room-detail' && item.id === 'rooms');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
