-- supabase/migrations/20260321000004_seed_categories.sql

insert into categories (name, type, color, icon) values
  ('Salary', 'income', '#22c55e', '💼'),
  ('Freelance', 'income', '#84cc16', '💻'),
  ('Other Income', 'income', '#10b981', '📈'),
  ('Housing', 'expense', '#f97316', '🏠'),
  ('Food & Dining', 'expense', '#ef4444', '🍔'),
  ('Transport', 'expense', '#3b82f6', '🚗'),
  ('Healthcare', 'expense', '#ec4899', '🏥'),
  ('Entertainment', 'expense', '#8b5cf6', '🎬'),
  ('Shopping', 'expense', '#f59e0b', '🛍️'),
  ('Utilities', 'expense', '#6b7280', '💡'),
  ('Education', 'expense', '#14b8a6', '📚'),
  ('Travel', 'expense', '#0ea5e9', '✈️'),
  ('Other Expense', 'expense', '#94a3b8', '📋')
on conflict do nothing;
