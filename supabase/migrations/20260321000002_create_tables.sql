-- supabase/migrations/20260321000002_create_tables.sql

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type account_type not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type category_type not null,
  color text,
  icon text,
  parent_id uuid references categories(id)
);

-- Enforce max one level of nesting
create or replace function check_category_depth()
returns trigger language plpgsql as $$
begin
  if new.parent_id is not null then
    -- Parent must not already be a child itself
    if exists (select 1 from categories where id = new.parent_id and parent_id is not null) then
      raise exception 'Category nesting is limited to one level';
    end if;
    -- This category must not already have children
    if exists (select 1 from categories where parent_id = new.id) then
      raise exception 'Cannot make a parent category (one that has children) into a subcategory';
    end if;
  end if;
  return new;
end;
$$;
create trigger enforce_category_depth
  before insert or update on categories
  for each row execute function check_category_depth();

create table imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  format import_format not null,
  imported_at timestamptz not null default now(),
  row_count int,
  status import_status not null default 'pending',
  error_message text
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  type transaction_type not null,
  account_id uuid not null references accounts(id),
  to_account_id uuid references accounts(id),
  category_id uuid references categories(id),
  import_id uuid references imports(id),
  notes text,
  created_at timestamptz not null default now(),
  constraint transfer_needs_destination check (
    (type = 'transfer' and to_account_id is not null) or
    (type != 'transfer' and to_account_id is null)
  ),
  constraint transfer_no_category check (
    (type = 'transfer' and category_id is null) or
    type != 'transfer'
  )
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  amount numeric(12,2) not null check (amount > 0),
  period budget_period not null,
  anchor_date date not null,
  active boolean not null default true
);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Disable RLS on all tables (single-user app)
alter table accounts disable row level security;
alter table categories disable row level security;
alter table transactions disable row level security;
alter table budgets disable row level security;
alter table imports disable row level security;
alter table ai_conversations disable row level security;
alter table ai_messages disable row level security;

-- Indexes for common query patterns
create index idx_transactions_account_id on transactions(account_id);
create index idx_transactions_to_account_id on transactions(to_account_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_category_id on transactions(category_id);
create index idx_transactions_import_id on transactions(import_id);
create index idx_ai_messages_conversation_id on ai_messages(conversation_id);
create index idx_budgets_category_id on budgets(category_id);

-- Uniqueness constraints
alter table accounts add constraint accounts_name_unique unique (name);

-- Categories: unique name per level (null parent = root level, non-null = subcategory level)
create unique index categories_name_root_unique on categories(name) where parent_id is null;
create unique index categories_name_parent_unique on categories(name, parent_id) where parent_id is not null;

-- Only one active budget per category per period
create unique index budgets_active_unique on budgets(category_id, period) where active = true;

-- Non-negative row count
alter table imports add constraint imports_row_count_positive check (row_count >= 0);
