// ============================================================
// Seed do usuário Dono — LZX Pesca
// ============================================================
// Cria o primeiro usuário Master usando a SERVICE ROLE KEY do Supabase.
// Lê credenciais de .env (DONO_EMAIL, DONO_SENHA, DONO_NOME).
//
// Como rodar:
//   node seed-dono.cjs
//   ou
//   npm run seed:dono
//
// Pré-requisitos:
//   1. Migration 004_auth_usuarios.sql aplicada no Supabase
//   2. .env preenchido com:
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DONO_EMAIL, DONO_SENHA, DONO_NOME
// ============================================================
'use strict'

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.env.DONO_EMAIL
const SENHA = process.env.DONO_SENHA
const NOME = process.env.DONO_NOME || 'Dono'

if (!URL) {
  console.error('❌ SUPABASE_URL não definido em .env')
  process.exit(1)
}
if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definido em .env')
  console.error('   Pegue em: Supabase Dashboard → Project Settings → API → service_role (secret)')
  process.exit(1)
}
if (!EMAIL || !SENHA) {
  console.error('❌ DONO_EMAIL e DONO_SENHA são obrigatórios em .env')
  process.exit(1)
}
if (SENHA.length < 8) {
  console.error('❌ DONO_SENHA precisa ter no mínimo 8 caracteres')
  process.exit(1)
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  // 1) Verifica se já existe um Dono ativo
  const { data: existingDono, error: queryErr } = await supabase
    .from('usuarios')
    .select('id, email, nome')
    .eq('perfil', 'dono')
    .eq('status', 'ativo')
    .maybeSingle()

  if (queryErr) {
    console.error('❌ Erro ao consultar usuários:', queryErr.message)
    console.error('   Verifique se a migration 004_auth_usuarios.sql foi aplicada.')
    process.exit(1)
  }

  if (existingDono) {
    console.log(`⚠️  Já existe um usuário Dono cadastrado: ${existingDono.email} (${existingDono.nome})`)
    console.log('    Para criar outro Dono, primeiro desative ou remova o atual no painel /admin/usuarios.')
    process.exit(0)
  }

  // 2) Tenta criar via Auth Admin API
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome: NOME, cargo_informado: 'Dono' },
  })

  let userId
  if (createErr) {
    // Se já existe um auth user com esse email, busca o id e promove
    if (createErr.message?.toLowerCase().includes('already')) {
      console.log(`ℹ️  Auth user com email ${EMAIL} já existe — promovendo a Dono...`)
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
      if (listErr) { console.error('❌', listErr.message); process.exit(1) }
      const found = list.users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())
      if (!found) { console.error('❌ Não consegui encontrar o auth user existente'); process.exit(1) }
      userId = found.id
    } else {
      console.error('❌ Erro ao criar auth user:', createErr.message)
      process.exit(1)
    }
  } else {
    userId = created.user.id
  }

  // 3) Upsert na tabela usuarios com perfil=dono e status=ativo
  const { error: upsertErr } = await supabase
    .from('usuarios')
    .upsert({
      id: userId,
      nome: NOME,
      email: EMAIL,
      perfil: 'dono',
      status: 'ativo',
      cargo_informado: 'Dono',
      aprovado_em: new Date().toISOString(),
    }, { onConflict: 'id' })

  if (upsertErr) {
    console.error('❌ Erro ao criar perfil de Dono:', upsertErr.message)
    process.exit(1)
  }

  console.log('✅ Usuário Dono criado com sucesso:', EMAIL)
  console.log('   Acesse o dashboard em /login com esse email e senha.')
}

main().catch(e => {
  console.error('❌ Erro inesperado:', e)
  process.exit(1)
})
