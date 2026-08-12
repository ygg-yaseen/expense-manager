import React, { useState } from 'react';
import { DollarSign, User, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../types';
import type { UserProfile } from '../types';
import { AuthService } from '../services/authService';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
}

const AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [monthlyBudget, setMonthlyBudget] = useState<string>('3000');
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [avatarColor, setAvatarColor] = useState<string>('#6366f1');
  const [includeDemoData, setIncludeDemoData] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const handleNextStep1 = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleNextStep2 = () => {
    const budget = parseFloat(monthlyBudget);
    if (isNaN(budget) || budget <= 0) {
      setError('Please enter a valid monthly budget');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleFinish = () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 numeric digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please verify');
      return;
    }

    const created = AuthService.createProfile({
      name,
      pin,
      currencyCode,
      monthlyBudget: parseFloat(monthlyBudget),
      avatarColor,
      includeDemoData,
    });

    onComplete(created);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient top decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
              {step}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {step === 1 ? 'Profile Setup' : step === 2 ? 'Monthly Budget' : 'Security PIN'}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-indigo-500' : i < step ? 'w-3 bg-emerald-500' : 'w-3 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Step 1: User Profile & Currency */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Welcome to Expense Flow</h2>
              <p className="text-sm text-slate-400 mt-1">Let's personalize your private expense workspace.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Preferred Currency
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                  <select
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition appearance-none cursor-pointer"
                  >
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name} ({curr.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Avatar Theme Color
                </label>
                <div className="flex items-center gap-3">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-9 h-9 rounded-full transition-transform cursor-pointer ${
                        avatarColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleNextStep1}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Monthly Budget */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Set Monthly Budget</h2>
              <p className="text-sm text-slate-400 mt-1">
                Define your spending target. You can adjust category limits anytime.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Overall Monthly Target
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xl font-bold text-indigo-400">
                    {SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol || '$'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="3000"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xl font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Sample Data Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="demoData"
                  checked={includeDemoData}
                  onChange={(e) => setIncludeDemoData(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <label htmlFor="demoData" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                  <span className="font-semibold text-slate-100 block">Include Sample Transactions</span>
                  Seed pre-filled demo transactions so you can explore analytics & dashboard immediately.
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNextStep2}
                className="w-2/3 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Security 4-Digit PIN */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Setup 4-Digit PIN</h2>
              <p className="text-sm text-slate-400 mt-1">
                This 4-digit PIN will be required to log in every time you launch the app.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Create 4-Digit PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm 4-Digit PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={pin.length !== 4 || pin !== confirmPin}
                className="w-2/3 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Complete Setup <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
