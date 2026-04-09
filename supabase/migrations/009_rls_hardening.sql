-- ============================================================
-- Migration 009 — RLS hardening (fix vulnerabilities)
-- Cole no Supabase: Dashboard → SQL Editor → New query → Run
--
-- Corrige 3 vulnerabilidades reportadas na varredura de segurança:
--
--   1. leads.created_by era forjável: funcionário podia INSERT/UPDATE
--      definindo created_by como outro usuário (transferência indevida).
--      → Adiciona DEFAULT auth.uid() + with check (created_by = auth.uid())
--
--   2. audit_log aceitava inserts forjados: qualquer ativo podia inserir
--      linhas com usuario_id de outra pessoa, poluindo a trilha de auditoria.
--      → Restringe INSERT a admin/dono e força usuario_id = auth.uid()
--
--   3. interactions tinha permissão inconsistente: funcionários podiam
--      INSERT em qualquer lead_id mas não tinham SELECT em nenhum.
--      → Permite SELECT/INSERT em interactions de leads próprios
--
-- Tudo é idempotente (drop if exists + create). Pode rodar várias vezes
-- sem efeito colateral.
-- ============================================================

-- ── 1) leads.created_by ─────────────────────────────────────
-- Default automático: novos rows pegam o uid do usuário autenticado.
-- (Não retroage: linhas existentes mantêm o created_by atual.)
alter table public.leads
  alter column created_by set default auth.uid();

-- INSERT: funcionário só pode criar lead com created_by = ele mesmo.
-- Admin/dono podem criar com qualquer created_by (pra atribuir manualmente).
drop policy if exists "leads_insert_active" on public.leads;
create policy "leads_insert_active"
  on public.leads for insert to authenticated
  with check (
    public.is_active_user()
    AND (public.is_admin_or_dono() OR created_by = auth.uid())
  );

-- UPDATE: substitui a policy do migration 008. Mesma regra de visibilidade,
-- mas o WITH CHECK agora também impede mudar created_by pra outro usuário.
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

-- ── 2) audit_log INSERT-only com auto-pin ───────────────────
-- Antes: qualquer ativo podia INSERT com usuario_id arbitrário.
-- Depois: só admin/dono podem inserir, e usuario_id é forçado a ser deles.
-- (Funcionários nunca acionam audit_log diretamente; ele é gravado pelo
-- AdminUsuariosPage e ConfiguracoesPage, que só dono/admin acessam.)
drop policy if exists "audit_insert_authenticated" on public.audit_log;
drop policy if exists "audit_insert_self"          on public.audit_log;
create policy "audit_insert_self"
  on public.audit_log for insert to authenticated
  with check (
    public.is_admin_or_dono()
    AND usuario_id = auth.uid()
  );

-- ── 3) interactions: SELECT/INSERT escopo a leads próprios ──
-- Funcionário agora vê e cria interações nas leads dele mesmo.
-- Admin/dono continuam com acesso total.
drop policy if exists "interactions_select_admin"      on public.interactions;
drop policy if exists "interactions_select_visibility" on public.interactions;
create policy "interactions_select_visibility"
  on public.interactions for select to authenticated
  using (
    public.is_admin_or_dono()
    OR exists (
      select 1 from public.leads l
      where l.id = interactions.lead_id
        and l.created_by = auth.uid()
    )
  );

drop policy if exists "interactions_insert_active" on public.interactions;
drop policy if exists "interactions_insert_scoped" on public.interactions;
create policy "interactions_insert_scoped"
  on public.interactions for insert to authenticated
  with check (
    public.is_active_user()
    AND (
      public.is_admin_or_dono()
      OR exists (
        select 1 from public.leads l
        where l.id = interactions.lead_id
          and l.created_by = auth.uid()
      )
    )
  );

-- ── Verificação ─────────────────────────────────────────────
-- Lista as policies atuais pra você conferir que estão como esperado.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('leads', 'interactions', 'audit_log')
order by tablename, cmd, policyname;
