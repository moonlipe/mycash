# Revisão da Implementação — Sprint 03

## Checklist por User Story

### US05 — Motor de Inserção Rápida e Teclado Fluido
| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Botão `+` (Verde) e `-` (Vermelho) alternam tipo | ✅ | Ícones +/⇄/-, estilizados com cores de tipo |
| 2 | Valor formata automático em moeda local (R$) | ✅ | `formatCurrencyInput` / `parseCurrencyInput` com formatação R$ em tempo real |
| 3 | Enter no último campo envia POST /transactions | ✅ | Form `onSubmit` dispara `handleInsert` |
| 4 | Estado limpo após save; foco volta à "Descrição" | ✅ | `descRef.current?.focus()` após reset dos campos |

### US06 — Transações Recorrentes e Parcelamentos
| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Gatilho "Mais opções" expande painel | ✅ | Botão ChevronDown/ChevronUp |
| 2 | Painel com Nota | ✅ | Input de texto `notes` |
| 3 | Painel com Lembrete | ✅ | Campo `reminderDate` (date picker) |
| 4 | Parcelamento: definir N parcelas (ex: 1/12) | ✅ | Seletor 2x-48x; backend envia ao backend |
| 5 | Backend gera N registros com data mês a mês | ✅ | `addMonths()` no loop de inserts |
| 6 | Sufixo `(i/N)` na descrição (ex: CONSORCIO MOTO (1/12)) | ✅ | Apenas parcelamento, não recorrência |
| 7 | Recorrência Fixa: "Repetir indefinidamente" | ✅ | Backend gera 12 registros (próximos 12 meses) |
| 8 | Valor por parcela semântica clara | ✅ | Label `installment_value_hint` mostra valor por parcela |

### US07 — Modal de Confirmação de Alteração em Lote
| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Modal ao alterar transação recorrente | ✅ | `RecurrenceModal` com action `edit` |
| 2 | Modal ao deletar transação recorrente | ✅ | `RecurrenceModal` com action `delete` |
| 3 | Opção "Alterar apenas esta" | ✅ | `scope: "single"` no backend PUT/DELETE |
| 4 | Opção "Alterar a partir desta" | ✅ | `scope: "future"` no backend PUT/DELETE |
| 5 | Modal de confirmação para exclusão avulsa | ✅ | Modal simples para transações sem recorrência |
| 6 | Frontend possui ação de edição nas linhas | ✅ | Botão lápis (Pencil) em cada linha, abre EditModal |

### Banco de Dados
| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | `recurrence_id` — identificador do grupo | ✅ | Tipo `text` (consistente com demais IDs) |
| 2 | `installment_number` — número da parcela | ✅ | `integer` |
| 3 | `total_installments` — total de parcelas | ✅ | `integer` |
| 4 | `notes` — texto livre | ✅ | `text` |
| 5 | `reminder_date` — data de lembrete | ✅ | `text` (nullable) |
| 6 | Índice em `recurrence_id` | ✅ | `transactions_recurrence_idx` |

### Backend
| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | POST / — criar transação avulsa | ✅ | |
| 2 | POST / — criar parcelamento | ✅ | Insere individualmente (evita `too many SQL variables` do D1) |
| 3 | POST / — criar recorrência fixa | ✅ | 12 registros mensais |
| 4 | PUT /:id — editar com scope single | ✅ | Desvincula da recorrência ao editar individual |
| 5 | PUT /:id — editar com scope future | ✅ | Atualiza registros futuros com mesmo `recurrence_id` |
| 6 | DELETE /:id — excluir com scope single/future | ✅ | Soft-delete com `deletedAt` |
| 7 | PATCH /:id/toggle-paid | ✅ | Inalterado |