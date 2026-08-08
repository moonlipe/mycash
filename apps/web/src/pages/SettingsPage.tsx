import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { Modal } from "@/components/Modal";
import { api, type Account, type Category } from "@/lib/api";
import {
  ArrowLeft,
  Sun,
  Moon,
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Heart,
  Dumbbell,
  Book,
  GraduationCap,
  Briefcase,
  Gift,
  CreditCard,
  PiggyBank,
  Plane,
  Gamepad2,
  Music,
  Tv,
  Smartphone,
  Laptop,
  Stethoscope,
  PawPrint,
  Shirt,
  Coffee,
  Beer,
  Cake,
  Tag,
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PageTab = "categories" | "accounts";
type CategoryTab = "expense" | "income";

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78716c", "#6b7280", "#64748b",
];

const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  home: Home,
  heart: Heart,
  dumbbell: Dumbbell,
  book: Book,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  plane: Plane,
  "gamepad-2": Gamepad2,
  music: Music,
  tv: Tv,
  smartphone: Smartphone,
  laptop: Laptop,
  stethoscope: Stethoscope,
  "paw-print": PawPrint,
  shirt: Shirt,
  coffee: Coffee,
  beer: Beer,
  cake: Cake,
  tag: Tag,
  "dollar-sign": DollarSign,
  "trending-up": TrendingUp,
  wallet: Wallet,
};

const ICON_NAMES = Object.keys(ICON_MAP);

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Tag;
  return <Icon className={className} size={18} />;
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return `${reais.toLocaleString("pt-BR")},${String(centavos).padStart(2, "0")}`;
}

