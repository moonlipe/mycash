import { Check, Circle } from "lucide-react";
import type { TransactionType } from "@/lib/api";

interface PaidToggleProps {
  isPaid: boolean;
  type: TransactionType;
  onToggle: () => void;
}

export function PaidToggle({ isPaid, type, onToggle }: PaidToggleProps) {
  const fillColor =
    type === "income"
      ? "bg-emerald-600 dark:bg-emerald-500"
      : type === "expense"
        ? "bg-rose-600 dark:bg-rose-500"
        : "bg-blue-600 dark:bg-blue-500";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="group relative flex h-11 w-11 items-center justify-center"
      aria-label={isPaid ? "Mark as pending" : "Mark as paid"}
    >
      {isPaid ? (
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full ${fillColor}`}
        >
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
      ) : (
        <Circle
          size={20}
          className="text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
        />
      )}
    </button>
  );
}
