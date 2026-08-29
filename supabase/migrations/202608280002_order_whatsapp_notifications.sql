create table if not exists public.order_notifications (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  destination_phone text not null default '',
  template_name text,
  status text not null default 'skipped' check (status in ('skipped', 'sent', 'failed')),
  provider_message_id text,
  error_code text,
  error_message text,
  payload_json jsonb not null default '{}'::jsonb,
  response_json jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists order_notifications_order_idx
  on public.order_notifications (order_id, created_at desc);

create index if not exists order_notifications_branch_idx
  on public.order_notifications (branch_id, created_at desc);

alter table public.order_notifications enable row level security;

grant select on public.order_notifications to authenticated;
grant select, insert, update, delete on public.order_notifications to service_role;

drop policy if exists "members can read order notifications" on public.order_notifications;
create policy "members can read order notifications"
on public.order_notifications for select
to authenticated
using (public.can_operate_branch(branch_id));
