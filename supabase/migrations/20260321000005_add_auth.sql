-- supabase/migrations/20260321000005_add_auth.sql

-- 1. Clear seed categories — they have no user_id and will block the NOT NULL constraint.
--    The per-user trigger (step 7) re-seeds categories automatically on signup.
truncate table categories cascade;

-- 2. Add user_id to all user-owned tables
alter table accounts         add column user_id uuid not null references auth.users(id) on delete cascade;
alter table categories       add column user_id uuid not null references auth.users(id) on delete cascade;
alter table transactions     add column user_id uuid not null references auth.users(id) on delete cascade;
alter table budgets          add column user_id uuid not null references auth.users(id) on delete cascade;
alter table imports          add column user_id uuid not null references auth.users(id) on delete cascade;
alter table ai_conversations add column user_id uuid not null references auth.users(id) on delete cascade;
-- ai_messages: no user_id needed, ownership cascades through ai_conversations

-- 3. Fix uniqueness constraints to be per-user
drop index categories_name_root_unique;
drop index categories_name_parent_unique;
create unique index categories_name_root_unique   on categories(user_id, name)             where parent_id is null;
create unique index categories_name_parent_unique on categories(user_id, name, parent_id)  where parent_id is not null;

alter table accounts drop constraint accounts_name_unique;
alter table accounts add constraint accounts_name_unique unique (user_id, name);

-- Budgets: update active-budget uniqueness to be per-user
drop index budgets_active_unique;
create unique index budgets_active_unique on budgets(user_id, category_id, period) where active = true;

-- 4. Rebuild account_balances view to expose user_id (needed for Python service filtering)
-- Must drop first — CREATE OR REPLACE cannot reorder or insert columns into an existing view.
drop view if exists account_balances;
create view account_balances as
select
  a.id,
  a.name,
  a.type,
  a.currency,
  a.user_id,
  coalesce(sum(
    case
      when t.type = 'income'   and t.account_id    = a.id then  t.amount
      when t.type = 'transfer' and t.to_account_id = a.id then  t.amount
      when t.type = 'expense'  and t.account_id    = a.id then -t.amount
      when t.type = 'transfer' and t.account_id    = a.id then -t.amount
      else 0
    end
  ), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id or t.to_account_id = a.id
group by a.id, a.name, a.type, a.currency, a.user_id;

-- 5. Enable RLS on all tables
alter table accounts          enable row level security;
alter table categories        enable row level security;
alter table transactions      enable row level security;
alter table budgets           enable row level security;
alter table imports           enable row level security;
alter table ai_conversations  enable row level security;
alter table ai_messages       enable row level security;

-- 6. RLS policies for tables with direct user_id
create policy "users_own_data" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. RLS policy for ai_messages (ownership via parent conversation)
create policy "users_own_messages" on ai_messages
  for all
  using (
    exists (
      select 1 from ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- 8. Per-user category seed trigger
create or replace function seed_default_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into public.categories (user_id, name, type, color, icon) values
    (NEW.id, 'Food & Dining',  'expense', '#EF4444', '🍔'),
    (NEW.id, 'Transport',      'expense', '#F97316', '🚌'),
    (NEW.id, 'Housing',        'expense', '#8B5CF6', '🏠'),
    (NEW.id, 'Utilities',      'expense', '#06B6D4', '💡'),
    (NEW.id, 'Healthcare',     'expense', '#EC4899', '🏥'),
    (NEW.id, 'Entertainment',  'expense', '#F59E0B', '🎬'),
    (NEW.id, 'Shopping',       'expense', '#10B981', '🛍️'),
    (NEW.id, 'Education',      'expense', '#3B82F6', '📚'),
    (NEW.id, 'Personal Care',  'expense', '#A78BFA', '💅'),
    (NEW.id, 'Savings',        'expense', '#14B8A6', '🏦'),
    (NEW.id, 'Salary',         'income',  '#22C55E', '💼'),
    (NEW.id, 'Freelance',      'income',  '#84CC16', '💻'),
    (NEW.id, 'Investments',    'income',  '#0EA5E9', '📈'),
    (NEW.id, 'Other Income',   'income',  '#6366F1', '💰'),
    (NEW.id, 'Uncategorized',  'expense', '#9CA3AF', '📦');
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure seed_default_categories();
