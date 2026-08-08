# Sprint 10: Assistente de Importação e Integração Inteligente (CSV/Excel)

Analisámos detalhadamente o dump da base de dados SQL (`./scripts/mycash-full.sql`). Este arquivo trás a visibilidade perfeita de como os dados reais estão estruturados em produção.

As contas (`accounts`) e categorias (`categories`) usam chaves textuais (Hashids), e que os valores das transações (`amount`) são guardados como **inteiros em centavos** (ex: `10000` representa R$ 100,00; `-350000` representa uma despesa de R$ -3.500,00). Além disso, o estado de pagamento é controlado pela coluna inteira `is_paid` (`1` para pago, `0` para pendente).

A ideia de arquitetura é extremamente inteligente: realizar a pré-análise, mapeamento de colunas e resolução de nomes inteiramente no **frontend** poupa recursos de CPU do nosso Cloudflare Worker e permite-nos reutilizar a API existente de criação de transações (`POST /transactions`) de forma segura, sem criar endpoints pesados de processamento de ficheiros.

---

# 🚀 Planeamento Técnico: Sprint 10

**Meta da Sprint:** Desenvolver um assistente visual no frontend que faça o parsing de arquivos CSV/Excel, resolva nomes de contas/categorias para os IDs corretos e integre os lançamentos em lote usando as APIs existentes.

## 📋 Backlog da Sprint 10 (User Stories)

### US20 - Motor de Parsing e Mapeamento Dinâmico (Frontend)

> **Como** utilizador que possui extratos antigos,
> **Quero** fazer o upload de um arquivo Excel ou CSV e mapear qual coluna representa cada dado (Data, Descrição, Valor),
> **Para que** o sistema aceite qualquer formato de extrato bancário sem exigir um modelo rígido.

* **Critérios de Aceitação:**
* Integração das bibliotecas `papaparse` (para CSVs rápidos) e `xlsx` (para ler folhas de cálculo Excel).
* **Tela de De-Para (Header Mapping):** Após o upload, o utilizador vê uma pré-visualização das primeiras linhas e seleciona através de dropdowns quais colunas correspondem a: *Data*, *Descrição* e *Valor*.
* **Normalização Numérica:** O motor deve identificar se o valor usa vírgula ou ponto, converter para float e multiplicá-lo por `100` para gerar o inteiro em centavos exigido pelo banco.



### US21 - Resolução de Entidades e Override de Status (Frontend)

> **Como** utilizador que está a integrar dados externos,
> **Quero** que o sistema associe os nomes de contas e categorias do arquivo aos meus registros reais e me permita definir o status de pagamento de uma vez,
> **Para que** eu não precise de editar transação por transação manualmente.

* **Critérios de Aceitação:**
* **Dedução por Texto:** Se o arquivo contiver uma coluna com a Conta ou Categoria, o frontend faz um *match* exato (case-insensitive) com as contas ativas guardadas (ex: "Itau" resolve para o ID `322481625998954496`).
* **Dropdown de Fallback:** Caso o nome do arquivo não exista no sistema (ex: erro de digitação ou nova categoria), a tela exibe um seletor para o utilizador escolher manualmente qual Conta/Categoria padrão aplicar àquelas linhas.
* **Seletor de Status (Pago vs Pendente):** Um interruptor global permite definir se todas as transações importadas entram como liquidadas (`is_paid: 1`) ou em aberto (`is_paid: 0`).



### US22 - Orquestrador de Integração em Lote (Client-Side Batching)

> **Como** frontend do sistema,
> **Quero** disparar as transações mapeadas para o endpoint existente em lotes controlados,
> **Para que** a inserção em massa seja concluída sem estourar o tempo limite de execução do Cloudflare Worker.

* **Critérios de Aceitação:**
* O envio não deve ser feito com um único `Promise.all` massivo se houver centenas de linhas (evita erro de concorrência ou rate limit). Os dados devem ser enviados em sub-lotes (ex: de 10 em 10).
* Exibição de uma barra de progresso em tempo real (ex: "A integrar 40 de 120 transações...").



---

## 🛠️ Arquitetura do Componente de Mapeamento (`ImportWizard.tsx`)

O **Arquiteto de Frontend** desenhou a estrutura base do assistente de importação. Este componente lida com a leitura do arquivo e faz a conversão lógica para os formatos nativos exigidos pela base de dados (centavos, tipos e flags de pagamento):

