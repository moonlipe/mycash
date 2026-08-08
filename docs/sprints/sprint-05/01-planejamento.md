# 🚀 Planejamento Técnico: Sprint 05

**Meta da Sprint:** Construir a infraestrutura agnóstica de mensageria (E-mail) para suportar múltiplos provedores (API e SMTP) e dar inteligência analítica básica ao usuário com o Dashboard (Gráficos).

O **Engenheiro de Software Sênior** desenhou a melhor abordagem para o serviço de e-mail: não ficaremos presos a um único fornecedor (*vendor lock-in*). Criaremos um **Service Adapter (Design Pattern)**. O sistema conversará com uma interface única, e se mudarmos do SendGrid para SMTP amanhã, mudaremos apenas uma variável de ambiente (`.env`).

Abaixo, veja o backlog refinado para este ciclo:

---

## 📋 Backlog da Sprint 05 (User Stories)

### US11 - Motor de Notificações por E-mail Agnóstico (Backend)

> **Como** administrador do sistema,
> **Quero** que a aplicação consiga disparar e-mails utilizando provedores REST API (SendGrid, Mailersend) ou servidores tradicionais SMTP,
> **Para que** as comunicações do sistema (boas-vindas, redefinição de senha, alertas de vencimento) cheguem de forma confiável aos usuários; o sistema possua flexibilidade de infraestrutura e zero dependência de um único fornecedor (*vendor lock-in*).

* **Critérios de Aceitação:**
* Criação do pacote/módulo `packages/services/email`.
* Deve implementar a interface padrão `EmailProvider` com o método `send(to, subject, html, text)`.
* **Estratégia de Driver:** Baseado na variável de ambiente `EMAIL_DRIVER` (`smtp`, `sendgrid` ou `mailersend`), o sistema inicializa a classe correta automaticamente.
* Suporte a TLS/SSL e autenticação para o driver `smtp`.
* Implementação do fluxo de **Esqueci minha senha** (Geração de token temporário JWT via e-mail) para fechar o ciclo de segurança que começamos na Sprint 01.
* **Arquitetura Adaptável:** Criação do pacote `packages/services/email` com o padrão *Adapter/Factory*. O sistema usará uma interface comum `EmailProvider`.
* **Troca por Variável de Ambiente:** Através da chave `EMAIL_DRIVER` (`smtp`, `sendgrid`, `mailersend`), o backend inicializará o driver correspondente de forma automática.
* **Segurança SMTP:** O driver SMTP deve suportar autenticação padrão e criptografia TLS/SSL de forma configurável.
* **Templates em HTML/Text:** O motor deve aceitar templates estruturados, enviando sempre a versão HTML (visual rica) e a versão Texto Limpo (fallback de acessibilidade e antispam).


### US12 - Fluxo de Segurança: Recuperação de Senha (Esqueci Minha Senha)

> **Como** um usuário do `mycash` que esqueceu suas credenciais de acesso,
> **Quero** solicitar uma redefinição de senha informando meu e-mail,
> **Para que** eu receba um link seguro e consiga criar uma nova senha sem comprometer a minha conta.

* **Critérios de Aceitação:**
* **Frontend:** Adicionar o link *"Esqueci minha senha"* na tela única de autenticação (`AuthPage.tsx`).
* **Geração do Token:** O endpoint `POST /auth/forgot-password` validará o e-mail e, se o usuário existir, gerará um token JWT temporário (expiração curta de 1 hora) assinado via WebCrypto.
* **Disparo do E-mail:** O sistema enviará o e-mail contendo o link seguro `https://github.com/henriquemeira/mycash/reset-password?token=XYZ`.
* **Redefinição:** O endpoint `POST /auth/reset-password` validará o token e atualizará o `password_hash` no Cloudflare D1 usando o PBKDF2 que estruturamos na Sprint 01.

---

## 📐 Estrutura de Configuração (`.dev.vars` / `.env`)

O desenvolvedor Backend já mapeou as credenciais necessárias para suportar essa flexibilidade que você propôs:

```ini
# Escolha do Driver: smtp | sendgrid | mailersend
EMAIL_DRIVER=smtp

# Se escolher SMTP:
EMAIL_SMTP_HOST=smtp.mailtrap.io
EMAIL_SMTP_PORT=2525
EMAIL_SMTP_USER=username
EMAIL_SMTP_PASS=password
EMAIL_SMTP_SECURE=false

# Se escolher API (SendGrid / Mailersend):
EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@mycash.com
EMAIL_FROM_NAME="MyCash App"

```

---

Utilizar o método `ctx.waitUntil()` nativo do Cloudflare Workers para processar os e-mails de forma assíncrona (em segundo plano) é a melhor prática em ambientes *serverless*.

### ⚡ Escolha técnica

1. **Latência Zero para o Usuário:** Quando o usuário clica em "Esqueci minha senha", a API valida o e-mail e responde **imediatamente** com status `200 OK` na tela. O usuário não fica travado olhando para um ícone de carregamento enquanto o servidor tenta se comunicar com o SendGrid ou com o SMTP.
2. **Economia de Recursos (CPU time):** O Worker pode fechar a conexão HTTP principal com o cliente de imediato, liberando o navegador. A Cloudflare mantém o isolamento do código rodando em background por alguns instantes a mais apenas para concluir o aperto de mão (*handshake*) de rede com o provedor de e-mail.

---

### 🛠️ Como o código será estruturado no Hono.js

A rota de recuperação de senha será implementada utilizando esse modelo de ciclo de vida otimizado:

```typescript
// apps/api/src/routes/auth.ts

app.post('/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  
  // 1. Valida o utilizador no Drizzle ORM
  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  // Segurança: Se o utilizador não existir, respondemos sucesso do mesmo modo
  // para evitar enumeração de e-mails na plataforma.
  if (!user) {
    return c.json({ success: true, message: "auth.email_sent_if_exists" });
  }

  // 2. Gera o token JWT temporário (expira em 1 hora)
  const resetToken = await generateResetToken(user.id);

  // 3. O MÁGICO: Dispara o e-mail em background sem travar a requisição
  c.executionCtx.waitUntil(
    emailService.send({
      to: user.email,
      subject: "MyCash - Recuperação de Senha",
      html: `<p>Clique no link para redefinir a sua senha: ...</p>`,
      text: `Link para redefinir a sua senha: ...`
    }).catch(err => {
      console.error(`Erro crítico ao enviar e-mail em background para ${user.email}:`, err);
    })
  );

  // 4. Resposta instantânea para o Frontend
  return c.json({ success: true, message: "auth.email_sent_successfully" });
});

```

---
