import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Plus, 
  PieChart as PieIcon, 
  Activity, 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import type { UserProfile } from '../types';
import { AuthService } from '../services/authService';
import { ExpenseService } from '../services/expenseService';

interface DashboardProps {
  profile: UserProfile;
  onOpenAddExpense: () => void;
  onNavigateTab: (tab: 'transactions' | 'budget' | 'analytics') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onOpenAddExpense, onNavigateTab }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const stats = ExpenseService.getMonthlySummary(selectedMonth);
  const categoryBreakdown = ExpenseService.getCategoryBreakdown(selectedMonth);
  const recentTransactions = ExpenseService.filter({ monthYear: selectedMonth }).slice(0, 5);
  const allCategories = AuthService.getCategories(profile);

  const sym = profile.currency.symbol;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personal Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {getGreeting()}, <span className="text-indigo-400">{profile.name}</span> 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Here is your spending breakdown and monthly budget pace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value={new Date().toISOString().slice(0, 7)}>Current Month</option>
            <option value="all">🌐 All Time Overview</option>
          </select>
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-2xl text-xs text-slate-300 font-medium">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Budget & Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Budget Progress Hero */}
        <div className="md:col-span-2 glass-card p-6 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Monthly Budget Tracker
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-100">
                  {sym}{stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs sm:text-sm text-slate-400">
                  / {sym}{profile.monthlyBudget.toLocaleString('en-US')} limit
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                stats.budgetPercentage > 100
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : stats.budgetPercentage > 85
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {stats.budgetPercentage > 100 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Over Budget
                </>
              ) : stats.budgetPercentage > 85 ? (
                <>
                  <Activity className="w-3.5 h-3.5" /> High Spend
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> On Track
                </>
              )}
            </div>
          </div>

          {/* Progress Bar Visualizer */}
          <div className="space-y-2 my-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>{stats.budgetPercentage}% used</span>
              <span>
                {sym}{stats.remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining
              </span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-slate-950/80 p-0.5 border border-slate-800">
              <div
                style={{ width: `${Math.min(100, stats.budgetPercentage)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.budgetPercentage > 100
                    ? 'bg-gradient-to-r from-rose-600 to-red-500 glow-rose'
                    : stats.budgetPercentage > 85
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 glow-emerald'
                }`}
              />
            </div>
          </div>

          {/* Bottom Quick Row */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block">Daily Spend Rate</span>
              <span className="text-sm font-bold text-slate-200">
                {sym}{stats.dailyAverage.toFixed(2)} / day
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Days Left in Month</span>
              <span className="text-sm font-bold text-indigo-400">{stats.daysRemainingInMonth} days</span>
            </div>
          </div>
        </div>

        {/* Income vs Expense Card */}
        <div className="glass-card p-6 sm:p-7 rounded-3xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Cashflow</span>
            
            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Income</span>
                    <span className="text-sm font-bold text-emerald-400">
                      +{sym}{stats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total Expenses</span>
                    <span className="text-sm font-bold text-rose-400">
                      -{sym}{stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenAddExpense}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Quick Expense
          </button>
        </div>
      </div>

      {/* Middle Section: Spending Breakdown & Top Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Category Spending Donut Chart */}
        <div className="md:col-span-2 glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100">Category Spending Breakdown</h3>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              Full Analytics <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {categoryBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="total"
                      nameKey="name"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.category.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${sym}${Number(val || 0).toFixed(2)}`, 'Spent']}
                      contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {categoryBreakdown.slice(0, 5).map((item) => (
                  <div
                    key={item.category.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.category.color }}
                      />
                      <span className="text-slate-200 font-medium">{item.category.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-100 font-bold block">
                        {sym}{item.total.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No expenses recorded for this month yet.
            </div>
          )}
        </div>

        {/* Top Spending Highlight Card */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Highest Category Spend
            </span>

            {stats.topCategory ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: stats.topCategory.category.bgColor,
                    color: stats.topCategory.category.color,
                  }}
                >
                  🏷️
                </div>
                <h4 className="text-sm font-bold text-slate-100">{stats.topCategory.category.name}</h4>
                <div className="text-xl font-extrabold text-indigo-400 mt-1">
                  {sym}{stats.topCategory.total.toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Accounts for {Math.round((stats.topCategory.total / (stats.totalSpent || 1)) * 100)}% of month total
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">No spending recorded yet.</div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('budget')}
            className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs mt-4 transition cursor-pointer"
          >
            Manage Category Budgets
          </button>
        </div>
      </div>

      {/* Bottom Section: Recent Transactions */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100">Recent Activity</h3>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            View All ({ExpenseService.getAll().length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="space-y-2.5">
            {recentTransactions.map((tx) => {
              const cat = allCategories.find((c) => c.id === tx.categoryId) || allCategories[allCategories.length - 1];
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 hover:border-indigo-500/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: cat?.bgColor || 'rgba(99, 102, 241, 0.15)', color: cat?.color || '#6366f1' }}
                    >
                      {tx.type === 'income' ? '💰' : '💳'}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100">{tx.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span>{cat?.name || 'General'}</span>
                        {tx.subCategory && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-400 font-medium">📍 {tx.subCategory}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs sm:text-sm font-extrabold ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{sym}{tx.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{tx.paymentMethod}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No recent transactions found for this month.
          </div>
        )}
      </div>
    </div>
  );
};
