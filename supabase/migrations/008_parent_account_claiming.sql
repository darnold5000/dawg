-- Optional account claiming after guest package purchase.
-- Credits attach to parent records immediately; portal access requires email verification.

alter table public.dawg_parents
  add column if not exists account_claimed_at timestamptz,
  add column if not exists account_invite_sent_at timestamptz;

comment on column public.dawg_parents.account_claimed_at is
  'Set when the family completes registration (intake). Unclaimed parents may still hold package credits.';
comment on column public.dawg_parents.account_invite_sent_at is
  'Last time a claim-account email was sent for this parent.';

alter table public.dawg_family_login_tokens
  add column if not exists purpose text not null default 'login'
    check (purpose in ('login', 'claim'));

comment on column public.dawg_family_login_tokens.purpose is
  'login = sign-in link; claim = post-purchase account claim reminder.';

-- Backfill claimed status for parents who already completed intake
update public.dawg_parents p
set account_claimed_at = coalesce(p.account_claimed_at, i.first_intake_at)
from (
  select parent_id, min(created_at) as first_intake_at
  from public.dawg_intake_submissions
  group by parent_id
) i
where p.id = i.parent_id
  and p.account_claimed_at is null;

alter table public.dawg_package_purchases
  add column if not exists post_purchase_email_sent_at timestamptz;

comment on column public.dawg_package_purchases.post_purchase_email_sent_at is
  'When the claim or purchase-confirmation email was sent after Stripe payment.';
