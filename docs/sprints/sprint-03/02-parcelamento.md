Gerar as parcelas fisicamente no banco de dados de uma só vez pelos seguinte motivos:

1. **Previsibilidade Financeira:** Quando o utilizador navegar para os meses seguintes (ex: Julho, Agosto, Setembro), o saldo futuro projetado já estará correto, refletindo o peso dessas parcelas no orçamento.
2. **Performance de Leitura:** O endpoint `GET /transactions` permanece extremamente rápido e limpo, pois o banco de dados só precisa de fazer um filtro de data comum, sem precisar de calcular projeções matemáticas complexas em tempo de execução.

---

## 🛠️ Engenharia de Backoffice: Como o Backend vai processar isto

Quando a linha de inserção rápida detetar que se trata de um parcelamento (ex: `Parcelamento: 3x`), o backend executará um loop simples, mas robusto:

```typescript
// Exemplo da lógica interna do Backend para a US06
const totalParcelas = 3;
const valorTotal = 30000; // R$ 300,00
const valorParcela = Math.floor(valorTotal / totalParcelas); // R$ 100,00

for (let i = 1; i <= totalParcelas; i++) {
  await db.insert(transactions).values({
    id: generateSnowflakeId(),
    recurrence_id: grupoRecorrenciaId, // O mesmo ID para interligar a cadeia
    description: `${descricaoOriginal} (${i}/${totalParcelas})`, // Ex: Consórcio Moto (1/3)
    amount: valorParcela,
    date: date.addMonths(i - 1), // Incrementa o mês automaticamente
    account_id: contaId,
    category_id: categoriaId,
    is_paid: false // Nascem sempre como pendentes
  });
}

```

---
