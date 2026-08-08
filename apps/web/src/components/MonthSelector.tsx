import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const { t } = useTranslation();

  const goBack = () => {
    if (month === 1) {
      onChange(12, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const goForward = () => {
    if (month === 12) {
      onChange(1, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goBack}
        className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[140px] text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t(`months.${month}`)}, {year}
      </span>
      <button
        onClick={goForward}
        className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
