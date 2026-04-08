# Supabase — LZX Pesca CRM

## Setup inicial (uma única vez)

1. Acesse o projeto no [supabase.com](https://supabase.com/dashboard) → seu projeto
2. Menu lateral → **SQL Editor** → **New query**
3. Abra o arquivo `schema.sql` desta pasta, copia todo o conteúdo, cola no editor SQL e clica **Run**
4. Vai criar:
   - 3 tabelas: `leads`, `interactions`, `orders`
   - 5 enums (estágio, origem, tipo de contato, status, categoria)
   - Índices para queries rápidas
   - Trigger de `updated_at`
   - **Row Level Security** habilitado com policies que liberam leitura/escrita pra anon key
   - 4 leads de exemplo (pode comentar a parte do `insert into` se não quiser)

## Variáveis de ambiente

Já estão configuradas no `.env` local. Para o Vercel:

1. Vercel → projeto → **Settings → Environment Variables**
2. Adicione duas variáveis:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://jpjmaprorlvdktgrdbed.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_lRoGUGElmNrFVS9YOXj9eg_rzShNhlK` |

3. Marque os 3 environments (Production, Preview, Development)
4. **Deployments → Redeploy** o último deploy

## Como funciona o fallback

O dashboard nunca quebra mesmo se Supabase estiver fora:

- **Conectado** → puxa leads/pedidos/interações reais (badge verde "Supabase conectado")
- **Offline ou não configurado** → usa dados mockados de `src/data/mockCrm.ts` (badge laranja "Modo offline")

Toda a UI continua funcional em ambos os modos. Cadastros feitos no modo offline ficam só na sessão.

## Estrutura das tabelas

### `leads`
Cliente potencial. UUID gerado pelo banco. Campos:
`name, whatsapp, city, state, product, category, estimated_qty, estimated_value, origin, stage, last_contact_at, next_follow_up_at, recurring, notes`

### `interactions`
Histórico de contatos com um lead. Tem `lead_id` apontando para `leads.id`. Cascata: deletar lead apaga as interações.

### `orders`
Pedidos fechados. `lead_id` opcional (pode ter pedido sem lead linkado).

## Adicionar autenticação real (opcional, no futuro)

Hoje as policies de RLS liberam tudo pra anon key porque o dashboard é interno. Quando você quiser restringir:

1. Habilite Auth no Supabase → Email/Password ou OAuth
2. Substitua as policies em `schema.sql`:

```sql
drop policy "lzx anon all leads" on public.leads;
create policy "auth users only leads"
  on public.leads for all
  to authenticated
  using (true) with check (true);
```

3. Adicione tela de login no dashboard
