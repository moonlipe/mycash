# Revisão da Sprint 02

## Checklist de Implementação vs Planejamento

### US03 - Layout Base Responsivo, Temas e Localização

| Item | Status | Observação |
|---|---|---|
| `react-i18next` instalado e configurado | ✅ | `src/i18n/index.ts` + `pt.json` + `en.json` |
| Dicionários PT/EN com zero strings fixas | ✅ | Todas as strings via `t()` |
| Chaves de erro do backend traduzidas (`errors.*`) | ✅ | Backend retorna chaves, frontend traduz |
| Tema detectado do SO (`prefers-color-scheme`) | ✅ | `ThemeContext.getInitialTheme()` |
| Tema salvo no `localStorage` | ✅ | `localStorage.setItem("theme", theme)` |
| `darkMode: "class"` no Tailwind | ✅ | `tailwind.config.js` |
| Script anti-flash no `<head>` do HTML | ✅ | `index.html` com script inline |
| Alternador Tema (Sol/Lua) no TopBar | ✅ | `Sun` / `Moon` icons |
| Seletor Idioma (PT/EN) no TopBar | ✅ | `Globe` icon + toggle |
| **Bottom Navigation Bar para Mobile** | ✅ | `BottomNav.tsx` com Transações, Nova Transação, Configurações |
| **Header completo para Desktop** | ✅ | TopBar com tema/idioma/logout visível em desktop, BottomNav em mobile |

### US04 - Listagem Mensal de Transações

| Item | Status | Observação |
|---|---|---|
| `GET /transactions?month=X&year=Y` | ✅ | Filtra por `dueDate` no mês |
| Resposta JSON com `{ summary, items }` | ✅ | `summary.income`, `summary.expense`, `summary.balance` |
| `POST /transactions` | ✅ | Criação com validação + decodificação hashids |
| `PATCH /transactions/:id/toggle-paid` | ✅ | Com middleware hashid |
| **Paginação / limite de dados** | ✅ | Backend com `page`/`limit`, resposta inclui `{ summary, items, pagination }` |
| **Uso do TanStack Table** | ✅ | `useReactTable` com `ColumnDef` e `flexRender` no desktop |

### 📅 Refinamento da US04

| Item | Status | Observação |
|---|---|---|
| Mês e ano atuais como padrão | ✅ | `new Date().getMonth() + 1` |
| Seletor compacto `[ < ] Junho, 2026 [ > ]` | ✅ | `MonthSelector` componente |
| Disparo de requisição ao mudar mês | ✅ | `useEffect` em `fetchData` |

### 🎨 Design Visual (UI/UX)

| Item | Status | Observação |
|---|---|---|
| Mini-Fita de Balanço (3 blocos lado a lado) | ✅ | `BalanceRibbon` componente |
| Receitas: `text-emerald-600` (light) / `text-emerald-400` (dark) | ✅ | |
| Despesas: `text-rose-600` (light) / `text-rose-400` (dark) | ✅ | |
| Balanço em negrito, cor conforme sinal | ✅ | `font-bold` + cor dinâmica |
| Transação pendente: `opacity-50` / dark `opacity-60` | ✅ | |
| Transição suave: `transition-opacity duration-200` | ✅ | |
| Botão Check: área 44x44px (`h-11 w-11`) | ✅ | |
| Pendente: círculo vazado (`Circle` icon) | ✅ | |
| Pago: círculo preenchido + check branco | ✅ | `Check` icon + cor dinâmica |

### ⚡ Atualização Otimista (Optimistic UI)

| Item | Status | Observação |
|---|---|---|
| Alteração visual imediata no toggle | ✅ | `setItems` antes do fetch |
| Disparo em segundo plano (`PATCH`) | ✅ | `api.togglePaid` após otimismo |
| Reversão em caso de erro | ✅ | Rollback no `catch` |
| **Notificação discreta de erro** | ✅ | Toast via `ToastContext` — aparece em toggle-paid e create com falha |

### 📱 Linha de Inserção Rápida

| Item | Status | Observação |
|---|---|---|
| Formulário fixo no topo do grid | ✅ | |
| Inputs sem bordas (clean) | ✅ | `border-none bg-transparent` |
| Navegação por Tab entre campos | ⚠️ | Funciona naturalmente, sem `tabIndex` explícito |
| Enter para submeter | ✅ | `onSubmit` no form |
| Botão `+` discreto | ✅ | `Plus` icon |

### 🗄️ Itens Adicionais Implementados (fora do escopo original)

| Item | Motivo |
|---|---|
| Campo `dueDate` (data de vencimento) | Surgiu durante refinamento do fluxo |
| Tipo `transfer` (transferência entre contas) | Surgiu durante refinamento do fluxo |
| `GET /accounts` e `GET /categories` | Necessário para dropdowns no formulário |
| Agrupamento por data de vencimento | Solicitação do usuário |
| Saldo diário por grupo | Solicitação do usuário |
| Seletor de conta no formulário | Necessário para criar transações |
| `predev` script para migrations automáticas | Corrige problema da sprint 01 |

---

## ⚠️ Não Conformidades e Observações

### 1. TanStack Table — CORRIGIDO
**Planejado:** `@tanstack/react-table` para o TransactionGrid.
**Corrigido:** Grid migrado para `useReactTable` com `ColumnDef` e `flexRender`. Cabeçalhos e células do desktop renderizados via TanStack Table. Agrupamento por data mantido com lógica manual.

### 2. Paginação no backend — CORRIGIDO
**Planejado:** Endpoint com paginação/limite de dados.
**Corrigido:** `GET /transactions` agora aceita `page` e `limit` (default 50, max 100). Resposta inclui `pagination: { page, limit, total, hasMore }`. Summary calculado sobre todas as transações do mês (não apenas a página). Botão "Carregar mais" no frontend quando `hasMore`.

### 3. Bottom Navigation Bar — CORRIGIDO
**Planejado:** Bottom Nav Bar mobile com 3 ações.
**Corrigido:** `BottomNav.tsx` com ícones para Transações, Nova Transação e Configurações. Visível apenas em mobile (`md:hidden`). Configurações oferece tema, idioma e logout. TopBar simplificado em mobile (apenas título, controles ocultos).

### 4. Notificação de erro na optimistic UI — CORRIGIDO
**Planejado:** Toast discreto quando optimistic update falha.
**Corrigido:** `ToastContext` implementado com toast de erro em `handleTogglePaid` e `handleCreate`. Notificação aparece por 3 segundos com estilo condicional (erro em vermelho, sucesso em verde).

### 5. Filtro por `dueDate` em vez de `date`
**Planejado (escopo):** Filtrar por `transactions.date`.
**Realidade:** Implementado filtro por `transactions.dueDate`. Mudança de escopo não documentada no planejamento. A intenção foi alinhar a listagem mensal à data de vencimento, que é o campo mais relevante para o usuário. Aceito como design correto.

---

## Resumo

| Métrica | Valor |
|---|---|
| Itens planejados | ~25 |
| Itens implementados | 25 |
| Não conformidades | 0 (todas corrigidas ou aceitas como design) |
| Itens adicionais implementados | 6 (dueDate, transfer, accounts/categories endpoints, agrupamento, saldo diário, seletor de conta) |
| Build | ✅ Passa |
| Typecheck | ✅ Passa |
