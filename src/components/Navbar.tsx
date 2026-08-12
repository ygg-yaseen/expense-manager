import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  PieChart, 
  Wallet, 
  User, 
  Lock, 
  Plus,
  Users,
  UserPlus,
  ChevronDown,
  Check
} from 'lucide-react';
import type { UserProfile } from '../types';
import { AuthService } from '../services/authService';

export type NavTab = 'dashboard' | 'transactions' | 'budget' | 'analytics' | 'profile';

interface NavbarProps {
  profile: UserProfile;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLockApp: () => void;
  onOpenAddExpense: () => void;
  onSwitchUser: (userId: string) => void;
  onAddNewUser: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeTab,
  onTabChange,
  onLockApp,
  onOpenAddExpense,
  onSwitchUser,
  onAddNewUser,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const allProfiles = AuthService.getAllProfiles();

  const navItems: Array<{ id: NavTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'budget', label: 'Budget', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 text-lg tracking-tight">ExpenseFlow</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Pro Multi-User
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Simple Personal Expense Manager</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3 relative">
            {/* Quick Add Button */}
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>

            {/* Lock App PIN Button */}
            <button
              onClick={onLockApp}
              title="Lock Session (Requires 4-Digit PIN)"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700/60 text-slate-300 hover:text-rose-400 transition cursor-pointer"
            >
              <Lock className="w-4.5 h-4.5" />
            </button>

            {/* Multi-User Profile Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/80 transition cursor-pointer"
              >
                <div
                  style={{ backgroundColor: profile.avatarColor || '#6366f1' }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-inner"
                >
                  {getInitials(profile.name)}
                </div>
                <span className="text-xs font-semibold text-slate-200 max-w-[80px] truncate hidden sm:inline">
                  {profile.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Switcher Popover */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" /> Switch User Profile
                  </div>

                  <div className="py-1 space-y-0.5 max-h-48 overflow-y-auto">
                    {allProfiles.map((p) => {
                      const isCurrent = p.id === profile.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setShowProfileMenu(false);
                            if (!isCurrent) onSwitchUser(p.id);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              style={{ backgroundColor: p.avatarColor || '#6366f1' }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                            >
                              {getInitials(p.name)}
                            </span>
                            <span className="truncate max-w-[110px]">{p.name}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onAddNewUser();
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700/60 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add New User Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
