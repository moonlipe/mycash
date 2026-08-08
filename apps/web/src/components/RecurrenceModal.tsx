import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";

interface RecurrenceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: "single" | "future") => void;
  action: "edit" | "delete";
  description?: string;
}

export function RecurrenceModal({
  open,
  onClose,
  onConfirm,
  action,
  description,
}: RecurrenceModalProps) {
  const { t } = useTranslation();

  const title =
    action === "delete"
      ? t("recurrence.delete_title")
      : t("recurrence.edit_title");

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {t("recurrence.explanation")}
        {description && (
          <span className="mt-1 block font-medium text-gray-800 dark:text-gray-200">
            &ldquo;{description}&rdquo;
          </span>
        )}
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => onConfirm("single")}
          className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
        >
          {action === "delete"
            ? t("recurrence.delete_single")
            : t("recurrence.edit_single")}
        </button>
        <button
          onClick={() => onConfirm("future")}
          className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
        >
          {action === "delete"
            ? t("recurrence.delete_future")
            : t("recurrence.edit_future")}
        </button>
      </div>
    </Modal>
  );
}