# Guia de Deploy em Producao - Cloudflare

Documento passo-a-passo para implantar o MyCash na infraestrutura da Cloudflare (Workers, D1, R2, Pages).

---

## Prerequisitos

- Conta na Cloudflare (plano gratuito e suficiente)
- Node.js >= 20
- pnpm >= 9.15
- Wrangler CLI autenticado (`wrangler login`)
- Dominio configurado na Cloudflare (opcional, mas recomendado)

---

## Passo 1 - Autenticar o Wrangler

```bash
npx wrangler login
```

Abrira o navegador para autorizar o Wrangler a acessar sua conta Cloudflare. Confirme a autorizacao.

---

## Passo 2 - Criar o Banco de Dados D1

```bash
npx wrangler d1 create mycash-prod
```

O comando retornara algo como:

```
✅ Successfully created DB 'mycash-prod'

[[d1_databases]]
binding = "DB"
database_name = "mycash-prod"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copie o `database_id` gerado e atualize o `apps/api/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mycash"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # <-- substitua aqui
migrations_dir = "../../packages/database/drizzle"
```

> **Nota:** O `database_name` permanece `mycash` para compatibilidade com o ambiente local. O `database_id` e o que vincula ao banco de producao remoto.

---

## Passo 3 - Aplicar as Migracoes no D1 de Producao

As migracoes (0000 a 0005) criam as tabelas: `users`, `accounts`, `categories`, `transactions`, `recurrence_rules` e `attachments`.

```bash
npx wrangler d1 migrations apply mycash --remote --config apps/api/wrangler.toml
```

> **Importante:** E necessario passar o caminho do `wrangler.toml` com `--config` (ou executar o comando dentro do diretorio `apps/api/`).

> **Nota:** O Wrangler le automaticamente as migracoes do diretorio configurado em `migrations_dir`.

Para verificar se as tabelas foram criadas:

```bash
npx wrangler d1 execute mycash --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Deve retornar: `users`, `accounts`, `categories`, `transactions`, `recurrence_rules`, `attachments`.

---

## Passo 4 - Criar o Bucket R2

O bucket R2 armazena os anexos (comprovantes) enviados pelos usuarios.

```bash
npx wrangler r2 bucket create mycash-prod
```

> **Nota:** O nome do bucket sera usado na variavel `S3_BUCKET`. Pode ser diferente, mas mantenha consistencia.

### Gerar credenciais de API R2

