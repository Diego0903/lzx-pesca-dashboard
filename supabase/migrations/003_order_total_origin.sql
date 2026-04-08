-- ============================================================
-- Migration 003 — Order total + new origin values
-- Cole no Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- 1) Nova coluna: valor total do pedido (separado do frete)
alter table public.leads
  add column if not exists order_total numeric(12,2) default 0;

comment on column public.leads.order_total is 'Valor total do pedido em R$ (sem frete)';

-- 2) Adiciona "Cliente Recorrente" e "Desconhecido" ao enum lead_origin
do $$ begin
  alter type lead_origin add value if not exists 'Cliente Recorrente';
exception when others then null; end $$;

do $$ begin
  alter type lead_origin add value if not exists 'Desconhecido';
exception when others then null; end $$;
