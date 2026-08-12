import React, { useState } from 'react';
import { 
  PieChart as PieIcon, 
  BarChart2, 
  TrendingUp, 
  CreditCard, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import type { UserProfile } from '../types';
import { ExpenseService } from '../services/expenseService';

interface AnalyticsProps {
  profile: UserProfile;
}

export const Analytics: React.FC<AnalyticsProps> = ({ profile }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const sym = profile.currency.symbol;
  const breakdown = ExpenseService.getCategoryBreakdown(selectedMonth);
  const trendData = ExpenseService.getMonthlyTrendData(6);
  const summary = ExpenseService.getMonthlySummary(selectedMonth);

  const netSavings = summary.totalIncome - summary.totalSpent;
  const savingsRate = summary.totalIncome > 0 ? Math.round((netSavings / summary.totalIncome) * 100) : 0;

  // Payment method breakdown
  const txs = ExpenseService.filter({ monthYear: selectedMonth, type: 'expense' });
  const paymentMap: Record<string, number> = {};
  txs.forEach((t) => {
    paymentMap[t.paymentMethod] = (paymentMap[t.paymentMethod] || 0) + t.amount;
  });

  const paymentData = Object.entries(paymentMap).map(([method, total]) => ({
    method,
    total,
  }));

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Financial Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-400" /> Spending Analytics & Trends
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gain deep insights into your cash flow, category distribution, and historical patterns.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-2xl text-xs text-slate-300 font-medium">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-slate-100 focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-3xl space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Net Cash Savings</span>
          <div className="text-2xl font-extrabold text-slate-100">
            {netSavings >= 0 ? '+' : ''}{sym}{netSavings.toFixed(2)}
          </div>
          <span className={`text-[11px] font-bold ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {savingsRate}% Savings Rate
          </span>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Average Daily Expense</span>
          <div className="text-2xl font-extrabold text-indigo-400">
            {sym}{summary.dailyAverage.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">Over {30 - summary.daysRemainingInMonth} days logged</span>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Top Spend Category</span>
          <div className="text-xl font-bold text-slate-100 truncate">
            {summary.topCategory ? summary.topCategory.category.name : 'N/A'}
          </div>
          <span className="text-[11px] text-amber-400 font-medium">
            {summary.topCategory ? `${sym}${summary.topCategory.total.toFixed(2)}` : 'No data'}
          </span>
        </div>
      </div>

      {/* 6-Month Income vs Expense Trend Bar Chart */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" /> 6-Month Income vs Expense Trend
          </h3>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="monthLabel" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(val: any) => [`${sym}${Number(val || 0).toFixed(2)}`]}
                contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown & Payment Method Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Category Pie Chart */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-400" /> Category Breakdown
          </h3>

          {breakdown.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="total"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.category.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${sym}${Number(val || 0).toFixed(2)}`]}
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">No expense data for this month.</div>
          )}
        </div>

        {/* Payment Method Distribution */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" /> Payment Methods
          </h3>

          {paymentData.length > 0 ? (
            <div className="space-y-3 pt-2">
              {paymentData.map((item) => {
                const totalExp = summary.totalSpent || 1;
                const percentage = Math.round((item.total / totalExp) * 100);

                return (
                  <div key={item.method} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-200">
                      <span>{item.method}</span>
                      <span>{sym}{item.total.toFixed(2)} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">No payment data recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
};
