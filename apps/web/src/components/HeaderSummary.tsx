import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, type AccountBalance } from "@/lib/api";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

interface HeaderSummaryProps {
  monthlyBalance: number;
}

export function HeaderSummary({ monthlyBalance }: HeaderSummaryProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalWealth = useMemo(() => {
    return balances.reduce((acc, curr) => acc + curr.currentBalance, 0);
  }, [balances]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    api.getAccountBalances().then((res) => {
      if (cancelled) return;
      if (res.data) setBalances(res.data.items);
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleClickOutside]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-end cursor-pointer select-none"
      >
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {t("transactions.balance")}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
        <span
          className={`text-sm font-bold ${
            monthlyBalance >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {formatCurrency(monthlyBalance)}
        </span>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 z-50">
          <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              {t("balances.total_wealth")}
            </p>
            <p className="text-xl font-black text-gray-800 dark:text-gray-100 mt-1">
              {isLoading ? "---" : formatCurrency(totalWealth)}
            </p>
          </div>

          <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {t("balances.by_account")}
            </p>

            {isLoading ? (
              <div className="space-y-2 py-1">
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              balances.map((account) => (
                <div key={account.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {account.name}
                    </span>
                  </div>
                  <span
                    className={`font-semibold ${
                      account.currentBalance >= 0
                        ? "text-gray-800 dark:text-gray-200"
                        : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(account.currentBalance)}
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