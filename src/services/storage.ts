import type { UserProfile, Transaction } from '../types';
import { SupabaseService } from './supabaseClient';

const STORAGE_KEYS = {
  PROFILES: 'em_user_profiles',
  ACTIVE_USER_ID: 'em_active_user_id',
  IS_LOCKED: 'em_is_locked',
  OLD_SINGLE_PROFILE: 'em_user_profile',
  OLD_SINGLE_TRANSACTIONS: 'em_transactions',
};

const INITIAL_DEMO_TRANSACTIONS = (userId: string): Transaction[] => {
  const today = new Date();

  const formatDate = (dayOffset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: `tx-1-${userId}`,
      userId,
      title: 'Monthly Salary',
      amount: 4500,
      type: 'income',
      categoryId: 'income',
      date: formatDate(12),
      time: '09:00',
      paymentMethod: 'Bank Transfer',
      notes: 'Company payroll direct deposit',
      createdAt: Date.now() - 86400000 * 12,
    },
    {
      id: `tx-2-${userId}`,
      userId,
      title: 'Ooty Vacation Resort',
      amount: 320.00,
      type: 'expense',
      categoryId: 'travel',
      subCategory: 'Ooty-Aug',
      date: formatDate(3),
      time: '14:00',
      paymentMethod: 'Credit Card',
      notes: 'Room booking & stay',
      createdAt: Date.now() - 86400000 * 3,
    },
  ];
};

export class StorageService {
  private static initProfilesStorage(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (data) {
        return JSON.parse(data);
      }

      const oldProfileStr = localStorage.getItem(STORAGE_KEYS.OLD_SINGLE_PROFILE);
      if (oldProfileStr) {
        const oldProfile = JSON.parse(oldProfileStr);
        const migratedProfile: UserProfile = {
          ...oldProfile,
          id: oldProfile.id || `usr-${Date.now()}`,
        };
        const profilesList = [migratedProfile];
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profilesList));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, migratedProfile.id);

        const oldTxs = localStorage.getItem(STORAGE_KEYS.OLD_SINGLE_TRANSACTIONS);
        if (oldTxs) {
          localStorage.setItem(`em_transactions_${migratedProfile.id}`, oldTxs);
        }

        return profilesList;
      }

      return [];
    } catch (err) {
      console.error('Failed to parse user profiles:', err);
      return [];
    }
  }

  static getAllProfiles(): UserProfile[] {
    return this.initProfilesStorage();
  }

  static getProfile(): UserProfile | null {
    const profiles = this.getAllProfiles();
    if (profiles.length === 0) return null;

    let activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
    let active = profiles.find((p) => p.id === activeId);

    if (!active) {
      active = profiles[0];
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, active.id);
    }

    return active;
  }

  static setActiveUserId(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
  }

  static saveProfile(profile: UserProfile): void {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id);

    if (index !== -1) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }

    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, profile.id);

    // Asynchronously sync profile to Supabase Cloud DB
    if (SupabaseService.isConfigured()) {
      SupabaseService.syncProfile(profile);
    }
  }

  static deleteProfile(userId: string): void {
    let profiles = this.getAllProfiles();
    profiles = profiles.filter((p) => p.id !== userId);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    localStorage.removeItem(`em_transactions_${userId}`);

    if (profiles.length > 0) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, profiles[0].id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
    }
  }

  static resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.IS_LOCKED);
    localStorage.removeItem(STORAGE_KEYS.OLD_SINGLE_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.OLD_SINGLE_TRANSACTIONS);
    
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('em_transactions_')) {
        localStorage.removeItem(key);
      }
    });
  }

  static isAppLocked(): boolean {
    const status = localStorage.getItem(STORAGE_KEYS.IS_LOCKED);
    return status === 'true';
  }

  static setAppLocked(locked: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_LOCKED, String(locked));
  }

  static getTransactions(userId?: string): Transaction[] {
    const activeUser = this.getProfile();
    const id = userId || (activeUser ? activeUser.id : null);
    if (!id) return [];

    try {
      const data = localStorage.getItem(`em_transactions_${id}`);
      if (!data) return [];
      return JSON.parse(data);
    } catch (err) {
      console.error(`Failed to load transactions for user ${id}:`, err);
      return [];
    }
  }

  static saveTransactions(transactions: Transaction[], userId?: string): void {
    const activeUser = this.getProfile();
    const id = userId || (activeUser ? activeUser.id : null);
    if (!id) return;

    try {
      localStorage.setItem(`em_transactions_${id}`, JSON.stringify(transactions));
    } catch (err) {
      console.error(`Failed to save transactions for user ${id}:`, err);
    }
  }

  static loadDemoData(userId: string): void {
    const demoTxs = INITIAL_DEMO_TRANSACTIONS(userId);
    this.saveTransactions(demoTxs, userId);
  }

  // Pull latest cloud data from Supabase into LocalStorage
  static async pullCloudData(): Promise<boolean> {
    if (!SupabaseService.isConfigured()) return false;

    try {
      const cloudProfiles = await SupabaseService.fetchCloudProfiles();
      if (cloudProfiles.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(cloudProfiles));

        for (const p of cloudProfiles) {
          const cloudTxs = await SupabaseService.fetchCloudTransactions(p.id);
          if (cloudTxs.length > 0) {
            localStorage.setItem(`em_transactions_${p.id}`, JSON.stringify(cloudTxs));
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to pull cloud database sync:', err);
      return false;
    }
  }

  static exportFullBackup(): string {
    const profiles = this.getAllProfiles();
    const activeUser = this.getProfile();
    const transactions = this.getTransactions();

    const payload = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      activeUser,
      profiles,
      transactions,
    };
    return JSON.stringify(payload, null, 2);
  }

  static importFullBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.profiles && Array.isArray(parsed.profiles)) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(parsed.profiles));
        if (parsed.activeUser) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, parsed.activeUser.id);
        }
        if (parsed.transactions && parsed.activeUser) {
          this.saveTransactions(parsed.transactions, parsed.activeUser.id);
        }
        return true;
      } else if (parsed.profile) {
        this.saveProfile(parsed.profile);
        if (Array.isArray(parsed.transactions)) {
          this.saveTransactions(parsed.transactions, parsed.profile.id);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to import backup payload:', err);
      return false;
    }
  }

  static exportTransactionsCSV(): string {
    const txs = this.getTransactions();
    if (txs.length === 0) return '';

    const headers = ['ID', 'Date', 'Time', 'Title', 'Type', 'Category', 'SubCategory/Tag', 'Amount', 'Payment Method', 'Notes'];
    const rows = txs.map(t => [
      t.id,
      t.date,
      t.time || '',
      `"${t.title.replace(/"/g, '""')}"`,
      t.type,
      t.categoryId,
      `"${(t.subCategory || '').replace(/"/g, '""')}"`,
      t.amount,
      t.paymentMethod,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
