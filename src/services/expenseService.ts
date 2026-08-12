import { StorageService } from './storage';
import { AuthService } from './authService';
import { SupabaseService } from './supabaseClient';
import type { Transaction, SummaryStats, CategoryDef, CategoryId } from '../types';
import { CATEGORIES } from '../types';

export class ExpenseService {
  static getAll(): Transaction[] {
    return StorageService.getTransactions().sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return dateB - dateA;
    });
  }

  static filter(params: {
    monthYear?: string;
    categoryId?: CategoryId | 'all';
    type?: 'all' | 'expense' | 'income';
    searchTerm?: string;
  }): Transaction[] {
    let list = this.getAll();

    if (params.monthYear) {
      list = list.filter(t => t.date.startsWith(params.monthYear!));
    }

    if (params.categoryId && params.categoryId !== 'all') {
      list = list.filter(t => t.categoryId === params.categoryId);
    }

    if (params.type && params.type !== 'all') {
      list = list.filter(t => t.type === params.type);
    }

    if (params.searchTerm) {
      const query = params.searchTerm.toLowerCase();
      list = list.filter(
        t => t.title.toLowerCase().includes(query) || (t.notes && t.notes.toLowerCase().includes(query))
      );
    }

    return list;
  }

  static addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const list = StorageService.getTransactions();
    const profile = AuthService.getProfile();
    const userId = profile ? profile.id : 'usr-default';

    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: Date.now(),
    };

    list.unshift(newTx);
    StorageService.saveTransactions(list);

    // Sync to Supabase Cloud Database if configured
    if (SupabaseService.isConfigured()) {
      SupabaseService.syncTransaction(newTx);
    }

    return newTx;
  }

  static updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): boolean {
    const list = StorageService.getTransactions();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return false;

    list[index] = { ...list[index], ...updates };
    StorageService.saveTransactions(list);

    // Sync updated tx to cloud
    if (SupabaseService.isConfigured()) {
      SupabaseService.syncTransaction(list[index]);
    }

    return true;
  }

  static deleteTransaction(id: string): boolean {
    const list = StorageService.getTransactions();
    const filtered = list.filter(t => t.id !== id);
    if (filtered.length === list.length) return false;

    StorageService.saveTransactions(filtered);

    // Delete from cloud
    if (SupabaseService.isConfigured()) {
      SupabaseService.deleteCloudTransaction(id);
    }

    return true;
  }

  static getMonthlySummary(monthYear?: string): SummaryStats {
    const profile = AuthService.getProfile();
    const monthlyBudget = profile ? profile.monthlyBudget : 0;

    const targetMonthYear = monthYear || new Date().toISOString().slice(0, 7);
    const txs = this.filter({ monthYear: targetMonthYear });

    const totalSpent = txs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = txs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingBudget = Math.max(0, monthlyBudget - totalSpent);
    const budgetPercentage = monthlyBudget > 0 ? Math.min(100, Math.round((totalSpent / monthlyBudget) * 100)) : 0;

    const now = new Date();
    const currentMonthYear = now.toISOString().slice(0, 7);
    const isCurrentMonth = targetMonthYear === currentMonthYear;

    const year = parseInt(targetMonthYear.slice(0, 4));
    const month = parseInt(targetMonthYear.slice(5, 7));
    const daysInMonth = new Date(year, month, 0).getDate();

    let elapsedDays = daysInMonth;
    let daysRemainingInMonth = 0;

    if (isCurrentMonth) {
      elapsedDays = Math.max(1, now.getDate());
      daysRemainingInMonth = Math.max(0, daysInMonth - elapsedDays);
    }

    const dailyAverage = Math.round((totalSpent / elapsedDays) * 100) / 100;

    const projectedTotal = dailyAverage * daysInMonth;
    let spendingPace: 'under' | 'moderate' | 'over' = 'under';
    if (projectedTotal > monthlyBudget * 1.1) {
      spendingPace = 'over';
    } else if (projectedTotal > monthlyBudget * 0.9) {
      spendingPace = 'moderate';
    }

    const categoryMap: Record<string, number> = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      categoryMap[t.categoryId] = (categoryMap[t.categoryId] || 0) + t.amount;
    });

    let topCategoryId: string | undefined;
    let maxCategorySpent = 0;

    Object.entries(categoryMap).forEach(([catId, amount]) => {
      if (amount > maxCategorySpent) {
        maxCategorySpent = amount;
        topCategoryId = catId;
      }
    });

    const allCats = AuthService.getCategories(profile);
    const topCategoryDef = topCategoryId ? allCats.find(c => c.id === topCategoryId) : undefined;
    const topCategory = topCategoryDef ? { category: topCategoryDef, total: maxCategorySpent } : undefined;

    return {
      totalSpent,
      totalIncome,
      remainingBudget,
      budgetPercentage,
      dailyAverage,
      daysRemainingInMonth,
      spendingPace,
      topCategory,
    };
  }

  static getCategoryBreakdown(monthYear?: string): Array<{
    category: CategoryDef;
    total: number;
    percentage: number;
    count: number;
  }> {
    const profile = AuthService.getProfile();
    const allCats = AuthService.getCategories(profile);
    const targetMonthYear = monthYear || new Date().toISOString().slice(0, 7);
    const txs = this.filter({ monthYear: targetMonthYear, type: 'expense' });

    const totalExpense = txs.reduce((sum, t) => sum + t.amount, 0);
    const map: Record<string, { total: number; count: number }> = {};

    txs.forEach(t => {
      if (!map[t.categoryId]) {
        map[t.categoryId] = { total: 0, count: 0 };
      }
      map[t.categoryId].total += t.amount;
      map[t.categoryId].count += 1;
    });

    return Object.entries(map)
      .map(([catId, data]) => {
        const category = allCats.find(c => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
        return {
          category,
          total: data.total,
          count: data.count,
          percentage: totalExpense > 0 ? Math.round((data.total / totalExpense) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  static getMonthlyTrendData(monthsCount: number = 6): Array<{
    monthYear: string;
    monthLabel: string;
    expense: number;
    income: number;
    budget: number;
  }> {
    const result = [];
    const profile = AuthService.getProfile();
    const monthlyBudget = profile ? profile.monthlyBudget : 0;
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const monthYear = `${year}-${monthStr}`;
      
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const txs = this.filter({ monthYear });
      const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

      result.push({
        monthYear,
        monthLabel,
        expense,
        income,
        budget: monthlyBudget,
      });
    }

    return result;
  }
}
