Esta é a documentação técnica oficial de arquitetura do sistema de finanças pessoais. Este documento serve como o **Guia Orientador Técnico-Funcional** para desenvolvedores que desejam contribuir com o projeto *open-source* ou realizar a auto-hospedagem (*self-hosting*).

---

# 📖 Documento de Orientação Arquitetural e Funcional

## 1. Visão Geral do Sistema

O objetivo principal é entregar uma aplicação de controle financeiro pessoal extremamente leve, veloz e focada na **edição inline de transações** (débitos, créditos e transferências) com um motor robusto de recorrências.

O projeto foi desenhado sob a filosofia *Plug-and-Play* com infraestrutura descentralizada na borda (*Edge Computing*), minimizando ao máximo a dependência de serviços externos pagos. Uma pessoa física deve ser capaz de implantar o ecossistema completo utilizando apenas a camada gratuita da Cloudflare ou um servidor doméstico simples.

---

## 2. Pilha Tecnológica (Tech Stack)

A arquitetura adota uma separação rígida entre as camadas de apresentação e lógica de negócios através de uma API RESTful.

```
                  +-----------------------------------+
                  |      Frontend (React / Vite)      |
                  +-----------------+-----------------+
                                    |
                                    | HTTPS (JSON)
                                    v
                  +-----------------+-----------------+
                  |      Backend (Hono.js / Worker)   |
                  +----+------------+------------+----+
                       |            |            |
         SQL Protocols |            | S3 API     | SMTP / HTTP
                       v            v            v
        +--------------+---+   +----+--------+  ++-------------+
        | Cloudflare D1    |   | Cloudflare  |  | SendGrid,    |
        | / PostgreSQL /   |   | R2 / MinIO  |  | Resend ou    |
        | SQLite Local     |   | (Storage)   |  | SMTP Local   |
        +------------------+   +-------------+  +--------------+

```

### Frontend

* **Framework Principal:** React (via Vite) em TypeScript.
* **Estilização:** Tailwind CSS (foco em utilitários purificados para alta performance).
* **Gerenciamento de Tabelas:** TanStack Table (React Table v8) para o desenvolvimento da matriz de edição inline com navegação via teclado.

### Backend & API

* **Runtime:** Cloudflare Workers (V8 Isolation Engine) ou Node.js/Bun para instâncias locais.
* **Framework Web:** Hono.js (ultra-rápido, tipado e com suporte nativo ao ecossistema Cloudflare).
* **ORM / Camada de Abstração:** Drizzle ORM (permite alternar entre drivers SQL mantendo a compatibilidade de sintaxe).

### Armazenamento & Infraestrutura

* **Banco de Dados:** Cloudflare D1 (Ambiente Cloudflare) com suporte nativo via variáveis de ambiente para PostgreSQL ou SQLite local.
* **Storage (Anexos):** Compatibilidade estrita com a API S3 (`@aws-sdk/client-s3`), rodando em Cloudflare R2 ou servidores locais MinIO.
* **E-mail (Opcional):** Interface genérica para SMTP tradicional ou microsserviços modernos (Resend, SendGrid, Mailjet).

---

## 3. Arquitetura de Identificadores (Segurança de Dados)

Para impedir o vazamento de metadados de volume ou ID sequenciais (evitando ataques de enumeração na API e scraping), o sistema utiliza uma camada dupla de abstração de dados de identidade:

1. **Geração no Backend (SnowflakeID):** O ID persistido no banco de dados é um ID gerado sob o algoritmo Snowflake do Twitter. Ele gera um identificador numérico de 64 bits baseado em timestamp, eliminando a necessidade de chaves auto-incrementais sequenciais.
2. **Exposição no Frontend (Hashids):** Antes que qualquer Payload JSON saia do Backend em direção ao navegador do usuário, o SnowflakeID numérico passa por um algoritmo de ofuscação bidirecional chamado `Hashids`. O usuário e o frontend interagem apenas com hashes alfanuméricas curtas (ex: `15432890` vira `3k9b7e`). No retorno da requisição, o backend decodifica a hash para o número Snowflake original antes de consultar o banco.

---

## 4. Gestão de Arquivos e Políticas de Upload

A manipulação de comprovantes e notas fiscais segue diretrizes rígidas de segurança na borda para mitigar ataques de negação de serviço (DoS) por esgotamento de disco:

* **Tamanho Limite:** Máximo de **5 MB** por arquivo. Arquivos acima desse limite são rejeitados no nível do gateway HTTP da API (Content-Length check).
* **Filtro MIME-Type Estrito:**
* `image/jpeg` / `image/png` / `image/webp`
* `application/pdf`


