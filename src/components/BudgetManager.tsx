import React, { useState } from 'react';
import { Wallet, Save, CheckCircle2, Sliders, Sparkles } from 'lucide-react';
import type { UserProfile, CategoryId } from '../types';
import { CATEGORIES } from '../types';
import { AuthService } from '../services/authService';
import { ExpenseService } from '../services/expenseService';

interface BudgetManagerProps {
  profile: UserProfile;
  onUpdateProfile: () => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ profile, onUpdateProfile }) => {
  const [monthlyBudget, setMonthlyBudget] = useState<string>(String(profile.monthlyBudget));
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (profile.categoryBudgets || []).forEach((cb) => {
      initial[cb.categoryId] = String(cb.limit);
    });
    return initial;
  });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const sym = profile.currency.symbol;
  const currentMonthYear = new Date().toISOString().slice(0, 7);
  const stats = ExpenseService.getMonthlySummary(currentMonthYear);
  const breakdown = ExpenseService.getCategoryBreakdown(currentMonthYear);

  const handleSaveMonthlyBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(monthlyBudget);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid monthly budget limit');
      return;
    }

    const updatedCategoryBudgets = Object.entries(categoryBudgets)
      .map(([catId, limitStr]) => ({
        categoryId: catId as CategoryId,
        limit: parseFloat(limitStr) || 0,
      }))
      .filter((cb) => cb.limit > 0);

    AuthService.updateProfile({
      monthlyBudget: val,
      categoryBudgets: updatedCategoryBudgets,
    });

    onUpdateProfile();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Budget Control Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-400" /> Monthly Budget & Category Limits
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Set your target spending limits to stay on top of your financial health.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4" /> Budget Settings Saved!
          </div>
        )}
      </div>

      <form onSubmit={handleSaveMonthlyBudget} className="space-y-6">
        {/* Main Monthly Budget Settings Card */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Overall Monthly Budget</h3>
              <p className="text-xs text-slate-400">Total maximum amount you plan to spend per month</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Current Status</span>
              <span className="text-sm font-bold text-indigo-400">
                {stats.budgetPercentage}% Used
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Monthly Target ({sym})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-xl font-bold text-indigo-400">{sym}</span>
                <input
                  type="number"
                  step="50"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-2xl font-bold focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Spent this Month:</span>
                <span className="font-bold text-slate-100">{sym}{stats.totalSpent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Allowance:</span>
                <span className="font-bold text-emerald-400">{sym}{stats.remainingBudget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Suggested Daily Limit:</span>
                <span className="font-bold text-indigo-400">
                  {sym}{(stats.remainingBudget / Math.max(1, stats.daysRemainingInMonth)).toFixed(2)} / day
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Budget Limits Allocation */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" /> Category-Specific Limits
              </h3>
              <p className="text-xs text-slate-400">
                Optionally set individual budget caps for specific categories.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.filter((c) => !c.isIncome).map((cat) => {
              const catSpentItem = breakdown.find((b) => b.category.id === cat.id);
              const catSpent = catSpentItem ? catSpentItem.total : 0;
              const catLimitStr = categoryBudgets[cat.id] || '';
              const catLimit = parseFloat(catLimitStr) || 0;
              const percent = catLimit > 0 ? Math.min(100, Math.round((catSpent / catLimit) * 100)) : 0;

              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: cat.bgColor, color: cat.color }}
                      >
                        🏷️
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{cat.name}</h4>
                        <span className="text-[10px] text-slate-400">
                          Spent: {sym}{catSpent.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-500">{sym}</span>
                        <input
                          type="number"
                          placeholder="No limit"
                          value={catLimitStr}
                          onChange={(e) =>
                            setCategoryBudgets((prev) => ({ ...prev, [cat.id]: e.target.value }))
                          }
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for category if limit is set */}
                  {catLimit > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{percent}% of limit</span>
                        <span>{sym}{(catLimit - catSpent).toFixed(2)} left</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full transition-all duration-300 ${
                            percent > 90
                              ? 'bg-rose-500'
                              : percent > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Budget Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
