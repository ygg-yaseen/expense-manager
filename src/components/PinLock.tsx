import React, { useState, useEffect, useRef } from 'react';
import { Delete, KeyRound, AlertCircle, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { AuthService } from '../services/authService';
import type { UserProfile } from '../types';

interface PinLockProps {
  currentProfile: UserProfile;
  onSuccess: () => void;
  onSwitchUser?: (userId: string) => void;
}

export const PinLock: React.FC<PinLockProps> = ({ currentProfile, onSuccess, onSwitchUser }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile>(currentProfile);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetConfirmPin, setResetConfirmPin] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allProfiles = AuthService.getAllProfiles();

  useEffect(() => {
    setSelectedUser(currentProfile);
  }, [currentProfile]);

  // Focus input automatically on mount for instant physical keyboard typing
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleProcessPin = (nextPin: string) => {
    setPin(nextPin);
    setError(false);
    setErrorMessage('');

    if (nextPin.length === 4) {
      setTimeout(() => {
        if (AuthService.verifyPin(nextPin, selectedUser.id)) {
          if (selectedUser.id !== currentProfile.id && onSwitchUser) {
            onSwitchUser(selectedUser.id);
          }
          AuthService.unlockApp();
          onSuccess();
        } else {
          setError(true);
          setErrorMessage('Incorrect PIN. Please try again.');
          setPin('');
        }
      }, 150);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      handleProcessPin(pin + num);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
    setErrorMessage('');
  };

  // Keyboard Event Listener for typing on physical keyboard (Numpad / standard numbers / Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showForgotModal) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, showForgotModal, selectedUser]);

  const handleMasterPinReset = () => {
    if (resetConfirmPin.length === 4) {
      AuthService.resetPin(resetConfirmPin);
      AuthService.unlockApp();
      setShowForgotModal(false);
      onSuccess();
    } else {
      alert('Please enter a valid 4-digit new PIN');
    }
  };

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setPin('');
    setError(false);
    setErrorMessage('');
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 select-none cursor-pointer"
    >
      {/* Hidden input element to ensure mobile & physical keyboards capture focus natively */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          handleProcessPin(val);
        }}
        className="sr-only"
        autoFocus
      />

      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Shield Icon Header */}
        <div className="relative mb-6">
          <div
            style={{ backgroundColor: selectedUser?.avatarColor || '#6366f1' }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/20 text-white font-extrabold text-2xl"
          >
            {(selectedUser?.name || 'User').slice(0, 2).toUpperCase()}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-950 text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Welcome Back</h2>
        <p className="text-sm text-slate-400 mt-1 mb-4">
          Enter 4-digit PIN for <span className="text-indigo-400 font-semibold">{selectedUser?.name || 'User'}</span>
        </p>

        {/* Multi-User Profile Switcher Pill */}
        {allProfiles.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl mb-6 max-w-full overflow-x-auto">
            {allProfiles.map((user) => {
              const isSel = user.id === selectedUser.id;
              return (
                <button
                  key={user.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserSelect(user);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isSel
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{user.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 4-Digit Dots Indicator */}
        <div className={`flex items-center justify-center gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                  error
                    ? 'border-rose-500 bg-rose-500/30'
                    : isFilled
                    ? 'border-indigo-500 bg-indigo-500 shadow-md shadow-indigo-500/50 scale-110'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-rose-400 text-xs font-medium bg-rose-500/10 px-3 py-1.5 rounded-full mb-6 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Keypad Grid (1-9, Clear, 0, Backspace) */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={(e) => {
                e.stopPropagation();
                handleKeyPress(num);
              }}
              className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/60 hover:bg-indigo-600/20 active:bg-indigo-600/40 text-slate-100 text-2xl font-semibold border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
            >
              {num}
            </button>
          ))}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowForgotModal(true);
            }}
            className="w-16 h-16 mx-auto rounded-2xl bg-slate-900/40 text-slate-500 hover:text-slate-300 text-xs font-medium transition-all flex items-center justify-center cursor-pointer"
          >
            Forgot?
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleKeyPress('0');
            }}
            className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/60 hover:bg-indigo-600/20 active:bg-indigo-600/40 text-slate-100 text-2xl font-semibold border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
          >
            0
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/40 hover:bg-slate-700/50 active:bg-slate-700 text-slate-300 transition-all flex items-center justify-center border border-slate-700/40 cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Type on your keyboard or tap digits above
        </p>
      </div>

      {/* Forgot PIN Recovery Modal */}
      {showForgotModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400 mb-3">
              <KeyRound className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-100">Reset 4-Digit PIN</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Enter a new 4-digit PIN below for profile <strong className="text-slate-200">{selectedUser.name}</strong>.
            </p>

            <input
              type="password"
              maxLength={4}
              placeholder="Enter new 4-digit PIN"
              value={resetConfirmPin}
              onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-slate-950 border border-slate-700 rounded-xl text-indigo-400 font-mono mb-4 focus:outline-none focus:border-indigo-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowForgotModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMasterPinReset}
                disabled={resetConfirmPin.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition cursor-pointer"
              >
                Save & Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
