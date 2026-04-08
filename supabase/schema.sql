-- ============================================================
-- LZX Pesca CRM — Supabase schema
-- Cole esse SQL no Supabase: Dashboard → SQL Editor → New query
-- Roda uma vez. Idempotente: pode rodar de novo sem quebrar.
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
do $$ begin
  create type lead_stage as enum ('novo','qualificado','orcamento','negociacao','fechado','perdido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_origin as enum ('Google','Instagram','Facebook','Indicação','WhatsApp','Cliente Recorrente','Desconhecido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_type as enum ('WhatsApp','Email','Ligação','Visita');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('novo','andamento','fechado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_category as enum ('Redes','Linhas','Tralhas','Cordas','Boias');
exception when duplicate_object then null; end $$;

-- ── TABELAS ──────────────────────────────────────────────────

create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  whatsapp            text,
  city                text,
  state               text,
  product             text,                       -- legacy single-product (mantido por compat)
  category            product_category,           -- legacy single-category
  estimated_qty       integer default 0,
  estimated_value     numeric(12,2) default 0,    -- legacy: total geral (order_total + shipping_value)
  order_total         numeric(12,2) default 0,    -- valor do pedido (sem frete)
  items               jsonb default '[]'::jsonb,  -- [{product, category, qty}]
  shipping_value      numeric(12,2) default 0,    -- frete
  origin              lead_origin,
  stage               lead_stage default 'novo',
  last_contact_at     timestamptz default now(),
  next_follow_up_at   timestamptz,
  recurring           boolean default false,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists public.interactions (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  type        contact_type not null,
  occurred_at timestamptz not null default now(),
  note        text,
  created_at  timestamptz default now()
);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads(id) on delete set null,
  client          text not null,
  product         text not null,
  category        product_category,
  state           text,
  value           numeric(12,2) not null default 0,
  status          order_status not null default 'novo',
  ordered_at      date not null default current_date,
  created_at      timestamptz default now()
);

-- ── ÍNDICES ──────────────────────────────────────────────────
create index if not exists leads_stage_idx       on public.leads (stage);
create index if not exists leads_state_idx       on public.leads (state);
create index if not exists leads_category_idx    on public.leads (category);
create index if not exists interactions_lead_idx on public.interactions (lead_id, occurred_at desc);
create index if not exists orders_status_idx     on public.orders (status);
create index if not exists orders_ordered_at_idx on public.orders (ordered_at desc);

-- ── TRIGGER updated_at ──────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
-- IMPORTANTE: como o dashboard é interno e usa a chave anon,
-- estamos liberando leitura/escrita para qualquer cliente que
-- tenha a anon key. Se um dia adicionar autenticação real,
-- substitua estas policies por checagem de auth.uid().

alter table public.leads        enable row level security;
alter table public.interactions enable row level security;
alter table public.orders       enable row level security;

-- Limpa policies antigas (caso re-rode o script)
drop policy if exists "lzx anon all leads"        on public.leads;
drop policy if exists "lzx anon all interactions" on public.interactions;
drop policy if exists "lzx anon all orders"       on public.orders;

create policy "lzx anon all leads"
  on public.leads for all
  to anon, authenticated
  using (true) with check (true);

create policy "lzx anon all interactions"
  on public.interactions for all
  to anon, authenticated
  using (true) with check (true);

create policy "lzx anon all orders"
  on public.orders for all
  to anon, authenticated
  using (true) with check (true);

-- (sem seed — banco começa vazio; cadastro feito pela equipe via dashboard)
