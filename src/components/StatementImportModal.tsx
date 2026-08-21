import React, { useState, useRef } from 'react';
import { 
  X, 
  FileText, 
  Upload, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  CheckSquare, 
  Square,
  ShieldCheck,
  Plus,
  CreditCard
} from 'lucide-react';
import type { UserProfile, PaymentMethod } from '../types';
import { AuthService } from '../services/authService';
import { ExpenseService } from '../services/expenseService';
import { StatementParserService, type ExtractedStatementTx } from '../services/statementParser';

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  profile: UserProfile;
}

export const StatementImportModal: React.FC<StatementImportModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  profile,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Payment Method Selection & Custom Creation State
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState<string>('Credit Card');
  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState<boolean>(false);
  const [newPaymentMethodName, setNewPaymentMethodName] = useState<string>('');

  // Extracted Results State
  const [bankName, setBankName] = useState<string>('');
  const [extractedTxs, setExtractedTxs] = useState<ExtractedStatementTx[]>([]);
  const [step, setStep] = useState<'upload' | 'password' | 'review'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = AuthService.getCategories(profile).filter((c) => !c.isIncome);
  const paymentMethods = AuthService.getPaymentMethods(profile);
  const sym = profile.currency.symbol;

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please select a valid PDF credit card statement file (.pdf)');
      return;
    }

    setFile(selectedFile);
    setErrorMsg('');
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        setIsAnalyzing(false);
        setErrorMsg('Failed to read file content');
        return;
      }

      // Convert to persistent Uint8Array byte copy
      const bytes = new Uint8Array(buffer.slice(0));
      setFileBytes(bytes);
      await analyzePDF(bytes, '');
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const analyzePDF = async (bytes: Uint8Array, pass: string) => {
    setIsAnalyzing(true);
    setErrorMsg('');

    // Pass a fresh byte slice to guarantee PDF.js worker can never detach state bytes
    const freshBytes = new Uint8Array(bytes.length);
    freshBytes.set(bytes);

    const res = await StatementParserService.parsePDF(freshBytes, pass);
    setIsAnalyzing(false);

    if (res.isPasswordProtected) {
      setStep('password');
      if (pass) {
        setErrorMsg('Incorrect password. Please try again.');
      }
      return;
    }

    if (!res.success || res.transactions.length === 0) {
      setErrorMsg(res.error || 'No transaction rows could be extracted from this PDF statement.');
      setStep('upload');
      return;
    }

    // Success -> Move to Review Step
    const detectedIssuer = res.bankName || 'Credit Card Statement';
    setBankName(detectedIssuer);

    // Default payment method preset to detected card or global selection
    const defaultPm = paymentMethods.includes(detectedIssuer) ? detectedIssuer : globalPaymentMethod;
    setGlobalPaymentMethod(defaultPm);

    // Preset payment method on extracted items
    setExtractedTxs(res.transactions.map((t) => ({ ...t, paymentMethod: defaultPm as PaymentMethod })));
    setStep('review');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !fileBytes) return;
    analyzePDF(fileBytes, password.trim());
  };

  const handleGlobalPaymentMethodChange = (pm: string) => {
    if (pm === '__add_new_pm__') {
      setShowAddPaymentMethodModal(true);
      return;
    }
    setGlobalPaymentMethod(pm);
    // Apply to all items
    setExtractedTxs((prev) => prev.map((t) => ({ ...t, paymentMethod: pm as PaymentMethod })));
  };

  const handleCreateCustomPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentMethodName.trim()) return;

    const trimmed = newPaymentMethodName.trim();
    AuthService.addPaymentMethod(trimmed);
    setGlobalPaymentMethod(trimmed);
    setExtractedTxs((prev) => prev.map((t) => ({ ...t, paymentMethod: trimmed as PaymentMethod })));

    setNewPaymentMethodName('');
    setShowAddPaymentMethodModal(false);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setExtractedTxs((prev) => prev.map((t) => ({ ...t, selected: checked })));
  };

  const handleToggleTx = (id: string) => {
    setExtractedTxs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleCategoryChange = (id: string, categoryId: string) => {
    setExtractedTxs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, categoryId } : t))
    );
  };

  const handleTxPaymentMethodChange = (id: string, paymentMethod: PaymentMethod) => {
    if ((paymentMethod as string) === '__add_new_pm__') {
      setShowAddPaymentMethodModal(true);
      return;
    }
    setExtractedTxs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, paymentMethod } : t))
    );
  };

  const handleImportSelected = () => {
    const selected = extractedTxs.filter((t) => t.selected);
    if (selected.length === 0) {
      alert('Please select at least one transaction to import');
      return;
    }

    // Batch insert into ExpenseService
    selected.forEach((t) => {
      ExpenseService.addTransaction({
        title: t.title,
        amount: t.amount,
        type: t.type,
        categoryId: t.type === 'income' ? 'income' : t.categoryId,
        subCategory: t.subCategory,
        date: t.date,
        time: '12:00',
        paymentMethod: t.paymentMethod,
        notes: t.notes,
      });
    });

    onRefreshData();
    onClose();
    alert(`Successfully imported ${selected.length} transactions into your ledger!`);
  };

  const selectedCount = extractedTxs.filter((t) => t.selected).length;
  const selectedTotal = extractedTxs
    .filter((t) => t.selected && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-4xl shadow-2xl relative my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart PDF Statement Importer</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" /> Credit Card PDF Statement Analyzer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* STEP 1: UPLOAD PDF FILE */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-3xl p-8 sm:p-12 text-center space-y-4 cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelect(selected);
                }}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 group-hover:scale-110 transition">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-100">
                  {file ? file.name : 'Upload Credit Card Statement (PDF)'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supports HDFC, ICICI, SBI, Axis, AMEX, and all major bank PDF statements.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Supports Password Protected PDFs
              </div>
            </div>

            {isAnalyzing && (
              <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" /> Analyzing statement pages and extracting transaction rows...
              </div>
            )}
          </div>
        )}

        {/* STEP 2: ENTER PASSWORD FOR PROTECTED PDF */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-amber-500/30 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-slate-100">Password Protected Statement</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                This PDF is encrypted by your bank. Enter your statement password to unlock and analyze transactions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Statement Password
              </label>
              <input
                type="password"
                placeholder="e.g. Date of Birth or Name combination"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setPassword('');
                }}
                className="flex-1 py-3 rounded-2xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Choose Another File
              </button>
              <button
                type="submit"
                disabled={!password.trim() || isAnalyzing}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                {isAnalyzing ? (
                  'Decrypting...'
                ) : (
                  <>
                    <Unlock className="w-4 h-4" /> Unlock & Analyze
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: REVIEW & CONFIRM EXTRACTED TRANSACTIONS */}
        {step === 'review' && (
          <div className="space-y-5">
            {/* Statement Summary & Payment Method Control Card */}
            <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
                <div>
                  <span className="text-indigo-400 font-bold uppercase tracking-wider block text-[10px]">
                    Detected Issuer
                  </span>
                  <span className="text-sm font-extrabold text-slate-100">{bankName}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Found Items</span>
                    <span className="font-bold text-slate-200">{extractedTxs.length} transactions</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Selected Total</span>
                    <span className="font-extrabold text-indigo-300">
                      {sym}{selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector & Add New Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
                  <label className="text-xs font-bold text-slate-200">
                    Set Payment Method for Import:
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={globalPaymentMethod}
                    onChange={(e) => handleGlobalPaymentMethodChange(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm} value={pm}>
                        💳 {pm}
                      </option>
                    ))}
                    <option value="__add_new_pm__" className="text-indigo-400 font-bold">
                      + Add New Payment Method...
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowAddPaymentMethodModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Card
                  </button>
                </div>
              </div>
            </div>

            {/* Select All Bar */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-400 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => handleToggleSelectAll(selectedCount !== extractedTxs.length)}
                className="flex items-center gap-2 hover:text-slate-200 font-semibold cursor-pointer"
              >
                {selectedCount === extractedTxs.length ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
                <span>
                  Select All ({selectedCount} / {extractedTxs.length})
                </span>
              </button>

              <span>Customize category & payment method per row</span>
            </div>

            {/* Extracted Transactions List Table */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {extractedTxs.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    tx.selected
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-slate-950/30 border-slate-900 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTx(tx.id)}
                      className="cursor-pointer text-indigo-400"
                    >
                      {tx.selected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    <div>
                      <h5 className="text-xs font-bold text-slate-100 max-w-[200px] sm:max-w-xs truncate">
                        {tx.title}
                      </h5>
                      <span className="text-[10px] text-slate-400">{tx.date}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                    {/* Category Selector */}
                    {tx.type === 'expense' && (
                      <select
                        value={tx.categoryId}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-200 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Payment Method Selector */}
                    <select
                      value={tx.paymentMethod}
                      onChange={(e) => handleTxPaymentMethodChange(tx.id, e.target.value as PaymentMethod)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-200 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm} value={pm}>
                          💳 {pm}
                        </option>
                      ))}
                      <option value="__add_new_pm__" className="text-indigo-400 font-bold">
                        + Add Custom Card...
                      </option>
                    </select>

                    <span
                      className={`text-xs font-extrabold shrink-0 ml-1 ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}{sym}{tx.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Import Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                }}
                className="flex-1 py-3 rounded-2xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Back / Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedCount === 0}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <CheckCircle2 className="w-4 h-4" /> Import {selectedCount} Transactions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Payment Method Modal */}
      {showAddPaymentMethodModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomPaymentMethod}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
          >
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Add Custom Payment Method
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Payment Method / Card Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Infinia, AMEX Gold, GPay"
                value={newPaymentMethodName}
                onChange={(e) => setNewPaymentMethodName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPaymentMethodModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPaymentMethodName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                Add Method
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
