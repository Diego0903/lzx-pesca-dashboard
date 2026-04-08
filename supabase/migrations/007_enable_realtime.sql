-- ============================================================
-- Migration 007 — Habilita Supabase Realtime para CRM
-- Cole no Supabase: Dashboard → SQL Editor → New query → Run
--
-- Sem isso, mudanças nas tabelas (cadastros, alterações de stage, etc)
-- NÃO são propagadas em tempo real entre os clientes conectados.
--
-- O Supabase Realtime usa publicações Postgres (logical replication).
-- Por padrão a publicação `supabase_realtime` existe mas não inclui
-- nenhuma tabela. Precisamos adicionar as nossas explicitamente.
-- ============================================================

-- Cria a publicação se ainda não existir (caso projeto novo sem Realtime)
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Adiciona as 3 tabelas do CRM à publicação Realtime
-- (idempotente: se já estiverem, ignora)
do $$ begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.interactions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

-- Verificação final
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
