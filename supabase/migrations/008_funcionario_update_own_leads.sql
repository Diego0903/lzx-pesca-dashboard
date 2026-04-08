-- ============================================================
-- Migration 008 — Funcionário pode atualizar o stage dos próprios leads
-- Cole no Supabase: Dashboard → SQL Editor → New query → Run
--
-- Antes: só admin/dono podiam fazer UPDATE em leads.
-- Depois: funcionário pode atualizar os leads que ele mesmo criou
-- (created_by = auth.uid()). Isso permite o select de stage no histórico
-- do perfil de funcionário funcionar.
-- ============================================================

drop policy if exists "leads_update_admin"       on public.leads;
drop policy if exists "leads_update_visibility"  on public.leads;

create policy "leads_update_visibility"
  on public.leads for update to authenticated
  using (
    public.is_admin_or_dono()
    OR (public.is_active_user() AND created_by = auth.uid())
  )
  with check (
    public.is_admin_or_dono()
    OR (public.is_active_user() AND created_by = auth.uid())
  );
