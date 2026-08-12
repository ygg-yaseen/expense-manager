import type { UserProfile, Transaction } from '../types';

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
      notes: 'Room booking & luxury hill view stay',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: `tx-3-${userId}`,
      userId,
      title: 'Whole Foods Grocery',
      amount: 142.50,
      type: 'expense',
      categoryId: 'food',
      subCategory: 'Groceries',
      date: formatDate(1),
      time: '17:30',
      paymentMethod: 'Credit Card',
      notes: 'Weekly fresh fruits & organic veggies',
      createdAt: Date.now() - 86400000 * 1,
    },
    {
      id: `tx-4-${userId}`,
      userId,
      title: 'Ooty Taxi & Sightseeing',
      amount: 85.00,
      type: 'expense',
      categoryId: 'travel',
      subCategory: 'Ooty-Aug',
      date: formatDate(2),
      time: '11:15',
      paymentMethod: 'Cash',
      notes: 'Botanical garden & tea estate tour cab fare',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: `tx-5-${userId}`,
      userId,
      title: 'Starbucks Coffee',
      amount: 14.80,
      type: 'expense',
      categoryId: 'food',
      subCategory: 'Coffee & Tea',
      date: formatDate(0),
      time: '08:45',
      paymentMethod: 'UPI/Mobile Wallet',
      notes: 'Morning latte & croissant',
      createdAt: Date.now(),
    },
  ];
};

export class StorageService {
  // Migration helper: Convert single profile to multi-user array if needed
  private static initProfilesStorage(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (data) {
        return JSON.parse(data);
      }

      // Check old single profile
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

        // Migrate old transactions
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

  // Get all registered user profiles
  static getAllProfiles(): UserProfile[] {
    return this.initProfilesStorage();
  }

  // Get active user profile
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

  // Switch active user profile
  static setActiveUserId(userId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
  }

  // Save or update a specific user profile
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
  }

  // Delete a user profile and their data
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

  // Clear all data
  static resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.IS_LOCKED);
    localStorage.removeItem(STORAGE_KEYS.OLD_SINGLE_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.OLD_SINGLE_TRANSACTIONS);
    
    // Clear per-user tx keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('em_transactions_')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Lock status
  static isAppLocked(): boolean {
    const status = localStorage.getItem(STORAGE_KEYS.IS_LOCKED);
    return status === 'true'; // Default unlocked unless manually locked
  }

  static setAppLocked(locked: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_LOCKED, String(locked));
  }

  // Get transactions for active user
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

  // Save transactions for active user
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

  // Initialize demo data for specified user
  static loadDemoData(userId: string): void {
    const demoTxs = INITIAL_DEMO_TRANSACTIONS(userId);
    this.saveTransactions(demoTxs, userId);
  }

  // Export full user dataset as JSON string
  static exportFullBackup(): string {
    const profiles = this.getAllProfiles();
    const activeUser = this.getProfile();
    const transactions = this.getTransactions();

    const payload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      activeUser,
      profiles,
      transactions,
    };
    return JSON.stringify(payload, null, 2);
  }

  // Import full dataset from JSON string
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

  // Export transactions to CSV
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
