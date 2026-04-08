-- ============================================================
-- Migration 002 — Multiple line items + shipping per lead
-- Cole no Supabase: Dashboard → SQL Editor → New query
-- ============================================================

alter table public.leads
  add column if not exists items jsonb default '[]'::jsonb;

alter table public.leads
  add column if not exists shipping_value numeric(12,2) default 0;

-- itens armazenam: [{ "product": "...", "category": "Redes", "qty": 50, "value": 12500 }, ...]
-- estimated_value continua sendo o "subtotal" que você passa pelo dashboard;
-- o total geral é sempre estimated_value + shipping_value.

comment on column public.leads.items is 'Array de produtos: [{product, category, qty, value}]';
comment on column public.leads.shipping_value is 'Valor do frete em reais';
