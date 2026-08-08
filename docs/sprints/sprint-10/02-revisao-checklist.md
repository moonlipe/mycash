# Sprint 10 — Revisão e Checklist

**Assistente de Importação e Integração Inteligente (CSV/Excel)**

## User Stories e Critérios de Aceitação

### US20 — Motor de Parsing e Mapeamento Dinâmico

| # | Critério | Status | Observação |
|---|----------|--------|------------|
| 1 | Integração `papaparse` e `xlsx` | ✅ OK | Dependências instaladas no `apps/web/package.json` |
| 2 | Tela De-Para com preview das primeiras linhas | ✅ OK | 5 linhas de preview com tabela de cabeçalhos |
| 3 | Dropdowns para mapear Data, Descrição e Valor | ✅ OK | 5 dropdowns (inclui Conta e Categoria opcionais) |
| 4 | Normalização numérica (vírgula/ponto → centavos) | ✅ OK | `normalizeAmount()` detecta separadores, converte para inteiro centavos |
| 5 | Normalização de datas (formato BR, ISO, US) | ✅ OK | `parseSmartDate()` cobre dd/mm/aaaa, aaaa-mm-dd, date parsing |
| 6 | Auto-detecção de cabeçalhos | ✅ OK | `autoMapHeaders()` com match por keywords em português/inglês |

### US21 — Resolução de Entidades e Override de Status

| # | Critério | Status | Observação |
|---|----------|--------|------------|
| 1 | Match exato case-insensitive de contas/categorias | ✅ OK | `resolveEntityByName()` com `toLowerCase()` |
| 2 | Resolução por tipo (income/expense) para categorias | ✅ OK | Filtro por `incomeCategories`/`expenseCategories` |
| 3 | Dropdown de fallback para conta padrão | ✅ OK | Selec na tela de Map e controles rápidos na Review |
| 4 | Dropdown de fallback para categoria padrão | ✅ OK | Idem |
| 5 | Seletor global de status (Pago vs Pendente) | ✅ OK | Checkbox `globalIsPaid` default true |
| 6 | `isPaid` é respeitado pelo backend | ✅ OK | Fix aplicado: backend agora lê `body.isPaid` em vez de hardcoded `false` |
| 7 | Mostrar nome original quando match falha | ✅ OK | Badge com `rawAccountName`/`rawCategoryName` entre aspas |
| 8 | Separação visual entre registros problemáticos e válidos | ✅ OK | Secções distintas na Review: "Registros com problemas" + "Registros prontos" |
| 9 | Fallback aplicável sem sair da Review | ✅ OK | Selectores rápidos no banner de problemas |

### US22 — Orquestrador de Integração em Lote

| # | Critério | Status | Observação |
|---|----------|--------|------------|
| 1 | Envio em sub-lotes de 10 em 10 | ✅ OK | `chunkSize = 10`, loop com `for (let i = 0; i < ...; i += chunkSize)` |
| 2 | Sem `Promise.all` massivo | ✅ OK | `Promise.all` apenas por chunk (máx. 10 requisições) |
| 3 | Barra de progresso em tempo real | ✅ OK | `<div>` com `width` percentual + texto "X de Y transações" |
| 4 | Contador de erros durante o processo | ✅ OK | Badge vermelho abaixo da barra de progresso |
| 5 | Usa API existente (`api.createTransaction`) | ✅ OK | Sem novos endpoints no backend |
| 6 | Tratamento de erros com continuidade | ✅ OK | Erros por chunk são acumulados, processamento continua |
| 7 | Tela de conclusão com resultado | ✅ OK | "Done" step com sucesso ou aviso de erros parciais |

## 📁 Arquivos do Sprint

| Arquivo | Tipo | Papel |
|---------|------|-------|
| `apps/web/src/components/ImportWizard.tsx` | ✨ Novo | Componente principal com 5 steps (upload → map → review → processing → done) |
| `apps/web/src/pages/ImportPage.tsx` | ✨ Novo | Página `/import` que carrega contas/categorias e renderiza o wizard |
| `apps/web/src/App.tsx` | 🔧 Modificado | Rota `/import` + ícone Upload na TopBar |
| `apps/web/src/components/BottomNav.tsx` | 🔧 Modificado | Botão "Importar" na navegação mobile |
| `apps/web/src/lib/api.ts` | 🔧 Modificado | `CreateTransactionData.isPaid?: boolean` adicionado |
| `apps/api/src/routes/transactions.ts` | 🔧 Modificado | Backend agora lê `body.isPaid` em vez de `isPaid: false` hardcoded |
| `apps/web/src/i18n/pt.json` | 🔧 Modificado | ~30 chaves de tradução para o fluxo de importação |
| `apps/web/src/i18n/en.json` | 🔧 Modificado | ~30 chaves de tradução para o fluxo de importação |
| `apps/web/package.json` | 🔧 Modificado | Dependências: `papaparse`, `xlsx`, `@types/papaparse` |
| `pnpm-lock.yaml` | 🔧 Modificado | Lock file atualizado |

