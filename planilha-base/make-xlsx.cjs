// Gera CRM-LZX-Pesca.xlsx com 3 abas (Leads, Interações, Pedidos)
// Sem dependências — usa só fs + zlib (stdlib do Node)
// Uso: node planilha-base/make-xlsx.cjs
'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ── Dados das 3 abas ─────────────────────────────────────────────
const SHEETS = [
  {
    name: 'Leads',
    rows: [
      ['id','nome','whatsapp','cidade','estado','produto_interesse','categoria','quantidade_estimada','valor_estimado','origem','estagio','ultimo_contato','proximo_followup','recorrente','observacoes'],
      ['l1','Marcos Albuquerque','(48) 99812-4501','Florianópolis','SC','Rede Multifilamento 70mm','Redes',50,12500,'Google','novo','2026-04-06 14:30','2026-04-09 10:00','nao','Cliente solicitou catálogo de redes'],
      ['l2','Pesca Sul Distribuidora','(51) 99340-7822','Rio Grande','RS','Linha Mono 0.50mm','Linhas',200,28000,'Indicação','qualificado','2026-04-05 11:15','2026-04-08 14:00','sim','Cliente recorrente prazo 45/60/90'],
      ['l3','Fernando Tavares','(41) 98445-2010','Paranaguá','PR','Boia de Sinalização Inflável','Boias',30,4200,'Instagram','orcamento','2026-04-04 16:00','2026-04-07 09:00','nao','Solicitou orçamento revisado'],
    ],
  },
  {
    name: 'Interações',
    rows: [
      ['id','id_lead','tipo_contato','data_hora','observacao'],
      ['i1','l1','WhatsApp','2026-04-06 14:30','Cliente solicitou catálogo de redes multifilamento. Enviado PDF.'],
      ['i2','l1','WhatsApp','2026-04-05 10:00','Primeiro contato — interesse em compra para frota de 8 barcos.'],
      ['i3','l2','Ligação','2026-04-05 11:15','Negociação de prazo de pagamento — cliente recorrente.'],
    ],
  },
  {
    name: 'Pedidos',
    rows: [
      ['id','cliente','produto','categoria','estado','valor','status','data','id_lead_origem'],
      ['o1','Estaleiro Sul','Corda Náutica 16mm','Cordas','SC',42500,'andamento','2026-04-06','l11'],
      ['o2','Clube de Pesca Atlântico','Tralha de Fundo Kit','Tralhas','RJ',9600,'fechado','2026-04-05','l5'],
      ['o3','Pesca Sul Distribuidora','Linha Mono 0.50mm','Linhas','RS',28000,'andamento','2026-04-04','l2'],
    ],
  },
]

// ── XML helpers ──────────────────────────────────────────────────
const escapeXml = s => String(s).replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[c]))

function colLetter(idx) { // 0 -> A, 1 -> B, ... 26 -> AA
  let s = ''
  let n = idx
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return s
}

// Coleta strings inline (sharedStrings)
const sst = []
const sstIndex = new Map()
function sharedStringId(s) {
  if (sstIndex.has(s)) return sstIndex.get(s)
  const id = sst.length
  sst.push(s)
  sstIndex.set(s, id)
  return id
}

function buildSheetXml(rows) {
  let body = ''
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    let cells = ''
    for (let c = 0; c < row.length; c++) {
      const ref = `${colLetter(c)}${r + 1}`
      const v = row[c]
      if (v === null || v === undefined || v === '') continue
      if (typeof v === 'number') {
        cells += `<c r="${ref}"><v>${v}</v></c>`
      } else {
        const id = sharedStringId(String(v))
        cells += `<c r="${ref}" t="s"><v>${id}</v></c>`
      }
    }
    body += `<row r="${r + 1}">${cells}</row>`
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${body}</sheetData>
</worksheet>`
}

function buildSharedStrings() {
  const items = sst.map(s => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.length}" uniqueCount="${sst.length}">${items}</sst>`
}

function buildWorkbook() {
  const sheets = SHEETS.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets}</sheets>
</workbook>`
}

function buildWorkbookRels() {
  const rels = SHEETS.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
  const sharedRel = `<Relationship Id="rId${SHEETS.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}${sharedRel}</Relationships>`
}

function buildContentTypes() {
  const overrides = SHEETS.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${overrides}
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`
}

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

// ── Construção do ZIP (ZIP/PKZIP — store + deflate sem dependências) ──
function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  let crc = 0 ^ (-1)
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  return (crc ^ (-1)) >>> 0
}

function zip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8')
    const raw = Buffer.from(f.data, 'utf8')
    const compressed = zlib.deflateRawSync(raw)
    const c = crc32(raw)

    // Local file header
    const local = Buffer.alloc(30 + nameBuf.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)              // version
    local.writeUInt16LE(0x0800, 6)          // flags (UTF-8)
    local.writeUInt16LE(8, 8)               // method = deflate
    local.writeUInt16LE(0, 10)              // mod time
    local.writeUInt16LE(0, 12)              // mod date
    local.writeUInt32LE(c, 14)              // crc
    local.writeUInt32LE(compressed.length, 18) // compressed size
    local.writeUInt32LE(raw.length, 22)     // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26) // name len
    local.writeUInt16LE(0, 28)              // extra len
    nameBuf.copy(local, 30)
    localParts.push(local, compressed)

    // Central directory entry
    const central = Buffer.alloc(46 + nameBuf.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)            // version made by
    central.writeUInt16LE(20, 6)            // version needed
    central.writeUInt16LE(0x0800, 8)        // flags
    central.writeUInt16LE(8, 10)            // method
    central.writeUInt16LE(0, 12)            // mod time
    central.writeUInt16LE(0, 14)            // mod date
    central.writeUInt32LE(c, 16)            // crc
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30)            // extra len
    central.writeUInt16LE(0, 32)            // comment len
    central.writeUInt16LE(0, 34)            // disk
    central.writeUInt16LE(0, 36)            // internal attrs
    central.writeUInt32LE(0, 38)            // external attrs
    central.writeUInt32LE(offset, 42)       // offset of local header
    nameBuf.copy(central, 46)
    centralParts.push(central)

    offset += local.length + compressed.length
  }

  const centralStart = offset
  const central = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(centralStart, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, central, eocd])
}

// ── Build ────────────────────────────────────────────────────────
// IMPORTANT: build sheet XMLs first so sharedStrings is populated
const sheetXmls = SHEETS.map(s => buildSheetXml(s.rows))

const files = [
  { name: '[Content_Types].xml',       data: buildContentTypes() },
  { name: '_rels/.rels',               data: ROOT_RELS },
  { name: 'xl/workbook.xml',           data: buildWorkbook() },
  { name: 'xl/_rels/workbook.xml.rels',data: buildWorkbookRels() },
  { name: 'xl/sharedStrings.xml',      data: buildSharedStrings() },
  ...sheetXmls.map((xml, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: xml })),
]

const out = path.join(__dirname, 'CRM-LZX-Pesca.xlsx')
fs.writeFileSync(out, zip(files))
console.log('✓ Gerado:', out)
console.log(`  ${SHEETS.length} abas: ${SHEETS.map(s => s.name).join(', ')}`)
