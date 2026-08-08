# MyCash

> **v1.0** — Financeiro pessoal na borda da Cloudflare. MVP completo em produção.

Sistema de controle financeiro pessoal leve, rápido e focado em edição inline de transações com motor robusto de recorrências.

## Objetivo

Aplicação de finanças pessoais desenhada sob a filosofia **Plug-and-Play** com infraestrutura descentralizada na borda (*Edge Computing*), minimizando dependência de serviços externos pagos. Implantável na camada gratuita da Cloudflare ou em servidor doméstico. **Em produção desde Junho/2026.**

## Funcionalidades

### Autenticação e Usuários
- Registro e login com WebCrypto API (PBKDF2 para hash de senhas)
- Recuperação de senha via e-mail
- Perfil do usuário com gerenciamento de sessão

### Gestão de Contas
- CRUD completo de contas bancárias
- Tipos de conta: checking, savings, credit, investment
- Saldo inicial configurável por conta
- Cores customizadas para visualização
- Soft delete para preservação de histórico

### Gestão de Categorias
- CRUD de categorias customizadas
- Ícones e cores personalizáveis
- Separação por tipo (income/expense)
- Onboarding automatizado com categorias padrão

### Transações e Lançamentos
- CRUD completo de transações
- smart CLI: linha de comando financeira inteligente (`/-` e `/+`) com interpretação de tags (`@`, `#`) e preview de saldo
- Edição inline via TanStack Table
- Parcelamento: suporte a múltiplas parcelas com controle de número total
- Recorrência mensal automática via motor de lembretes
- Transferências entre contas
- Toggle de pagamento (isPaid)
- Filtros avançados: busca textual, conta, categoria, tipo, mês/ano
- Paginação com cursor
- Exportação CSV client-side

### Gestão Financeira
- Saldo consolidado por conta (apenas transações pagas e não deletadas)
- Patrimônio Líquido Total no cabeçalho com dropdown
- Visão por conta com lazy loading

### Comprovantes e Anexos
- Upload de comprovantes via URLs pré-assinadas (R2/MinIO)
- Sistema de status: pending/confirmed
- Storage S3-compatible
- Associação por transação

### Lembretes e Notificações
- Sistema de lembretes automáticos por transação
- E-mails assíncronos via `waitUntil`
- Motor de e-mail agnóstico: SMTP, SendGrid ou Mailersend
- Log de notificações enviadas

### Importação
- Importação de extratos via CSV/XLSX
- Wizard de mapeamento de colunas
- Revisão antes da importação

### Infraestrutura e Segurança
- API RESTful com Hono.js no Cloudflare Workers
- Banco de dados Cloudflare D1 (SQLite na borda)
- IDs ofuscados via SnowflakeID + Hashids (proteção IDOR)
- Soft delete para preservação de histórico
- Proteção anti-bot com **Cloudflare Turnstile** (produção only)
- Middleware de autenticação com JWT

## Stack Tecnológica

### Frontend
- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (estilização)
- **TanStack Table** (grid de transações)

### Backend
- **Hono.js** (framework web ultra-rápido)
- **Cloudflare Workers** (runtime V8 Isolation)
- **Drizzle ORM** (abstração SQL)
- **WebCrypto API** (hash de senhas)

### Infraestrutura
- **Cloudflare D1** (banco SQLite na borda)
- **Cloudflare R2** (storage S3-compatible)
- **pnpm workspaces** (monorepo)

## Estrutura do Projeto

```
mycash/
  apps/
    api/              # Backend Hono.js (Cloudflare Workers)
    web/              # Frontend React + Vite
  packages/
    database/         # Schema Drizzle ORM compartilhado
    email/            # Motor de e-mail agnóstico (Adapter/Factory)
  docs/               # Documentação técnica
```

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9.15
- **Cloudflare Wrangler** (para deploy)

## Instalação

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/mycash.git
cd mycash

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente da API
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Edite `apps/api/.dev.vars` com suas chaves:

