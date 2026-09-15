-- 0006_customer_summary_include_registered.sql
-- Why: `customer_summary` (used by /admin/customers) was built only from
-- the `customers` table, which only gets a row once someone completes a
-- checkout (see 0001: "guest checkout — no auth account required"). So a
-- person who creates a login (auth.users) but never buys anything never
-- appeared in the admin Customers list at all.
--
-- This redefines the view as the old buyer rows UNION any registered
-- (auth.users) accounts that don't already have a customers/orders row,
-- shown with 0 orders / $0 spent so admins can see every signed-up account,
-- not just paying ones. Safe to run even if 0005 was already applied.
--
-- Also fixes a bug in 0005's buyer-rows query: `is_registered` used a
-- correlated subquery comparing against `c.email`, a raw table column from
-- inside a grouped query. Postgres checks column-level dependency, so even
-- wrapping it in lower() didn't satisfy it ("subquery uses ungrouped
-- column"). Fixed by aggregating first in a CTE, then computing
-- is_registered against the already-grouped `email` output column.

create or replace view customer_summary as
with buyer_agg as (
  select
    lower(c.email) as email,
    (array_agg(c.full_name order by c.created_at desc))[1] as full_name,
    (array_agg(c.phone order by c.created_at desc))[1] as phone,
    count(distinct o.id) as total_orders,
    coalesce(sum(o.total), 0) as total_spent,
    min(o.created_at) as first_order_at,
    max(o.created_at) as last_order_at
  from customers c
  join orders o on o.customer_id = c.id
  where is_admin()
  group by lower(c.email)
)
select
  email,
  full_name,
  phone,
  total_orders,
  total_spent,
  first_order_at,
  last_order_at,
  exists(select 1 from auth.users u where lower(u.email) = buyer_agg.email) as is_registered
from buyer_agg

union all

-- Registered accounts with no order/customer row yet.
select
  lower(u.email) as email,
  u.raw_user_meta_data ->> 'full_name' as full_name,
  null as phone,
  0 as total_orders,
  0 as total_spent,
  null::timestamptz as first_order_at,
  null::timestamptz as last_order_at,
  true as is_registered
from auth.users u
where is_admin()
  and not exists (
    select 1 from customers c3 where lower(c3.email) = lower(u.email)
  );

grant select on customer_summary to authenticated;
