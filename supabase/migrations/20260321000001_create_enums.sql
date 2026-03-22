-- supabase/migrations/20260321000001_create_enums.sql
create type account_type as enum ('checking', 'savings', 'credit', 'cash');
create type category_type as enum ('income', 'expense');
create type transaction_type as enum ('income', 'expense', 'transfer');
create type budget_period as enum ('monthly', 'weekly', 'yearly');
create type import_format as enum ('csv', 'ofx');
create type import_status as enum ('pending', 'done', 'failed');
create type message_role as enum ('user', 'assistant');
