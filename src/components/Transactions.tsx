import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  ReceiptText,
  FileSpreadsheet,
  MapPin,
  FileText
} from 'lucide-react';
import type { Transaction, UserProfile } from '../types';
import { AuthService } from '../services/authService';
import { ExpenseService } from '../services/expenseService';
import { StorageService } from '../services/storage';
import { StatementImportModal } from './StatementImportModal';

interface TransactionsProps {
  profile: UserProfile;
  onOpenAddExpense: () => void;
  onEditExpense: (tx: Transaction) => void;
  onRefreshData: () => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  profile,
  onOpenAddExpense,
  onEditExpense,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const sym = profile.currency.symbol;
  const categories = AuthService.getCategories(profile);

  let allTxs = ExpenseService.filter({
    monthYear: selectedMonth || undefined,
  });

  const uniqueSubCategories = Array.from(
    new Set(allTxs.map((t) => t.subCategory).filter(Boolean) as string[])
  );

  let transactions = ExpenseService.filter({
    searchTerm,
    categoryId: selectedCategory as any,
    type: selectedType,
    monthYear: selectedMonth || undefined,
  });

  if (selectedSubCategory !== 'all') {
    transactions = transactions.filter((t) => t.subCategory === selectedSubCategory);
  }

  transactions = [...transactions].sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    if (sortBy === 'amount_asc') return a.amount - b.amount;
    return 0;
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      ExpenseService.deleteTransaction(id);
      onRefreshData();
    }
  };

  const handleExportCSV = () => {
    const csvData = StorageService.exportTransactionsCSV();
    if (!csvData) {
      alert('No transaction data to export');
      return;
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expense_manager_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-indigo-400" /> Transactions Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter by main or sub-category, import PDF statements, edit, or export your complete transaction history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 text-xs font-bold transition cursor-pointer"
            title="Import Credit Card PDF Statement"
          >
            <FileText className="w-4 h-4 text-indigo-400" /> Import Card PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search title, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Main Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sub-Category / Trip Tag Filter */}
          <select
            value={selectedSubCategory}
            onChange={(e) => setSelectedSubCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Sub-Categories / Tags</option>
            {uniqueSubCategories.map((sub) => (
              <option key={sub} value={sub}>
                📍 {sub}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | 'expense' | 'income')}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Expenses & Income</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
          </select>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 border-t border-slate-800/60 pt-3">
          <span>
            Showing <strong className="text-slate-200">{transactions.length}</strong> transactions
          </span>
          {(searchTerm || selectedCategory !== 'all' || selectedSubCategory !== 'all' || selectedType !== 'all' || selectedMonth) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedSubCategory('all');
                setSelectedType('all');
                setSelectedMonth('');
              }}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl">
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId) || categories[categories.length - 1];
              return (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/70 hover:border-indigo-500/40 transition group"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-inner"
                      style={{ backgroundColor: cat?.bgColor || 'rgba(99, 102, 241, 0.15)', color: cat?.color || '#6366f1' }}
                    >
                      {tx.type === 'income' ? '💰' : '💳'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{tx.title}</h4>
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: cat?.bgColor || 'rgba(99, 102, 241, 0.15)', color: cat?.color || '#6366f1' }}
                        >
                          {cat?.name || 'General'}
                        </span>

                        {tx.subCategory && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {tx.subCategory}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" /> {tx.date} {tx.time ? `@ ${tx.time}` : ''}
                        </span>
                        <span>•</span>
                        <span>{tx.paymentMethod}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 italic max-w-[200px] truncate">{tx.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-slate-800/60 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span
                        className={`text-base font-extrabold block ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{sym}{tx.amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => onEditExpense(tx)}
                        title="Edit Transaction"
                        className="p-2 rounded-xl hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id, tx.title)}
                        title="Delete Transaction"
                        className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <ReceiptText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Transactions Found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Try adjusting your search query or filters, import a credit card PDF statement, or add a new transaction.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold border border-slate-700 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Import Card PDF
              </button>
              <button
                onClick={onOpenAddExpense}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Transaction
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Credit Card PDF Statement Importer Modal */}
      <StatementImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onRefreshData={onRefreshData}
        profile={profile}
      />
    </div>
  );
};
