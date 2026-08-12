import { useState } from 'react';
import type { UserProfile, Transaction } from './types';
import { AuthService } from './services/authService';
import { ExpenseService } from './services/expenseService';
import { StorageService } from './services/storage';
import { PinLock } from './components/PinLock';
import { OnboardingModal } from './components/OnboardingModal';
import { Navbar } from './components/Navbar';
import type { NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { BudgetManager } from './components/BudgetManager';
import { Analytics } from './components/Analytics';
import { ProfileSettings } from './components/ProfileSettings';
import { ExpenseModal } from './components/ExpenseModal';

export function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => AuthService.getProfile());
  const [isLocked, setIsLocked] = useState<boolean>(() => AuthService.isLocked());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isAddingNewUser, setIsAddingNewUser] = useState<boolean>(false);
  
  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Refresh trigger state
  const [, setRefreshKey] = useState<number>(0);
  const refreshData = () => setRefreshKey((v) => v + 1);

  // Handle Onboarding Completion
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setIsLocked(false);
    setIsAddingNewUser(false);
    refreshData();
  };

  // Switch User Profile (Requires PIN for the target profile!)
  const handleSwitchUser = (targetUserId: string) => {
    AuthService.switchProfile(targetUserId);
    const switched = AuthService.getProfile();
    setProfile(switched);
    // Lock app immediately so PIN authentication is required to access switched user workspace!
    AuthService.lockApp();
    setIsLocked(true);
    refreshData();
  };

  // Handle App Lock trigger (Manual lock button)
  const handleLockApp = () => {
    AuthService.lockApp();
    setIsLocked(true);
  };

  // Handle PIN Unlock success
  const handleUnlockSuccess = () => {
    setIsLocked(false);
  };

  // Save transaction (Add or Edit)
  const handleSaveTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      ExpenseService.updateTransaction(editingTransaction.id, txData);
    } else {
      ExpenseService.addTransaction(txData);
    }
    setEditingTransaction(null);
    refreshData();
  };

  // Handle Edit click
  const handleEditExpense = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsExpenseModalOpen(true);
  };

  // Handle Reset App
  const handleResetApp = () => {
    StorageService.resetAllData();
    setProfile(null);
    setIsLocked(false);
    setIsAddingNewUser(false);
    refreshData();
  };

  // Update Profile hook
  const handleUpdateProfile = () => {
    setProfile(AuthService.getProfile());
    refreshData();
  };

  // Case 1: First time user setup OR Adding a New Additional User Profile
  if (!profile || isAddingNewUser) {
    return (
      <div className="relative min-h-screen bg-slate-950">
        {isAddingNewUser && (
          <button
            onClick={() => setIsAddingNewUser(false)}
            className="fixed top-4 right-4 z-60 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            ← Cancel Adding User
          </button>
        )}
        <OnboardingModal onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // Case 2: App is Locked -> Show 4-Digit PIN Keypad Screen (Required on user switch / lock)
  if (isLocked) {
    return (
      <PinLock
        currentProfile={profile}
        onSuccess={handleUnlockSuccess}
        onSwitchUser={handleSwitchUser}
      />
    );
  }

  // Case 3: Authenticated Main Workspace View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col font-sans">
      {/* Header & Navigation */}
      <Navbar
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLockApp={handleLockApp}
        onOpenAddExpense={() => {
          setEditingTransaction(null);
          setIsExpenseModalOpen(true);
        }}
        onSwitchUser={handleSwitchUser}
        onAddNewUser={() => setIsAddingNewUser(true)}
      />

      {/* Main Screen Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={profile}
            onOpenAddExpense={() => {
              setEditingTransaction(null);
              setIsExpenseModalOpen(true);
            }}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'transactions' && (
          <Transactions
            profile={profile}
            onOpenAddExpense={() => {
              setEditingTransaction(null);
              setIsExpenseModalOpen(true);
            }}
            onEditExpense={handleEditExpense}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetManager
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics profile={profile} />
        )}

        {activeTab === 'profile' && (
          <ProfileSettings
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onResetApp={handleResetApp}
            onAddNewUser={() => setIsAddingNewUser(true)}
            onSwitchUser={handleSwitchUser}
          />
        )}
      </main>

      {/* Add / Edit Expense Modal Dialog */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        profile={profile}
      />
    </div>
  );
}

export default App;
