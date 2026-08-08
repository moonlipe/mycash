# Refatoração de UX — Unificação do Painel de Filtros

**Data:** Junho de 2026  
**Contexto:** Mitigação do "Viés do Primeiro Input" detetado em produção.

## 🔴 Problema Identificado
O input de pesquisa permanente no topo competia visualmente com o Smart CLI, fazendo com que os utilizadores digitassem novos lançamentos no campo de busca por engano.

## 🟢 Solução Aplicada
1. Remoção do campo de pesquisa global da listagem principal de transações.
2. Migração do input de texto para o interior do painel expansível de `Filtros` (unificação lógica).
3. O Smart CLI passou a ser o único input em destaque na tela inicial.
4. O estado `searchQuery` foi acoplado ao objeto global de `filters` no frontend.

----

Ajustar o input de pesquisa.

Há um problema clássico de usabilidade conhecido como **"Viés do Primeiro Input"**. Quando um utilizador abre uma aplicação de finanças pessoais, a sua intenção primária (na esmagadora maioria das vezes) é *registar um novo gasto*. O cérebro dele está programado para procurar uma caixa de texto, e ele instintivamente clica na primeira grande caixa vazia que aparece, ignorando o *placeholder* que diz "Pesquisar".

Analisando a tela inicial, as duas caixas de texto empilhadas estão a competir diretamente pela atenção visual.

O nosso **UX/UI Designer** avaliou as propostas e o veredito é claro:

### 🏆 Remover e esconder a Pesquisa (A sua segunda opção)

Transformar a pesquisa num elemento acionado sob demanda é, de longe, a melhor decisão arquitetónica. Inverter a ordem (passar o lançamento para cima) resolveria o problema do clique errado, mas manteria a ecrã com uma elevada "poluição visual" (dois inputs gigantes empilhados).

**Por que esconder a pesquisa é o caminho ideal:**

* **Foco Absoluto no Core Business:** O coração da nossa hiper-produtividade é o *Smart CLI* (a barra de inserção fluida que construímos na Sprint 07). Ela deve ser a protagonista indiscutível do ecrã, reinando sozinha no topo da listagem.
* **Hierarquia de Ações:** Pesquisar uma transação específica é uma ação secundária ou terciária no dia a dia. Não faz sentido ocupar 100% da largura do ecrã permanentemente com algo que o utilizador usa esporadicamente.
* **Design Minimalista:** Mantém a interface incrivelmente limpa.

### 🛠️ Como podemos desenhar isto na UI:

1. **A Lupa Discreta:** Adicionamos um ícone de lupa (`Search`) no mesmo grupo de botões onde já estão o **"Filtros"** e o **"Exportar"** (alinhados à direita).
2. **O Novo Protagonista:** A barra do *Smart CLI* ("Adicionar nova transação...") sobe e passa a ser o único input permanentemente visível.
3. **Comportamento Interativo:** Quando o utilizador precisar de pesquisar, clica na Lupa. A barra de pesquisa pode expandir-se *inline* (empurrando os botões para o lado num efeito suave) ou aparecer como um popover/modal focado.

---

Conceitualmente, pesquisar por texto **é** aplicar um filtro aos dados. Agrupar a pesquisa por texto com os filtros de data, tipo e categoria dentro do mesmo painel faz todo o sentido arquitetónico e cognitivo. Centralizamos toda a lógica de "refinamento de visualização" num único lugar.

Essa definição resolve o problema do "Viés do Primeiro Input" de forma elegante e liberta o espaço da interface para o que realmente importa: a barra de hiper-produtividade (*Smart CLI*).

### 🛠️ Como vamos implementar esta refatoração de UI:

1. **Remoção Frontal:** O grande input de pesquisa atual desaparece completamente da tela principal de transações.
2. **Integração no Painel:** O campo de texto ("Pesquisar na descrição...") passa a ser o primeiro elemento dentro do menu de **Filtros** (que já construímos na Sprint 04).
3. **Indicador Visual (Badge):** Para que o utilizador não se esqueça de que tem uma pesquisa ativa escondida no painel, o botão de "Filtros" no ecrã principal ganhará uma pequena *badge* (um ponto vermelho ou o número de filtros ativos) sempre que a pesquisa de texto ou qualquer outro filtro estiver a ser utilizado.
4. **Protagonismo Restaurado:** A barra de inserção de novas transações ("Adicionar nova transação...") sobe e torna-se a única caixa de texto visível na listagem principal.

---

O código de estado `searchQuery` será simplesmente migrado para dentro do objeto `filters` no componente do frontend.
