'use strict'
require('dotenv').config()
const app = require('./api/index.js')

const PORT = 3001
app.listen(PORT, () => {
  console.log(`\n🎣 LZX Pesca API Server rodando em http://localhost:${PORT}`)
  console.log(`📊 Dashboard em http://localhost:3000\n`)
})
