# Revisão da Implementação — Sprint 04

**Meta da Sprint:** Enriquecer as transações com armazenamento em Nuvem (Anexos via S3/R2) e dar poder de análise ao usuário com Filtros Avançados e Exportação.

**Commits:** `437b475` — feat: sprint 04 - anexos, filtros e exportação (+2070 / -80 linhas, 19 arquivos)

---

## Checklist por User Story

### US08 — Gestão de Anexos e Comprovantes (Cloudflare R2 / S3)

| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Uploads de até 5MB | ✅ | `ALLOWED_EXTENSIONS` + `MAX_FILE_SIZE` (5MB) validado no backend e frontend |
| 2 | Extensões permitidas: JPG, PNG, WEBP, XLS, DOC, PDF e documentos de escritório | ✅ | 20 extensões permitidas; executáveis/scripts bloqueados (`BLOCKED_EXTENSIONS`) |
| 3 | Upload processado via Worker (Hono) e armazenado no Cloudflare R2 / MinIO | ✅ | Rota `POST /attachments/:transactionId/upload` com upload server-to-server ao S3 |
| 4 | Ícone "clipe/ anexo" nas transações com arquivos | ✅ | `Paperclip` ícone no grid quando `attachmentCount > 0` |
| 5 | Visualização/download do anexo | ✅ | Download via presigned GET URL, aberto em nova aba (visualizador nativo do SO) |
| 6 | **Presigned URL** (upload direto frontend→S3) | ⚠️ | Planejado, mas implementado via multipart (Worker proxy). Método `presignAttachment` existe no client mas não é utilizado pelo `AttachmentManager` |

**Observações:**
- Tabela `attachments` criada com campos extras em relação ao plano: `user_id`, `file_key`, `status` (pending/confirmed), `soft-delete` (`deleted_at`) — melhoria de robustez
- Migration: `0005_great_maelstrom.sql`
- S3 utils com implementação completa de AWS Sig V4 (presigned PUT, presigned GET, upload, delete)
- Validação de tipo MIME no frontend (`ALLOWED_TYPES`) + extensão no backend

---

### US09 — Filtros Avançados e Busca Textual

| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Barra de ferramentas com campo de "Busca" | ✅ | `TransactionToolbar` com `<input search>` + ícone lupa + botão limpar (X) |
| 2 | Dropdowns para filtrar por Conta, Categoria e Tipo | ✅ | 3 `<select>` dinâmicos (Conta, Categoria, Tipo Receita/Despesa) |
| 3 | Mini-balanço recalculado dinamicamente | ✅ | Filtros enviados como query params; backend recalcula `income`/`expense`/`balance` do resultado filtrado |
| 4 | Botão "Limpar filtros" | ✅ | Reseta account, category e type (preserva busca textual) |
| 5 | **Mobile: Bottom Sheet** | ⚠️ | Implementado toggle show/hide (`showFilters`), não bottom sheet conforme plano |

**Observações:**
- Backend: filtros aplicados com `like(description)`, `eq(accountId)`, `eq(categoryId)`, `eq(type)`
- Frontend: `fetchData()` reexecuta sempre que `filters` mudam (via `useEffect`)
- Interface `TransactionFilters`: `{ search?, accountId?, categoryId?, type? }`

---

### US10 — Exportação de Dados

| # | Critério | Status | Obs |
|---|----------|--------|-----|
| 1 | Botão "Exportar" na barra de ferramentas | ✅ | Ícone `Download` no `TransactionToolbar` |
| 2 | Geração de CSV com transações atuais | ✅ | Cliente-side: mapeia `items` → CSV com BOM UTF-8 |
| 3 | Respeita filtros aplicados | ✅ | Usa `items` (já filtrados) como fonte |
| 4 | Nome do arquivo: `mycash-{year}-{month}.csv` | ✅ | `handleExportCSV()` gera nome dinâmico |
| 5 | Colunas localizadas | ✅ | Headers traduzidos via `t()` (pt/en) |

**Observações:**
- Custo zero de processamento no backend (geração 100% client-side)
- Formato Excel-compatível (BOM `\uFEFF`, `toLocaleString` para números)
- Colunas: Description, Amount, Date, Due Date, Type, Category, Account, Paid

---

## Backend / API

| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | `attachments` table (Drizzle ORM) | ✅ | `id`, `transaction_id` (FK), `user_id` (FK), `file_name`, `content_type`, `size`, `file_key`, `status`, `created_at`, `deleted_at` |
| 2 | S3 utilities (Sig V4) | ✅ | Presigned PUT/GET, upload, delete, validação de arquivo (`s3.ts` — 316 linhas) |
| 3 | `POST /attachments/:transactionId/upload` | ✅ | Multipart upload via Worker |
| 4 | `GET /attachments/list/:transactionId` | ✅ | Lista anexos confirmados e não deletados |
| 5 | `GET /attachments/:id/download` | ✅ | Retorna presigned GET URL |
| 6 | `DELETE /attachments/:id` | ✅ | Soft-delete + remove do S3 |
| 7 | Filtros nas transações (`GET /transactions`) | ✅ | `search`, `accountId`, `categoryId`, `type` |
| 8 | Env vars S3 tipadas | ✅ | `env.d.ts`, `.dev.vars.example`, `wrangler.toml` |

---

## Frontend

| # | Item | Status | Obs |
|---|------|--------|-----|
| 1 | `TransactionToolbar` component | ✅ | Busca, filtros, exportação, upload inline |
| 2 | `AttachmentManager` component | ✅ | Lista, upload, download, delete anexos |
| 3 | Ícone Paperclip no grid | ✅ | `TransactionGrid` exibe clipe quando `attachmentCount > 0` |
| 4 | Linha expansível com anexos | ✅ | `expandedTxId` + `AttachmentManager` abaixo da linha |
| 5 | i18n pt + en | ✅ | ~30 novas chaves de tradução |
| 6 | API client (`api.ts`) | ✅ | `TransactionFilters`, `Attachment`, métodos CRUD |

---

## Resumo Geral

| User Story | Status |
|------------|--------|
| US08 — Gestão de Anexos | ✅ **Entregue** (com adaptação: upload via Worker proxy em vez de presigned direto) |
| US09 — Filtros Avançados | ✅ **Entregue** (com adaptação: toggle dropdowns em vez de bottom sheet mobile) |
| US10 — Exportação CSV | ✅ **Entregue** |

**Desvios do plano original:**
1. **US08:** O upload usa multipart via Worker (server-to-server) em vez de presigned URL direto do frontend para o S3. O método `presignAttachment` existe no client e pode ser adotado futuramente para reduzir CPU no Worker.
2. **US09:** O filtro mobile usa toggle show/hide dos dropdowns em vez de um Bottom Sheet. Simplificação funcional sem perda de usabilidade.

**Lições aprendidas:**
- A abordagem server-to-server para upload é mais simples de implementar e debugar, mas consome CPU do Worker. Migrar para presigned upload direto é uma otimização futura possível.
- Manter a geração de CSV no client-side eliminou completamente a necessidade de processamento no backend, sendo uma escolha acertada para performance e simplicidade.
