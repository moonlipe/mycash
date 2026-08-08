import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ListPlus, PlusCircle, Settings, Sun, Moon, Globe, CalendarDays, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/hooks/useLanguage";

interface BottomNavProps {
  onNewTransaction: () => void;
  isCurrentMonth: boolean;
  goToCurrentMonth: () => void;
}

export function BottomNav({ onNewTransaction, isCurrentMonth, goToCurrentMonth }: BottomNavProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 md:hidden">
      <div className="flex items-center justify-around py-2">
        <button className="flex flex-col items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
          <ListPlus size={22} />
          <span className="text-[10px] font-medium">{t("nav.transactions")}</span>
        </button>

        <button
          onClick={onNewTransaction}
          className="flex flex-col items-center gap-0.5 text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <PlusCircle size={22} />
          <span className="text-[10px] font-medium">{t("nav.new_transaction")}</span>
        </button>

        <button
          onClick={() => { window.location.pathname = "/import"; }}
          className="flex flex-col items-center gap-0.5 text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <Upload size={22} />
          <span className="text-[10px] font-medium">{t("import.title_upload")}</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex flex-col items-center gap-0.5 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Settings size={22} />
            <span className="text-[10px] font-medium">{t("nav.settings")}</span>
          </button>

          {showMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => {
                  window.location.pathname = "/settings";
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Settings size={16} />
                {t("nav.settings")}
              </button>

              {!isCurrentMonth && (
                <>
                  <button
                    onClick={() => { goToCurrentMonth(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <CalendarDays size={16} />
                    {t("go_to_current_month")}
                  </button>
                  <div className="my-1 border-t border-gray-200 dark:border-gray-600" />
                </>
              )}

              <button
                onClick={() => { toggleTheme(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? t("settings.light_mode") : t("settings.dark_mode")}
              </button>

              <button
                onClick={() => { setLanguage(language === "pt" ? "en" : "pt"); setShowMenu(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Globe size={16} />
                {language === "pt" ? "English" : "Português"}
              </button>

              <div className="my-1 border-t border-gray-200 dark:border-gray-600" />

              <button
                onClick={() => { setShowMenu(false); logout(); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
              >
                {t("app.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
