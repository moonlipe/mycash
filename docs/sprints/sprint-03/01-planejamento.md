# 🚀 Planejamento Técnico: Sprint 03

**Meta da Sprint:** Dar inteligência e profundidade ao motor de lançamentos. Implementar a criação real por meio da linha fixa do topo, suportar transações com recorrências/parcelamentos e criar o modal de decisões para edições em lote.

---

## 📋 Backlog da Sprint 03 (User Stories)

### US05 - Motor de Inserção Rápida e Teclado Fluido

Este Use Case já foi implementado, portanto, revise e valide se a US05 está bem implementada e atende aos critérios de aceitação a seguir.

> **Como** um usuário focado em produtividade,
> **Quero** preencher os campos da linha fixa do topo e salvar pressionando "Enter" ou clicando no `+`,
> **Para que** eu possa registrar meus gastos diários em menos de 5 segundos.

* **Critérios de Aceitação:**
* O botão `+` (Verde) e `-` (Vermelho) no canto esquerdo da linha deve alternar o tipo da transação antes de salvar.
* O campo de valor deve formatar automaticamente em tempo real para moeda local ($R\$$).
* Ao pressionar `Enter` no último campo (ou clicar no check/plus da linha), os dados devem ser enviados via `POST /transactions` com o ID da conta correta (ex: CAIXA).
* O estado da linha deve ser limpo imediatamente após o salvamento otimista, jogando o foco do teclado de volta para o campo "Descrição".


### US06 - Transações Recorrentes e Parcelamentos (Backend & Banco)

> **Como** um usuário que possui contas fixas (ex: Aluguel) ou compras parceladas (ex: Consórcio Moto),
> **Quero** ter a opção de expandir a linha para definir se o lançamento se repete ou é parcelado,
> **Para que** eu não precise cadastrar a mesma transação manualmente todos os meses.

* **Critérios de Aceitação:**
* Abaixo da linha principal de inserção, haverá o gatilho "Mais opções", que expande o painel de **Lembrete**, **Nota** e **Repetir Transação**.
* **Parcelamento:** Deve permitir definir o número de parcelas (ex: Iniciar na parcela 1 de 12). O backend deve gerar $N$ registros no banco de dados automaticamente, incrementando a data mês a mês e adicionando o sufixo no texto (ex: `CONSORCIO MOTO (1/12)`).
* **Recorrência Fixa:** Opção "Repetir indefinidamente". O backend gera os lançamentos para os próximos 12 meses programados.

### US07 - Modal de Confirmação de Alteração em Lote

> **Como** um usuário que está editando ou excluindo uma transação que faz parte de uma série recorrente,
> **Quero** decidir se a alteração se aplica apenas ao mês atual ou a toda a cadeia futura,
> **Para que** meu histórico retroativo permaneça intacto.

* **Critérios de Aceitação:**
* Ao alterar o valor, descrição ou deletar uma transação que possui vínculo recorrente, o sistema deve abrir o modal de confirmação.
* Opções: **"Alterar apenas esta"** ou **"Alterar a partir desta"**.

---

## 📐 Adaptações no Banco de Dados (Drizzle ORM)

Para suportar a inteligência de recorrências que as imagens demandam, o **DBA** mapeou a necessidade de duas novas colunas na tabela de `transactions`:

```typescript
// Acréscimo técnico ao schema da tabela 'transactions'
recurrence_id: integer('recurrence_id', { mode: 'bigint' }), // Identifica o grupo da recorrência (SnowflakeID)
installment_number: integer('installment_number'),          // Ex: 1, 2, 3...
total_installments: integer('total_installments'),          // Ex: 12
notes: text('notes'),                                       // Campo de texto livre

```

---
