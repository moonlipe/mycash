### 🎯 O Ponto Cego: Janela de Manutenção

Focamos tanto em fazer o motor do carro andar de forma extremamente veloz (inserção rápida) que nos esquecemos de construir o painel para trocar os pneus.

Desde a Sprint 01, o sistema cria automaticamente a conta "CAIXA" e as categorias padrão ("RECEITAS" e "DESPESAS") durante o registo do utilizador. Além disso, já temos os endpoints `GET /accounts` e `GET /categories` que alimentam os dropdowns da interface. Mas o utilizador, de fato, está "preso" a esses dados porque não construímos a interface visual (CRUD) para gerir isso.

Vamos resolver isto agora. Declaro aberta a **Sprint 08**!

---

# 🚀 Planeamento Técnico: Sprint 08

**Meta da Sprint:** Construir o Módulo de Configurações para gestão (CRUD) de Categorias e Contas, permitindo total personalização do ecossistema financeiro do utilizador.

## 📋 Backlog da Sprint 08 (User Stories)

Como o menu de "Configurações" já existe no *BottomNav* (mobile) e no *TopBar* (desktop) desde a Sprint 02, vamos usá-lo como a casa para estas novas telas.

### US16 - Gestão de Categorias (CRUD)

> **Como** utilizador do sistema,
> **Quero** visualizar, criar, editar e desativar categorias de receitas e despesas,
> **Para que** eu possa organizar os meus lançamentos com a nomenclatura, cores e ícones que fazem sentido para a minha realidade.

* **Critérios de Aceitação (Frontend & Backend):**
* **Listagem:** Tela com abas para separar "Despesas" e "Receitas".
* **Criação/Edição:** Modal ou página simples para definir `name`, `color` (seletor de paleta Tailwind) e `icon`.
* **Regra de Negócio Crítica (Soft-Delete):** Se o utilizador apagar uma categoria que já tem transações passadas, o backend deve fazer apenas um *soft-delete* (preencher o campo `deleted_at` que já criámos na Sprint 01). Essa categoria não deve aparecer mais nos dropdowns de novos lançamentos, mas não pode quebrar o histórico de transações antigas no grid.



### US17 - Gestão de Contas (CRUD)

> **Como** utilizador com múltiplos locais de armazenamento de dinheiro,
> **Quero** cadastrar novas contas (ex: NuBank, Carteira, Banco do Brasil),
> **Para que** eu possa separar o saldo e organizar de onde o dinheiro sai e para onde entra.

* **Critérios de Aceitação (Frontend & Backend):**
* **Criação/Edição:** Possibilidade de definir `name`, `type` (Corrente, Poupança, Investimento) e `initial_balance` (Saldo Inicial).
* **Bloqueio de Exclusão Padrão:** A conta principal não deve ser apagada caso seja a única ativa no sistema.
* **Soft-Delete Seguro:** Mesmo comportamento de *soft-delete* aplicado às categorias, preservando o histórico e a integridade referencial dos dados do D1.

---
