import { StorageService } from './storage';
import type { UserProfile, CategoryDef } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_PRESET_SUB_CATEGORIES, SUPPORTED_CURRENCIES } from '../types';

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

  // Get active categories list (Default + Custom user categories with name/color overrides)
  static getCategories(userProfile?: UserProfile | null, includeArchived = false): CategoryDef[] {
    const profile = userProfile || this.getProfile();
    const custom = profile?.customCategories || [];
    const archivedIds = new Set(profile?.archivedCategoryIds || []);
    const overrides = profile?.categoryOverrides || {};

    const rawList = [...DEFAULT_CATEGORIES, ...custom];
    
    // Apply name & color overrides if edited by user
    const list = rawList.map((cat) => {
      const override = overrides[cat.id];
      if (override) {
        return {
          ...cat,
          name: override.name || cat.name,
          color: override.color || cat.color,
          bgColor: override.bgColor || cat.bgColor,
        };
      }
      return cat;
    });

    if (includeArchived) return list;

    return list.filter((c) => !c.isArchived && !archivedIds.has(c.id));
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

  // Edit Category Name & Color
  static editCategory(categoryId: string, updates: { name: string; color?: string }): boolean {
    const profile = this.getProfile();
    if (!profile) return false;

    const trimmedName = updates.name.trim();
    if (!trimmedName) return false;

    const custom = profile.customCategories || [];
    const isCustom = custom.some((c) => c.id === categoryId);

    if (isCustom) {
      // Update custom category directly
      const updatedCustom = custom.map((c) => {
        if (c.id === categoryId) {
          return {
            ...c,
            name: trimmedName,
            color: updates.color || c.color,
          };
        }
        return c;
      });
      this.updateProfile({ customCategories: updatedCustom });
    } else {
      // Update default category via user overrides
      const overrides = { ...(profile.categoryOverrides || {}) };
      overrides[categoryId] = {
        name: trimmedName,
        color: updates.color,
      };
      this.updateProfile({ categoryOverrides: overrides });
    }

    return true;
  }

  // Delete or Archive a Category
  static deleteCategory(categoryId: string): boolean {
    const profile = this.getProfile();
    if (!profile) return false;

    const custom = profile.customCategories || [];
    const isCustom = custom.some((c) => c.id === categoryId);

    if (isCustom) {
      // Remove custom category directly
      const updatedCustom = custom.filter((c) => c.id !== categoryId);
      this.updateProfile({ customCategories: updatedCustom });
    } else {
      // Archive default category
      const archivedIds = Array.from(new Set([...(profile.archivedCategoryIds || []), categoryId]));
      this.updateProfile({ archivedCategoryIds: archivedIds });
    }

    return true;
  }

  // Restore an archived Category
  static restoreCategory(categoryId: string): boolean {
    const profile = this.getProfile();
    if (!profile) return false;

    const archivedIds = (profile.archivedCategoryIds || []).filter((id) => id !== categoryId);
    this.updateProfile({ archivedCategoryIds: archivedIds });
    return true;
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

  // Delete a Sub-Category / Tag
  static deleteSubCategory(categoryId: string, subCategoryName: string): string[] {
    const profile = this.getProfile();
    if (!profile) return [];

    const customSubMap = { ...(profile.customSubCategories || {}) };
    const currentList = customSubMap[categoryId] || [];

    customSubMap[categoryId] = currentList.filter((item) => item !== subCategoryName);
    this.updateProfile({ customSubCategories: customSubMap });

    return this.getSubCategories(categoryId);
  }

  // Verify PIN for current profile or specified user profile
  static verifyPin(inputPin: string, userId?: string): boolean {
    const profiles = this.getAllProfiles();
    const profile = userId ? profiles.find((p) => p.id === userId) : this.getProfile();
    if (!profile) return false;
    return profile.pin === inputPin;
  }

  // Create initial profile
  static createProfile(params: {
    name: string;
    pin: string;
    currencyCode: string;
    monthlyBudget: number;
    avatarColor?: string;
    includeDemoData?: boolean;
  }): UserProfile {
    const currency = SUPPORTED_CURRENCIES.find((c) => c.code === params.currencyCode) || SUPPORTED_CURRENCIES[0];
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: params.name.trim(),
      pin: params.pin,
      currency,
      monthlyBudget: params.monthlyBudget,
      avatarColor: params.avatarColor || '#6366f1',
      categoryBudgets: [],
      customCategories: [],
      customSubCategories: {},
      archivedCategoryIds: [],
      categoryOverrides: {},
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
