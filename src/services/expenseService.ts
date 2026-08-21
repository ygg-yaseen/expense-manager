import { StorageService } from './storage';
import { AuthService } from './authService';
import { SupabaseService } from './supabaseClient';
import type { Transaction, SummaryStats, CategoryDef, CategoryId, RecurringExpense } from '../types';

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

    if (params.monthYear && params.monthYear !== 'all') {
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

  // ------------------------------------------------------------------
  // RECURRING EXPENSES & EMI COMMITMENTS
  // ------------------------------------------------------------------
  static getRecurringExpenses(): RecurringExpense[] {
    return StorageService.getRecurringExpenses();
  }

  static addRecurringExpense(data: Omit<RecurringExpense, 'id' | 'createdAt'>): RecurringExpense {
    const list = StorageService.getRecurringExpenses();
    const profile = AuthService.getProfile();
    const userId = profile ? profile.id : 'usr-default';

    const newRec: RecurringExpense = {
      ...data,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: Date.now(),
    };

    list.unshift(newRec);
    StorageService.saveRecurringExpenses(list);
    return newRec;
  }

  static updateRecurringExpense(id: string, updates: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>): boolean {
    const list = StorageService.getRecurringExpenses();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return false;

    list[index] = { ...list[index], ...updates };
    StorageService.saveRecurringExpenses(list);
    return true;
  }

  static deleteRecurringExpense(id: string): boolean {
    const list = StorageService.getRecurringExpenses();
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length === list.length) return false;

    StorageService.saveRecurringExpenses(filtered);
    return true;
  }

  // 1-Click Post a Recurring EMI / Subscription into actual transactions
  static postRecurringExpense(id: string, customDate?: string): Transaction | null {
    const list = StorageService.getRecurringExpenses();
    const rec = list.find(r => r.id === id);
    if (!rec) return null;

    const currentMonthStr = (customDate || new Date().toISOString()).slice(0, 7);
    const postDate = customDate || `${currentMonthStr}-${String(rec.dueDateDay).padStart(2, '0')}`;

    // Add actual transaction entry
    const newTx = this.addTransaction({
      title: rec.title,
      amount: rec.amount,
      type: 'expense',
      categoryId: rec.categoryId,
      subCategory: rec.subCategory,
      date: postDate,
      time: '09:00',
      paymentMethod: rec.paymentMethod,
      notes: rec.notes ? `[Recurring EMI/Bill] ${rec.notes}` : '[Recurring EMI/Bill]',
    });

    // Mark last processed month
    rec.lastProcessedMonth = currentMonthStr;
    StorageService.saveRecurringExpenses(list);

    return newTx;
  }

  // Get active recurring commitments due for the current month that haven't been posted yet
  static getDueRecurringExpenses(currentMonthStr?: string): RecurringExpense[] {
    const monthStr = currentMonthStr || new Date().toISOString().slice(0, 7);
    const all = this.getRecurringExpenses();

    return all.filter(r => r.isActive && r.lastProcessedMonth !== monthStr);
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
    // Include all categories (including archived & custom) for resolution
    const allCats = AuthService.getCategories(profile, true);
    const targetMonthYear = monthYear || new Date().toISOString().slice(0, 7);
    const txs = this.filter({ monthYear: targetMonthYear, type: 'expense' });

    const totalExpense = txs.reduce((sum, t) => sum + t.amount, 0);
    const map: Record<string, { total: number; count: number }> = {};

    txs.forEach(t => {
      const catId = t.categoryId || 'other';
      if (!map[catId]) {
        map[catId] = { total: 0, count: 0 };
      }
      map[catId].total += t.amount;
      map[catId].count += 1;
    });

    return Object.entries(map)
      .map(([catId, data]) => {
        const found = allCats.find(c => c.id === catId);
        const category: CategoryDef = found || {
          id: catId,
          name: catId === 'other' ? 'Other & General' : (catId.charAt(0).toUpperCase() + catId.slice(1)),
          color: '#6366f1',
          bgColor: 'rgba(99, 102, 241, 0.15)',
        };

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
