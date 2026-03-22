-- Drop everything — run this before re-applying all migrations from scratch
-- Safe to run multiple times (all statements use IF EXISTS)

-- Views
drop view if exists account_balances cascade;

-- Triggers
drop trigger if exists enforce_category_depth on categories;
drop trigger if exists on_auth_user_created on auth.users;

-- Functions
drop function if exists check_category_depth() cascade;
drop function if exists seed_default_categories() cascade;

-- Tables (in dependency order)
drop table if exists ai_messages cascade;
drop table if exists ai_conversations cascade;
drop table if exists transactions cascade;
drop table if exists budgets cascade;
drop table if exists imports cascade;
drop table if exists categories cascade;
drop table if exists accounts cascade;

-- Enums
drop type if exists account_type cascade;
drop type if exists category_type cascade;
drop type if exists transaction_type cascade;
drop type if exists budget_period cascade;
drop type if exists import_format cascade;
drop type if exists import_status cascade;
drop type if exists message_role cascade;
