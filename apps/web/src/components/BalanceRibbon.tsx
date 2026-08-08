import { useTranslation } from "react-i18next";
import type { TransactionSummary } from "@/lib/api";
import { HeaderSummary } from "./HeaderSummary";

interface BalanceRibbonProps {
  summary: TransactionSummary;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function BalanceRibbon({ summary }: BalanceRibbonProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("transactions.income")}
        </span>
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {formatCurrency(summary.income)}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("transactions.expense")}
        </span>
        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
          {formatCurrency(summary.expense)}
        </span>
      </div>

      <HeaderSummary monthlyBalance={summary.balance} />
    </div>
  );
}
