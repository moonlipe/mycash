# 🚀 Planejamento Técnico (Input Mágico / Fórmulas): Sprint 07

A **Sintaxe Fluida** (baseada em comandos rápidos com barras e tags, estilo *Slack*, *Discord* ou *Telegram*) é infinitamente superior para o telemóvel e para a digitação rápida.

Escrever o formato `/- 500.10 mercado @alimentacao #10/06` funciona com espaços simples, o que torna o lançamento natural, orgânico e extremamente veloz. E o sistema pode ser inteligente para iterpretar a separação decimal utilizando . ou ,.

**Meta da Sprint:** Transformar a linha de inserção rápida num terminal financeiro inteligente (Smart CLI), interpretando comandos com `/`, `@` e `#` em tempo real.

## 📋 Backlog da Sprint 07 (User Stories)

### US15 - Linha de Comando Financeira (Smart CLI Parser)

> **Como** um utilizador focado em produtividade máxima,
> **Quero** digitar um comando fluido e corrido na linha de inserção (ex: `/- 15.50 Café @alimentacao`),
> **Para que** o sistema processe e distribua os dados nos campos corretos instantaneamente.

* **Critérios de Aceitação:**
* **Gatilhos de Comando:**
* `/-` -> Define o tipo como Despesa (Vermelho).
* `/+` -> Define o tipo como Receita (Verde).


* **Captura de Valores:** Qualquer número isolado (ex: `500.10` ou `500` ou `500,1`) deve ser extraído e injetado no campo "Valor".
* **Mapeamento de Categoria (`@`):** O texto que vier após a `@` (ex: `@alimentacao`) deve selecionar a categoria correspondente. Deve aceitar busca por aproximação (*fuzzy*) para ignorar acentos ou maiúsculas.
* **Mapeamento de Data (`#`):** O texto após o `#` define a data. Deve aceitar `#hoje`, `#ontem` ou datas diretas como `#10/06` ou `#2026-06-10` ou `#5` (lançando como dia 5 do mês selecionado no topo).
* **O Resto é Descrição:** Qualquer texto que não comece com os gatilhos (`/`, `@`, `#`) ou não seja o valor numérico é considerado a "Descrição" do lançamento.
* **Execução Otimista:** Ao pressionar `Enter`, o comando é enviado para a API de forma assíncrona, a linha limpa-se e o cursor volta para o início.



---

## 🛠️ Como vamos construir o Motor de Parsing (Front-end)

O desenvolvedor senior desenhou uma estratégia com **Expressões Regulares (Regex)** para que o processamento seja feito no próprio navegador, sem consumir recursos do servidor Cloudflare:

```typescript
export interface ParsedCommand {
  type: 'expense' | 'income';
  amount?: number;
  category?: string;
  date?: string;
  description: string;
}

/**
 * Auxiliar para converter formatos inteligentes de data (#hoje, #ontem, #10/06, #5)
 * @param dateToken O texto que vem após o caractere '#'
 * @param selectedMonth Ano/Mês atual selecionado no topo do grid (ex: "2026-06")
 */
function parseSmartDate(dateToken: string, selectedMonth: string = "2026-06"): string {
  const normalized = dateToken.toLowerCase().trim();
  const today = new Date();

  if (normalized === 'hoje') {
    return today.toISOString().split('T')[0];
  }
  
  if (normalized === 'ontem') {
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Cenário: #5 (Apenas o número do dia dentro do mês selecionado no topo)
  if (/^\d+$/.test(normalized)) {
    const day = parseInt(normalized, 10);
    const paddedDay = day.toString().padStart(2, '0');
    // selectedMonth vem no formato "YYYY-MM"
    return `${selectedMonth}-${paddedDay}`;
  }

  // Cenário: #10/06 (Dia e Mês)
  if (/^\d{1,2}\/\d{1,2}$/.test(normalized)) {
    const [day, month] = normalized.split('/');
    const year = selectedMonth.split('-')[0]; // Usa o ano atual do grid
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Cenário: #2026-06-10 (Data completa)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  // Fallback caso a sintaxe não bata: retorna o dia atual
  return today.toISOString().split('T')[0];
}

/**
 * Parser Principal da Linha de Comando Financeira (Smart CLI)
 */
export function parseCliInput(input: string, selectedMonth: string = "2026-06"): ParsedCommand {
  const tokens = input.trim().split(/\s+/); // Divide a string por espaços

  // Padrão inicial: Despesa se não especificado diferente
  let type: 'expense' | 'income' = 'expense';
  let amount: number | undefined;
  let category: string | undefined;
  let date: string | undefined;
  const descriptionWords: string[] = [];

  for (const token of tokens) {
    if (!token) continue;

    // 1. Gatilhos de Comando (/- ou /+)
    if (token === '/-') {
      type = 'expense';
    } else if (token === '/+') {
      type = 'income';
    } 
    // 2. Mapeamento de Categoria (@categoria)
    else if (token.startsWith('@') && token.length > 1) {
      category = token.substring(1); // Remove o '@'
    } 
    // 3. Mapeamento de Data (#data)
    else if (token.startsWith('#') && token.length > 1) {
      date = parseSmartDate(token.substring(1), selectedMonth);
    } 
    // 4. Captura de Valores (Suporta 500, 500.10, 500,1)
    // Só captura se ainda não tiver capturado um valor válido na linha
    else if (!amount && /^\d+([.,]\d{1,2})?$/.test(token)) {
      amount = parseFloat(token.replace(',', '.'));
    } 
    // 5. O resto acumula como descrição do lançamento
    else {
      descriptionWords.push(token);
    }
  }

  return {
    type,
    amount,
    category,
    date,
    description: descriptionWords.join(' ')
  };
}

```