```tsx
// apps/web/src/components/ImportWizard.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface MappedTransaction {
  description: string;
  amount: number; // Armazenado em centavos
  date: string;    // YYYY-MM-DD
  type: 'income' | 'expense';
}

export function ImportWizard({ activeAccounts, activeCategories }: any) {
  const [step, setStep] = useState<'upload' | 'map' | 'processing'>('upload');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Estados de Mapeamento de Colunas
  const [colDescription, setColDescription] = useState('');
  const [colAmount, setColAmount] = useState('');
  const [colDate, setColDate] = useState('');
  
  // Estados de Configuração Global de Integração
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [globalIsPaid, setGlobalIsPaid] = useState(true); // Pago por padrão

  // Executa o parsing do arquivo carregado
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 0) {
            setHeaders(Object.keys(results.data[0] as any));
            setRawRows(results.data);
            setStep('map');
          }
        }
      });
    } else {
      // Processamento Excel (.xlsx / .xls)
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length > 0) {
          setHeaders(Object.keys(data[0] as any));
          setRawRows(data);
          setStep('map');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // Processa e normaliza as linhas do arquivo antes de enviar à API
  const processAndImport = async () => {
    setStep('processing');
    
    const preparedTransactions: MappedTransaction[] = rawRows.map(row => {
      // 1. Tratamento e normalização do valor (Conversão para centavos)
      const rawValue = String(row[colAmount] || '0').replace(/[^\d,-]/g, '').replace(',', '.');
      const parsedValue = parseFloat(rawValue);
      const amountInCents = Math.round(parsedValue * 100);
      
      // Determina o tipo com base no valor ou coluna
      const type = amountInCents >= 0 ? 'income' : 'expense';

      // 2. Normalização simples de data (Exemplo básico, expandível)
      const rawDate = row[colDate] || ''; 
      // Idealmente aqui entra um helper similar ao parseSmartDate desenvolvido na Sprint 07
      const formattedDate = new Date(rawDate).toISOString().split('T')[0];

      return {
        description: String(row[colDescription] || 'Transação Importada'),
        amount: amountInCents,
        date: formattedDate,
        type
      };
    });

    // 3. Orquestrador em Lote (Client-Side Chunking de 10 em 10)
    const chunkSize = 10;
    for (let i = 0; i < preparedTransactions.length; i += chunkSize) {
      const chunk = preparedTransactions.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(tx => {
        // Dispara contra o endpoint existente POST /transactions
        return fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: tx.description,
            amount: tx.amount,
            date: tx.date,
            dueDate: tx.date, // Alinhado ao comportamento da Sprint 02
            type: tx.type,
            accountId: selectedAccountId,   // ID resolvido no frontend
            categoryId: selectedCategoryId, // ID resolvido no frontend
            isPaid: globalIsPaid ? 1 : 0    // Inserção livre como pago/pendente
          })
        });
      }));
    }

    alert('Integração concluída com sucesso!');
    setStep('upload');
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      {step === 'upload' && (
        <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
          <p className="text-sm text-slate-500 mb-4">Carregue o seu extrato em formato .CSV ou .XLSX</p>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="mx-auto" />
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Mapear Colunas do Ficheiro</h3>
          
          {/* Seletores de De-Para */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">Descrição</label>
              <select value={colDescription} onChange={e => setColDescription(e.target.value)} className="w-full p-2 border rounded-lg">
                <option value="">Selecionar...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Valor (R$)</label>
              <select value={colAmount} onChange={e => setColAmount(e.target.value)} className="w-full p-2 border rounded-lg">
                <option value="">Selecionar...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Data</label>
              <select value={colDate} onChange={e => setColDate(e.target.value)} className="w-full p-2 border rounded-lg">
                <option value="">Selecionar...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Configurações de Destino de Conta, Categoria e Status */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Regras de Destino</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Conta de Destino</label>
                <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full p-2 border rounded-lg">
                  <option value="">Escolher conta...</option>
                  {activeAccounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Categoria Padrão</label>
                <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} className="w-full p-2 border rounded-lg">
                  <option value="">Escolher categoria...</option>
                  {activeCategories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={globalIsPaid} onChange={e => setGlobalIsPaid(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                  Marcar todas como Pagas
                </label>
              </div>
            </div>
          </div>

          <button onClick={processAndImport} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 rounded-xl transition">
            Iniciar Integração de Lançamentos
          </button>
        </div>
      )}

      {step === 'processing' && (
        <div className="text-center py-8 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">A processar ficheiro e a enviar lotes para a API...</p>
        </div>
      )}
    </div>
  );
}

```

---
