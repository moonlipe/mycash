# Refatoração de Sistema — Correção de Datas em Transações Recorrentes

**Data:** Junho de 2026  
**Contexto:** Mitigação de falha crítica na atualização em massa de datas de vencimento em lançamentos recorrentes.

## 🔴 Problema Identificado
Ao editar uma transação pertencente a uma recorrência e selecionar a opção **"Alterar a partir desta"**, o sistema aplicava um `UPDATE` massivo no banco de dados definindo a **mesma data exata** para todas as parcelas futuras. Isso aglomerava todos os lançamentos subsequentes no mesmo mês do registro alterado, destruindo a projeção de fluxo de caixa do usuário.

## 🟢 Regras de Negócio e Solução Aplicada

O endpoint de atualização (`PUT /transactions/:id`) no backend deve ser refatorado para isolar a lógica de campos textuais/monetários da lógica de datas, respeitando o seguinte fluxo:

### 1. Opção: "Alterar apenas esta"

- O sistema atualiza **exclusivamente** o registro selecionado.
- **Vínculo Preservado:** O registro mantém intacto o seu `recurrence_id`, garantindo que não seja desvinculado do histórico e do grupo de recorrência original.

### 2. Opção: "Alterar a partir desta"

- Campos estáticos (Valor, Categoria, Descrição) são repassados a todos os registros daquela recorrência onde a data seja maior ou igual à do registro modificado.
- **Motor de Recálculo de Datas:** A atualização das colunas `date` e `due_date` deixou de ser estática. O sistema agora intercepta a diferença de dias aplicada na parcela atual e aciona o motor de recalculo mensal.
- *Exemplo de Comportamento:* Se a parcela de 10 de Agosto for editada para 15 de Agosto, o motor iterará sobre os meses seguintes ajustando-os para 15 de Setembro, 15 de Outubro, etc., preservando o salto mensal inerente à recorrência.

### 2.1. Preservação do Sufixo de Parcela na Descrição

- Ao alterar a descrição no escopo **"Alterar a partir desta"**, o sistema extrai o texto base (removendo o sufixo `(N/M)`) da descrição fornecida e o reaplica preservando o número da parcela de cada registro futuro.
- *Exemplo:* Se a parcela 1/4 possui descrição `"Aluguel (1/4)"` e o usuário altera para `"Aluguel Comercial (1/4)"`, as parcelas 2/4, 3/4 e 4/4 receberão `"Aluguel Comercial (2/4)"`, `"Aluguel Comercial (3/4)"` e `"Aluguel Comercial (4/4)"` respectivamente.

## 🛠️ Como Verificar a Correção

1. Acesse a tela inicial e crie ou localize uma transação recorrente.
2. Edite a transação do mês corrente (ex: altere o vencimento do dia 05 para o dia 12, e modifique o valor).
3. Selecione **"Alterar a partir desta"** e conclua a ação.
4. Navegue para o mês seguinte no topo da tela e verifique se o lançamento do próximo mês absorveu o novo valor e reposicionou a data corretamente para o dia 12.
5. Verifique também que a descrição das parcelas futuras manteve o número de parcela correto (ex: `2/4`, `3/4`, `4/4`) em vez de copiar o número da parcela editada.
