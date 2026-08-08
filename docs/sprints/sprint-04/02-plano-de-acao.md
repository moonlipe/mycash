### 🛠️ Plano de Ação Técnico: Sprint 04

#### 1. Infraestrutura e Banco de Dados (DBA & DevOps)

* **Nova Tabela:** Vamos criar a tabela `attachments` no Drizzle ORM vinculada à transação (com `ON DELETE CASCADE` para não deixar arquivos órfãos se a transação for apagada).
* **Storage Inteligente:** O Worker da Cloudflare não fará o tráfego pesado do arquivo. Ele apenas gerará uma **URL Pré-assinada (Presigned URL)**. O Frontend usará essa URL para enviar o arquivo *direto* para o Bucket (Cloudflare R2 ou MinIO/S3), economizando CPU e banda do nosso servidor backend.

#### 2. Interface Mobile-First para Filtros (UX/UI & Frontend)

* **Desktop:** Adicionaremos uma barra de ferramentas limpa acima da tabela com o campo de busca textual e dropdowns de Conta e Categoria.
* **Mobile:** Como o espaço é precioso no celular, colocaremos apenas um ícone de "Filtros" (Funil) e "Busca" (Lupa). Ao tocar, um *Bottom Sheet* (menu inferior) desliza na tela permitindo configurar os filtros com o polegar.
* **Exportação:** O botão de exportar vai gerar o **CSV** dinamicamente no navegador (client-side) baseado nos dados que estão atualmente cacheados na listagem. Isso tem custo zero de processamento para o backend e é instantâneo para o usuário.

---

### 🛠️ Visualizador de Anexos

Para visualziar anexos a escolha é do **visualizador nativo** para a primeira release por dois motivos pragmáticos:

1. **Aproveitamento de Recursos do SO:** Dispositivos móveis (iOS e Android) e navegadores desktop modernos já possuem visualizadores de PDF e imagens extremamente rápidos, com suporte nativo a gestos de pinça para zoom (*pinch-to-zoom*), rotação e compartilhamento. Replicar isso via código aumentaria desnecessariamente o tamanho do nosso bundle JS.
2. **Foco e Velocidade de Entrega:** Economizamos tempo precioso de desenvolvimento e testes de interface, permitindo que o time foque 100% na robustez do motor de upload, na segurança das URLs pré-assinadas e nos filtros do grid.

---

#### 🛠️ Ajuste de Fluxo na Interface (Frontend)

Para que a experiência com o visualizador nativo seja fluida e o usuário não sinta que "saiu" do app de forma agressiva:

* **Desktop:** O link do anexo usará o atributo `target="_blank" rel="noopener noreferrer"`. Ao clicar, uma nova aba se abre com o comprovante, mantendo a aba do *mycash* intacta e ativa logo ao lado.
* **Mobile:** O comportamento nativo abrirá o arquivo em tela cheia na própria aba ou disparará o visualizador de mídia do sistema operacional. Para retornar ao app, basta o usuário usar o gesto de "Voltar" do próprio celular.

---
