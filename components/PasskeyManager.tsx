'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Fingerprint, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function PasskeyManager() {
  const supabase = createClient();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if WebAuthn / Passkeys are supported by device/browser
    if (typeof window !== 'undefined') {
      const isSupported = !!(
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      );
      if (isSupported) {
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then(res => setSupported(res))
          .catch(() => setSupported(false));
      } else {
        setSupported(false);
      }
    }
  }, []);

  const registerPasskey = async () => {
    setLoading(true);
    try {
      // Enroll WebAuthn / Passkey factor with Supabase Auth
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'webauthn',
        friendlyName: `Staff Passkey (${new Date().toLocaleDateString()})`,
      });

      if (error) {
        if (error.message.includes('not supported') || error.message.includes('factor_type')) {
          toast.info('Passkeys WebAuthn is enabled on your device! Make sure "Passkeys" is enabled in your Supabase Auth dashboard under Authentication -> Providers.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('✅ Passkey registered successfully with Touch ID / Face ID!');
    } catch (err: any) {
      toast.error(err.message || 'Passkey enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-anthropic p-6 rounded-2xl border border-[var(--card-border)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D97757]/10 rounded-xl text-[#D97757]">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Biometric Passkeys
                {supported ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-mono font-normal">
                    Device Supported
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-mono font-normal">
                    WebAuthn Ready
                  </span>
                )}
              </h3>
              <p className="text-xs opacity-60 mt-0.5">
                Sign in with Touch ID, Face ID, Windows Hello, or hardware security keys without typing passwords.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--sidebar-bg)] rounded-xl border border-[var(--card-border)] text-xs space-y-2">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Why use Passkeys?
          </div>
          <ul className="list-disc list-inside opacity-70 space-y-1 pl-1">
            <li>1-second instant sign in with Touch ID or Face ID</li>
            <li>100% immune to phishing and password leaks</li>
            <li>Encrypted securely on your device hardware chip</li>
          </ul>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={registerPasskey}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D97757] hover:opacity-90 text-[#F5F4EF] text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>Register New Passkey (Touch ID / Face ID)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
