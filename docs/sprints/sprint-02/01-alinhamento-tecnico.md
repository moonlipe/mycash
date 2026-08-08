## 🛠️ Alinhamento Técnico das Novas Diretrizes

### 📱 1. Mobile-First & 🚫 4. Sem Sidebar (UX/UI & Frontend)

* **O Desafio do Grid:** Uma tabela cheia de colunas para edição *inline* (como no desktop) quebra no celular.
* **A Solução:** No mobile, transformaremos a linha da tabela em um **Card Compacto Editável**. Ao tocar em qualquer campo do card (como o valor ou a categoria), ele abrirá instantaneamente um pequeno *bottom sheet* (menu que desliza de baixo) ou um *input* nativo otimizado para o polegar, mantendo a velocidade do lançamento rápido.
* **Navegação Sem Sidebar:** Adotaremos o padrão de **Bottom Navigation Bar** (Barra de Navegação Inferior) para telas mobile, contendo apenas 3 ações principais: *Transações*, *Nova Transação (+)* e *Configurações*. No Desktop, essa barra sobe e se transforma em um *Header* (Cabeçalho) limpo e fixo no topo da tela.

### 🌗 2. Tema Claro e Escuro (Frontend)

* Utilizaremos a estratégia nativa do **Tailwind CSS (`dark:`)** baseada em classe CSS aplicada na tag `<html>`.
* Criaremos um `ThemeContext` no React que injeta a classe `.dark` e salva a preferência do usuário no `localStorage`. Se o usuário não tiver preferência salva, o sistema herda automaticamente o tema do sistema operacional dele.

### 🌐 3. Sistema Multi-idioma / i18n (Gestor de Qualidade & Frontend)

* **Ferramenta:** Utilizaremos o **`i18next`** com `react-i18next`.
* **Abordagem:** Zero strings fixas. Criaremos arquivos JSON estruturados (ex: `pt.json`, `en.json`, `es.json`).
* *Nota do Engenheiro Sênior:* Até as mensagens de erro vindas do Backend (ex: "E-mail já cadastrado") retornarão chaves de tradução (ex: `errors.email_already_exists`) em vez de frases prontas. Assim, o frontend traduz o erro dinamicamente na tela do usuário.

