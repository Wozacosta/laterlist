"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
} from "react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export const ToastProvider = memo(function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() =>
            setToasts((prev) => prev.filter((x) => x.id !== t.id))
          } />
        ))}
      </div>
    </ToastContext.Provider>
  );
});

const icons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
};

const styles: Record<ToastType, string> = {
  success: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
};

const ToastItem = memo(function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      ref={ref}
      onClick={onDismiss}
      className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg cursor-pointer transition-all duration-300 ${styles[toast.type]} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span className="text-xs">{icons[toast.type]}</span>
      {toast.message}
    </div>
  );
});
