'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Check initial status
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline && isOnline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleCheckConnection = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      window.location.reload();
    }
  };

  if (isOnline && !showRestored) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[90%] pointer-events-auto animate-in slide-in-from-top duration-300">
      {!isOnline ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-600 dark:bg-amber-700 text-white shadow-2xl border border-amber-500/50 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <WifiOff className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate">You are currently offline</p>
              <p className="text-[11px] opacity-90 leading-tight truncate">Changes & uploads will pause until reconnected</p>
            </div>
          </div>
          <button
            onClick={handleCheckConnection}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
            title="Check connection"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      ) : showRestored ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl border border-emerald-500/50 backdrop-blur-md animate-in fade-in duration-200">
          <Wifi className="w-4 h-4 shrink-0" />
          <p className="text-xs font-semibold">Back online! Connection restored.</p>
        </div>
      ) : null}
    </div>
  );
}
