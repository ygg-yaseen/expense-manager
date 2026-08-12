import { StorageService } from './storage';
import type { UserProfile, CategoryDef } from '../types';
import { SUPPORTED_CURRENCIES, DEFAULT_CATEGORIES, DEFAULT_PRESET_SUB_CATEGORIES } from '../types';

export class AuthService {
  static hasProfile(): boolean {
    return StorageService.getProfile() !== null;
  }

  static getProfile(): UserProfile | null {
    return StorageService.getProfile();
  }

  static getAllProfiles(): UserProfile[] {
    return StorageService.getAllProfiles();
  }

  static switchProfile(userId: string): void {
    StorageService.setActiveUserId(userId);
  }

  // Get active categories list (Default + Custom user categories)
  static getCategories(userProfile?: UserProfile | null): CategoryDef[] {
    const profile = userProfile || this.getProfile();
    const custom = profile?.customCategories || [];
    return [...DEFAULT_CATEGORIES, ...custom];
  }

  // Get sub-categories for a given category ID (Default + Custom user sub-categories)
  static getSubCategories(categoryId: string, userProfile?: UserProfile | null): string[] {
    const profile = userProfile || this.getProfile();
    const defaultSubs = DEFAULT_PRESET_SUB_CATEGORIES[categoryId] || [];
    const customSubs = profile?.customSubCategories?.[categoryId] || [];
    
    // Combine & remove duplicates
    return Array.from(new Set([...defaultSubs, ...customSubs]));
  }

  // Add a new custom Category to active user profile
  static addCategory(cat: { name: string; color?: string; isIncome?: boolean }): CategoryDef | null {
    const profile = this.getProfile();
    if (!profile) return null;

    const id = `cat_custom_${Date.now()}`;
    const newCategory: CategoryDef = {
      id,
      name: cat.name.trim(),
      color: cat.color || '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.15)',
      isIncome: cat.isIncome || false,
      isCustom: true,
    };

    const updatedCustom = [...(profile.customCategories || []), newCategory];
    this.updateProfile({ customCategories: updatedCustom });
    return newCategory;
  }

  // Add a new custom Sub-Category to active user profile
  static addSubCategory(categoryId: string, subCategoryName: string): string[] {
    const profile = this.getProfile();
    if (!profile) return [];

    const trimmed = subCategoryName.trim();
    if (!trimmed) return this.getSubCategories(categoryId, profile);

    const customSubMap = { ...(profile.customSubCategories || {}) };
    const currentList = customSubMap[categoryId] || [];

    if (!currentList.includes(trimmed)) {
      customSubMap[categoryId] = [...currentList, trimmed];
      this.updateProfile({ customSubCategories: customSubMap });
    }

    return this.getSubCategories(categoryId);
  }

  // Verify PIN for current profile or specified user profile
  static verifyPin(inputPin: string, userId?: string): boolean {
    const profiles = this.getAllProfiles();
    const target = userId ? profiles.find((p) => p.id === userId) : this.getProfile();
    if (!target) return false;
    return target.pin === inputPin;
  }

  // Create new user profile (Multi-user)
  static createProfile(params: {
    name: string;
    pin: string;
    currencyCode: string;
    monthlyBudget: number;
    avatarColor?: string;
    includeDemoData?: boolean;
  }): UserProfile {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === params.currencyCode) || SUPPORTED_CURRENCIES[0];
    
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: params.name.trim(),
      pin: params.pin,
      currency,
      monthlyBudget: params.monthlyBudget,
      avatarColor: params.avatarColor || '#6366f1',
      categoryBudgets: [],
      customCategories: [],
      customSubCategories: {},
      autoLockMinutes: 0,
      isDarkMode: true,
      createdAt: Date.now(),
    };

    StorageService.saveProfile(newProfile);
    StorageService.setAppLocked(false);

    if (params.includeDemoData) {
      StorageService.loadDemoData(newProfile.id);
    }

    return newProfile;
  }

  // Update current profile
  static updateProfile(updates: Partial<UserProfile>): UserProfile | null {
    const current = this.getProfile();
    if (!current) return null;

    const updated = { ...current, ...updates };
    StorageService.saveProfile(updated);
    return updated;
  }

  // Delete profile
  static deleteProfile(userId: string): void {
    StorageService.deleteProfile(userId);
  }

  // Change 4-digit PIN for current profile
  static changePin(oldPin: string, newPin: string): { success: boolean; error?: string } {
    if (!this.verifyPin(oldPin)) {
      return { success: false, error: 'Current PIN is incorrect' };
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'PIN must be exactly 4 digits' };
    }

    this.updateProfile({ pin: newPin });
    return { success: true };
  }

  // Master reset PIN for active profile
  static resetPin(newPin: string): boolean {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) return false;
    this.updateProfile({ pin: newPin });
    return true;
  }

  // App Lock controls
  static lockApp(): void {
    StorageService.setAppLocked(true);
  }

  static unlockApp(): void {
    StorageService.setAppLocked(false);
  }

  static isLocked(): boolean {
    return StorageService.isAppLocked();
  }
}
