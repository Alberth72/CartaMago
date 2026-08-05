alter table public.orders
add column if not exists payment_method text not null default 'cash',
add column if not exists payment_provider text not null default 'manual';

alter table public.orders
drop constraint if exists orders_payment_method_check;

alter table public.orders
add constraint orders_payment_method_check
check (payment_method in (
  'cash',
  'card_at_counter',
  'card_at_table',
  'bank_transfer',
  'wompi',
  'didi_food'
));

alter table public.orders
drop constraint if exists orders_payment_provider_check;

alter table public.orders
add constraint orders_payment_provider_check
check (payment_provider in ('manual', 'wompi', 'didi_food'));

alter table public.orders
drop constraint if exists orders_payment_method_fulfillment_check;

alter table public.orders
add constraint orders_payment_method_fulfillment_check
check (
  (fulfillment_mode = 'pickup' and payment_method in ('cash', 'card_at_counter', 'bank_transfer', 'wompi'))
  or (fulfillment_mode in ('delivery', 'local_delivery') and payment_method in ('cash', 'bank_transfer', 'wompi'))
  or (fulfillment_mode = 'table' and payment_method in ('cash', 'card_at_table', 'bank_transfer', 'wompi'))
  or (fulfillment_mode = 'didi_food' and payment_method = 'didi_food')
);
