import { useState, useEffect, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type AuthView = "login" | "register" | "forgot-password" | "forgot-sent";

const isDev =
  import.meta.env.DEV ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const useTurnstile = !isDev;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function AuthPage() {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!useTurnstile || !TURNSTILE_SITE_KEY) return;

    const renderWidget = () => {
      if (turnstileRef.current && window.turnstile) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken(""),
        });
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!useTurnstile) return;
    setTurnstileToken("");
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [view]);

  const validateAuth = (): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return t("validation.email_required");
    if (!emailRegex.test(email)) return t("validation.email_invalid");
    if (!password) return t("validation.password_required");
    if (password.length < 8) return t("validation.password_min_length");
    return null;
  };

  const validateEmail = (): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return t("validation.email_required");
    if (!emailRegex.test(email)) return t("validation.email_invalid");
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateAuth();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (useTurnstile && !turnstileToken) {
      setError(t("errors.turnstile_required"));
      return;
    }

    setSubmitting(true);
    const action = view === "login" ? login : register;
    const err = await action(email, password, turnstileToken || undefined);
    if (err) setError(err);
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateEmail();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const { error: err } = await api.forgotPassword(email);
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    setView("forgot-sent");
  };

  if (view === "forgot-sent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("app.title")}
          </h1>
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
              {t("auth.forgot_password_sent")}
            </p>
            <p className="text-xs text-green-700 dark:text-green-400">
              {t("auth.forgot_password_sent_detail")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setView("login");
              setError("");
              setPassword("");
            }}
            className="mt-6 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {t("auth.back_to_login")}
          </button>
        </div>
      </div>
    );
  }

  if (view === "forgot-password") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-sm">
          <h1 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("app.title")}
          </h1>

          <h2 className="mb-6 text-center text-lg font-medium text-gray-700 dark:text-gray-300">
            {t("auth.forgot_password")}
          </h2>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                placeholder={t("auth.email_placeholder")}
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {submitting ? t("auth.submitting") : t("auth.send_reset_link")}
            </button>
          </form>

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setView("login");
                setError("");
              }}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("auth.back_to_login")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("app.title")}
        </h1>

        <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => {
              setView("login");
              setError("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              view === "login"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            onClick={() => {
              setView("register");
              setError("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              view === "register"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t("auth.register")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              placeholder={t("auth.email_placeholder")}
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              placeholder={t("auth.password_placeholder")}
              autoComplete={view === "login" ? "current-password" : "new-password"}
            />
          </div>

          {useTurnstile && (
            <div ref={turnstileRef} className="min-h-[65px]" />
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {submitting
              ? t("auth.submitting")
              : view === "login"
                ? t("auth.login")
                : t("auth.register")}
          </button>
        </form>

        {view === "login" && (
          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setView("forgot-password");
                setError("");
              }}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {t("auth.forgot_password")}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
