'use client'

import React, { useActionState } from 'react';
import { login, signup, type AuthState } from '@/app/actions/auth';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[120px] animate-pulse delay-700"></div>
      
      <div className="w-full max-w-md px-6 z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 mb-6 shadow-2xl">
             <img src="/logo.jpg" alt="Logo" className="w-32 h-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            NextStep <span className="text-emerald-500">Travel & Tourism</span>
          </h1>
          <p className="text-slate-400">Secure Billing & Management Dashboard</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transition-all duration-500">
          <div className="flex items-center justify-center p-3 rounded-full bg-emerald-600/10 border border-emerald-600/20 mb-8 border-white/5 overflow-hidden">
            <span className="text-sm font-bold text-emerald-500 flex items-center gap-2 italic">
               <LogIn className="w-4 h-4" /> Secure Admin Access
            </span>
          </div>

          <form action={action} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="email" 
                  name="email"
                  placeholder="name@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-300"
                />
              </div>
            </div>

            {state?.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-2xl animate-shake">
                {state.error}
              </div>
            )}
            
            {state?.message && !state.error && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm px-4 py-3 rounded-2xl">
                {state.message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={pending}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-900 hover:from-emerald-500 hover:to-emerald-800 text-white font-bold h-14 rounded-2xl shadow-xl shadow-emerald-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              {pending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Access Dashboard
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4">Secure Access Guaranteed</p>
             <div className="flex items-center justify-center gap-4 text-slate-600">
                <span className="text-[10px] w-auto h-auto px-2 py-1 border border-white/5 rounded-md">256-BIT SSL</span>
                <span className="text-[10px] w-auto h-auto px-2 py-1 border border-white/5 rounded-md">ENCRYPTED DATA</span>
             </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
