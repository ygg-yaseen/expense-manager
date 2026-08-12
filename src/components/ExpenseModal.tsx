import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Plus, Tag } from 'lucide-react';
import type { Transaction, UserProfile, PaymentMethod } from '../types';
import { AuthService } from '../services/authService';
import { CalendarPicker } from './CalendarPicker';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  editingTransaction?: Transaction | null;
  profile: UserProfile;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI/Mobile Wallet',
  'Bank Transfer',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  profile,
}) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('travel');
  const [subCategory, setSubCategory] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Modals
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  const [showAddSubCatModal, setShowAddSubCatModal] = useState<boolean>(false);
  const [newSubCatName, setNewSubCatName] = useState<string>('');

  // Custom Calendar Modal toggle
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  const categories = AuthService.getCategories(profile).filter((c) =>
    type === 'income' ? c.isIncome : !c.isIncome
  );
  const subCategories = AuthService.getSubCategories(categoryId, profile);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmount(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setSubCategory(editingTransaction.subCategory || '');
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNotes(editingTransaction.notes || '');
    } else {
      setType('expense');
      setTitle('');
      setAmount('');
      setCategoryId('travel');
      setSubCategory('');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('Credit Card');
      setNotes('');
    }
    setError('');
  }, [editingTransaction, isOpen]);

  const handleCategoryChange = (newCatId: string) => {
    if (newCatId === '__add_new__') {
      setShowAddCatModal(true);
      return;
    }
    setCategoryId(newCatId);
    const availableSubs = AuthService.getSubCategories(newCatId, profile);
    setSubCategory(availableSubs.length > 0 ? availableSubs[0] : '');
  };

  const handleSubCategoryChange = (newSub: string) => {
    if (newSub === '__add_new_sub__') {
      setShowAddSubCatModal(true);
      return;
    }
    setSubCategory(newSub);
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const created = AuthService.addCategory({
      name: newCatName.trim(),
      isIncome: type === 'income',
    });

    if (created) {
      setCategoryId(created.id);
      setNewCatName('');
      setShowAddCatModal(false);
    }
  };

  const handleCreateCustomSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatName.trim()) return;

    AuthService.addSubCategory(categoryId, newSubCatName.trim());
    setSubCategory(newSubCatName.trim());
    setNewSubCatName('');
    setShowAddSubCatModal(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!title.trim()) {
      setError('Please enter a description');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    onSave({
      title: title.trim(),
      amount: parsedAmount,
      type,
      categoryId: type === 'income' ? 'income' : categoryId,
      subCategory: subCategory.trim() || undefined,
      date,
      paymentMethod,
      notes: notes.trim(),
    });

    onClose();
  };

  const sym = profile.currency.symbol;

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const todayStr = new Date().toISOString().slice(0, 10);
    const isToday = dateStr === todayStr;

    const formatted = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return isToday ? `${formatted} (Today)` : formatted;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative my-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-100">
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Simple & clean expense entry</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Switcher: Expense / Income */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  if (categoryId === 'income') setCategoryId('travel');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategoryId('income');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💰 Income
              </button>
            </div>

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount ({sym})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-xl font-bold text-indigo-400">{sym}</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-2xl font-bold focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="Room booking, Flight, Fuel..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Category Selectable Dropdown */}
            {type === 'expense' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__add_new__" className="text-indigo-400 font-bold">
                    + Add New Category...
                  </option>
                </select>
              </div>
            )}

            {/* Tags Selectable Dropdown */}
            {type === 'expense' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tags
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="">None / Select Tag</option>
                  {subCategories.map((sub) => (
                    <option key={sub} value={sub}>
                      📍 {sub}
                    </option>
                  ))}
                  <option value="__add_new_sub__" className="text-indigo-400 font-bold">
                    + Add New Tag (e.g. Ooty-Aug)...
                  </option>
                </select>
              </div>
            )}

            {/* Date Button (Opens Custom Dark Theme Calendar Popup) & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium hover:border-indigo-500/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>{formatDateDisplay(date)}</span>
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes or details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Transaction
              </button>
            </div>
          </form>
        </div>

        {/* Add New Custom Category Modal */}
        {showAddCatModal && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateCustomCategory}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
            >
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Add New Category
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Subscriptions, Pet Care, Fitness"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add New Custom Tag / Sub-Category Modal */}
        {showAddSubCatModal && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateCustomSubCategory}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
            >
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" /> Add New Tag
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ooty-Aug, Goa 2026, Work Trip"
                  value={newSubCatName}
                  onChange={(e) => setNewSubCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubCatModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSubCatName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Custom Dark Theme Calendar Picker Popup Modal */}
      {showCalendarModal && (
        <CalendarPicker
          selectedDate={date}
          onSelectDate={(newSelectedDate) => setDate(newSelectedDate)}
          onClose={() => setShowCalendarModal(false)}
        />
      )}
    </>
  );
};
