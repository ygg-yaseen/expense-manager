import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, Transaction } from '../types';

const SUPABASE_STORAGE_KEYS = {
  URL: 'em_supabase_url',
  ANON_KEY: 'em_supabase_anon_key',
};

let supabaseInstance: SupabaseClient | null = null;

export class SupabaseService {
  // Get configured credentials from localStorage or Vite environment
  static getCredentials(): { url: string; anonKey: string } {
    const url =
      localStorage.getItem(SUPABASE_STORAGE_KEYS.URL) ||
      import.meta.env.VITE_SUPABASE_URL ||
      '';
    const anonKey =
      localStorage.getItem(SUPABASE_STORAGE_KEYS.ANON_KEY) ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      '';
    return { url, anonKey };
  }

  // Check if cloud sync is enabled
  static isConfigured(): boolean {
    const { url, anonKey } = this.getCredentials();
    return Boolean(url && anonKey && url.startsWith('http'));
  }

  // Initialize or return active client
  static getClient(): SupabaseClient | null {
    if (!this.isConfigured()) return null;
    if (supabaseInstance) return supabaseInstance;

    const { url, anonKey } = this.getCredentials();
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  // Save Credentials from App UI Settings
  static saveCredentials(url: string, anonKey: string): boolean {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    if (!trimmedUrl || !trimmedKey) {
      localStorage.removeItem(SUPABASE_STORAGE_KEYS.URL);
      localStorage.removeItem(SUPABASE_STORAGE_KEYS.ANON_KEY);
      supabaseInstance = null;
      return false;
    }

    localStorage.setItem(SUPABASE_STORAGE_KEYS.URL, trimmedUrl);
    localStorage.setItem(SUPABASE_STORAGE_KEYS.ANON_KEY, trimmedKey);
    supabaseInstance = null; // reset client instance
    return this.isConfigured();
  }

  // Test Cloud Connection
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase credentials not configured' };

    try {
      const { error } = await client.from('profiles').select('id').limit(1);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }

  // -------------------------------------------------------------
  // CLOUD SYNC OPERATIONS
  // -------------------------------------------------------------

  // Sync profile to cloud table 'profiles'
  static async syncProfile(profile: UserProfile): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: profile.id,
        name: profile.name,
        email: profile.email || null,
        avatar_color: profile.avatarColor,
        currency: profile.currency,
        pin: profile.pin,
        monthly_budget: profile.monthlyBudget,
        category_budgets: profile.categoryBudgets || [],
        custom_categories: profile.customCategories || [],
        custom_sub_categories: profile.customSubCategories || {},
        auto_lock_minutes: profile.autoLockMinutes,
        is_dark_mode: profile.isDarkMode,
        created_at: profile.createdAt,
      };

      const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) console.error('Cloud profile sync error:', error);
      return !error;
    } catch (err) {
      console.error('Failed to sync profile to cloud:', err);
      return false;
    }
  }

  // Sync transaction to cloud table 'transactions'
  static async syncTransaction(tx: Transaction): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const payload = {
        id: tx.id,
        user_id: tx.userId,
        title: tx.title,
        amount: tx.amount,
        type: tx.type,
        category_id: tx.categoryId,
        sub_category: tx.subCategory || null,
        date: tx.date,
        time: tx.time || null,
        payment_method: tx.paymentMethod,
        notes: tx.notes || null,
        created_at: tx.createdAt,
      };

      const { error } = await client.from('transactions').upsert(payload, { onConflict: 'id' });
      if (error) console.error('Cloud tx sync error:', error);
      return !error;
    } catch (err) {
      console.error('Failed to sync transaction to cloud:', err);
      return false;
    }
  }

  // Delete transaction from cloud table
  static async deleteCloudTransaction(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client.from('transactions').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.error('Failed to delete cloud transaction:', err);
      return false;
    }
  }

  // Fetch all cloud profiles
  static async fetchCloudProfiles(): Promise<UserProfile[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client.from('profiles').select('*');
      if (error || !data) return [];

      return data.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        avatarColor: row.avatar_color,
        currency: row.currency,
        pin: row.pin,
        monthlyBudget: Number(row.monthly_budget),
        categoryBudgets: row.category_budgets || [],
        customCategories: row.custom_categories || [],
        customSubCategories: row.custom_sub_categories || {},
        autoLockMinutes: row.auto_lock_minutes,
        isDarkMode: row.is_dark_mode,
        createdAt: Number(row.created_at),
      }));
    } catch (err) {
      console.error('Failed to fetch cloud profiles:', err);
      return [];
    }
  }

  // Fetch cloud transactions for user
  static async fetchCloudTransactions(userId: string): Promise<Transaction[]> {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (error || !data) return [];

      return data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        amount: Number(row.amount),
        type: row.type,
        categoryId: row.category_id,
        subCategory: row.sub_category || undefined,
        date: row.date,
        time: row.time || undefined,
        paymentMethod: row.payment_method,
        notes: row.notes || undefined,
        createdAt: Number(row.created_at),
      }));
    } catch (err) {
      console.error('Failed to fetch cloud transactions:', err);
      return [];
    }
  }
}
