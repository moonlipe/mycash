# 🌍 Planejamento Técnico: Sprint 06 (A Release!)

**Meta da Sprint:** Realizar o deploy do ecossistema completo na infraestrutura global da Cloudflare (Workers, D1, R2) e disponibilizar o sistema em produção.

O **Arquiteto de Software** e o **Engenheiro DevOps** já prepararam os scripts. Como estamos rodando em uma arquitetura moderna e serverless, colocar o `mycash` no ar não vai envolver servidores pesados ou configurações complexas de Linux. Vamos publicar tudo na rede de borda (*edge*) da Cloudflare, garantindo carregamento instantâneo em qualquer lugar do mundo.

---

## 📋 Backlog da Sprint 06 (User Stories)

### US13 - Deploy de Produção e CI/CD (DevOps)

> **Como** mantenedor do sistema,
> **Quero** publicar o Frontend (Pages), a API (Workers), o Banco de Dados (D1) e o Storage (R2) na Cloudflare,
> **Para que** qualquer usuário possa acessar a aplicação publicamente por um domínio seguro.

* **Critérios de Aceitação:**
* **Banco de Dados:** Criação do banco D1 de produção via painel/Wrangler e execução das migrações (`0000` a `0005`) para provisionar as tabelas.
* **Storage:** Criação do Bucket R2 de produção para receber os anexos enviados pelos usuários.
* **API (Backend):** Deploy do Worker (Hono) configurando as variáveis de ambiente secretas de produção (`JWT_SECRET`, `HASHIDS_SALT`, `EMAIL_API_KEY`, `TURNSTILE_SECRET_KEY`, etc.) usando `wrangler secret put`.
* **Frontend:** Deploy do app React (Vite) no **Cloudflare Pages**, apontando os requests de API para o novo subdomínio de produção.



### US14 - Smoke Tests e Carga Inicial (Homologação)

> **Como** Product Owner,
> **Quero** realizar um teste de ponta a ponta no ambiente de produção,
> **Para** garantir que os fluxos críticos de cadastro, login, inserção rápida e upload de anexos estejam funcionando perfeitamente na nuvem.

* **Critérios de Aceitação:**
* Validar se o onboarding automático (criação da conta "CAIXA" e categorias padrão) ocorre perfeitamente no D1 de produção ao criar um novo usuário.
* Testar o upload de um anexo PDF/imagem e conferir se o arquivo foi gravado corretamente no bucket R2 e abre via visualizador nativo.
* Realizar o fluxo de esqueci minha senha e garantir que o e-mail em segundo plano seja disparado pelo driver de produção.
* Verificar se o widget Cloudflare Turnstile aparece nas telas de login e registro em produção e bloqueia submissões não resolvidas.



---

## 🏗️ Topologia da Infraestrutura na Nuvem

O desenho da nossa arquitetura de produção seguirá o seguinte ecossistema distribuído na Cloudflare:

```text
[ Usuário Final ]
       │
       ▼
 ┌──────────────┐      ┌─────────────────────────┐
 │   Frontend   │ ───> │     API (Backend)       │
 │  CF Pages    │      │ CF Workers (Edge Node)  │
 └──────────────┘      └─────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
     ┌─────────────────────────┐         ┌─────────────────────────┐
     │ Banco de Dados (D1 SQL) │         │   Storage de Anexos     │
     │     Produção Global     │         │       Bucket R2         │
     └─────────────────────────┘         └─────────────────────────┘

```

---
