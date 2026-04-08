-- ============================================================
-- Migration 004 — Sistema de autenticação + perfis (usuarios)
-- Cole no Supabase: Dashboard → SQL Editor → New query
-- Idempotente: pode rodar de novo sem quebrar.
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
do $$ begin
  create type user_perfil as enum ('dono','admin','funcionario');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('pendente','ativo','inativo','rejeitado');
exception when duplicate_object then null; end $$;

-- ── TABELA USUARIOS ──────────────────────────────────────────
-- Estende auth.users do Supabase. id é o mesmo da auth.users.
create table if not exists public.usuarios (
  id                uuid primary key references auth.users(id) on delete cascade,
  nome              text not null,
  email             text not null unique,
  perfil            user_perfil not null default 'funcionario',
  status            user_status not null default 'pendente',
  cargo_informado   text,
  criado_em         timestamptz default now(),
  aprovado_em       timestamptz,
  aprovado_por      uuid references public.usuarios(id) on delete set null,
  desativado_em     timestamptz,
  rejeitado_em      timestamptz
);

create index if not exists usuarios_status_idx on public.usuarios (status);
create index if not exists usuarios_perfil_idx on public.usuarios (perfil);

-- ── TRIGGER: signUp cria linha em usuarios automaticamente ──
-- Quando um usuário se cadastra via Supabase Auth, criamos a linha
-- correspondente em public.usuarios com status='pendente'.
-- Os campos nome / cargo_informado vêm do raw_user_meta_data passado no signUp.
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.usuarios (id, nome, email, cargo_informado, status, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'cargo_informado',
    'pendente',
    'funcionario'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ── HELPERS RLS (funções de checagem de perfil) ─────────────
create or replace function public.is_dono() returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from public.usuarios
    where id = auth.uid() and perfil = 'dono' and status = 'ativo'
  );
$$;

create or replace function public.is_admin_or_dono() returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from public.usuarios
    where id = auth.uid() and perfil in ('dono','admin') and status = 'ativo'
  );
$$;

create or replace function public.is_active_user() returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from public.usuarios
    where id = auth.uid() and status = 'ativo'
  );
$$;

-- ── RLS em usuarios ─────────────────────────────────────────
alter table public.usuarios enable row level security;

drop policy if exists "user_self_select"      on public.usuarios;
drop policy if exists "dono_select_all"       on public.usuarios;
drop policy if exists "dono_update_all"       on public.usuarios;
drop policy if exists "dono_delete"           on public.usuarios;

-- Cada usuário pode ler a própria linha (pra saber perfil/status)
create policy "user_self_select"
  on public.usuarios for select
  to authenticated
  using (id = auth.uid());

-- Dono lê todos
create policy "dono_select_all"
  on public.usuarios for select
  to authenticated
  using (public.is_dono());

-- Apenas dono atualiza (status, perfil, etc.)
create policy "dono_update_all"
  on public.usuarios for update
  to authenticated
  using (public.is_dono())
  with check (public.is_dono());

-- Apenas dono deleta
create policy "dono_delete"
  on public.usuarios for delete
  to authenticated
  using (public.is_dono());

-- ── RLS nas tabelas existentes (leads/interactions/orders) ──
-- Substitui as policies "anon all" antigas pelas baseadas em perfil.
-- Funcionário pode INSERT em leads + interactions, mas não SELECT/UPDATE/DELETE.
-- Admin e Dono têm acesso total. Dono é o único que pode DELETE.

-- LEADS
drop policy if exists "lzx anon all leads"         on public.leads;
drop policy if exists "leads_select_admin"         on public.leads;
drop policy if exists "leads_insert_active"        on public.leads;
drop policy if exists "leads_update_admin"         on public.leads;
drop policy if exists "leads_delete_dono"          on public.leads;

create policy "leads_select_admin"
  on public.leads for select to authenticated
  using (public.is_admin_or_dono());

create policy "leads_insert_active"
  on public.leads for insert to authenticated
  with check (public.is_active_user());

create policy "leads_update_admin"
  on public.leads for update to authenticated
  using (public.is_admin_or_dono())
  with check (public.is_admin_or_dono());

create policy "leads_delete_dono"
  on public.leads for delete to authenticated
  using (public.is_dono());

-- INTERACTIONS
drop policy if exists "lzx anon all interactions"  on public.interactions;
drop policy if exists "interactions_select_admin"  on public.interactions;
drop policy if exists "interactions_insert_active" on public.interactions;
drop policy if exists "interactions_update_admin"  on public.interactions;
drop policy if exists "interactions_delete_dono"   on public.interactions;

create policy "interactions_select_admin"
  on public.interactions for select to authenticated
  using (public.is_admin_or_dono());

create policy "interactions_insert_active"
  on public.interactions for insert to authenticated
  with check (public.is_active_user());

create policy "interactions_update_admin"
  on public.interactions for update to authenticated
  using (public.is_admin_or_dono())
  with check (public.is_admin_or_dono());

create policy "interactions_delete_dono"
  on public.interactions for delete to authenticated
  using (public.is_dono());

-- ORDERS
drop policy if exists "lzx anon all orders"     on public.orders;
drop policy if exists "orders_select_admin"     on public.orders;
drop policy if exists "orders_insert_admin"    on public.orders;
drop policy if exists "orders_update_admin"    on public.orders;
drop policy if exists "orders_delete_dono"     on public.orders;

create policy "orders_select_admin"
  on public.orders for select to authenticated
  using (public.is_admin_or_dono());

create policy "orders_insert_admin"
  on public.orders for insert to authenticated
  with check (public.is_admin_or_dono());

create policy "orders_update_admin"
  on public.orders for update to authenticated
  using (public.is_admin_or_dono())
  with check (public.is_admin_or_dono());

create policy "orders_delete_dono"
  on public.orders for delete to authenticated
  using (public.is_dono());
