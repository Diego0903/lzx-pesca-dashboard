-- ============================================================
-- ⚠️ MIGRATION CONSOLIDADA — RODE ESTA SE VOCÊ ESTÁ COM ERRO
-- "column leads.items does not exist" ou similar.
--
-- Esta migration aplica de uma vez tudo que estava faltando:
--   - 002 (items + shipping_value)
--   - 003 (order_total + novas origens)
--   - 005 (audit_log, app_settings, created_by)
--
-- Cole no Supabase: Dashboard → SQL Editor → New query → Run
-- 100% idempotente: pode rodar de novo sem quebrar.
-- ============================================================

-- ── 002: items jsonb + shipping_value ──────────────────────
alter table public.leads
  add column if not exists items jsonb default '[]'::jsonb;

alter table public.leads
  add column if not exists shipping_value numeric(12,2) default 0;

comment on column public.leads.items is 'Array de produtos: [{product, category, qty}]';
comment on column public.leads.shipping_value is 'Valor do frete em reais';

-- ── 003: order_total + Cliente Recorrente / Desconhecido ───
alter table public.leads
  add column if not exists order_total numeric(12,2) default 0;

comment on column public.leads.order_total is 'Valor total do pedido em R$ (sem frete)';

do $$ begin
  alter type lead_origin add value if not exists 'Cliente Recorrente';
exception when others then null; end $$;

do $$ begin
  alter type lead_origin add value if not exists 'Desconhecido';
exception when others then null; end $$;

-- ── 005a: created_by nos leads ─────────────────────────────
alter table public.leads
  add column if not exists created_by uuid references public.usuarios(id) on delete set null;

create index if not exists leads_created_by_idx on public.leads (created_by);

-- ── 005b: RLS de leads para visibilidade por perfil ────────
drop policy if exists "leads_select_admin"      on public.leads;
drop policy if exists "leads_select_visibility" on public.leads;

create policy "leads_select_visibility"
  on public.leads for select to authenticated
  using (
    public.is_admin_or_dono()
    OR (public.is_active_user() AND created_by = auth.uid())
  );

-- ── 005c: Admin pode ler usuarios (pra mostrar criador) ───
drop policy if exists "admin_select_usuarios" on public.usuarios;
create policy "admin_select_usuarios"
  on public.usuarios for select to authenticated
  using (public.is_admin_or_dono());

-- ── 005d: Tabela audit_log ─────────────────────────────────
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  acao          text not null,
  usuario_id    uuid references public.usuarios(id) on delete set null,
  usuario_nome  text,
  alvo_id       uuid references public.usuarios(id) on delete set null,
  alvo_nome     text,
  detalhes      jsonb,
  criado_em     timestamptz default now()
);

create index if not exists audit_log_criado_idx on public.audit_log (criado_em desc);
create index if not exists audit_log_acao_idx   on public.audit_log (acao);

alter table public.audit_log enable row level security;

drop policy if exists "audit_select_dono"           on public.audit_log;
drop policy if exists "audit_insert_authenticated"  on public.audit_log;

create policy "audit_select_dono"
  on public.audit_log for select to authenticated
  using (public.is_dono());

create policy "audit_insert_authenticated"
  on public.audit_log for insert to authenticated
  with check (public.is_active_user());

-- ── 005e: Tabela app_settings ──────────────────────────────
create table if not exists public.app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now(),
  updated_by  uuid references public.usuarios(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "settings_dono_select" on public.app_settings;
drop policy if exists "settings_dono_update" on public.app_settings;
drop policy if exists "settings_dono_insert" on public.app_settings;
drop policy if exists "settings_dono_all"    on public.app_settings;

create policy "settings_dono_all"
  on public.app_settings for all to authenticated
  using (public.is_dono())
  with check (public.is_dono());

drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

-- ── Verificação final ──────────────────────────────────────
-- Se rodou sem erro, todas as colunas e tabelas devem existir agora.
select 'leads.items'         as col, exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='items') as ok
union all
select 'leads.shipping_value', exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='shipping_value')
union all
select 'leads.order_total',    exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='order_total')
union all
select 'leads.created_by',     exists(select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name='created_by')
union all
select 'audit_log',            exists(select 1 from information_schema.tables where table_schema='public' and table_name='audit_log')
union all
select 'app_settings',         exists(select 1 from information_schema.tables where table_schema='public' and table_name='app_settings');
