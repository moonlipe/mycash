import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import { Trash2, Pencil, X, Repeat, Bell, Paperclip } from "lucide-react";
import type { Transaction, Category, Account, TransactionType, UpdateTransactionData } from "@/lib/api";
import { api } from "@/lib/api";
import { PaidToggle } from "./PaidToggle";
import { Modal } from "./Modal";
import { RecurrenceModal } from "./RecurrenceModal";
import { AttachmentManager } from "./AttachmentManager";
import { useToast } from "@/contexts/ToastContext";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value) / 100);
}

function formatCurrencyInput(cents: number): string {
  if (cents === 0) return "";
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return `R$ ${reais.toLocaleString("pt-BR")},${String(centavos).padStart(2, "0")}`;
}

function formatFullDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
    weekday: "long",
  });
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}, ${weekday}`;
}

const amountColorClass = (t: TransactionType) => {
  switch (t) {
    case "income":
      return "text-emerald-600 dark:text-emerald-400";
    case "expense":
      return "text-rose-600 dark:text-rose-400";
    case "transfer":
      return "text-blue-600 dark:text-blue-400";
  }
};

interface TransactionGridProps {
  items: Transaction[];
  categories: Category[];
  accounts: Account[];
  onTogglePaid: (id: string) => void;
  onDeleteTransaction: (id: string, scope: "single" | "future") => Promise<void>;
  onRefresh: () => void;
  expandedTxId?: string | null;
  onExpandTx?: (id: string | null) => void;
}

export function TransactionGrid({
  items,
  categories,
  accounts,
  onTogglePaid,
  onDeleteTransaction,
  onRefresh,
  expandedTxId,
  onExpandTx,
}: TransactionGridProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  const [recurrenceModal, setRecurrenceModal] = useState<{
    open: boolean;
    action: "edit" | "delete";
    transactionId: string;
    description: string;
  }>({
    open: false,
    action: "delete",
    transactionId: "",
    description: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    transactionId: string;
    description: string;
  }>({ open: false, transactionId: "", description: "" });

  const [editModal, setEditModal] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });

  const [editDesc, setEditDesc] = useState("");
  const [editAmountCents, setEditAmountCents] = useState(0);
  const [editAmountDisplay, setEditAmountDisplay] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editReminderDate, setEditReminderDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const handleEditAmountChange = useCallback((raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    const cents = digits ? parseInt(digits, 10) : 0;
    setEditAmountCents(cents);
    setEditAmountDisplay(formatCurrencyInput(cents));
  }, []);

  const openEditModal = useCallback(
    (tx: Transaction) => {
      if (tx.recurrenceId) {
        setRecurrenceModal({
          open: true,
          action: "edit",
          transactionId: tx.id,
          description: tx.description,
        });
        return;
      }
      setEditDesc(tx.description);
      setEditAmountCents(Math.abs(tx.amount));
      setEditAmountDisplay(formatCurrencyInput(Math.abs(tx.amount)));
      setEditCategoryId(tx.categoryId);
      setEditAccountId(tx.accountId);
      setEditNotes(tx.notes || "");
      setEditReminderDate(tx.reminderDate || "");
      setEditDueDate(tx.dueDate);
      setEditModal({ open: true, transaction: tx });
    },
    []
  );

  const handleEditSubmit = useCallback(
    async (scope: "single" | "future") => {
      const tx = editModal.transaction;
      if (!tx) return;
      setEditModal({ open: false, transaction: null });

      const data: UpdateTransactionData = {
        description: editDesc.trim() || undefined,
        amount: editAmountCents || undefined,
        categoryId: editCategoryId || undefined,
        accountId: editAccountId || undefined,
        dueDate: editDueDate || undefined,
        notes: editNotes || undefined,
        reminderDate: editReminderDate || null,
        scope,
      };

      await api.updateTransaction(tx.id, data);
      onRefresh();
    },
    [editModal, editDesc, editAmountCents, editCategoryId, editAccountId, editNotes, editReminderDate, editDueDate, onRefresh]
  );

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "description",
        header: t("transactions.description"),
        cell: ({ getValue, row }) => {
          const desc = getValue() as string;
          return (
            <div className="flex flex-col">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {desc}
              </span>
              {row.original.notes && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {row.original.notes}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "category",
        header: t("transactions.category"),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: row.original.categoryColor }}
            />
            {row.original.categoryName}
          </span>
        ),
      },
      {
        id: "account",
        header: t("transactions.account"),
        cell: ({ row }) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.accountName}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("transactions.amount"),
        cell: ({ row }) => {
          const { amount, type } = row.original;
          return (
            <span
              className={`text-sm font-medium ${amountColorClass(type)}`}
            >
              {type === "income" ? "+" : type === "expense" ? "-" : "\u21C4"}
              {formatCurrency(amount)}
            </span>
          );
        },
      },
      {
        id: "icons",
        header: "",
        size: 52,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.recurrenceId && (
              <Repeat size={14} className="text-gray-400 dark:text-gray-500" />
            )}
            {row.original.reminderDate && (
              <Bell size={14} className="text-amber-400 dark:text-amber-500" />
            )}
            {(row.original.attachmentCount ?? 0) > 0 && (
              <Paperclip size={14} className="text-gray-400 dark:text-gray-500" />
            )}
          </div>
        ),
      },
      {
        id: "actions",
        size: 80,
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <PaidToggle
              isPaid={row.original.isPaid}
              type={row.original.type}
              onToggle={() => onTogglePaid(row.original.id)}
            />
            <button
              onClick={() => onExpandTx?.(expandedTxId === row.original.id ? null : row.original.id)}
              className={`rounded p-1 transition-colors ${
                (row.original.attachmentCount ?? 0) > 0
                  ? "text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  : "text-gray-300 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
              }`}
              title={t("transactions.attachments")}
            >
              <Paperclip size={14} />
            </button>
            <button
              onClick={() => openEditModal(row.original)}
              className="rounded p-1 text-gray-300 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
              title={t("transactions.edit")}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleDeleteClick(row.original)}
              className="rounded p-1 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
              title={t("transactions.delete")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [t, onTogglePaid, openEditModal, expandedTxId, onExpandTx]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rowMap = useMemo(() => {
    const map = new Map<string, Row<Transaction>>();
    for (const row of table.getRowModel().rows) {
      map.set(row.original.id, row);
    }
    return map;
  }, [items]);

  const groupedItems = useMemo(() => {
    const groups: { date: string; items: Transaction[]; balance: number }[] = [];
    let runningBalance = 0;

    const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const byDate = new Map<string, Transaction[]>();

    for (const item of sorted) {
      const key = item.dueDate;
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(item);
    }

    for (const [date, dateItems] of byDate) {
      let dayBalance = 0;
      for (const item of dateItems) {
        if (item.type === "income") dayBalance += item.amount;
        else if (item.type === "expense") dayBalance -= Math.abs(item.amount);
      }
      runningBalance += dayBalance;
      groups.push({ date, items: dateItems, balance: runningBalance });
    }

    return groups;
  }, [items]);

  const handleDeleteClick = useCallback(
    (tx: Transaction) => {
      if (tx.recurrenceId) {
        setRecurrenceModal({
          open: true,
          action: "delete",
          transactionId: tx.id,
          description: tx.description,
        });
      } else {
        setDeleteConfirm({ open: true, transactionId: tx.id, description: tx.description });
      }
    },
    []
  );

  const handleDeleteConfirm = useCallback(
    async () => {
      const id = deleteConfirm.transactionId;
      setDeleteConfirm({ open: false, transactionId: "", description: "" });
      await onDeleteTransaction(id, "single");
    },
    [deleteConfirm, onDeleteTransaction]
  );

  const handleRecurrenceConfirm = useCallback(
    async (scope: "single" | "future") => {
      const modal = recurrenceModal;
      setRecurrenceModal((prev) => ({ ...prev, open: false }));

      if (modal.action === "delete") {
        await onDeleteTransaction(modal.transactionId, scope);
      } else {
        const tx = items.find((i) => i.id === modal.transactionId);
        if (!tx) return;
        setEditDesc(tx.description);
        setEditAmountCents(Math.abs(tx.amount));
        setEditAmountDisplay(formatCurrencyInput(Math.abs(tx.amount)));
        setEditCategoryId(tx.categoryId);
        setEditAccountId(tx.accountId);
        setEditNotes(tx.notes || "");
        setEditReminderDate(tx.reminderDate || "");
        setEditDueDate(tx.dueDate);
        setEditModal({ open: true, transaction: { ...tx, _scope: scope } as Transaction & { _scope?: string } });
      }
    },
    [recurrenceModal, onDeleteTransaction, items]
  );

  const colCount = columns.length;
  const editFilteredCategories = editModal.transaction
    ? categories.filter((cat) => {
        if (editModal.transaction!.type === "transfer") return true;
        return cat.type === editModal.transaction!.type;
      })
    : [];

  const editTx = editModal.transaction;
  const editScope = (editTx as Transaction & { _scope?: string })?._scope as "single" | "future" | undefined;

  return (
    <div className="flex flex-col">
      {items.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("transactions.no_transactions")}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  >
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {groupedItems.map((group) => (
                  <Fragment key={`group-${group.date}`}>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <td
                        colSpan={colCount}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {formatFullDate(group.date, i18n.language)}
                      </td>
                    </tr>
                    {group.items.map((item) => {
                      const row = rowMap.get(item.id);
                      if (!row) return null;
                      return (
                        <Fragment key={item.id}>
                        <tr
                          className={`border-b border-gray-100 transition-opacity duration-200 dark:border-gray-800 ${
                            item.isPaid
                              ? "opacity-100"
                              : "opacity-50 dark:opacity-60"
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-2 py-1">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                        {expandedTxId === item.id && (
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <td colSpan={colCount} className="px-4 py-2">
                              <AttachmentManager
                                transactionId={item.id}
                                attachmentCount={item.attachmentCount ?? 0}
                                onAttachmentChange={onRefresh}
                              />
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <td
                        colSpan={colCount - 1}
                        className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400"
                      >
                        {t("transactions.daily_balance")}
                      </td>
                      <td
                        className={`px-4 py-2 text-right text-sm font-semibold ${
                          group.balance >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {group.balance >= 0 ? "+" : "-"}
                        {formatCurrency(group.balance)}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:hidden">
            {groupedItems.map((group) => (
              <div key={`mobile-group-${group.date}`}>
                <div className="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {formatFullDate(group.date, i18n.language)}
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`border-b border-gray-100 px-4 py-3 transition-opacity duration-200 dark:border-gray-800 ${
                      item.isPaid
                        ? "opacity-100"
                        : "opacity-50 dark:opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.description}
                          </span>
                          {item.recurrenceId && (
                            <Repeat size={12} className="text-gray-400 dark:text-gray-500" />
                          )}
                          {item.reminderDate && (
                            <Bell size={12} className="text-amber-400 dark:text-amber-500" />
                          )}
                          {(item.attachmentCount ?? 0) > 0 && (
                            <Paperclip size={12} className="text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.categoryColor }}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.categoryName}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            &middot; {item.accountName}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-sm font-semibold ${amountColorClass(item.type)}`}
                      >
                        {item.type === "income"
                          ? "+"
                          : item.type === "expense"
                            ? "-"
                            : "\u21C4"}
                        {formatCurrency(item.amount)}
                      </span>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onExpandTx?.(expandedTxId === item.id ? null : item.id)}
                          className={`rounded p-1 transition-colors ${
                            (item.attachmentCount ?? 0) > 0
                              ? "text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              : "text-gray-300 hover:bg-gray-50 hover:text-gray-500 dark:hover:bg-gray-700"
                          }`}
                        >
                          <Paperclip size={14} />
                        </button>
                        <PaidToggle
                          isPaid={item.isPaid}
                          type={item.type}
                          onToggle={() => onTogglePaid(item.id)}
                        />
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded p-1 text-gray-300 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="rounded p-1 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {expandedTxId === item.id && (
                      <AttachmentManager
                        transactionId={item.id}
                        attachmentCount={item.attachmentCount ?? 0}
                        onAttachmentChange={onRefresh}
                      />
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-end border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <span className="mr-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {t("transactions.daily_balance")}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      group.balance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {group.balance >= 0 ? "+" : "-"}
                    {formatCurrency(group.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RecurrenceModal
        open={recurrenceModal.open}
        onClose={() => setRecurrenceModal((prev) => ({ ...prev, open: false }))}
        onConfirm={handleRecurrenceConfirm}
        action={recurrenceModal.action}
        description={recurrenceModal.description}
      />

      <Modal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, transactionId: "", description: "" })}
        title={t("transactions.delete_confirm_title")}
      >
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {t("transactions.delete_confirm_message", { description: deleteConfirm.description })}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteConfirm({ open: false, transactionId: "", description: "" })}
            className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
          >
            {t("transactions.delete_confirm_cancel")}
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
          >
            {t("transactions.delete_confirm_ok")}
          </button>
        </div>
      </Modal>

      <Modal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, transaction: null })}
        title={t("transactions.edit_title")}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.description")}
            </label>
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.due_date")}
            </label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.amount")}
            </label>
            <input
              type="text"
              value={editAmountDisplay}
              onChange={(e) => handleEditAmountChange(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.category")}
            </label>
            <select
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {editFilteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.account")}
            </label>
            <select
              value={editAccountId}
              onChange={(e) => setEditAccountId(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <Bell size={12} />
              {t("transactions.reminder_label")}
            </label>
            <input
              type="date"
              value={editReminderDate}
              onChange={(e) => setEditReminderDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("transactions.notes_label")}
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditModal({ open: false, transaction: null })}
              className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
            >
              {t("transactions.edit_cancel")}
            </button>
            <button
              onClick={() => handleEditSubmit(editScope || "single")}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {t("transactions.edit_save")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
