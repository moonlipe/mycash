import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  const validate = (): string | null => {
    if (!password) return t("validation.password_required");
    if (password.length < 8) return t("validation.password_min_length");
    if (password !== confirmPassword) return t("validation.password_mismatch");
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("errors.reset_token_missing"));
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const { error: err } = await api.resetPassword(token, password);
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(true);
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("app.title")}
          </h1>
          <p className="text-red-600 dark:text-red-400">{t("errors.reset_token_missing")}</p>
          <a
            href="/"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {t("auth.back_to_login")}
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("app.title")}
          </h1>
          <p className="mb-4 text-green-600 dark:text-green-400">
            {t("auth.password_reset_success")}
          </p>
          <a
            href="/"
            className="inline-block w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {t("auth.back_to_login")}
          </a>
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

        <h2 className="mb-6 text-center text-lg font-medium text-gray-700 dark:text-gray-300">
          {t("auth.reset_password")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("auth.new_password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              placeholder={t("auth.password_placeholder")}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("auth.confirm_password")}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              placeholder={t("auth.confirm_password_placeholder")}
              autoComplete="new-password"
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
            {submitting ? t("auth.submitting") : t("auth.reset_password")}
          </button>
        </form>

        <p className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {t("auth.back_to_login")}
          </a>
        </p>
      </div>
    </div>
  );
}