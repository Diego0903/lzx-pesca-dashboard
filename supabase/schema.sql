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
  create type lead_origin as enum ('Google','Instagram','Facebook','Indicação','WhatsApp');
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
  product             text,
  category            product_category,
  estimated_qty       integer default 0,
  estimated_value     numeric(12,2) default 0,
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

-- ── SEED inicial (opcional — comente se não quiser dados de exemplo) ──
insert into public.leads (name, whatsapp, city, state, product, category, estimated_qty, estimated_value, origin, stage, last_contact_at, next_follow_up_at, recurring)
values
  ('Marcos Albuquerque',     '(48) 99812-4501', 'Florianópolis','SC','Rede Multifilamento 70mm','Redes',  50, 12500, 'Google',     'novo',        now() - interval '2 days', now() + interval '1 day', false),
  ('Pesca Sul Distribuidora','(51) 99340-7822', 'Rio Grande',   'RS','Linha Mono 0.50mm',       'Linhas', 200, 28000, 'Indicação', 'qualificado', now() - interval '3 days', now() + interval '2 days', true),
  ('Atacadão da Pesca LTDA', '(11) 98765-4321', 'Santos',       'SP','Corda Náutica 12mm',      'Cordas',1000, 87000, 'Google',    'negociacao',  now() - interval '5 days', now() + interval '3 days', true),
  ('Estaleiro Sul',          '(48) 99776-1122', 'Itajaí',       'SC','Corda Amarração 16mm',    'Cordas', 500, 42500, 'Indicação', 'fechado',     now() - interval '8 days', null, true)
on conflict do nothing;
