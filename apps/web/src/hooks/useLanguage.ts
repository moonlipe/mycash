import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useLanguage() {
  const { i18n } = useTranslation();

  const setLanguage = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang);
      localStorage.setItem("lang", lang);
    },
    [i18n]
  );

  return {
    language: i18n.language,
    setLanguage,
  };
}
