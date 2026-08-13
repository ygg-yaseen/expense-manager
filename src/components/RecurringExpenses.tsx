import React, { useState } from 'react';
import { 
  Repeat, 
  Plus, 
  Calendar, 
  CreditCard, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  X,
  Save,
  Check
} from 'lucide-react';
import type { RecurringExpense, UserProfile, RecurrenceFrequency, PaymentMethod } from '../types';
import { AuthService } from '../services/authService';
import { ExpenseService } from '../services/expenseService';

interface RecurringExpensesProps {
  profile: UserProfile;
  onRefreshData: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI/Mobile Wallet',
  'Bank Transfer',
];

const FREQUENCIES: Array<{ id: RecurrenceFrequency; label: string }> = [
  { id: 'monthly', label: 'Monthly (e.g. EMIs, Rent, Subscriptions)' },
  { id: 'quarterly', label: 'Quarterly (e.g. Insurance, Maintenance)' },
  { id: 'yearly', label: 'Yearly (e.g. Domain, Annual Dues)' },
  { id: 'weekly', label: 'Weekly' },
];

export const RecurringExpenses: React.FC<RecurringExpensesProps> = ({
  profile,
  onRefreshData,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('housing');
  const [subCategory, setSubCategory] = useState<string>('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [dueDateDay, setDueDateDay] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const sym = profile.currency.symbol;
  const categories = AuthService.getCategories(profile).filter((c) => !c.isIncome);
  const recurringList = ExpenseService.getRecurringExpenses();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // Calculate stats
  const activeCommitments = recurringList.filter((r) => r.isActive);
  const totalMonthlyCommitment = activeCommitments.reduce((sum, r) => {
    if (r.frequency === 'monthly') return sum + r.amount;
    if (r.frequency === 'quarterly') return sum + r.amount / 3;
    if (r.frequency === 'yearly') return sum + r.amount / 12;
    if (r.frequency === 'weekly') return sum + r.amount * 4;
    return sum + r.amount;
  }, 0);

  const dueForCurrentMonth = activeCommitments.filter((r) => r.lastProcessedMonth !== currentMonthStr);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCategoryId('housing');
    setSubCategory('');
    setFrequency('monthly');
    setDueDateDay(5);
    setPaymentMethod('Bank Transfer');
    setNotes('');
    setError('');
    setShowModal(true);
  };

  const handleEditClick = (rec: RecurringExpense) => {
    setEditingId(rec.id);
    setTitle(rec.title);
    setAmount(String(rec.amount));
    setCategoryId(rec.categoryId);
    setSubCategory(rec.subCategory || '');
    setFrequency(rec.frequency);
    setDueDateDay(rec.dueDateDay);
    setPaymentMethod(rec.paymentMethod);
    setNotes(rec.notes || '');
    setError('');
    setShowModal(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!title.trim()) {
      setError('Please enter a description (e.g. Car EMI, House Rent)');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    if (editingId) {
      ExpenseService.updateRecurringExpense(editingId, {
        title: title.trim(),
        amount: parsedAmount,
        categoryId,
        subCategory: subCategory.trim() || undefined,
        frequency,
        dueDateDay,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      setNotificationMsg(`Updated "${title.trim()}" recurring expense`);
    } else {
      ExpenseService.addRecurringExpense({
        title: title.trim(),
        amount: parsedAmount,
        categoryId,
        subCategory: subCategory.trim() || undefined,
        frequency,
        dueDateDay,
        startDate: new Date().toISOString().slice(0, 10),
        paymentMethod,
        notes: notes.trim() || undefined,
        isActive: true,
      });
      setNotificationMsg(`Added new recurring commitment: "${title.trim()}"`);
    }

    setShowModal(false);
    onRefreshData();
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handlePostNow = (rec: RecurringExpense) => {
    const posted = ExpenseService.postRecurringExpense(rec.id);
    if (posted) {
      setNotificationMsg(`Posted ${sym}${rec.amount} for "${rec.title}" into transactions ledger!`);
      onRefreshData();
      setTimeout(() => setNotificationMsg(null), 3500);
    }
  };

  const handleDelete = (id: string, titleStr: string) => {
    if (window.confirm(`Are you sure you want to delete recurring expense "${titleStr}"?`)) {
      ExpenseService.deleteRecurringExpense(id);
      onRefreshData();
    }
  };

  const handleToggleActive = (rec: RecurringExpense) => {
    ExpenseService.updateRecurringExpense(rec.id, { isActive: !rec.isActive });
    onRefreshData();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fixed Monthly Commitments</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-indigo-400" /> Recurring EMIs & Subscriptions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage fixed monthly EMIs, house rent, subscriptions, and SIPs with 1-click ledger posting.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Recurring EMI / Bill
        </button>
      </div>

      {notificationMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {notificationMsg}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-3xl space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Monthly Fixed Commitment
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            {sym}{totalMonthlyCommitment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block">
            Across {activeCommitments.length} active recurring items
          </span>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Due for Current Month
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
            {dueForCurrentMonth.length} <span className="text-sm font-semibold text-slate-400">items pending</span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            {sym}
            {dueForCurrentMonth.reduce((sum, r) => sum + r.amount, 0).toLocaleString('en-US')}{' '}
            pending ledger entry
          </span>
        </div>

        <div className="glass-card p-5 rounded-3xl space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Paid / Posted this Month
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {activeCommitments.length - dueForCurrentMonth.length} / {activeCommitments.length}
          </div>
          <span className="text-[11px] text-slate-400 block">Logged into transaction ledger</span>
        </div>
      </div>

      {/* Due Soon Notification Alert Box */}
      {dueForCurrentMonth.length > 0 && (
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
            <Clock className="w-4 h-4" /> Pending EMIs & Bills for this month ({dueForCurrentMonth.length})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueForCurrentMonth.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{rec.title}</h4>
                  <span className="text-xs font-extrabold text-indigo-400 block">
                    {sym}{rec.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Due on Day {rec.dueDateDay} of month
                  </span>
                </div>

                <button
                  onClick={() => handlePostNow(rec)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                >
                  Post Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring Commitments List */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" /> Active EMIs & Recurring Bills ({recurringList.length})
          </h3>
          <button
            onClick={handleOpenAddModal}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New EMI
          </button>
        </div>

        {recurringList.length > 0 ? (
          <div className="space-y-3">
            {recurringList.map((rec) => {
              const cat = categories.find((c) => c.id === rec.categoryId) || categories[categories.length - 1];
              const isPostedThisMonth = rec.lastProcessedMonth === currentMonthStr;

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    rec.isActive
                      ? 'bg-slate-950/70 border-slate-800/80 hover:border-indigo-500/40'
                      : 'bg-slate-950/30 border-slate-800/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-inner"
                      style={{ backgroundColor: cat?.bgColor || 'rgba(99, 102, 241, 0.15)', color: cat?.color || '#6366f1' }}
                    >
                      🔁
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{rec.title}</h4>
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: cat?.bgColor || 'rgba(99, 102, 241, 0.15)', color: cat?.color || '#6366f1' }}
                        >
                          {cat?.name || 'General'}
                        </span>
                        {rec.subCategory && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                            📍 {rec.subCategory}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" /> Due on Day {rec.dueDateDay} of month
                        </span>
                        <span>•</span>
                        <span className="capitalize">{rec.frequency}</span>
                        <span>•</span>
                        <span>{rec.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-slate-800/60 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-base font-extrabold text-slate-100 block">
                        {sym}{rec.amount.toFixed(2)}
                      </span>
                      {isPostedThisMonth ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 inline-flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3" /> Paid this month
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePostNow(rec)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold cursor-pointer mt-0.5 transition"
                        >
                          Post Now
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(rec)}
                        title={rec.isActive ? 'Pause Commitment' : 'Activate Commitment'}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          rec.isActive
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        }`}
                      >
                        {rec.isActive ? 'Active' : 'Paused'}
                      </button>
                      <button
                        onClick={() => handleEditClick(rec)}
                        className="p-2 rounded-xl hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id, rec.title)}
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
            <Repeat className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No Recurring EMIs or Bills Setup</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add your monthly car loan EMI, house rent, Netflix subscription, or SIPs to track fixed commitments easily.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Recurring EMI Now
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Recurring Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-100">
                  {editingId ? 'Edit Recurring EMI' : 'Add Recurring EMI / Bill'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Fixed monthly commitments & subscriptions</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              {/* Description / Item Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Commitment Description
                </label>
                <input
                  type="text"
                  placeholder="Car Loan EMI, House Rent, Netflix, Insurance..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              {/* Amount */}
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
                  />
                </div>
              </div>

              {/* Main Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency & Due Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Due Day of Month
                  </label>
                  <select
                    value={dueDateDay}
                    onChange={(e) => setDueDateDay(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d} of month
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Notes / Account Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Loan #10293, Auto-debit on 5th"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
