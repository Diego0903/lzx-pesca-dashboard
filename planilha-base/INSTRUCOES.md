# Planilha Base — CRM LZX Pesca

Arquivo único com **3 abas** prontas para subir no Google Sheets ou abrir no Excel:

📂 **`CRM-LZX-Pesca.xlsx`**
- Aba **Leads**
- Aba **Interações**
- Aba **Pedidos**

## Como subir no Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com)
2. **Arquivo → Importar → Upload**
3. Selecione `CRM-LZX-Pesca.xlsx`
4. Em "Local de importação" escolha **Substituir planilha** (ou criar nova)
5. Clique em **Importar dados**

Pronto. As 3 abas aparecem no rodapé já com cabeçalhos e exemplos.

## Como compartilhar com a equipe

1. Botão **Compartilhar** (canto superior direito)
2. Adicione os emails dos funcionários
3. Permissão: **Editor**
4. Cada um vai conseguir adicionar linhas direto pelo navegador ou pelo app do celular

## Regras de preenchimento

### Aba Leads
| Coluna | Como preencher |
|---|---|
| **id** | Sequencial: `l1`, `l2`, `l3`... (importante: nunca repetir nem mudar depois) |
| **nome** | Nome do cliente ou empresa |
| **whatsapp** | Formato `(00) 00000-0000` |
| **cidade** | Nome completo da cidade |
| **estado** | Sigla com 2 letras: `SC`, `RS`, `PR`, `SP`, `RJ`, `MG`, `BA`, `PA`, `CE` ou `Outros` |
| **produto_interesse** | Nome do produto que o cliente perguntou |
| **categoria** | Uma destas exatas: `Redes`, `Linhas`, `Tralhas`, `Cordas`, `Boias` |
| **quantidade_estimada** | Número (sem ponto/vírgula) |
| **valor_estimado** | Número em reais sem `R$`, sem ponto. Ex: `12500` para R$ 12.500,00 |
| **origem** | Uma destas: `Google`, `Instagram`, `Facebook`, `Indicação`, `WhatsApp` |
| **estagio** | Uma destas: `novo`, `qualificado`, `orcamento`, `negociacao`, `fechado`, `perdido` |
| **ultimo_contato** | Formato `2026-04-08 14:30` |
| **proximo_followup** | Mesmo formato. Deixe em branco se não tiver agendado |
| **recorrente** | `sim` ou `nao` |
| **observacoes** | Texto livre |

### Aba Interações
| Coluna | Como preencher |
|---|---|
| **id** | Sequencial: `i1`, `i2`, `i3`... |
| **id_lead** | O ID do lead na aba Leads (`l1`, `l2`...) |
| **tipo_contato** | Uma destas: `WhatsApp`, `Email`, `Ligação`, `Visita` |
| **data_hora** | Formato `2026-04-08 14:30` |
| **observacao** | O que aconteceu nesse contato |

### Aba Pedidos
| Coluna | Como preencher |
|---|---|
| **id** | Sequencial: `o1`, `o2`, `o3`... |
| **cliente** | Nome do cliente |
| **produto** | Nome do produto vendido |
| **categoria** | `Redes`, `Linhas`, `Tralhas`, `Cordas`, `Boias` |
| **estado** | Sigla 2 letras |
| **valor** | Número em reais sem `R$`. Ex: `42500` |
| **status** | `novo`, `andamento` ou `fechado` |
| **data** | Formato `2026-04-08` |
| **id_lead_origem** | O `id` do lead que originou esse pedido (opcional) |

## Boas práticas

- **Nunca apague linhas antigas** — mude o status para `perdido` ou `fechado` em vez de deletar
- **Use sempre os mesmos valores nas colunas com opções** (estagio, categoria, origem, etc.) — o dashboard depende disso pra agrupar corretamente
- **Datas no formato exato**: `AAAA-MM-DD HH:MM` ou `AAAA-MM-DD`
- **Não troque a ordem das colunas** nem renomeie cabeçalhos

## Próximo passo (depois da equipe começar a preencher)

Quando tiver uns 20-30 registros já preenchidos, me avisa que eu:

1. Configuro a Google Sheets API (sem custo)
2. Conecto a planilha ao dashboard automaticamente
3. Substituo os dados mockados pelos reais
4. Cada vez que vocês atualizarem a planilha, o dashboard reflete em tempo real

Para isso eu vou precisar:
- O **link da planilha** (compartilhada com permissão de leitura para a service account)
- Te mando o email da service account quando chegar a hora

---

**Quer regenerar o arquivo com mais linhas de exemplo?** Edite `make-xlsx.cjs` e rode:

```bash
node planilha-base/make-xlsx.cjs
```
