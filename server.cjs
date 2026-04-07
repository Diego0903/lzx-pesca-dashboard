'use strict'
require('dotenv').config()

const PORT = 3001

import('./api/index.js').then(({ default: app }) => {
  app.listen(PORT, () => {
    console.log(`\n🎣 LZX Pesca API Server rodando em http://localhost:${PORT}`)
    console.log(`📊 Dashboard em http://localhost:3000\n`)
  })
}).catch(err => {
  console.error('Erro ao iniciar servidor:', err)
  process.exit(1)
})