* **Abstração S3:** O backend consome as variáveis globais de ambiente (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`). Se o endpoint apontar para o Cloudflare R2, o tráfego de saída (*egress*) terá custo zero. Se apontar para um container MinIO local, o comportamento da API permanece idêntico.

---

## 5. Autenticação e Sessão Local

A fim de remover intermediários externos (como Clerk ou Auth0) do fluxo básico para quem busca *self-hosting* absoluto, o controle de acesso é interno:

* **Armazenamento de Senha:** Utilização obrigatória da **WebCrypto API** nativa do runtime para geração de hashes (criptografia assíncrona não bloqueante usando algoritmos baseados em salt complexo, como PBKDF2 ou Scrypt). Senhas nunca tocam o banco de dados em texto limpo.
* **Restrição de Unicidade:** O campo `email` na tabela `users` é indexado como chave `UNIQUE` no banco de dados. Tentativas de cadastro duplicado disparam um erro SQL tratado pelo backend como `HTTP 409 Conflict`.
* **Estado de Sessão:** Controle por JSON Web Tokens (**JWT**) transmitidos e armazenados em cookies HTTP protegidos com as flags `HttpOnly`, `Secure` e `SameSite=Strict`.
* **Proteção Anti-Bot:** Em ambientes de produção, os endpoints de login e registro exigem validação via **Cloudflare Turnstile** antes de processar a requisição. O widget não é renderizado em `localhost`, mantendo a experiência de desenvolvimento fluida.

---

## 6. Fluxo de Integração e Onboarding Automatizado

Com o intuito de simular uma experiência puramente *Plug-and-Play*, o sistema gerencia o estado inicial de novas contas sem requerer passos extras do usuário final. No momento exato em que a criação de um usuário é validada no banco de dados, um gatilho (*Database Transaction*) povoa a conta com a seguinte estrutura inicial padrão:

1. **Tabela `accounts`:** Registra uma conta financeira inicial nomeada **"CAIXA"**.
2. **Tabela `categories`:** Instancia duas categorias genéricas e primárias categorizadas por seu comportamento de fluxo:
* Tipo Crédito (Income): **"RECEITAS"**
* Tipo Débito (Expense): **"DESPESAS"**



```
 [ Cadastro de Usuário ] 
          │
          ▼
 ┌─────────────────────────┐
 │  Valida E-mail Único    │
 └────────┬────────────────┘
          │ (Sucesso)
          ▼
 ┌─────────────────────────┐
 │ Grava Hash da Senha     │
 └────────┬────────────────┘
          │
          ▼
 ┌────────────────────────────────────────┐
 │ TRANSACTION (Garante Consistência)     │
 │ ├─► Cria Conta Padrão: "CAIXA"         │
 │ ├─► Cria Categoria: "RECEITAS" (In)    │
 │ └─► Cria Categoria: "DESPESAS" (Out)   │
 └────────────────────────────────────────┘

```

---

## 7. Acoplamento de E-mail Descentralizado

O módulo de disparo de e-mails é uma **dependência opcional**. O sistema checa a presença das variáveis de configuração de e-mail na inicialização do microsserviço:

* **Variáveis Ausentes:** A aplicação desativa silenciosamente recursos que necessitam de transporte externo. A interface do usuário esconde ou desativa elementos visuais como "Esqueci minha senha" e exibe logs internos de aviso.
* **Variáveis Presentes:** O backend injeta o driver correspondente (SMTP genérico, API Resend ou API SendGrid) liberando fluxos de recuperação de conta via chaves ou tokens temporários de expiração rápida.

---

## 8. Estrutura Base de Dados (Drizzle / SQL)

Abaixo encontra-se a representação abstrata da modelagem necessária na camada de persistência compatível com SQLite (D1) e PostgreSQL:

### Tabela `users`

* `id` (text/bigint, Primary Key) - *SnowflakeID*
* `email` (text, Unique, Index)
* `password_hash` (text)
* `created_at` (timestamp)

### Tabela `accounts`

* `id` (text/bigint, Primary Key) - *SnowflakeID*
* `user_id` (text/bigint, Foreign Key -> users.id)
* `name` (text) - *Ex: "CAIXA", "Banco Inter"*
* `initial_balance` (integer/numeric) - *Armazenado em centavos para evitar ponto flutuante*

### Tabela `categories`

* `id` (text/bigint, Primary Key) - *SnowflakeID*
* `user_id` (text/bigint, Foreign Key -> users.id)
* `name` (text) - *Ex: "RECEITAS", "Condomínio"*
* `type` (text) - *Valores restritos: 'income' | 'expense' | 'transfer'*

### Tabela `transactions`

* `id` (text/bigint, Primary Key) - *SnowflakeID*
* `user_id` (text/bigint, Foreign Key -> users.id)
* `account_id` (text/bigint, Foreign Key -> accounts.id)
* `category_id` (text/bigint, Foreign Key -> categories.id)
* `description` (text)
* `amount` (integer/numeric) - *Armazenado em centavos*
* `date` (date/timestamp)
* `is_paid` (boolean)

### Tabela `recurrence_rules`

* `id` (text/bigint, Primary Key)
* `parent_transaction_id` (text/bigint, Foreign Key -> transactions.id)
* `frequency` (text) - *'monthly' | 'yearly'*
* `interval` (integer) - *Ex: a cada '1' mês*
* `end_date` (date/timestamp, Nullable)

---

## 9. Diretrizes para Contribuição (Desenvolvedores)

1. **Navegação por Teclado:** Qualquer componente introduzido na tabela do Frontend (`src/components/TransactionGrid`) deve escutar eventos `onKeyDown`. O comportamento esperado do usuário é operar transações usando `Tab`, `Shift+Tab`, `Enter` para salvar e setas de direção para mover-se entre as células do grid.
2. **Testes de Recorrência:** Modificações no motor de repetição no backend (`src/services/recurrence`) exigem a execução e atualização da suíte de testes unitários (`Vitest`). Casos de teste bissextos e transições de parcelas individuais vs. parcelas em lote devem manter 100% de cobertura.


