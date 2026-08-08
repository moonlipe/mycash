# 🚀 Documento de Planejamento Técnico: Sprint 01

**Meta da Sprint:** Estabelecer a base da aplicação (*Walking Skeleton*), incluindo a infraestrutura de banco de dados, o sistema nativo de autenticação/onboarding e o mecanismo de mascaramento de IDs.

* **Foco:** Fundação, Segurança e Infraestrutura de Dados.

---

## 📋 Backlog da Sprint (User Stories)

### US01 - Cadastro de Usuário e Onboarding Automatizado

> **Como** um novo usuário,
> **Quero** criar uma conta utilizando meu e-mail e uma senha segura,
> **Para que** eu possa acessar o sistema imediatamente com uma estrutura financeira inicial pronta para uso.

* **Critérios de Aceitação:**
* O e-mail deve ser validado (formato válido e rejeição de duplicados com HTTP 409).
* A senha deve ter no mínimo 8 caracteres.
* Ao finalizar o cadastro, o sistema deve criar automaticamente uma conta chamada **"CAIXA"** e duas categorias: **"RECEITAS"** (Crédito) e **"DESPESAS"** (Débito).
* O usuário deve ser redirecionado logado para a aplicação.



### US02 - Autenticação e Sessão Protegida

> **Como** um usuário cadastrado,
> **Quero** realizar o login com meu e-mail e senha,
> **Para que** eu possa acessar meus lançamentos financeiros com segurança.

* **Critérios de Aceitação:**
* Login bem-sucedido gera um cookie HTTPOnly contendo o token JWT.
* Tentativas com credenciais inválidas devem retornar uma mensagem genérica por segurança (HTTP 401).



---

## 🛠️ Especificação Técnica por Papel

### 🏗️ Arquiteto de Software & DevOps

* **Estrutura de Repositório:** Monorepo utilizando `pnpm workspaces` dividido em:
* `apps/web`: Frontend React + Vite.
* `apps/api`: Backend Hono.js para Cloudflare Workers.
* `packages/database`: Camada compartilhada do Drizzle ORM.


* **Tarefas de Infraestrutura:**
* Configuração do arquivo `wrangler.toml` para o Cloudflare Worker e vinculação com o banco local/produção Cloudflare D1.
* Configuração das variáveis de ambiente base: `JWT_SECRET`, `HASHIDS_SALT`.



### 🗄️ DBA & Backend Developer

* **Setup do Drizzle ORM:** Configurar o Drizzle para gerar migrações compatíveis com SQLite/D1.
* **Desenvolvimento do Schema (Tabelas Iniciais):**
* Criar as tabelas `users`, `accounts` e `categories` seguindo estritamente as tipagens definidas no documento arquitetural.


* **Geração e Ofuscação de IDs:**
* Implementar o gerador de **SnowflakeID** no momento da inserção (`INSERT`).
* Criar um *Middleware* no Hono.js para interceptar requisições:
* **Inbound (Entrada):** Decodifica hashes recebidas nas rotas para os SnowflakeIDs reais.
* **Outbound (Saída):** Codifica todos os SnowflakeIDs em strings amigáveis usando a biblioteca `hashids` antes de enviar o JSON ao cliente.





### 🛡️ Security Engineer

* **Criptografia de Senhas:** Implementar a função de hash de senhas no Worker utilizando a **WebCrypto API** nativa (evitando bibliotecas pesadas que não rodam na borda, como o `bcrypt` tradicional do Node).
* **Segurança de Cookies:** Configurar a emissão do token JWT com as flags de segurança:
```ts
Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000

```



### 💻 Frontend Developer & UX/UI Designer

* **Interface de Autenticação:** Criar uma tela única (focada em usabilidade e limpa) que alterna entre as abas/visões de "Login" e "Criar Conta".
* **Gerenciamento de Estado de Autenticação:** Implementar um Context do React (`AuthContext`) para gerenciar se o usuário está logado e armazenar os dados básicos de perfil retornados pela API.
* **Validações no Client-side:** Validar campos obrigatórios, formato de e-mail e quantidade mínima de caracteres antes de disparar o gatilho de envio para a API.

---

## 🧪 Matriz de Testes e Qualidade (QA)

Para que as tarefas sejam movidas para "Pronto" (*Done*), elas devem passar pelos seguintes cenários de validação:

| Cenário de Teste | Comportamento Esperado | Status Esperado |
| --- | --- | --- |
| Cadastro com e-mail já existente | Sistema bloqueia e retorna erro amigável de duplicidade. | HTTP 409 Conflict |
| Inserção de senha fraca (< 8 caracteres) | O frontend barra o envio e o backend valida novamente. | Erro de validação |
| Primeiro login do usuário | Verificar no banco se a conta "CAIXA" e as categorias "RECEITAS"/"DESPESAS" foram vinculadas ao novo `user_id`. | Sucesso (Onboarding) |
| Retorno de IDs na API | Inspecionar a aba *Network* do navegador e garantir que nenhum ID numérico sequencial ou cru está exposto no JSON (deve exibir apenas as strings do Hashids). | IDs Ofuscados |

---

## 🏁 Critérios de Pronto globais (Definition of Done - DoD)

1. Código revisado por pelo menos um Engenheiro de Software Sênior via *Pull Request*.
2. Build do monorepo executando com sucesso (sem erros de TypeScript).
3. Migrações de banco de dados (`drizzle-kit generate`) aplicadas e testadas em ambiente local.

---

## 📡 Comunicação Transparente

Toda e qualquer dúvida técnica ou de negócio que impacte o futuro do produto será trazida para nossa Daily ou via RFC (Request for Comments). Não tomar decisões às escuras que possam engessar o motor de transações lá na frente.
