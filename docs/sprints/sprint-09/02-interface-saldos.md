# 🚀 Planejamento Técnico Interface: Sprint 09

**Dropdown de Contas no Topo**

1. **Preserva o Minimalismo:** Respeita a nossa premissa de "Zero Sidebar" no desktop e mantém o ecrã focado inteiramente na listagem de transações, sem comprimir o espaço do grid.
2. **Contexto Psicológico Perfeito:** O utilizador já olha para o topo do ecrã para ver o resumo financeiro do mês (Receitas, Despesas, Balanço). Tornar esse bloco clicável cria um fluxo natural: *"Este é o meu desempenho deste mês, e ao clicar aqui, vejo como está a minha vida financeira como um todo (Património)"*.
3. **Perfeito para Mobile-First:** No telemóvel, dropdowns/popovers acionados por cliques no cabeçalho são extremamente fáceis de interagir com o polegar.


**Meta da Sprint:** Desenvolver o motor de agregação histórica de saldos (D1) e o Dropdown Interativo de Património Líquido no cabeçalho do topo.

## 📋 Backlog da Sprint 09 (User Stories)

### US18 - API de Saldos Consolidados (Backend)

> **Como** API do sistema,
> **Quero** calcular o saldo real e atualizado de cada conta somando o saldo inicial aos lançamentos históricos,
> **Para que** o frontend possa exibir a saúde financeira real do utilizador.

* **Critérios de Aceitação:**
* Endpoint `GET /accounts/balances` implementado com agregação SQL nativa (D1) para evitar lentidão.
* O cálculo deve somar o `initial_balance` da conta com todas as transações de receita menos as despesas associadas àquele ID de conta.
* Desconsiderar transações onde `deleted_at IS NOT NULL`.



### US19 - Dropdown de Património Líquido e Contas (Frontend)

> **Como** utilizador que acompanha o seu dinheiro em tempo real,
> **Quero** clicar no bloco de balanço do topo para abrir um menu suspenso,
> **Para que** eu veja o meu Patrimonio Líquido Total e o saldo real acumulado de cada uma das minhas contas.

* **Critérios de Aceitação:**
* **Interatividade:** O card de Balanço Mensal no topo ganha um ícone discreto de `ChevronDown` (seta) indicando que é interativo.
* **Popover Vivo:** Ao clicar, abre um balão flutuante posicionado de forma absoluta (`absolute z-50`). Clicar fora ou clicar novamente fecha o balão.
* **Visão Geral:** O topo do dropdown exibe em destaque o **Património Líquido Total** (a soma matemática do saldo atual de todas as contas ativas).
* **Visão por Conta:** Abaixo, exibe a lista de contas com as suas respetivas cores customizadas (cadastradas na Sprint 08) e o saldo real acumulado de cada uma.

---

## 🛠️ Implementação do Componente Interativo (`HeaderSummary.tsx`)

O **Frontend Developer** estruturou o componente React com Tailwind CSS utilizando um estado de carregamento assíncrono para garantir que os saldos reais só são chamados à API quando o utilizador de facto abre o dropdown, poupando largura de banda:

```tsx
// apps/web/src/components/HeaderSummary.tsx
import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';

interface AccountBalance {
  id: string;
  name: string;
  color: string;
  type: string;
  currentBalance: number;
}

export function HeaderSummary({ monthlyBalance }: { monthlyBalance: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Calcula o património líquido total somando o saldo de todas as contas
  const totalWealth = useMemo(() => {
    return balances.reduce((acc, curr) => acc + curr.currentBalance, 0);
  }, [balances]);

  // Executa o fetch apenas quando o utilizador decide abrir o painel
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/accounts/balances')
        .then(res => res.json())
        .then(data => {
          setBalances(data.items);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Card de Balanço Mensal Reativo e Clicável */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition flex items-center justify-between gap-4 select-none"
      >
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Balanço do Mês</p>
          <p className={`text-xl font-bold ${monthlyBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            R$ {monthlyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* DROPDOWN FLUTUANTE DE SALDOS CONSOLIDADOS */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Cabeçalho: Património Líquido Geral */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" /> Património Total Real
            </p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              R$ {isLoading ? '---' : totalWealth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Lista das Contas Individuais */}
          <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldos por Conta</p>
            
            {isLoading ? (
              <div className="space-y-2 py-1">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              balances.map((account) => (
                <div key={account.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10" 
                      style={{ backgroundColor: account.color }} 
                    />
                    <span className="font-medium text-slate-600 dark:text-slate-300">{account.name}</span>
                  </div>
                  <span className={`font-semibold ${account.currentBalance >= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-rose-600'}`}>
                    R$ {account.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

```

---