## 🔧 Fluxo do Assistente

```
Upload (CSV/XLSX)
    │
    ▼
Map (mapear colunas + regras de destino)
    │
    ▼
Review (validar, corrigir problemas, confirmar)
    │
    ▼
Processing (envio em lotes de 10 + barra de progresso)
    │
    ▼
Done (resumo: sucesso ou erros parciais)
```

## 🔄 Validações e Build

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` (web) | ✅ Sem erros |
| `pnpm run typecheck` (api) | ✅ Sem erros |
| `pnpm run build` (web) | ✅ Bundle gerado |
| `wrangler d1 migrations apply mycash-dev --local` | ✅ Migrations aplicadas (predev) |

## ✅ Checklist de Homologação

- [ ] **Parsing CSV**: upload de ficheiro `.csv` com delimitadores comuns (vírgula, ponto-e-vírgula)
- [ ] **Parsing Excel**: upload de ficheiro `.xlsx` e `.xls`
- [ ] **Auto-detecção**: os dropdowns de mapeamento vêm pré-selecionados corretamente
- [ ] **Preview**: as primeiras 5 linhas são mostradas na tabela de preview
- [ ] **Normalização de valores**: moeda formatada como `R$ 1.500,50` ou `1500.50` ou `1.500,50` gera centavos correctos
- [ ] **Parsing de datas**: formatos `dd/mm/aaaa`, `aaaa-mm-dd`, `mm/dd/aaaa` são convertidos para ISO
- [ ] **Match de conta**: se a coluna Conta for mapeada, o nome é resolvido (case-insensitive)
- [ ] **Match de categoria**: se a coluna Categoria for mapeada, o nome é resolvido (c/ filtro por tipo income/expense)
- [ ] **Fallback**: registros sem match usam o valor padrão selecionado (conta/categoria)
- [ ] **Status Pago**: com a flag "Marcar todas como Pagas" activa, `isPaid` é `true` na BD
- [ ] **Status Pendente**: com a flag desmarcada, `isPaid` é `false` na BD
- [ ] **Banner de problemas**: registos com match falhado são destacados com indicação do nome original
- [ ] **Fallback na Review**: selectores rápidos no banner permitem corrigir sem voltar atrás
- [ ] **Separação visual**: "Registros com problemas" (todos visíveis) vs. "Registros prontos" (até 10, com "Mostrar mais")
- [ ] **Envio em lotes**: o backend recebe pedidos em grupos de 10
- [ ] **Barra de progresso**: a % actualizada em tempo real durante o processamento
- [ ] **Tela de conclusão**: mensagem de sucesso ou aviso de erros parciais
- [ ] **Navegação mobile**: botão "Importar" na BottomNav
- [ ] **Navegação desktop**: ícone Upload na TopBar
- [ ] **Traduções**: todo o fluxo em português e inglês

## 🐛 Bugs Corrigidos Durante o Sprint

1. **`isPaid` ignorado pelo backend** — `POST /transactions` usava `isPaid: false` hardcoded. Corrigido para ler `body.isPaid`.
2. **`CreateTransactionData` sem campo isPaid** — Adicionado `isPaid?: boolean` ao tipo para que o frontend possa enviá-lo.
3. **Fallback forçado sem visibilidade** — A tela de revisão agora separa registros problemáticos dos válidos, permite aplicar fallback com um clique e mostra o nome original do match falhado.

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Linhas de código novas | +1025 (ImportWizard) + 62 (ImportPage) |
| Linhas alteradas | ~135 (api, App, BottomNav, i18n, api.ts) |
| Traduções (pt/en) | 30 chaves cada |
| Dependências adicionadas | 3 (`papaparse`, `xlsx`, `@types/papaparse`) |
| Commits | `70dc3fd` |
