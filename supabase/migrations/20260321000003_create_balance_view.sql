-- supabase/migrations/20260321000003_create_balance_view.sql
-- Balance convention: asset accounts (checking/savings/cash) show positive balance = amount you have.
-- Credit accounts show negative balance when you owe money (expenses reduce credit balance).
-- This way, net worth = SUM(all account balances) is always correct.
create or replace view account_balances as
select
  a.id,
  a.name,
  a.type,
  a.currency,
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
group by a.id, a.name, a.type, a.currency;
