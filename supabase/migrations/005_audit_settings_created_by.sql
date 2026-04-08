-- ============================================================
-- Migration 005 — Auditoria, configurações e created_by nos leads
-- Cole no Supabase: Dashboard → SQL Editor → New query
-- Idempotente.
-- ============================================================

-- ── 1) created_by nos leads ────────────────────────────────
alter table public.leads
  add column if not exists created_by uuid references public.usuarios(id) on delete set null;

create index if not exists leads_created_by_idx on public.leads (created_by);

-- ── 2) Atualizar RLS de leads para visibilidade por perfil ─
-- Funcionário vê só os leads que ele mesmo criou.
-- Admin/Dono veem todos.
drop policy if exists "leads_select_admin"      on public.leads;
drop policy if exists "leads_select_visibility" on public.leads;

create policy "leads_select_visibility"
  on public.leads for select to authenticated
  using (
    public.is_admin_or_dono()
    OR (public.is_active_user() AND created_by = auth.uid())
  );

-- ── 3) Permitir admin (não só dono) ler tabela usuarios ────
-- Necessário pra exibir "cadastrado por X" no kanban/lista do CRM.
drop policy if exists "admin_select_usuarios" on public.usuarios;
create policy "admin_select_usuarios"
  on public.usuarios for select to authenticated
  using (public.is_admin_or_dono());

-- ── 4) Tabela audit_log ────────────────────────────────────
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

-- ── 5) Tabela app_settings ─────────────────────────────────
-- Armazena configurações dinâmicas (token Meta, etc) editáveis pelo Dono.
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

-- ── 6) Trigger pra atualizar updated_at em app_settings ────
drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();
