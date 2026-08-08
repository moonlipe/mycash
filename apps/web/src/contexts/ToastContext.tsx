import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success";
}

interface ToastContextType {
  showToast: (message: string, type?: "error" | "success") => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback(
    (message: string, type: "error" | "success" = "error") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all ${
              toast.type === "error"
                ? "bg-rose-600 text-white dark:bg-rose-500"
                : "bg-emerald-600 text-white dark:bg-emerald-500"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}