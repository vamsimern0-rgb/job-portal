import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from "lucide-react";

const ToastContext = createContext(null);

const toneStyles = {
  success: "text-emerald-50 border-emerald-300/40",
  error: "text-rose-50 border-rose-300/40",
  info: "text-cyan-50 border-cyan-300/40"
};

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPathChange = () => setPathname(window.location.pathname);
    const pushState = window.history.pushState;
    const replaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
      const result = pushState.apply(this, args);
      window.dispatchEvent(new Event("app-route-change"));
      return result;
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const result = replaceState.apply(this, args);
      window.dispatchEvent(new Event("app-route-change"));
      return result;
    };

    window.addEventListener("popstate", onPathChange);
    window.addEventListener("app-route-change", onPathChange);

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      window.removeEventListener("popstate", onPathChange);
      window.removeEventListener("app-route-change", onPathChange);
    };
  }, []);

  const pageTone = pathname.startsWith("/hr")
    ? "from-emerald-700 via-emerald-600 to-teal-600"
    : pathname.startsWith("/student")
      ? "from-indigo-700 via-blue-600 to-cyan-600"
      : "from-slate-800 via-slate-700 to-indigo-700";

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message, tone = "info", options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = Number(options.duration) || 3600;
    setToasts((prev) => [...prev, { id, message, tone, title: options.title || "" }]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const api = useMemo(
    () => ({
      success: (message, options) => pushToast(message, "success", options),
      error: (message, options) => pushToast(message, "error", options),
      info: (message, options) => pushToast(message, "info", options)
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="fixed top-4 right-4 z-[9999] w-[min(94vw,390px)] space-y-3">
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone] || Info;
          return (
            <div
              key={toast.id}
              className={`border rounded-2xl px-4 py-3 shadow-xl backdrop-blur-sm flex items-start gap-3 bg-gradient-to-br ${pageTone} ${toneStyles[toast.tone] || toneStyles.info}`}
            >
              <div className="shrink-0 mt-0.5">
                <Icon size={17} />
              </div>

              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide opacity-90 flex items-center gap-1">
                  <Sparkles size={12} />
                  {toast.title || (toast.tone === "success" ? "Success" : toast.tone === "error" ? "Attention" : "Update")}
                </p>
                <p className="text-sm mt-0.5 leading-snug">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-full p-1 hover:bg-white/20 transition"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
