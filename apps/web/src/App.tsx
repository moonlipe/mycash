import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { FrameProvider } from "@/contexts/FrameContext";
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { BottomNav } from "@/components/BottomNav";
import { SettingsPage } from "@/pages/SettingsPage";
import { ImportPage } from "@/pages/ImportPage";
import { useFrame } from "@/contexts/FrameContext";
import { useToast } from "@/contexts/ToastContext";
import { Sun, Moon, Globe, Maximize2, Minimize2, Mail, Settings, CalendarDays, Upload } from "lucide-react";
import { api } from "@/lib/api";

function TopBar({ month, year, onMonthChange, isCurrentMonth, goToCurrentMonth }: {
  month: number; year: number; onMonthChange: (m: number, y: number) => void;
  isCurrentMonth: boolean; goToCurrentMonth: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const { framed, toggleFramed } = useFrame();
  const { language, setLanguage } = useLanguage();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleTestEmail = async () => {
    try {
      const { error } = await api.sendTestEmail();
      if (error) {
        showToast(error, "error");
      } else {
        showToast(t("email.test_success"), "success");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggleTheme}
          className="hidden rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 md:block"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={toggleFramed}
          className="hidden rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 md:block"
          title={framed ? t("settings.expand_view") : t("settings.framed_view")}
        >
          {framed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
        </button>
      </div>

      <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t("app.title")}
      </h1>

      <div className="hidden items-center gap-1 md:flex">
        {!isCurrentMonth && (
          <button
            onClick={goToCurrentMonth}
            title={t("go_to_current_month")}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <CalendarDays size={16} />
          </button>
        )}
        <button
          onClick={() => { window.location.pathname = "/settings"; }}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title={t("nav.settings")}
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => { window.location.pathname = "/import"; }}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title={t("import.title_upload")}
        >
          <Upload size={16} />
        </button>
        <button
          onClick={handleTestEmail}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Test email"
        >
          <Mail size={14} />
        </button>
        <button
          onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Globe size={14} />
          {language === "pt" ? "PT" : "EN"}
        </button>
        <button
          onClick={logout}
          className="rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t("app.logout")}
        </button>
      </div>
    </header>
  );
}

function handleNewTransaction() {
  const form = document.getElementById("quick-add-form");
  if (form) {
    form.scrollIntoView({ behavior: "smooth" });
    const input = form.querySelector('input[type="text"]');
    if (input) (input as HTMLInputElement).focus();
  }
}

function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const goToCurrentMonth = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <TopBar month={month} year={year} onMonthChange={handleMonthChange} isCurrentMonth={isCurrentMonth} goToCurrentMonth={goToCurrentMonth} />
      <main className="flex-1 pb-16 md:pb-0">
        <TransactionsPage month={month} year={year} onMonthChange={handleMonthChange} />
      </main>
      <BottomNav onNewTransaction={handleNewTransaction} isCurrentMonth={isCurrentMonth} goToCurrentMonth={goToCurrentMonth} />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">{t("app.loading")}</p>
      </div>
    );
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (window.location.pathname === "/settings") {
    return user ? <SettingsPage /> : <AuthPage />;
  }

  if (window.location.pathname === "/import") {
    return user ? <ImportPage /> : <AuthPage />;
  }

  return user ? <Dashboard /> : <AuthPage />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <FrameProvider>
          <AppContent />
        </FrameProvider>
      </ToastProvider>
    </AuthProvider>
  );
}