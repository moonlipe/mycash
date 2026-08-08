import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ImportWizard } from "@/components/ImportWizard";
import { api, type Account, type Category } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { ArrowLeft, Loader2 } from "lucide-react";

export function ImportPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [accRes, catRes] = await Promise.all([
        api.getAccounts(),
        api.getCategories(),
      ]);
      if (accRes.data) setAccounts(accRes.data.items);
      if (catRes.data) setCategories(catRes.data.items);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleComplete = () => {
    window.location.pathname = "/";
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => { window.location.pathname = "/"; }}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title={t("settings.back")}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("import.title_upload")}
        </h1>
      </header>

      <main className="flex-1 p-4 md:mx-auto md:max-w-3xl md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <ImportWizard
            accounts={accounts}
            categories={categories}
            onComplete={handleComplete}
          />
        )}
      </main>
    </div>
  );
}
