# Revisão da Implementação — Sprint 05

**Meta da Sprint:** Construir a infraestrutura agnóstica de mensageria (E-mail) para suportar múltiplos provedores (API e SMTP) e dar inteligência analítica básica ao usuário com o Dashboard (Gráficos).

**Commits:** `doc: revisão sprint 04 — anexos, filtros e exportação` + implementação Sprint 05

---

## Checklist por User Story

### US11 — Motor de Notificações por E-mail Agnóstico (Backend)

| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Criação do pacote `packages/services/email` | ✅ | Criado como `packages/email/` (nome `@mycash/email`) — o workspace pattern `packages/*` não resolve subdiretórios aninhados |
| 2 | Interface `EmailProvider` com método `send(to, subject, html, text)` | ✅ | `types.ts` — `EmailProvider.send(message: EmailMessage)` |
| 3 | Estratégia de Driver via `EMAIL_DRIVER` (`smtp`, `sendgrid`, `mailersend`) | ✅ | Factory em `factory.ts` seleciona driver automaticamente |
| 4 | Driver SMTP com suporte a TLS/SSL e autenticação | ✅ | `smtp.ts` — AUTH LOGIN + `secureTransport: "on"` (TLS implícito) |
| 5 | Driver SendGrid (REST API) | ✅ | `sendgrid.ts` — POST para `api.sendgrid.com/v3/mail/send` |
| 6 | Driver Mailersend (REST API) | ✅ | `mailersend.ts` — POST para `api.mailersend.com/v1/email` |
| 7 | Templates HTML + Texto (fallback) | ✅ | `templates.ts` — `passwordResetEmail()` retorna ambos |
| 8 | Padrão Adapter/Factory | ✅ | `EmailService` delega para provedor concreto; factory cria a instância correta |
| 9 | Troca via variável de ambiente | ✅ | `EMAIL_DRIVER` define o driver; mudar de SMTP para SendGrid requer apenas alterar `.env` |

---

### US12 — Fluxo de Recuperação de Senha (Esqueci Minha Senha)

| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Link "Esqueci minha senha" na `AuthPage.tsx` | ✅ | Abaixo do formulário de login, alterna para view `forgot-password` |
| 2 | `POST /auth/forgot-password` valida e-mail | ✅ | Normaliza e-mail (lowercase/trim) |
| 3 | Retorna sucesso mesmo se e-mail não existir | ✅ | `{ success: true, message: "auth.email_sent_if_exists" }` — previne enumeração |
| 4 | Geração de token JWT temporário (1 hora) via WebCrypto | ✅ | `signResetToken()` em `jwt.ts` — inclui `purpose: "password-reset"` |
| 5 | Disparo de e-mail assíncrono com `c.executionCtx.waitUntil()` | ✅ | Resposta retorna imediatamente; envio em background |
| 6 | Link seguro `{APP_URL}/reset-password?token=XYZ` | ✅ | `APP_URL` configurável via env var (default `http://localhost:5173`) |
| 7 | `POST /auth/reset-password` valida token JWT | ✅ | `verifyResetToken()` verifica assinatura HMAC + `purpose` + expiração |
| 8 | Atualiza `password_hash` via PBKDF2 | ✅ | Reutiliza `hashPassword()` do `crypto.ts` (Sprint 01) |

---

### Configuração e Infraestrutura

| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | `EMAIL_DRIVER` no `.dev.vars.example` | ✅ | `smtp` como padrão |
| 2 | `EMAIL_SMTP_HOST / PORT / USER / PASS / SECURE` | ✅ | Exemplo com Mailtrap |
| 3 | `EMAIL_API_KEY` | ✅ | Para SendGrid/Mailersend |
| 4 | `EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME` | ✅ | `noreply@mycash.com` / `MyCash App` |
| 5 | `APP_URL` | ✅ | Adicionado para construção do link de reset |
| 6 | Env vars tipadas no `Env` interface | ✅ | `env.d.ts` com todos os campos de e-mail |
| 7 | Exemplo em `wrangler.toml` | ✅ | Vars comentadas para referência |

---

### Frontend

| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | Link "Esqueci minha senha" | ✅ | `AuthPage.tsx` — alterna para view `forgot-password` |
| 2 | Formulário de solicitação (apenas e-mail) | ✅ | Valida e-mail, submete para `/auth/forgot-password` |
| 3 | Tela de confirmação de envio | ✅ | View `forgot-sent` com mensagem de sucesso genérica |
| 4 | `ResetPasswordPage` para redefinição | ✅ | Nova página em `pages/ResetPasswordPage.tsx` |
| 5 | Roteamento via `window.location.pathname` | ✅ | `App.tsx` detecta `/reset-password` e renderiza página |
| 6 | Validação de senha e confirmação | ✅ | Mínimo 8 caracteres + confirmação coincidente |
| 7 | `api.forgotPassword()` e `api.resetPassword()` | ✅ | Novos métodos no `api.ts` |
| 8 | i18n PT + EN | ✅ | 11 novas chaves em cada idioma |

---

### Backend / API

| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | `POST /auth/forgot-password` | ✅ | Gera token JWT, envia e-mail via `waitUntil()` |
| 2 | `POST /auth/reset-password` | ✅ | Valida token, atualiza hash PBKDF2 |
| 3 | `signResetToken()` / `verifyResetToken()` | ✅ | JWT com `purpose: "password-reset"`, expiração de 1h |
| 4 | `@mycash/email` package | ✅ | `packages/email/` com 9 arquivos |
| 5 | `createEmailService()` integrado com env vars | ✅ | Factory lê `EMAIL_DRIVER` e configurações |
| 6 | Template de e-mail HTML responsivo | ✅ | Layout com header azul, botão CTA, fallback text |

---

### Resumo Geral

| User Story | Status |
|------------|--------|
| US11 — Motor de E-mail Agnóstico (SMTP + SendGrid + Mailersend) | ✅ **Entregue** |
| US12 — Fluxo "Esqueci Minha Senha" | ✅ **Entregue** |

**Desvios do plano original:**

1. **Localização do pacote:** O plano especifica `packages/services/email`, mas o workspace do pnpm usa `packages/*` (que não resolve subdiretórios). O pacote foi criado em `packages/email/` com nome `@mycash/email`.
2. **Configuração SMTP sem STARTTLS:** O driver SMTP suporta TLS implícito (`secureTransport: "on"` — porta 465) e conexão insegura (porta 2525 — Mailtrap), mas não implementa STARTTLS (porta 587) devido às limitações da API de sockets do Cloudflare Workers. O plano mostra exatamente essa configuração com Mailtrap (`EMAIL_SMTP_SECURE=false`), então o uso prático está coberto.
3. **APP_URL adicionado:** O link de reset usa `APP_URL` configurável, mais flexível que o URL fixo mencionado no plano.

**Arquivos criados/modificados:** 22 arquivos, ~405 linhas adicionadas
