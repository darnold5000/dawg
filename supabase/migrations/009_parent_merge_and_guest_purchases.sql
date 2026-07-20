-- Guest purchases: parent is assigned from Stripe-verified email after payment.
-- Staff can merge duplicate parent records safely.

alter table public.dawg_package_purchases
  alter column parent_id drop not null;

alter table public.dawg_package_purchases
  drop constraint if exists dawg_package_purchases_paid_requires_parent;

alter table public.dawg_package_purchases
  add constraint dawg_package_purchases_paid_requires_parent
  check (status <> 'paid' or parent_id is not null);

comment on column public.dawg_package_purchases.parent_id is
  'Null while guest checkout is pending; set from Stripe-verified email when paid.';

-- Merge duplicate parent records into the canonical account.
create or replace function public.dawg_merge_parents(
  p_canonical_id uuid,
  p_duplicate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moved_athletes int := 0;
  v_moved_bookings int := 0;
  v_moved_purchases int := 0;
  v_moved_intakes int := 0;
  v_moved_devices int := 0;
begin
  if p_canonical_id = p_duplicate_id then
    raise exception 'MERGE_SAME_PARENT';
  end if;

  if not exists (select 1 from public.dawg_parents where id = p_canonical_id) then
    raise exception 'CANONICAL_PARENT_NOT_FOUND';
  end if;

  if not exists (select 1 from public.dawg_parents where id = p_duplicate_id) then
    raise exception 'DUPLICATE_PARENT_NOT_FOUND';
  end if;

  update public.dawg_athletes
  set parent_id = p_canonical_id, updated_at = now()
  where parent_id = p_duplicate_id;
  get diagnostics v_moved_athletes = row_count;

  update public.dawg_bookings
  set parent_id = p_canonical_id, updated_at = now()
  where parent_id = p_duplicate_id;
  get diagnostics v_moved_bookings = row_count;

  update public.dawg_package_purchases
  set parent_id = p_canonical_id, updated_at = now()
  where parent_id = p_duplicate_id;
  get diagnostics v_moved_purchases = row_count;

  update public.dawg_intake_submissions
  set parent_id = p_canonical_id, updated_at = now()
  where parent_id = p_duplicate_id;
  get diagnostics v_moved_intakes = row_count;

  update public.dawg_device_families
  set parent_id = p_canonical_id, updated_at = now()
  where parent_id = p_duplicate_id;
  get diagnostics v_moved_devices = row_count;

  update public.dawg_parents c
  set
    account_claimed_at = coalesce(c.account_claimed_at, d.account_claimed_at),
    account_invite_sent_at = case
      when c.account_invite_sent_at is null then d.account_invite_sent_at
      when d.account_invite_sent_at is null then c.account_invite_sent_at
      else greatest(c.account_invite_sent_at, d.account_invite_sent_at)
    end,
    phone = coalesce(nullif(trim(c.phone), ''), nullif(trim(d.phone), ''), c.phone),
    first_name = coalesce(nullif(trim(c.first_name), ''), d.first_name),
    last_name = coalesce(nullif(trim(c.last_name), ''), d.last_name),
    updated_at = now()
  from public.dawg_parents d
  where c.id = p_canonical_id
    and d.id = p_duplicate_id;

  delete from public.dawg_parents where id = p_duplicate_id;

  return jsonb_build_object(
    'canonical_id', p_canonical_id,
    'duplicate_id', p_duplicate_id,
    'moved_athletes', v_moved_athletes,
    'moved_bookings', v_moved_bookings,
    'moved_purchases', v_moved_purchases,
    'moved_intakes', v_moved_intakes,
    'moved_devices', v_moved_devices
  );
end;
$$;

comment on function public.dawg_merge_parents(uuid, uuid) is
  'Staff-only: move athletes, bookings, package purchases, intake, and device sessions to canonical parent, then delete duplicate.';
