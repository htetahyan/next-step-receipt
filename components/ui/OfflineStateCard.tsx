'use client';

import React from 'react';
import { WifiOff, RefreshCw, Database, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from './OfflineBanner';

interface OfflineStateCardProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function OfflineStateCard({
  title = "No Internet Connection",
  description = "You are currently working offline. Cached records remain viewable, but network operations and new uploads will resume once reconnected.",
  onRetry,
}: OfflineStateCardProps) {
  const isOnline = useOnlineStatus();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="card-anthropic p-8 text-center max-w-lg mx-auto my-8 border-dashed border-amber-500/30 bg-amber-500/5 space-y-4 animate-in fade-in duration-300">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
        <WifiOff className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-serif text-lg font-bold text-[var(--foreground)]">
          {title}
        </h3>
        <p className="text-xs opacity-70 leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      <div className="py-2 px-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-left text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[11px] uppercase tracking-wider opacity-70">
          <Database className="w-3.5 h-3.5 text-[#D97757]" /> What you can do offline:
        </div>
        <ul className="space-y-1 text-[11px] opacity-80 pl-1">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Browse previously loaded tabs and screens</span>
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Prepare customer details and review draft figures</span>
          </li>
        </ul>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <button
          onClick={handleRetry}
          className="px-5 py-2 rounded-lg bg-[#D97757] hover:bg-[#c26243] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Check Connection & Refresh
        </button>
      </div>
    </div>
  );
}
