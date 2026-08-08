# 🔍 Revisão da Sprint 07 — Smart CLI Parser

## 📋 Visão Geral

**Sprint:** 07  
**Meta:** Transformar a linha de inserção rápida num terminal financeiro inteligente (Smart CLI), interpretando comandos com `/`, `@` e `#` em tempo real.  
**US associada:** US15 - Linha de Comando Financeira (Smart CLI Parser)

---

## ✅ Checklist de Implementação

### 1. Motor de Parsing (`cliParser.ts`)

| Item | Status | Detalhes |
|------|--------|----------|
| Gatilho `/-` → Despesa | ✅ OK | Define `type: "expense"` |
| Gatilho `/+` → Receita | ✅ OK | Define `type: "income"` |
| Captura de valor numérico | ✅ OK | Suporta `500`, `500.10`, `500,1` — apenas o primeiro número isolado |
| `@categoria` — extração do token | ✅ OK | Remove o `@` e armazena como `category` |
| `#data` — parser inteligente | ✅ OK | `parseSmartDate()` implementado |
| `#hoje` | ✅ OK | Retorna a data atual em ISO |
| `#ontem` | ✅ OK | Retorna o dia anterior em ISO |
| `#5` (dia do mês corrente) | ✅ OK | Usa `selectedMonth` para compor `YYYY-MM-DD` |
| `#10/06` (dia/mês) | ✅ OK | Usa o ano do `selectedMonth` |
| `#2026-06-10` (completa) | ✅ OK | Retorna o próprio valor |
| Fallback de data | ✅ OK | Retorna data atual se a sintaxe não for reconhecida |
| Descrição: resto dos tokens | ✅ OK | Qualquer token não identificado é acumulado como descrição |
| `selectedMonth` dinâmico | ✅ OK | Recebe `YYYY-MM` do grid (ano/mês selecionado) |
| Interface `ParsedCommand` | ✅ OK | `type`, `amount?`, `category?`, `date?`, `description` |

**Arquivo:** `apps/web/src/lib/cliParser.ts`

---

### 2. Busca por Aproximação (Fuzzy Match) — `fuzzyMatch.ts`

| Item | Status | Detalhes |
|------|--------|----------|
| Remoção de acentos (diacríticos) | ✅ OK | `normalize()` — tabela completa `áàâãäéèêëíìîïóòôõöúùûüçñ` |
| Case-insensitive | ✅ OK | `.toLowerCase()` |
| Match exato | ✅ OK | Retorna a categoria se o nome normalizado bater |
| Match por início (`startsWith`) | ✅ OK | Ex: `@alim` → `Alimentação` |
| Match por substring (`includes`) | ✅ OK | Fallback para correspondência parcial |
| Retorno `null` sem match | ✅ OK | Permite UI mostrar preview em itálico ("Mapear para: ...?") |

**Arquivo:** `apps/web/src/lib/fuzzyMatch.ts`

---

### 3. Tooltip Vivo (Preview em Tempo Real) — `TransactionGrid.tsx`

| Item | Status | Detalhes |
|------|--------|----------|
| Tooltip aparece ao focar e digitar | ✅ OK | `cliFocused && cliInput.trim().length > 0` |
| Indicador de Tipo (🔴 Despesa / 🟢 Receita) | ✅ OK | Cor rosa (expense) ou verde (income) conforme `cliPreview.type` |
| Indicador de Valor (💰 R$ XX,XX) | ✅ OK | Formatação `pt-BR` com 2 casas decimais; mostra `0,00` se vazio |
| Indicador de Descrição (📝) | ✅ OK | Mostra o texto descritivo ou "Sem descrição" |
| Indicador de Categoria (🏷️) | ✅ OK | Exibe `@categoria`; se não encontrada, mostra "Mapear para: categoria?" em itálico laranja |
| Indicador de Data (📅) | ✅ OK | Data por extenso via `toLocaleDateString` — respeita idioma (`pt-BR` / `en-US`) |
| Tema Claro | ✅ OK | `bg-white/95`, borda `border-slate-200` |
| Tema Escuro | ✅ OK | `bg-slate-900/95`, borda `border-slate-800` |
| Sombra e backdrop-blur | ✅ OK | `shadow-lg`, `backdrop-blur-sm` |
| Delay no blur para permitir clique | ✅ OK | `setTimeout(() => ..., 200)` |
| Animação de entrada | ✅ OK | Classes Tailwind: `animate-in fade-in slide-in-from-top-1 duration-150` |

