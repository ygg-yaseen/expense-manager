-- ========================================================
-- ExpenseFlow - Supabase Cloud Database Setup Schema
-- Run this script in your Supabase SQL Editor (supabase.com)
-- ========================================================

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  avatar_color TEXT DEFAULT '#6366f1',
  currency JSONB NOT NULL,
  pin TEXT NOT NULL,
  monthly_budget NUMERIC DEFAULT 3000,
  category_budgets JSONB DEFAULT '[]'::jsonb,
  custom_categories JSONB DEFAULT '[]'::jsonb,
  custom_sub_categories JSONB DEFAULT '{}'::jsonb,
  auto_lock_minutes INTEGER DEFAULT 0,
  is_dark_mode BOOLEAN DEFAULT true,
  created_at BIGINT NOT NULL
);

-- 2. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category_id TEXT NOT NULL,
  sub_category TEXT,
  date TEXT NOT NULL,
  time TEXT,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_at BIGINT NOT NULL
);

-- 3. Create Recurring Expenses Table (EMIs, Subscriptions, Rent)
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category_id TEXT NOT NULL,
  sub_category TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  due_date_day INTEGER NOT NULL DEFAULT 1,
  start_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  last_processed_month TEXT,
  created_at BIGINT NOT NULL
);

-- Enable Row Level Security (RLS) or public access for custom PIN auth app
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Allow public policies for read/write based on user_id matching app session
CREATE POLICY "Allow anon read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow anon insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete profiles" ON public.profiles FOR DELETE USING (true);

CREATE POLICY "Allow anon read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow anon insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete transactions" ON public.transactions FOR DELETE USING (true);

CREATE POLICY "Allow anon read recurring" ON public.recurring_expenses FOR SELECT USING (true);
CREATE POLICY "Allow anon insert recurring" ON public.recurring_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update recurring" ON public.recurring_expenses FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete recurring" ON public.recurring_expenses FOR DELETE USING (true);
