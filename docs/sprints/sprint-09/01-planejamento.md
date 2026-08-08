**Fluxo de Caixa Mensal e Patrimônio/Liquidez Atual**

Ponto crucial de psicologia financeira e arquitetura de produto. Existe uma diferença vital entre **Fluxo de Caixa Mensal** (o que entra e sai naquele mês específico) e **Patrimônio/Liquidez Atual** (quanto dinheiro eu realmente tenho na conta neste exato momento). Olhar para o topo do ecrã e ver um balanço positivo de +R$ 30,00 no mês é bom, mas o utilizador precisa de saber se o saldo real da sua conta bancária está positivo ou no vermelho antes de passar o cartão.

Como a listagem é mensal e multi-conta, misturar o saldo acumulado histórico ali dentro causaria confusão visual.

Damos as boas-vindas ao planeamento da **Sprint 09: Motor de Saldos e Consolidação Bancária**.

---

# 🚀 Planejamento Técnico: Sprint 09

**Meta da Sprint:** Desenvolver o motor de agregação histórica de saldos e criar os pontos de contacto visuais para o utilizador acompanhar o seu saldo acumulado geral e por conta.

## 📋 Backlog da Sprint 09 (User Stories)

### US18 - API de Saldos Consolidados (Backend)

> **Como** API do sistema,
> **Quero** calcular o saldo real e atualizado de cada conta somando o saldo inicial aos lançamentos históricos,
> **Para que** o frontend possa exibir a saúde financeira real do utilizador independente do mês selecionado.

* **Critérios de Aceitação:**
* **Cálculo Matemático Real:** O saldo atual de uma conta deve ser:

$$\text{Saldo Atual} = \text{Saldo Inicial} + \sum(\text{Receitas}) - \sum(\text{Despesas})$$


* **Filtro de Efetivação (Opcional/Configurável):** O cálculo deve considerar apenas transações com `deletedAt IS NULL` e, idealmente, transações marcadas como pagas/recebidas (`paid = true`).
* **Performance:** Criar um endpoint otimizado `GET /accounts/balances` que resolva essa agregação no SQLite (Cloudflare D1) numa única query para evitar o problema de N+1.

---

## 🛠️ Implementação do Backend (Hono.js + Drizzle ORM)

O **Arquiteto de Software** desenhou uma query de agregação utilizando `subqueries` para que o Cloudflare D1 processe o saldo acumulado na velocidade da luz:

```typescript
// apps/api/src/routes/accounts.ts

app.get('/balances', authMiddleware, async (c) => {
  const userId = c.get('userId');

  // Query que agrupa os valores por conta e calcula o saldo atualizado
  const accountBalances = await db.select({
    id: accounts.id,
    name: accounts.name,
    color: accounts.color,
    type: accounts.type,
    initialBalance: accounts.initialBalance,
    // Soma de receitas pagas
    totalIncome: sql<number>`TOTAL(CASE WHEN ${transactions.type} = 'income' AND ${transactions.paid} = 1 THEN ${transactions.amount} ELSE 0 END)`,
    // Soma de despesas pagas
    totalExpense: sql<number>`TOTAL(CASE WHEN ${transactions.type} = 'expense' AND ${transactions.paid} = 1 THEN ${transactions.amount} ELSE 0 END)`,
  })
  .from(accounts)
  .leftJoin(transactions, eq(accounts.id, transactions.accountId))
  .where(
    and(
      eq(accounts.userId, userId),
      isNull(accounts.deletedAt),
      sql`${transactions.deletedAt} IS NULL` // Garante que transações apagadas não entrem no cálculo
    )
  )
  .groupBy(accounts.id);

  // Mapeia os resultados calculando o saldo final líquido (em centavos)
  const items = accountBalances.map(acc => {
    const currentBalanceCents = acc.initialBalance + acc.totalIncome - acc.totalExpense;
    return {
      id: encodeId(acc.id),
      name: acc.name,
      color: acc.color,
      type: acc.type,
      currentBalance: currentBalanceCents / 100 // Converte para a moeda principal
    };
  });

  return c.json({ items });
});

```

---

## 🏃‍♂️ Quadro Kanban: Sprint 09 Iniciada

O time de backend já está a isolar a rota, enquanto o design de UI estuda o melhor posicionamento desse dado crítico.

```text
+------------------------------------------------------------+
|                        KANBAN - SPRINT 09                  |
+---------------------+-------------------+------------------+
| TO DO               | IN PROGRESS       | DONE             |
+---------------------+-------------------+------------------+
| [US19] Interface de | [US18] Endpoint   |                  |
| Saldos por Conta    | GET /accounts     |                  |
| (Frontend)          | /balances         |                  |
+---------------------+-------------------+------------------+

```

---
