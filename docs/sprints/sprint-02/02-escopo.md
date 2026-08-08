## 🚀 Escopo Proposto: Sprint 02

**Meta da Sprint:** Construir a casca visual da aplicação com suporte a temas, multi-idioma, navegação mobile e a primeira listagem responsiva de transações.

### 📋 Backlog da Sprint 02 (User Stories)

#### US03 - Layout Base Responsivo, Temas e Localização

> **Como** usuário do sistema,
> **Quero** que a aplicação se adapte perfeitamente ao meu celular, respeite o idioma do meu navegador e me permita alternar entre o tema claro e escuro,
> **Para que** eu tenha uma experiência visual confortável e acessível em qualquer lugar.

* **Tarefas Técnicas:**
* Setup do `react-i18next` e criação dos dicionários PT/EN.
* Setup do controle de temas (Light/Dark mode) com Tailwind.
* Construção da *Bottom Navigation Bar* para Mobile e *Header* para Desktop.



#### US04 - Tela Principal: Listagem Otimizada de Transações

> **Como** usuário focado em agilidade,
> **Quero** visualizar minhas transações em uma lista limpa no celular (ou tabela no desktop) com paginação ou scroll infinito,
> **Para que** eu possa acompanhar meus lançamentos sem lentidão na rede móvel.

* **Tarefas Técnicas:**
* Criar o endpoint `GET /transactions` no Hono.js (com paginação/limite de dados).
* Construir o componente `TransactionGrid` utilizando TanStack Table, aplicando a regra responsiva (Tabela no Desktop / Cards no Mobile).

---

## 📅 Refinamento da US04: Listagem Mensal Combinada

### 📋 Critérios de Aceitação Atualizados:

* O sistema deve carregar, por padrão, o **mês e ano atuais**.
* A interface deve apresentar um seletor compacto no topo (ex: `[ < ] Junho, 2026 [ > ]`) que mude o mês com um único toque no telemóvel.
* Ao avançar ou retroceder o mês, o frontend deve disparar uma nova requisição para o backend passando os parâmetros de busca (`?month=06&year=2026`).

---

## 🛠️ Detalhes da Implementação Técnica (Sprint 02)

### 🗄️ Backend (Hono.js + Drizzle ORM)

O endpoint `GET /transactions` receberá os query params `month` e `year`. O Drizzle fará o filtro automático utilizando funções de data do SQLite para manter a alta performance de indexação:

```typescript
// Exemplo lógico do filtro no backend
const startOfMonth = `${year}-${month}-01`;
const endOfMonth = `${year}-${month}-31`; // O motor trata o fim real do mês

const monthlyTransactions = await db.select()
  .from(transactions)
  .where(
    and(
      eq(transactions.userId, currentUserId),
      gte(transactions.date, startOfMonth),
      lte(transactions.date, endOfMonth),
      isNull(transactions.deletedAt)
    )
  )
  .orderBy(desc(transactions.date));

```

### 📱 Frontend (React + Tailwind) - Design do Top Header

Como **não utilizaremos sidebar**, o topo da tela do celular será o nosso centro de controle do tempo:

* **Área Superior Fixa:** Centralizado ficará o controle de mês/ano. Ao lado esquerdo, o alternador de Tema (Sol/Lua) e, ao lado direito, o seletor de Idioma (PT/EN).
* **Navegação Fluida:** No mobile, um simples deslizar de dedos para os lados (*swipe gesture*) poderá ser adicionado no futuro para avançar ou voltar os meses, tornando a usabilidade ainda mais orgânica.

---

### 🎨 O Design Visual (UX/UI & Frontend)

Para manter o foco nas transações e o princípio *mobile-first*, o resumo ficará logo abaixo do seletor de meses, ocupando o mínimo de espaço vertical. Em vez de cards grandes e coloridos, usaremos uma **linha de dados horizontal unificada (Mini-Fita de Balanço)**:

* **Design:** Três blocos de texto minimalistas alinhados lado a lado.
* **Hierarquia Visual:**
* **Receitas:** Valor discreto com indicador sutil (ex: um tom verde suave para o texto ou um mini ícone `↑`).
* **Despesas:** Valor discreto com indicador sutil (ex: um tom vermelho/laranja suave ou `↓`).
* **Balanço:** Em destaque sutil (negrito), mostrando o saldo líquido do mês. Se for positivo, herda a cor de receita; se for negativo, a de despesa.



No **Modo Escuro**, essas cores serão dessaturadas automaticamente para garantir a legibilidade e o conforto visual, sem "gritar" na tela do usuário.

---

### ⚡ Implementação Técnica (Backend & DBA)

Para não onerar o banco de dados e garantir que a resposta da API seja instantânea, o **Backend Developer** e o **DBA** decidiram centralizar esse cálculo no mesmo endpoint de listagem (`GET /transactions?month=X&year=Y`).

O servidor retornará um JSON estruturado em duas partes: `summary` (o consolidado) e `items` (as transações).

```json
{
  "summary": {
    "income": 550000,   // R$ 5.500,00 (em centavos)
    "expense": 320000,  // R$ 3.200,00 (em centavos)
    "balance": 230000   // R$ 2.300,00 (em centavos)
  },
  "items": [
    { "id": "3k9b7e", "description": "Salário", "amount": 550000, "type": "income", ... },
    { "id": "a7x2p9", "description": "Supermercado", "amount": -320000, "type": "expense", ... }
  ]
}

```

> **Nota do Sênior:** Fazer isso em uma única requisição HTTP evita múltiplos *round-trips* (idas e vindas) entre o celular do usuário e os Workers da Cloudflare, economizando banda e bateria no mobile.

---

### 🎨 Paleta de Cores e Acessibilidade (WCAG Compliance)

