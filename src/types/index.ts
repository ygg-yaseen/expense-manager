export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (R$)' },
];

export type CategoryId = string;

export interface CategoryDef {
  id: CategoryId;
  name: string;
  iconName?: string;
  color: string;
  bgColor: string;
  isIncome?: boolean;
  isCustom?: boolean;
  isArchived?: boolean;
}

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: 'travel', name: 'Travel & Trips', iconName: 'Plane', color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.12)' },
  { id: 'food', name: 'Food & Dining', iconName: 'Utensils', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)' },
  { id: 'transport', name: 'Transport & Fuel', iconName: 'Car', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.12)' },
  { id: 'shopping', name: 'Shopping & Clothes', iconName: 'ShoppingBag', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.12)' },
  { id: 'housing', name: 'Rent & Housing', iconName: 'Home', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)' },
  { id: 'utilities', name: 'Bills & Utilities', iconName: 'Zap', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)' },
  { id: 'entertainment', name: 'Fun & Entertainment', iconName: 'Film', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.12)' },
  { id: 'health', name: 'Health & Medical', iconName: 'HeartPulse', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)' },
  { id: 'personal', name: 'Personal Care', iconName: 'Smile', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.12)' },
  { id: 'education', name: 'Education & Books', iconName: 'GraduationCap', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.12)' },
  { id: 'income', name: 'Income / Salary', iconName: 'TrendingUp', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.12)', isIncome: true },
  { id: 'other', name: 'General & Others', iconName: 'MoreHorizontal', color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.12)' },
];

export const CATEGORIES = DEFAULT_CATEGORIES;

export const DEFAULT_PRESET_SUB_CATEGORIES: Record<string, string[]> = {};
export const PRESET_SUB_CATEGORIES = DEFAULT_PRESET_SUB_CATEGORIES;

export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'UPI/Mobile Wallet' | 'Bank Transfer';

export interface Transaction {
  id: string;
  userId?: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: CategoryId;
  subCategory?: string; // User tag e.g. "Ooty-Aug"
  date: string; // YYYY-MM-DD
  time?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'yearly' | 'weekly';

export interface RecurringExpense {
  id: string;
  userId?: string;
  title: string; // e.g. "Car Loan EMI", "House Rent", "Netflix"
  amount: number;
  categoryId: CategoryId;
  subCategory?: string;
  frequency: RecurrenceFrequency;
  dueDateDay: number; // Day of month (1-31)
  startDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  isActive: boolean;
  lastProcessedMonth?: string; // YYYY-MM when it was last logged as transaction
  createdAt: number;
}

export interface CategoryBudget {
  categoryId: CategoryId;
  limit: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  currency: Currency;
  pin: string;
  monthlyBudget: number;
  categoryBudgets: CategoryBudget[];
  customCategories?: CategoryDef[];
  customSubCategories?: Record<string, string[]>;
  archivedCategoryIds?: string[];
  categoryOverrides?: Record<string, { name?: string; color?: string; bgColor?: string }>;
  autoLockMinutes: number;
  isDarkMode: boolean;
  createdAt: number;
}

export interface SummaryStats {
  totalSpent: number;
  totalIncome: number;
  remainingBudget: number;
  budgetPercentage: number;
  dailyAverage: number;
  daysRemainingInMonth: number;
  spendingPace: 'under' | 'moderate' | 'over';
  topCategory?: { category: CategoryDef; total: number };
}
