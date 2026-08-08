Agora, em nossa **Planning da Sprint 04**, o **Arquiteto de Software** e o **Business Analyst** olharam para as fundações que definimos lá no início e para as referências visuais originais. Identificamos as próximas peças-chave para entregar uma experiência completa de gestão na listagem.

Aqui está a nossa proposta técnica para a **Sprint 04**.

---

# 🚀 Planejamento Técnico: Sprint 04

**Meta da Sprint:** Enriquecer as transações com armazenamento em Nuvem (Anexos via S3/R2) e dar poder de análise ao usuário com Filtros Avançados e Exportação.

## 📋 Backlog da Sprint 04 (User Stories)

### US08 - Gestão de Anexos e Comprovantes (Cloudflare R2 / S3)

> **Como** um usuário organizado,
> **Quero** anexar fotos de recibos ou notas fiscais em PDF nas minhas transações,
> **Para que** eu tenha o comprovante salvo de forma segura na nuvem e atrelado ao gasto.

* **Critérios de Aceitação:**
* O sistema deve aceitar uploads de até **5MB**.
* Apenas extensões permitidas: JPG, PNG, WEBP, XLS, DOC, PDF e demais documentos normalmente utilizados em escritório, proibir executáveis binários ou scripts.
* O upload deve ser processado via Worker (Hono) e armazenado no Cloudflare R2 (ou MinIO local via S3 API).
* O frontend deve exibir um ícone de "clipe" ou "anexo" nas transações que possuem arquivos, permitindo a visualização/download; o ícone deve ser adicional à ícones já existentes como recorrencia e lembrete.



### US09 - Filtros Avançados e Busca Textual

> **Como** usuário que possui muitos lançamentos,
> **Quero** buscar uma transação específica pelo nome ou filtrar o grid por conta/categoria,
> **Para que** eu possa conciliar valores rapidamente sem precisar ler o mês inteiro.

* **Critérios de Aceitação:**
* Adicionar uma barra de ferramentas acima do grid com um campo de "Busca" (que filtra a descrição em tempo real).
* Adicionar seletores suspensos (Dropdowns) para filtrar por **Conta**, **Categoria** e **Tipo** (Receita/Despesa).
* O mini-balanço (totais do topo) deve ser recalculado dinamicamente para refletir apenas as transações filtradas na tela.



### US10 - Exportação de Dados

> **Como** um usuário que gosta de manter backups ou planilhas externas,
> **Quero** um botão para exportar a visualização atual,
> **Para que** eu possa baixar meus dados num formato universal.

* **Critérios de Aceitação:**
* Um botão "Exportar" na barra de ferramentas.
* O sistema deve gerar e baixar um arquivo **CSV** contendo as transações listadas na tela atual, respeitando os filtros aplicados e o idioma do usuário.



---

## 🛠️ Especificação Técnica e Infraestrutura (DevOps & Backend)

Para a **US08 (Anexos)**, o time de engenharia definiu a seguinte abordagem para manter a alta performance e economia no Cloudflare:

1. **Presigned URLs (URLs Pré-assinadas):** Em vez de o tráfego do arquivo passar obrigatoriamente pela memória do Worker (o que poderia estourar o limite de CPU do Cloudflare na camada gratuita), o Worker vai gerar uma "URL Pré-assinada" do S3.
2. O Frontend fará o upload (PUT) do arquivo *diretamente* para o Bucket R2 usando essa URL temporária.
3. Isso garante transferência rápida, uso zero de CPU no Worker e compatibilidade 100% com S3/Minio.
4. **Tabela `attachments`:** Vamos criar a tabela que estava pendente, vinculando `transaction_id`, `file_url`, `content_type` e `size`.

---

