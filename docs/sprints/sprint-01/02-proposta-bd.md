A equip de engenharia de dados (DBA, Backend e Engenheiro Sénior) reuniu-se para refinar o *schema* inicial, aplicando as melhores práticas de mercado para garantir auditoria, performance e segurança, sem perder a flexibilidade de rodar tanto em Cloudflare D1 (SQLite) como em PostgreSQL.

Apresentamos a proposta refinada em formato de **RFC (Request for Comments)** para a sua revisão e implementação.

---

# 🗄️ Proposta Refinada do Banco de Dados (Schema RFC)

### 💡 Decisões Globais da Equipe Técnica:

1. **IDs como BIGINT:** No frontend trafega apenas hashids, podemos usar o poder máximo do BigInt nativo no ecossistema do backend e otimizar ainda mais o banco de dados.
2. **Campos de Auditoria:** Todas as tabelas passam a ter `created_at` e `updated_at` gerados automaticamente.
3. **Estratégia de Soft Delete (`deleted_at`):** Adicionámos o campo `deleted_at` (nulo por padrão) nas tabelas principais. O Engenheiro Sénior recomendou isto para evitar que uma eliminação acidental destrua o histórico financeiro do utilizador. As consultas padrão vão filtrar apenas registos onde `deleted_at IS NULL`.
4. **Valores em Cêntimos (Inteiros):** Todos os campos monetários serão estritamente `INTEGER`. Um saldo de R$ 100,50 será guardado como `10050`. Isto elimina erros de arredondamento de ponto flutuante.

---

## 📐 Definição Detalhada das Tabelas

### 1. Tabela: `users` (Gestão de Contas de Acesso)

*Refinamento do DBA:* Adicionado o campo `status` para permitir bloqueio de contas ou fluxos de verificação futuros, e `last_login_at` para segurança.

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,                 -- SnowflakeID
    email TEXT UNIQUE NOT NULL,          -- Índice Único, caixa baixa (lowercase)
    password_hash TEXT NOT NULL,         -- Hash gerado via WebCrypto API
    status TEXT DEFAULT 'active',        -- 'active' | 'suspended' | 'pending'
    last_login_at TIMESTAMP,             -- Auditoria de segurança
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP                 -- Soft delete
);