**Arquivo:** `apps/web/src/components/TransactionGrid.tsx`

---

### 4. Execução Otimista (Formulário) — `TransactionGrid.tsx`

| Item | Status | Detalhes |
|------|--------|----------|
| Parse ao pressionar Enter | ✅ OK | `handleInsert` → `parseCliInput()` |
| Validação de valor > 0 | ✅ OK | Early return se `!parsed.amount` ou `<= 0` |
| Categoria obrigatória | ✅ OK | Early return se `!matchedCategory` |
| Account obrigatória | ✅ OK | Early return se `!finalAccountId` |
| Criação da transação via API | ✅ OK | Chama `onCreateTransaction(data)` |
| Limpeza do input após inserção | ✅ OK | `setCliInput("")`, reseta `notes`, `reminderDate`, `recurrenceType`, `installmentCount` |
| Foco volta para o input | ✅ OK | `cliRef.current?.focus()` |
| Suporte a parcelamento | ✅ OK | `recurrenceType === "installment"` com `totalInstallments` |
| Suporte a recorrência | ✅ OK | `recurrenceType === "recurring"` com 12 meses |
| Modo escuro nos controles | ✅ OK | Consistentemente aplicado |

⚠️ **Observação:** A execução não é puramente "otimista" — o `handleInsert` faz `await onCreateTransaction(data)` antes de limpar o input. Uma abordagem verdadeiramente otimista limparia o campo imediatamente e depois trataria erros. Também não há `try/catch` — se a API falhar, o erro será um rejection não tratado e os campos **não** serão limpos (comportamento desejável, mas sem feedback de erro).

**Arquivo:** `apps/web/src/components/TransactionGrid.tsx`

---

### 5. Internacionalização (i18n)

| Chave | pt | en | Status |
|-------|----|----|--------|
| `cli_placeholder` | `/- 15,50 Café @alimentação #hoje` | `/- 15.50 Coffee @food #today` | ✅ OK |
| `cli_no_description` | `Sem descrição` | `No description` | ✅ OK |
| `cli_map_to` | `Mapear para:` | `Map to:` | ✅ OK |
| `cli_default_description` | `Transação rápida` | `Quick transaction` | ✅ OK |

**Arquivos:** `apps/web/src/i18n/pt.json`, `apps/web/src/i18n/en.json`

---

### 6. Testes Automatizados

| Item | Status | Detalhes |
|------|--------|----------|
| Testes unitários para `cliParser.ts` | ❌ Ausente | Nenhum arquivo `*.test.*` ou `__tests__` encontrado |
| Testes unitários para `fuzzyMatch.ts` | ❌ Ausente | Nenhum arquivo `*.test.*` ou `__tests__` encontrado |
| Testes de integração do tooltip | ❌ Ausente | Não verificado |

---

## 📊 Resumo

| Categoria | Total | OK | ❌ Ausente |
|-----------|-------|----|------------|
| Motor de Parsing | 14 | 14 | 0 |
| Fuzzy Match | 6 | 6 | 0 |
| Tooltip Vivo | 10 | 10 | 0 |
| Execução (Form) | 10 | 9 | 1 (tratamento de erro na API) |
| i18n | 4 | 4 | 0 |
| Testes | 3 | 0 | 3 |
| **Total** | **47** | **43** | **4** |

### 🔢 Itens Pendentes (não críticos)

1. **Testes unitários** para `cliParser.ts` e `fuzzyMatch.ts` — especialmente importante para o parser de data e o fuzzy match de categorias, que têm múltiplos casos de borda.
2. **Tratamento de erro** no `handleInsert` — um `try/catch` com `showToast` para feedback visual em caso de falha da API.
3. **Testes de integração** para o fluxo completo do tooltip com o componente.

---

## 💡 Observações Finais

- A implementação segue **fielmente o planejamento técnico** definido no `01-planejamento.md`.
- O parser foi integrado diretamente no `TransactionGrid.tsx` (e não num componente `TransactionRow.tsx` separado como o plano sugeria), o que é uma decisão acertada dado que o grid já continha toda a lógica de estado.
- O `fuzzyMatchCategory` usa uma abordagem progressiva (exato → startsWith → includes) que cobre bem os casos de uso sem adicionar dependências externas.
- A UI do tooltip está bem resolvida com suporte a tema claro/escuro, animações e feedback visual para categoria não encontrada.
- A funcionalidade está **pronta para uso**; os itens pendentes são refinamentos de qualidade (testes e tratamento de erro) que não bloqueiam a entrega.
