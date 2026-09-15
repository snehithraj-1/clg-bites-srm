import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, User, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminLoginPage() {
  const { loginAdmin, unauthorizedError } = useAdminAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);
    const result = await loginAdmin(identifier, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid Super Administrator credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080E1A] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-white">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FF5722] to-amber-600 mx-auto flex items-center justify-center shadow-xl shadow-orange-500/20 mb-3 border border-orange-400/30">
          <Lock size={28} className="text-white" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
          Srm : College Bites Admin Portal
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Central Order & Kitchen Operations Console (SRM University AP)
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 py-7 px-6 sm:px-8 rounded-3xl shadow-2xl border border-slate-800 space-y-5">
          
          {/* Admin Notice */}
          <div className="p-3.5 rounded-2xl bg-orange-950/40 border border-orange-800/60 text-xs text-orange-200 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-[#FF5722] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Unified Admin Console:</strong> Manage all campus orders, kitchen availability, dish menus, and customer records from a single central portal.
            </div>
          </div>

          {/* Unauthorized Alert */}
          {unauthorizedError && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-start gap-2">
              <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{unauthorizedError}</span>
            </div>
          )}

          {/* Form Error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User size={12} className="text-[#FF5722]" />
                <span>Admin Email / Username</span>
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter admin email or username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <KeyRound size={12} className="text-[#FF5722]" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5722]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-1 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#FF5722] to-amber-600 hover:from-[#F4511E] hover:to-amber-500 text-white shadow-md shadow-orange-600/30 transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating Administrator...</span>
              ) : (
                <>
                  <Lock size={14} />
                  <span>Unlock Admin Portal</span>
                </>
              )}
            </button>
          </form>

        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Enforced by Neon PostgreSQL & Supabase Database Authorization
        </p>
      </div>

    </div>
  );
}