function parseCents(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<PageTab>("categories");
  const [activeCategoryTab, setActiveCategoryTab] = useState<CategoryTab>("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [catModal, setCatModal] = useState<{ open: boolean; editing?: Category }>({ open: false });
  const [catForm, setCatForm] = useState({ name: "", type: "expense" as CategoryTab, color: "#6b7280", icon: "tag" });

  const [accModal, setAccModal] = useState<{ open: boolean; editing?: Account }>({ open: false });
  const [accForm, setAccForm] = useState({ name: "", type: "checking", initialBalance: "", color: "#3b82f6" });

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "account"; id: string; name: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [catRes, accRes] = await Promise.all([
      api.getCategories(),
      api.getAccounts(),
    ]);
    if (catRes.data) setCategories(catRes.data.items);
    if (accRes.data) setAccounts(accRes.data.items);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goBack = () => {
    window.location.pathname = "/";
  };

  const openNewCategory = (type: CategoryTab) => {
    setCatForm({ name: "", type, color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)], icon: "tag" });
    setCatModal({ open: true });
  };

  const openEditCategory = (cat: Category) => {
    setCatForm({ name: cat.name, type: cat.type as CategoryTab, color: cat.color, icon: cat.icon });
    setCatModal({ open: true, editing: cat });
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) {
      showToast(t("errors.missing_fields"), "error");
      return;
    }
    if (catModal.editing) {
      const { error } = await api.updateCategory(catModal.editing.id, {
        name: catForm.name,
        color: catForm.color,
        icon: catForm.icon,
      });
      if (error) {
        showToast(error, "error");
        return;
      }
    } else {
      const { error } = await api.createCategory({
        name: catForm.name,
        type: catForm.type,
        color: catForm.color,
        icon: catForm.icon,
      });
      if (error) {
        showToast(error, "error");
        return;
      }
    }
    setCatModal({ open: false });
    fetchData();
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm || deleteConfirm.type !== "category") return;
    const { error } = await api.deleteCategory(deleteConfirm.id);
    if (error) {
      showToast(error, "error");
    } else {
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const openNewAccount = () => {
    setAccForm({ name: "", type: "checking", initialBalance: "", color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)] });
    setAccModal({ open: true });
  };

  const openEditAccount = (acc: Account) => {
    const initialBalance = acc.initialBalance ? formatCurrencyInput(String(Math.abs(acc.initialBalance))) : "";
    setAccForm({ name: acc.name, type: acc.type, initialBalance, color: acc.color });
    setAccModal({ open: true, editing: acc });
  };

  const handleSaveAccount = async () => {
    if (!accForm.name.trim()) {
      showToast(t("errors.missing_fields"), "error");
      return;
    }
    const data = {
      name: accForm.name,
      type: accForm.type,
      color: accForm.color,
      initialBalance: parseCents(accForm.initialBalance),
    };
    if (accModal.editing) {
      const { error } = await api.updateAccount(accModal.editing.id, data);
      if (error) {
        showToast(error, "error");
        return;
      }
    } else {
      const { error } = await api.createAccount(data);
      if (error) {
        showToast(error, "error");
        return;
      }
    }
    setAccModal({ open: false });
    fetchData();
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm || deleteConfirm.type !== "account") return;
    const { error } = await api.deleteAccount(deleteConfirm.id);
    if (error) {
      showToast(t(error), "error");
    } else {
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const filteredCategories = categories.filter((c) => c.type === activeCategoryTab);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("settings.title")}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Globe size={16} />
          </button>
        </div>
      </header>

      <div className="flex border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === "categories"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("settings.categories")}
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === "accounts"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {t("settings.accounts")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "categories" && (
          <div>
            <div className="flex border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setActiveCategoryTab("expense")}
                className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
                  activeCategoryTab === "expense"
                    ? "border-b-2 border-rose-400 text-rose-600 dark:text-rose-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t("settings.expense")}
              </button>
              <button
                onClick={() => setActiveCategoryTab("income")}
                className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
                  activeCategoryTab === "income"
                    ? "border-b-2 border-emerald-400 text-emerald-600 dark:text-emerald-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t("settings.income")}
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: cat.color + "20" }}
                  >
                    <CategoryIcon name={cat.icon} className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: "category", id: cat.id, name: cat.name })}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {!loading && filteredCategories.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  {t("settings.no_categories")}
                </div>
              )}
            </div>

            <div className="px-4 py-4">
              <button
                onClick={() => openNewCategory(activeCategoryTab)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              >
                <Plus size={18} />
                {t("settings.add_category")}
              </button>
            </div>
          </div>
        )}

        {activeTab === "accounts" && (
          <div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: acc.color + "20" }}
                  >
                    <DollarSign size={16} className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {acc.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {t(`settings.${acc.type}`)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditAccount(acc)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: "account", id: acc.id, name: acc.name })}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {!loading && accounts.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  {t("settings.no_accounts")}
                </div>
              )}
            </div>

            <div className="px-4 py-4">
              <button
                onClick={openNewAccount}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              >
                <Plus size={18} />
                {t("settings.add_account")}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={catModal.open}
        onClose={() => setCatModal({ open: false })}
        title={catModal.editing ? t("settings.edit_category") : t("settings.add_category")}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.name")}
            </label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder={t("settings.name")}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.color")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setCatForm({ ...catForm, color })}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    catForm.color === color ? "ring-2 ring-offset-2 ring-emerald-400 dark:ring-offset-gray-800" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.icon")}
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_NAMES.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => setCatForm({ ...catForm, icon: iconName })}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    catForm.icon === iconName
                      ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                  }`}
                >
                  <CategoryIcon name={iconName} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCatModal({ open: false })}
              className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
            >
              {t("settings.cancel")}
            </button>
            <button
              onClick={handleSaveCategory}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {t("settings.save")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={accModal.open}
        onClose={() => setAccModal({ open: false })}
        title={accModal.editing ? t("settings.edit_account") : t("settings.add_account")}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.name")}
            </label>
            <input
              type="text"
              value={accForm.name}
              onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder={t("settings.name")}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.type")}
            </label>
            <select
              value={accForm.type}
              onChange={(e) => setAccForm({ ...accForm, type: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="checking">{t("settings.checking")}</option>
              <option value="savings">{t("settings.savings")}</option>
              <option value="investment">{t("settings.investment")}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.initial_balance")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={accForm.initialBalance}
              onChange={(e) => setAccForm({ ...accForm, initialBalance: formatCurrencyInput(e.target.value) })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("settings.color")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccForm({ ...accForm, color })}
                  className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                    accForm.color === color ? "ring-2 ring-offset-2 ring-emerald-400 dark:ring-offset-gray-800" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setAccModal({ open: false })}
              className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
            >
              {t("settings.cancel")}
            </button>
            <button
              onClick={handleSaveAccount}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {t("settings.save")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={deleteConfirm ? t("settings.delete_confirm_title", { name: deleteConfirm.name }) : ""}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("settings.delete_confirm_message")}
          </p>
          {deleteConfirm?.type === "category" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("settings.delete_category_warning")}
            </p>
          )}
          {deleteConfirm?.type === "account" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("settings.delete_account_warning")}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
            >
              {t("settings.cancel")}
            </button>
            <button
              onClick={deleteConfirm?.type === "category" ? handleDeleteCategory : handleDeleteAccount}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              {t("settings.delete")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