1. Acesse o [Dashboard Cloudflare](https://dash.cloudflare.com/) > R2 > Gerenciar R2 API
2. Crie uma API Token com permissao de **Object Read & Write** para o bucket `mycash-prod`
3. Anote o **Access Key ID** e **Secret Access Key** gerados
4. Anote o endpoint S3 (formato: `https://<account_id>.r2.cloudflarestorage.com`)

---

## Passo 5 - Configurar as Variaveis de Ambiente Secretas

O Worker usa variaveis secretas que nao devem ser commitadas no codigo. Configure cada uma com:

> **Importante:** Todos os comandos abaixo precisam do `--config apps/api/wrangler.toml` para localizar o worker. Se preferir, execute-os dentro do diretorio `apps/api/` e omita o `--config`.

```bash
# Obrigatorias - Seguranca
npx wrangler secret put JWT_SECRET --config apps/api/wrangler.toml
# Valor: uma string aleatoria de no minimo 32 caracteres. Ex: openssl rand -base64 48

npx wrangler secret put HASHIDS_SALT --config apps/api/wrangler.toml
# Valor: uma string aleatoria. Ex: openssl rand -base64 24

# Obrigatorias - Storage R2
npx wrangler secret put S3_ENDPOINT --config apps/api/wrangler.toml
# Valor: https://<account_id>.r2.cloudflarestorage.com

npx wrangler secret put S3_ACCESS_KEY --config apps/api/wrangler.toml
# Valor: Access Key ID gerado no Passo 4

npx wrangler secret put S3_SECRET_KEY --config apps/api/wrangler.toml
# Valor: Secret Access Key gerado no Passo 4

npx wrangler secret put S3_BUCKET --config apps/api/wrangler.toml
# Valor: mycash-prod (nome do bucket criado no Passo 4)

npx wrangler secret put S3_REGION --config apps/api/wrangler.toml
# Valor: auto

# Obrigatoria - URL da aplicacao (para links em e-mails e CORS)
npx wrangler secret put APP_URL --config apps/api/wrangler.toml
# Valor: https://mycash.seudominio.com (URL do frontend em producao)

# E-mail (escolha seu driver: smtp, sendgrid ou mailersend)
npx wrangler secret put EMAIL_DRIVER --config apps/api/wrangler.toml
# Valor: sendgrid (recomendado para producao)

npx wrangler secret put EMAIL_API_KEY --config apps/api/wrangler.toml
# Valor: SG.xxxxxxxxxxxxxxxxxxxxxx (chave do SendGrid)

npx wrangler secret put EMAIL_FROM_ADDRESS --config apps/api/wrangler.toml
# Valor: noreply@seudominio.com

npx wrangler secret put EMAIL_FROM_NAME --config apps/api/wrangler.toml
# Valor: MyCash App

# Se usar SMTP em vez de SendGrid/Mailersend:
npx wrangler secret put EMAIL_SMTP_HOST --config apps/api/wrangler.toml
npx wrangler secret put EMAIL_SMTP_PORT --config apps/api/wrangler.toml
npx wrangler secret put EMAIL_SMTP_USER --config apps/api/wrangler.toml
npx wrangler secret put EMAIL_SMTP_PASS --config apps/api/wrangler.toml
npx wrangler secret put EMAIL_SMTP_SECURE --config apps/api/wrangler.toml
```

> **Dica:** Para gerar secrets seguros, use `openssl rand -base64 48` no terminal.

---

## Passo 5.1 - Configurar o Turnstile (Proteção Anti-Bot)

O MyCash utiliza o **Cloudflare Turnstile** para proteger as telas de login e registro contra bots. A proteção é **ativada apenas em produção**; em desenvolvimento local (`localhost`) o widget não é exibido.

### 5.1.1 - Criar o Widget no Dashboard Cloudflare

1. Acesse o [Dashboard Cloudflare](https://dash.cloudflare.com/) > **Turnstile**
2. Clique em **Add widget**
3. Escolha o modo **Managed**
4. Em **Widget name**, insira: `mycash-prod`
5. Em **Domains**, adicione:
   - Seu domínio de produção (ex: `mycash.seudominio.com`)
   - `localhost` (opcional, para testes locais com produção ativada)
   - `127.0.0.1`
6. Clique em **Create**

Anote o **Site Key** (chave pública) e a **Secret Key** (chave privada).

### 5.1.2 - Configurar a Secret Key no Worker

A `TURNSTILE_SECRET_KEY` é um secret e deve ser configurada via `wrangler secret put` no ambiente de produção:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --env production --config apps/api/wrangler.toml
# Valor: <secret-key-do-widget-turnstile>
```

Para o ambiente de preview (opcional, já que o Turnstile só é ativado em produção):

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/api/wrangler.toml
# Valor: <secret-key-do-widget-turnstile>
```

> **Atenção:** A `TURNSTILE_SECRET_KEY` é obrigatória para que o login e registro funcionem em produção. Se não for configurada, o Worker rejeitará as requisições com erro `turnstile_required`.

### 5.1.3 - Configurar o Site Key no Frontend

O `VITE_TURNSTILE_SITE_KEY` é uma variável **pública** (não é um secret). Ela pode ser configurada de duas formas:

**Opção A — Manual (`.env.production`):**  
Adicione ao arquivo `apps/web/.env.production`:

```env
VITE_TURNSTILE_SITE_KEY=<site-key-do-widget-turnstile>
```

**Opção B — CI/CD (variável de ambiente no build):**  
Passe a variável no `env:` da etapa de build do workflow. Exemplo:

```yaml
- run: pnpm --filter @mycash/web run build
  env:
    VITE_API_URL: https://mycash-api.seu-usuario.workers.dev
    VITE_TURNSTILE_SITE_KEY: <site-key-do-widget-turnstile>
```

> **Nota:** Em CI/CD, prefira a Opção B para não depender do arquivo `.env.production` versionado. Em deploys manuais, a Opção A é suficiente.

---

## Passo 6 - Atualizar o CORS para Producao

Antes do deploy, o CORS no arquivo `apps/api/src/index.ts` esta hardcoded para `localhost`. E necessario torna-lo dinamico usando a variavel `APP_URL`.

Alterar:

```typescript
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
```

Para:

```typescript
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const appUrl = c.env.APP_URL || "http://localhost:5173";
      return [appUrl, "http://localhost:5173"];
    },
    credentials: true,
  })
);
```

Isso permite que tanto o ambiente local quanto o de producao funcionem corretamente.

---

## Passo 7 - Deploy da API (Cloudflare Workers)

O projeto possui dois ambientes no `wrangler.toml`:

| Ambiente | Worker | Comando |
|----------|--------|---------|
| **Pré-produção (preview)** | `mycash-api-preview` | `wrangler deploy` (padrão) |
| **Produção** | `mycash-api` | `wrangler deploy --env production` |

### 7.1 - Deploy em Pré-Produção (Preview)

```bash
pnpm --filter @mycash/api run deploy:preview
```

Ou, a partir do diretorio `apps/api`:

```bash
npx wrangler deploy
```

Apos o deploy, o Wrangler exibira a URL publica do Worker de preview:

```
Published mycash-api-preview (x.xx sec)
  https://mycash-api-preview.seu-usuario.workers.dev
```

### 7.2 - Deploy em Producao

```bash
pnpm --filter @mycash/api run deploy:production
```

Ou, a partir do diretorio `apps/api`:

```bash
npx wrangler deploy --env production
```

Apos o deploy:

```
Published mycash-api (x.xx sec)
  https://mycash-api.seu-usuario.workers.dev
```

> **Atencao:** A API de producao foi renomeada de `mycash-api-production` para `mycash-api`. O Worker `mycash-api-production` pode ser removido manualmente no Dashboard Cloudflare.

---

## Passo 8 - Build e Deploy do Frontend (Cloudflare Pages)

### 8.1 - Configurar a variavel de API URL

Crie o arquivo `apps/web/.env.production` com a URL da API de produção e a chave pública do Turnstile:

```env
VITE_API_URL=https://mycash-api.seu-usuario.workers.dev
VITE_TURNSTILE_SITE_KEY=<site-key-do-widget-turnstile>
```

> **Nota:** O `VITE_API_URL` deve apontar para a **API de produção** (`mycash-api`), nunca para a de preview. A URL do preview (`mycash-api-preview.seu-usuario.workers.dev`) é usada apenas em testes no ambiente de pré-produção.

### 8.2 - Build do frontend

```bash
pnpm --filter @mycash/web run build
```

### 8.3 - Deploy via Wrangler Pages

```bash
npx wrangler pages deploy apps/web/dist --project-name=mycash-web
```

Na primeira execucao, o Wrangler perguntara se deseja criar o projeto. Confirme.

Apos o deploy, ofrontend estara disponivel em:

```
https://mycash-web.pages.dev
```

### 8.4 - (Opcional) Dominio personalizado

No Dashboard Cloudflare > Pages > mycash-web > Custom domains, adicione seu dominio (ex: `mycash.seudominio.com`).

Se usar dominio personalizado, atualize a variavel `APP_URL` nos secrets da API de produção:

```bash
npx wrangler secret put APP_URL --env production --config apps/api/wrangler.toml
# Novo valor: https://mycash.seudominio.com
```

E faca redeploy da API em produção:

```bash
pnpm --filter @mycash/api run deploy:production
```

---

## Passo 9 - Verificacao Pos-Deploy (Smoke Tests)

### 9.1 - Health Check (Producao)

```bash
curl https://mycash-api.seu-usuario.workers.dev/health
# Esperado: {"status":"ok","timestamp":"..."}
```

### 9.2 - Registro de Usuario (Producao)

```bash
curl -X POST https://mycash-api.seu-usuario.workers.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"12345678"}'
```

Para testar o ambiente de preview, substitua `mycash-api` por `mycash-api-preview` nas URLs acima.

Verificar se:
- O usuario foi criado no D1
- A conta "CAIXA" e categorias padrao foram geradas automaticamente (onboarding)
- O response contem o token JWT

### 9.3 - Login (Producao)

```bash
curl -X POST https://mycash-api.seu-usuario.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"12345678"}'
```

### 9.4 - Upload de Anexo

Atraves da interface web, faca upload de um PDF ou imagem e verifique:
- O arquivo foi gravado no bucket R2
- O arquivo pode ser visualizado/baixado

### 9.5 - Recuperacao de Senha

Atraves da interface web, clique em "Esqueci minha senha" e verifique:
- O e-mail foi disparado pelo driver configurado (SendGrid/SMTP)
- O link de recuperacao aponta para o dominio de producao correto

### 9.6 - Protecao Turnstile (Login e Registro)

Atraves da interface web, acesse a tela de login e verifique:
- O widget do Turnstile aparece abaixo do campo de senha (apenas em producao; em `localhost` nao deve aparecer)
- Tentar fazer login sem resolver o desafio Turnstile deve exibir a mensagem "Verificacao de seguranca necessaria"
- Apos resolver o desafio, o login/registro deve funcionar normalmente

---

## Passo 10 - (Opcional) Configurar CI/CD

Para automatizar deploys futuros via GitHub Actions:

### 10.1 - Secrets do GitHub

No repositorio GitHub > Settings > Secrets and variables > Actions, adicione:

- `CLOUDFLARE_API_TOKEN`: Token de API da Cloudflare com permissao de Workers e Pages
- `CLOUDFLARE_ACCOUNT_ID`: ID da sua conta Cloudflare

### 10.2 - Workflow de exemplo

O workflow abaixo faz deploy em **pré-produção** para PRs e em **produção** para pushes na `main`:

```yaml
name: Deploy MyCash

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm --filter @mycash/api run deploy:preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm --filter @mycash/api run deploy:production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-web-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    needs: deploy-preview
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm --filter @mycash/web run build
        env:
          VITE_API_URL: https://mycash-api-preview.infra-h2a.workers.dev
          VITE_TURNSTILE_SITE_KEY: <site-key-do-widget-turnstile>
      - run: npx wrangler pages deploy apps/web/dist --project-name=mycash-web-preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-web-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    needs: deploy-production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm --filter @mycash/web run build
        env:
          VITE_API_URL: https://mycash-api.infra-h2a.workers.dev
          VITE_TURNSTILE_SITE_KEY: <site-key-do-widget-turnstile>
      - run: npx wrangler pages deploy apps/web/dist --project-name=mycash-web
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

> **Dica:** Para não repetir o `<site-key-do-widget-turnstile>` no workflow, crie uma variável de ambiente no GitHub (Settings > Secrets and variables > Actions > Variables) chamada `TURNSTILE_SITE_KEY` e use `${{ vars.TURNSTILE_SITE_KEY }}` no lugar do valor fixo.

---

## Resumo da Topologia em Producao

```
[ Usuario Final ]
       |
       v
 +--------------+      +-------------------------+
 |   Frontend   | ----> |     API (Backend)       |
 |  CF Pages    |      | CF Workers (Edge Node)  |
 +--------------+      +-------------------------+
                                |
              +-----------------+-----------------+
              v                                   v
 +-------------------------+       +-------------------------+
 | Banco de Dados (D1)     |       |   Storage de Anexos     |
 |     Producao Global     |       |       Bucket R2          |
 +-------------------------+       +-------------------------+
```

## Checklist de Deploy

- [ ] Wrangler autenticado (`wrangler login`)
- [ ] Banco D1 criado e `database_id` atualizado no `wrangler.toml`
- [ ] Migracoes aplicadas no D1 remoto
- [ ] Tabelas verificadas no D1
- [ ] Bucket R2 criado
- [ ] Credenciais R2 geradas (Access Key + Secret Key)
- [ ] Secrets configurados no Worker (`wrangler secret put`)
- [ ] CORS atualizado para usar `APP_URL` dinamicamente
- [ ] API de preview publicada (`mycash-api-preview`)
- [ ] API de producao publicada (`mycash-api`, `wrangler deploy --env production`)
- [ ] Arquivo `.env.production` do frontend com `VITE_API_URL`
- [ ] Build do frontend realizado
- [ ] Frontend publicado no Cloudflare Pages
- [ ] Health check respondendo OK
- [ ] Registro de usuario com onboarding funcional
- [ ] Login funcional
- [ ] Upload de anexo funcional (R2)
- [ ] Recuperacao de senha funcional (e-mail)
- [ ] Widget Turnstile visivel em login/registro (apenas producao)
- [ ] Login/registro bloqueado sem Turnstile em producao
- [ ] Dominio personalizado configurado (opcional)