```env
JWT_SECRET=sua-chave-secreta-jwt-minimo-32-caracteres
HASHIDS_SALT=salt-para-ofuscacao-de-ids
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=mycash
S3_REGION=us-east-1
APP_URL=http://localhost:5173
EMAIL_DRIVER=smtp
EMAIL_SMTP_HOST=smtp.mailtrap.io
EMAIL_SMTP_PORT=2525
EMAIL_SMTP_USER=username
EMAIL_SMTP_PASS=password
EMAIL_SMTP_SECURE=false
EMAIL_FROM_ADDRESS=noreply@mycash.com
EMAIL_FROM_NAME="MyCash App"
```

### Configuração do MinIO (desenvolvimento local)

Para usar anexos localmente, instale e execute o [MinIO](https://min.io/):

```bash
# Com Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Criar bucket
mc alias set myminio http://localhost:9000 minioadmin minioadmin
mc mb myminio/mycash
```

Para Cloudflare R2, configure as variáveis no painel do Workers:
- `S3_ENDPOINT`: URL do S3 do R2 (ex: `https://<account_id>.r2.cloudflarestorage.com`)
- `S3_ACCESS_KEY`: Access Key ID gerado no dashboard R2
- `S3_SECRET_KEY`: Secret Access Key gerado no dashboard R2
- `S3_BUCKET`: Nome do bucket R2
- `S3_REGION`: `auto`

### Configuração de E-mail

O sistema possui um motor de e-mail agnóstico com suporte a 3 drivers:

| Driver | Descrição |
|--------|-----------|
| `smtp` | Servidor SMTP (Mailtrap, Gmail SMTP, etc.) |
| `sendgrid` | API REST do SendGrid |
| `mailersend` | API REST do Mailersend |

A escolha é feita via variável `EMAIL_DRIVER`. Exemplo com Mailtrap (desenvolvimento):

```env
EMAIL_DRIVER=smtp
EMAIL_SMTP_HOST=smtp.mailtrap.io
EMAIL_SMTP_PORT=2525
EMAIL_SMTP_USER=seu_usuario
EMAIL_SMTP_PASS=sua_senha
EMAIL_SMTP_SECURE=false
```

Para produção com SendGrid:

```env
EMAIL_DRIVER=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@seudominio.com
EMAIL_FROM_NAME="MyCash App"
```

> O envio de e-mails é feito de forma assíncrona via `c.executionCtx.waitUntil()` do Cloudflare Workers, garantindo resposta instantânea ao usuário sem travar a requisição.

### Testando o envio de e-mails

Com o servidor rodando, use o botão de envelope (📧) na barra superior do dashboard, ou via CLI:

```bash
# Com o servidor em modo dev rodando (pnpm dev):
# Defina EMAIL e PASSWORD de um usuário existente
EMAIL=seu@email.com PASSWORD=sua-senha pnpm test:email
```

O endpoint `POST /api/email/test` envia um e-mail síncrono (sem `waitUntil`), exibindo o erro real em caso de falha. O dashboard exibe um toast verde "E-mail de teste enviado!" em caso de sucesso, ou vermelho com a mensagem de erro.

## Desenvolvimento Local

```bash
# Gerar migrações do banco
pnpm db:generate

# Rodar em modo desenvolvimento (API + Frontend)
pnpm dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:8787

### Scripts Disponíveis

```bash
pnpm dev              # Dev paralelo (API + Web)
pnpm build            # Build de produção
pnpm typecheck        # Verificação de tipos TypeScript
pnpm lint             # Linting do código
pnpm db:generate      # Gerar migrações Drizzle
pnpm db:migrate       # Aplicar migrações no banco
```

## Configuração

### Variáveis de Ambiente (API)

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `JWT_SECRET` | Chave secreta para assinatura de tokens JWT | Sim |
| `HASHIDS_SALT` | Salt para ofuscação de IDs via Hashids | Sim |
| `S3_ENDPOINT` | Endpoint do storage S3-compatible (R2/MinIO) | Sim* |
| `S3_ACCESS_KEY` | Access key do storage | Sim* |
| `S3_SECRET_KEY` | Secret key do storage | Sim* |
| `S3_BUCKET` | Nome do bucket S3 | Sim* |
| `S3_REGION` | Região do storage (R2: `auto`, MinIO: `us-east-1`) | Não |
| `APP_URL` | URL base da aplicação para links de e-mail (ex: `http://localhost:5173`) | Não |
| `EMAIL_DRIVER` | Driver de e-mail: `smtp`, `sendgrid` ou `mailersend` | Não |
| `EMAIL_SMTP_HOST` | Host do servidor SMTP | SMTP* |
| `EMAIL_SMTP_PORT` | Porta do servidor SMTP (ex: `2525`, `465`, `587`) | SMTP* |
| `EMAIL_SMTP_USER` | Usuário de autenticação SMTP | SMTP* |
| `EMAIL_SMTP_PASS` | Senha de autenticação SMTP | SMTP* |
| `EMAIL_SMTP_SECURE` | TLS implícito (`true` para porta 465, `false` para 2525) | SMTP* |
| `EMAIL_API_KEY` | Chave de API (SendGrid ou Mailersend) | API* |
| `EMAIL_FROM_ADDRESS` | Endereço de e-mail do remetente | Sim** |
| `EMAIL_FROM_NAME` | Nome do remetente exibido nos e-mails | Não |
| `ENVIRONMENT` | Ambiente de execução (`development` ou `production`) | Sim |
| `TURNSTILE_SECRET_KEY` | Secret key do widget Cloudflare Turnstile | Sim* |

*\* Obrigatório conforme o driver escolhido em `EMAIL_DRIVER`.*
*\*\* Obrigatório se `EMAIL_DRIVER` estiver configurado.*
*\*\*\* Obrigatório em produção (`ENVIRONMENT=production`). Sem essa variável, o login e registro serão rejeitados em produção.*

*\* Obrigatórias para funcionalidade de anexos. Sem essas variáveis, o sistema funciona normalmente mas sem upload de comprovantes.*

### Banco de Dados

O schema está em `packages/database/src/schema.ts`. Tabelas principais:

- **users** - Contas de acesso (email único, senha hasheada)
- **accounts** - Contas financeiras (CAIXA, bancos, carteiras)
- **categories** - Categorias de transações (income/expense)
- **transactions** - Lançamentos financeiros
- **recurrence_rules** - Regras de recorrência
- **attachments** - Anexos/comprovantes vinculados a transações

## Deploy

> Guia completo: [docs/sprints/sprint-06/02-deploy-guide.md](docs/sprints/sprint-06/02-deploy-guide.md)

### Cloudflare (Producao)

A implantacao na Cloudflare segue 3 etapas: banco de dados, API e frontend.

**1. Banco de Dados D1**

```bash
# Criar banco de producao
wrangler d1 create mycash-prod

# Copiar o database_id gerado para apps/api/wrangler.toml

# Aplicar migracoes
wrangler d1 migrations apply mycash-prod --remote
```

**2. Storage R2**

```bash
# Criar bucket para anexos
wrangler r2 bucket create mycash-prod
```

Gerar credenciais de API R2 no Dashboard Cloudflare e configurar os secrets:

```bash
wrangler secret put S3_ENDPOINT      # https://<account_id>.r2.cloudflarestorage.com
wrangler secret put S3_ACCESS_KEY     # Access Key ID do R2
wrangler secret put S3_SECRET_KEY     # Secret Access Key do R2
wrangler secret put S3_BUCKET         # mycash-prod
wrangler secret put S3_REGION         # auto
wrangler secret put JWT_SECRET        # openssl rand -base64 48
wrangler secret put HASHIDS_SALT      # openssl rand -base64 24
wrangler secret put APP_URL           # https://mycash.seudominio.com
wrangler secret put EMAIL_DRIVER       # sendgrid
wrangler secret put EMAIL_API_KEY      # SG.xxxxx
wrangler secret put EMAIL_FROM_ADDRESS # noreply@seudominio.com
wrangler secret put EMAIL_FROM_NAME    # MyCash App
```

**3. API (Workers)**

```bash
# Preview (pré-produção)
pnpm --filter @mycash/api run deploy:preview

# Produção
pnpm --filter @mycash/api run deploy:production
```

> A API de produção é o worker `mycash-api` implantado via `--env production`.
> A API de preview é o worker `mycash-api-preview` (padrão, sem `--env`).

**4. Frontend (Pages)**

```bash
# Configurar URL da API de produção e chave pública do Turnstile
cat > apps/web/.env.production << 'EOF'
VITE_API_URL=https://mycash-api.seu-usuario.workers.dev
VITE_TURNSTILE_SITE_KEY=<site-key-do-widget-turnstile>
EOF

# Build e deploy
pnpm --filter @mycash/web run build
npx wrangler pages deploy apps/web/dist --project-name=mycash-web
```

Apos o deploy, o frontend estara em `https://mycash-web.pages.dev`.

### Dominio Personalizado

No Dashboard Cloudflare > Pages > Custom domains, adicione seu dominio. Entao atualize a API:

```bash
wrangler secret put APP_URL --env production  # https://mycash.seudominio.com
pnpm --filter @mycash/api run deploy:production
```

### Verificacao Pos-Deploy

- `GET /health` deve retornar `{"status":"ok"}`
- Registro de usuario deve criar conta CAIXA e categorias automaticamente
- Upload de anexo deve gravar no R2
- Recuperacao de senha deve disparar e-mail
- Widget Turnstile deve aparecer em login/registro (apenas em produção; em localhost não deve aparecer)
- Login/registro em produção deve ser bloqueado sem resolver o desafio Turnstile

## Segurança

### Arquitetura de IDs

- **Backend:** SnowflakeID (64-bit baseado em timestamp)
- **Frontend:** Hashids (strings alfanuméricas ofuscadas)
- **Proteção:** Impede ataques de enumeração (IDOR)

### Autenticação

- **Senhas:** PBKDF2 via WebCrypto API (100.000 iterações, SHA-256)
- **Sessão:** JWT em cookies `HttpOnly`, `Secure`, `SameSite=Strict`
- **Validação:** Email único (HTTP 409), senha mínima 8 caracteres

### Soft Delete

Campo `deleted_at` em todas as tabelas principais para preservação de histórico e recuperação de dados.

## Documentação

- [Guia Arquitetural Completo](docs/guia.md)
- [Sprint 01 - Planejamento](docs/sprints/sprint-01/01-planejamento.md)
- [Sprint 01 - Proposta BD](docs/sprints/sprint-01/02-proposta-bd.md)
- [Sprint 04 - Planejamento](docs/sprints/sprint-04/01-planejamento.md)
- [Sprint 04 - Plano de Ação](docs/sprints/sprint-04/02-plano-de-acao.md)
- [Sprint 05 - Planejamento](docs/sprints/sprint-05/01-planejamento.md)
- [Sprint 05 - Revisao](docs/sprints/sprint-05/02-revisao.md)
- [Sprint 06 - Go Live](docs/sprints/sprint-06/01-golive.md)
- [Sprint 06 - Guia de Deploy](docs/sprints/sprint-06/02-deploy-guide.md)
- [Sprint 07 - CLI Inteligente](docs/sprints/sprint-07)
- [Sprint 08 - Configurações e CRUD](docs/sprints/sprint-08)
- [Sprint 09 - Saldos e Patrimônio](docs/sprints/sprint-09)

## Próximas Releases (V2.0)

Funcionalidades mapeadas para o próximo ciclo:

- **Gráficos e Dashboards** — visualização mensal/anual com sparklines
- **Conciliação bancária** — importação e matching de extratos CSV/OFX
- **Relatórios avançados** — categorização inteligente e projeções
- **Modo off-line** — suporte a PWA com cache de transações
- **Compartilhamento** — contas conjuntas e permissões por usuário

## Contribuição

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona X'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Diretrizes

- Navegação por teclado obrigatória em componentes de grid
- Testes unitários (Vitest) para lógica de recorrência
- Typecheck deve passar (`pnpm typecheck`)
- IDs sempre ofuscados via Hashids no frontend

## Licença

MIT