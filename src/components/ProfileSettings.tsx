import React, { useState } from 'react';
import { 
  User, 
  Download, 
  Upload, 
  Trash2, 
  Smartphone, 
  CheckCircle2, 
  KeyRound, 
  ShieldCheck,
  Users,
  UserPlus,
  Tag,
  Plus,
  Sparkles
} from 'lucide-react';
import type { UserProfile } from '../types';
import { SUPPORTED_CURRENCIES } from '../types';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storage';

interface ProfileSettingsProps {
  profile: UserProfile;
  onUpdateProfile: () => void;
  onResetApp: () => void;
  onAddNewUser: () => void;
  onSwitchUser: (userId: string) => void;
}

const AVATAR_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#ec4899',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onUpdateProfile,
  onResetApp,
  onAddNewUser,
  onSwitchUser,
}) => {
  const [name, setName] = useState<string>(profile.name);
  const [currencyCode, setCurrencyCode] = useState<string>(profile.currency.code);
  const [avatarColor, setAvatarColor] = useState<string>(profile.avatarColor || '#6366f1');

  // Security PIN Modal
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [oldPin, setOldPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Category Manager State
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newSubCatName, setNewSubCatName] = useState<string>('');
  const [selectedCatForSub, setSelectedCatForSub] = useState<string>('travel');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const allProfiles = AuthService.getAllProfiles();
  const allCategories = AuthService.getCategories(profile);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ text: 'Name cannot be empty', type: 'error' });
      return;
    }

    const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || profile.currency;

    AuthService.updateProfile({
      name: name.trim(),
      currency,
      avatarColor,
    });

    onUpdateProfile();
    setMessage({ text: 'Profile updated successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    AuthService.addCategory({ name: newCatName.trim() });
    setNewCatName('');
    setShowAddCatModal(false);
    onUpdateProfile();
    setMessage({ text: 'Custom main category created!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatName.trim()) return;

    AuthService.addSubCategory(selectedCatForSub, newSubCatName.trim());
    setNewSubCatName('');
    onUpdateProfile();
    setMessage({ text: 'Custom sub-category added!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('New PINs do not match');
      return;
    }

    const res = AuthService.changePin(oldPin, newPin);
    if (!res.success) {
      setPinError(res.error || 'Failed to update PIN');
      return;
    }

    setShowPinModal(false);
    setOldPin('');
    setNewPin('');
    setConfirmNewPin('');
    setMessage({ text: '4-Digit PIN changed successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteUserProfile = (userId: string, userName: string) => {
    if (allProfiles.length <= 1) {
      alert('Cannot delete the last remaining user profile.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete profile "${userName}" and all their transactions?`)) {
      AuthService.deleteProfile(userId);
      onUpdateProfile();
    }
  };

  const handleExportJSON = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_flow_backup_${profile.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && StorageService.importFullBackup(content)) {
        onUpdateProfile();
        setMessage({ text: 'Data imported successfully!', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: 'Failed to import JSON data. Invalid format.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to reset all user profiles and transaction data? This action cannot be undone.'
      )
    ) {
      onResetApp();
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Settings & Preferences</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" /> User Profile & Category Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage profiles, custom categories & sub-categories, 4-digit PIN security, and database backup.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Category & Sub-Category Manager */}
          <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-400" /> Categories & Sub-Categories Manager
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create custom categories and trip tags (e.g. Ooty-Aug)
                </p>
              </div>

              <button
                onClick={() => setShowAddCatModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-400" /> Add Category
              </button>
            </div>

            {/* Quick Add Sub-category form */}
            <form onSubmit={handleCreateSubCategory} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">Add New Sub-Category / Location Tag</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedCatForSub}
                  onChange={(e) => setSelectedCatForSub(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="e.g. Ooty-Aug, Goa 2026"
                  value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={!newSubCatName.trim()}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            </form>

            {/* List of Categories & their subcategories */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {allCategories.map((cat) => {
                const subs = AuthService.getSubCategories(cat.id, profile);
                return (
                  <div key={cat.id} className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-bold text-slate-200">{cat.name}</span>
                        {cat.isCustom && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-bold">
                            Custom
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{subs.length} sub-categories</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((sub) => (
                        <span key={sub} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                          📍 {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-User Management Card */}
          <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> User Profiles ({allProfiles.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add multiple user profiles with separate PIN & expense data.
                </p>
              </div>

              <button
                onClick={onAddNewUser}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {allProfiles.map((p) => {
                const isActive = p.id === profile.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                      isActive
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-slate-100'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: p.avatarColor || '#6366f1' }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      >
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">{p.name}</h4>
                        <span className="text-[10px] text-slate-400">{p.currency.symbol} {p.currency.code}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isActive ? (
                        <button
                          onClick={() => onSwitchUser(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Switch
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                          Active
                        </span>
                      )}

                      {allProfiles.length > 1 && (
                        <button
                          onClick={() => handleDeleteUserProfile(p.id, p.name)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Profile Form */}
          <form onSubmit={handleSaveProfile} className="glass-card p-6 sm:p-7 rounded-3xl space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">
              Active Profile Details ({profile.name})
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Currency Symbol
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
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
                      className={`w-8 h-8 rounded-full transition cursor-pointer ${
                        avatarColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>

          {/* Security PIN Card */}
          <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" /> Security 4-Digit PIN
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your 4-digit security login PIN.
                </p>
              </div>

              <button
                onClick={() => setShowPinModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-indigo-400" /> Change PIN
              </button>
            </div>
          </div>

          {/* Data Backup & Restore */}
          <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Backup & Migration</h3>
            <p className="text-xs text-slate-400">
              Export your data as a JSON file to transfer between devices or restore later.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleExportJSON}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" /> Export JSON Backup
              </button>

              <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" /> Import JSON Backup
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>

              <button
                onClick={handleResetData}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Reset All App Data
              </button>
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-4 border border-indigo-500/30 relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" /> Database & Cross-Platform Info
            </div>
            <h3 className="text-lg font-bold text-slate-100">Database Architecture 🗄️</h3>
            
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">💾 Web Database: Browser LocalStorage / IndexedDB</span>
                <p className="text-[11px] text-slate-400">
                  Data is stored in high-performance key-value local storage directly on your browser/device. Fully private, offline-first, and zero external latency.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">📱 Mobile Database: Native SQLite / SecureStorage</span>
                <p className="text-[11px] text-slate-400">
                  When packaged into Android / iOS apps using Capacitor or React Native, it uses native **SQLite database engine** with encrypted local keychains.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Main Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCategory}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
          >
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Create Main Category
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Category Name
              </label>
              <input
                type="text"
                placeholder="e.g. Subscriptions, Pet Care"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleChangePin}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-400" /> Change 4-Digit PIN
            </h3>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                ⚠️ {pinError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Current PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono tracking-[0.5em] text-center focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono tracking-[0.5em] text-center focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirm New PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono tracking-[0.5em] text-center focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Update PIN
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