### 🧪 Cobertura dos Casos de Teste (Exemplos)

Se o utilizador digitar na linha fixa do topo:

/- 15,50 Café @alimentacao #hoje

Resultado: { type: 'expense', amount: 15.5, category: 'alimentacao', date: '2026-06-08', description: 'Café' }

Se o utilizador digitar:

/+ Reembolso Uber 200 @transporte #5 (Considerando o mês "2026-06" no topo)

Resultado: { type: 'income', amount: 200, category: 'transporte', date: '2026-06-05', description: 'Reembolso Uber' }


---

### 🎨 O Design Visual do Tooltip Vivo (UX/UI & Frontend)

Quando o campo de descrição ganha foco e o utilizador digita qualquer coisa, um pequeno balão com cantos arredondados e sombra suave (`shadow-lg`) surge logo abaixo do input, estilizado nativamente para os dois modos:

* **Tema Claro:** Fundo branco semi-transparente (`bg-white/95`), borda sutil e textos em cinza escuro.
* **Tema Escuro:** Fundo grafite escuro (`bg-slate-900/95`), borda suave e textos claros.

**A Dinâmica das Cores Clássicas dentro do Balão:**
O balão terá quatro mini-indicadores horizontais que acendem, apagam ou mudam de cor dinamicamente:

1. **Indicador de Tipo:** Se detetar `/-`, mostra um mini-badge escrito 🔴 **Despesa**. Se detetar `/+`, muda na hora para 🟢 **Receita**.
2. **Indicador de Valor:** Se digitar `15,50`, aparece `💰 R$ 15,50`. Se não houver número, fica um discreto `💰 R$ 0,00` em tom fosco.
3. **Indicador de Categoria:** Ao digitar `@alimentacao`, o balão mostra `🏷️ Alimentação`. Se o utilizador digitar algo que não existe (ex: `@alime`), o sistema faz a busca por aproximação (*fuzzy*) e mostra um preview em itálico: `🏷️ Mapear para: Alimentação?`.
4. **Indicador de Data:** Ao digitar `#5`, o balão calcula e mostra a data por extenso: `📅 05 de Junho de 2026`.

---

### ⚡ Integração no Componente React (`TransactionRow.tsx`)

O **Frontend Developer** já mapeou como o estado do componente vai reagir a cada tecla digitada, utilizando o método `parseCliInput` que refinámos anteriormente:

```tsx
import { useState, useMemo } from 'react';
import { parseCliInput } from '../utils/cliParser';

export function TransactionRow({ selectedMonth }) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // useMemo garante que o parser roda instantaneamente a cada tecla
  // sem gerar perda de performance ou travamentos na digitação
  const preview = useMemo(() => {
    return parseCliInput(inputValue, selectedMonth);
  }, [inputValue, selectedMonth]);

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)} // delay para permitir cliques
        placeholder="Adicionar nova transação... (ex: /- 15,50 Café @alimentacao #hoje)"
        className="w-full bg-transparent border-none outline-none ..."
      />

      {/* TOOLTIP SUSPENSO VIVO */}
      {isFocused && inputValue.trim().length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full max-w-xl p-3 rounded-lg border backdrop-blur-sm shadow-lg bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          
          <span className={`font-semibold flex items-center gap-1 ${preview.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {preview.type === 'expense' ? '🔴 Despesa' : '🟢 Receita'}
          </span>

          <span className="text-slate-400 dark:text-slate-500">|</span>

          <span className="font-medium text-slate-700 dark:text-slate-300">
            💰 R$ {preview.amount ? preview.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
          </span>

          <span className="text-slate-400 dark:text-slate-500">|</span>

          <span className="text-slate-600 dark:text-slate-400">
            📝 {preview.description || 'Sem descrição'}
          </span>

          {(preview.category || preview.date) && (
            <>
              <span className="text-slate-400 dark:text-slate-500">|</span>
              {preview.category && (
                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                  🏷️ @{preview.category}
                </span>
              )}
              {preview.date && (
                <span className="text-slate-500 dark:text-slate-400">
                  📅 {preview.date}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

```

---