Para garantir que o aplicativo seja legível mesmo sob a luz do sol (cenário comum de uso mobile) e confortável no escuro, usaremos tonalidades inteligentes do Tailwind CSS:

* **Tema Claro (Light Mode):**
* 🟢 **Receitas:** `text-emerald-600` (um verde vivo, mas com contraste adequado sobre o fundo branco).
* 🔴 **Despesas:** `text-rose-600` (um vermelho suave, evitando o tom puramente agressivo).


* **Tema Escuro (Dark Mode):**
* 🟢 **Receitas:** `text-emerald-400` (um tom mais pastel/iluminado para não cansar os olhos sobre o fundo escuro).
* 🔴 **Despesas:** `text-rose-400` (um tom rosado/avermelhado de alta legibilidade no escuro).

---

### 🎨 Implementação Visual (Tailwind CSS)

* **Transação Paga/Recebida (`is_paid: true`):** Cor 100% visível, texto nítido.
* **Transação Pendente (`is_paid: false`):** Aplicaremos a classe `opacity-50` (ou `opacity-60` no modo escuro para garantir o contraste). O valor continuará verde ou vermelho, mas com aquele aspecto fosco/suave.

> **✨ Toque de Mestre do Frontend:** > Vamos adicionar uma transição suave no CSS (`transition-opacity duration-200`). Quando o usuário clicar para marcar a transação como paga diretamente no grid, ela vai "acender" na tela na mesma hora, dando uma sensação tátil e imediata de conclusão.

---

### 🔲 Design e Usabilidade do Botão de Check (UX/UI & Frontend)

Pensando na velocidade máxima no celular, para o usuário alternar o status de "Pago" para "Pendente" (ou vice-versa) direto na lista, utilizar um clique/toque direto em um ícone de "Check" na própria linha/card.

Para que essa mecânica funcione perfeitamente tanto no mouse (Desktop) quanto no polegar (Mobile), adotaremos as seguintes diretrizes:

* **Tamanho do Alvo (Mobile):** O ícone de check visualmente parecerá compacto, mas a sua **área de clique invisível** terá pelo menos `44x44px` (padrão de acessibilidade da Apple/Google). Isso evita que o usuário erre o toque e acabe abrindo os detalhes da transação sem querer.
* **Estados Visuais:**
* **Pendente (`is_paid: false`):** Exibirá apenas a borda de um círculo sutil e vazado. Ao passar o mouse (ou segurar o toque), ele mostra um preview do check interno.
* **Pago (`is_paid: true`):** O círculo se preenche com a cor clássica da transação (verde para receita, vermelho para despesa) e um ícone de check branco no centro.



---

### ⚡ Engenharia de Performance: Atualização Otimista (Frontend & Backend)

Para que o sistema pareça instantâneo (com "latência zero"), o **Engenheiro Sênior** desenhou a seguinte estratégia:

1. **Interface Otimista (Optimistic UI):** Quando o usuário clica no Check, o frontend altera **imediatamente** o estado visual da linha na tela (muda a opacidade de 50% para 100% e preenche o ícone), antes mesmo de o servidor responder.
2. **Disparo em Segundo Plano:** Em paralelo, a API faz uma chamada HTTP leve do tipo `PATCH /transactions/:id/toggle-paid`.
3. **Tratamento de Erro:** Na raríssima hipótese de a internet do usuário cair exatamente nesse milésimo de segundo, o frontend desfaz a alteração visual e mostra uma notificação discreta: *"Não foi possível salvar. Tentando novamente..."*.

---

Brilhante! O **Frontend Developer** e o **UX/UI Designer** estão vibrando aqui na sala. Essa abordagem estilo "planilha" (com a linha de inserção fixa no topo do grid) é o ápice da eficiência para quem gerencia finanças. O usuário não precisa abrir modais, fechar janelas ou mudar o foco visual: ele simplesmente clica na primeira linha, digita os dados, aperta `Enter` e a transação "desce" para o histórico formatada.

O **Business Analyst** revisou os prints que você enviou lá no início (especialmente o print 2 e 4) e confirmou que essa mecânica casa perfeitamente com a proposta de valor do seu sistema.

---

### 📱 Lançamento de nova transação. Como isso funcionará no fluxo Mobile-First?

A criação de uma nova transação será feita através de uma linha em branco sempre fixa no topo do próprio grid.

Como no desktop essa linha horizontal é natural, o **UX Designer** desenhou a adaptação perfeita para telas menores (celular):

* **No Desktop:** A primeira linha da tabela é um formulário estático composto por inputs sem bordas (limpos), que se misturam ao grid.
* **No Mobile:** Como o espaço horizontal é reduzido, essa linha do topo se transforma em um **Card de Inserção Rápida Fixo** (com os campos empilhados de forma bem compacta ou acionados em sequência). O usuário digita o valor, seleciona a categoria e clica em um botão `+` discreto no próprio card para lançar.

---

### ⌨️ A Mágica da Navegação por Teclado (Engenheiro Sênior)

Para que o lançamento seja "ultra-rápido", mapearemos os seguintes comandos de teclado no componente de inserção:

1. O usuário clica no campo **Descrição** da linha de cima e digita.
2. Aperta `Tab` ➔ vai para o campo **Valor** (onde digita o número).
3. Aperta `Tab` ➔ abre um mini *dropdown* de **Categoria** (ele pode digitar as primeiras letras e apertar `Enter`).
4. Aperta `Tab` ➔ vai para o campo **Conta** (mesmo esquema do dropdown).
5. Aperta `Enter` em qualquer momento ➔ O backend processa o `POST /transactions`, a linha limpa instantaneamente e a nova transação aparece logo abaixo, com a animação de opacidade que definimos antes.

---