```

* **Índices:** Criado um índice único e explícito em `email` para buscas ultra-rápidas no login.

### 2. Tabela: `accounts` (Contas Bancárias / Carteiras)

*Refinamento do Backend:* Adicionado o campo `color` e `type` para enriquecer a UI do frontend sem complicar o lançamento, e `currency` para precaver uma futura internacionalização.

```sql
CREATE TABLE accounts (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,               -- FK -> users.id
    name TEXT NOT NULL,                  -- Ex: "CAIXA", "Nubank"
    type TEXT DEFAULT 'checking',        -- 'checking' (corrente) | 'savings' (poupança) | 'cash' (dinheiro)
    color TEXT DEFAULT '#3b82f6',        -- Cor em HEX para renderização no Frontend
    initial_balance INTEGER DEFAULT 0,   -- Saldo inicial em cêntimos
    currency TEXT DEFAULT 'BRL',         -- Moeda padrão
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,                -- Soft delete
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

```

* **Índices:** Índice composto em `(user_id, deleted_at)` para que o sistema liste as contas do utilizador logado instantaneamente.

### 3. Tabela: `categories` (Classificação de Lançamentos)

*Refinamento do UX/UI + DBA:* Adicionados campos de customização visual (`color` e `icon`). O utilizador poderá bater o olho na transação e identificar a categoria pela cor ou ícone associado.

```sql
CREATE TABLE categories (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,               -- FK -> users.id
    name TEXT NOT NULL,                  -- Ex: "RECEITAS", "Alimentação"
    type TEXT NOT NULL,                  -- 'income' (crédito) | 'expense' (débito)
    color TEXT DEFAULT '#6b7280',        -- Cor visual da categoria
    icon TEXT DEFAULT 'tag',             -- Identificador do ícone (ex: Lucide Icons)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,                -- Soft delete
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

```

* **Índices:** Índice composto em `(user_id, type)` para otimizar os filtros de seleção no ecrã de lançamentos rápidos.

---

## 🗣️ Notas e Justificações dos Papéis

* **Engenheiro Sênior:** *"A inclusão do `deleted_at` garante conformidade com boas práticas de segurança de dados. Se o utilizador apagar uma conta sem querer, o suporte (ou o próprio utilizador no banco) consegue reverter alterando o campo para NULL, sem quebrar os registos históricos."*
* **Backend Developer:** *"Ao mapear os IDs como BIGINT, o nosso código no Hono.js fica limpo. A biblioteca Hashids lida perfeitamente com a codificação de volta para a hash que vai para o browser."*
* **DBA:** *"Garantimos que todas as chaves estrangeiras (`FOREIGN KEY`) possuem a cláusula `ON DELETE CASCADE`. Se um utilizador decidir apagar permanentemente a sua conta (`Hard Delete` na tabela `users`), o banco de dados limpa automaticamente todas as contas e categorias associadas, evitando dados órfãos e lixo no banco de dados."*

---

# ATENÇÃO PARA O USO DE SNOWFLAKEID NO BACKEND E HASHID NO FRONTEND

A equipe inteira de engenharia acabou de ter aquele momento *"clique"* aqui na sala de reunião.

Se o Frontend trafega **apenas** `Hashids` (que são strings por natureza), o limite do `JSON.parse()` no navegador deixa de ser um problema. Com isso, podemos usar o poder máximo do **`BigInt`** nativo no ecossistema do backend e otimizar ainda mais o banco de dados.

O **DBA** e o **Backend Developer** já ajustaram o fluxo imediatamente. Veja como fica a arquitetura perfeita que você desenhou:

---

### 🔄 O Fluxo do ID (Ciclo de Vida de uma Requisição)

```
[Frontend] -- (Envia Hashid: "3k9b7e") --> [API Hono.js Middleware]
                                                   │
                                                   ▼ (Decodifica)
[Drizzle ORM / Banco] <-- (Usa BigInt: 15432890n) ─┘

```

1. **Entrada (Inbound):** O Frontend faz um `PUT /transactions/3k9b7e` com a alteração *inline*. O middleware do Hono.js intercepta a rota, pega a string `"3k9b7e"`, decodifica para o `BigInt` `15432890n` e passa para a lógica de negócio purificada.
2. **Saída (Outbound):** O banco retorna o registro com o ID `15432890n`. Antes do Hono dar o `return c.json()`, o serializador transforma o ID na hash `"3k9b7e"`.

---

### 🗄️ Ajuste no Schema do Banco de Dados (Melhoria de Performance)

Como agora usamos `BigInt` internamente, o **DBA** comemorou: **ganhamos performance de indexação**. Buscar e indexar números no banco de dados é consideravelmente mais rápido do que comparar strings de texto.

* **No Cloudflare D1 (SQLite):** Mudamos o tipo de `TEXT` para `INTEGER`. No SQLite, a coluna `INTEGER` armazena automaticamente inteiros de até 8 bytes (64 bits), o que cobre o tamanho do Snowflake perfeitamente.
* **No PostgreSQL (Self-hosted):** Mudamos para o tipo `BIGINT`.

O nosso arquivo do Drizzle ORM para a tabela de usuários, por exemplo, fica limpo e performático assim:

```typescript
// packages/database/schema.ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  // Drizzle trata inteiros de 64 bits do SQLite como BigInt no JS
  id: integer('id', { mode: 'bigint' }).primaryKey(), 
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  // ... campos de auditoria
});

```

---

### 🏆 Vantagens dessa Abordagem

* **Performance:** Consultas com chaves primárias e estrangeiras numéricas (`INT64`) rodam na velocidade da luz.
* **Segurança Absoluta:** O usuário malicioso não consegue adivinhar o ID da próxima transação por incremento (ataque IDOR), pois só vê a hash alfanumérica.
* **Código Limpo:** O Frontend não precisa de nenhuma biblioteca complexa de criptografia ou manipulação de tipos de número, ele apenas consome e cospe strings.

