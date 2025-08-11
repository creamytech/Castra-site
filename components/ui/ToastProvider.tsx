"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { nanoid } from "nanoid";

type Toast = {
  id: string;
  title?: string;
  message: string;
  variant?: "success" | "error" | "info";
  actionLabel?: string;
  onAction?: () => void;
  ttlMs?: number;
};

const ToastCtx = createContext<{
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = nanoid();
    const ttl = t.ttlMs ?? 5000;
    setToasts((q) => [...q, { id, ...t }]);
    if (ttl > 0) setTimeout(() => setToasts((q) => q.filter((x) => x.id !== id)), ttl);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => setToasts((q) => q.filter((x) => x.id !== id)), []);

  return (
    <ToastCtx.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div style={{ position: "fixed", right: 16, bottom: 16, display: "grid", gap: 8, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            style={{
              minWidth: 280,
              maxWidth: 380,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.1)",
              background:
                t.variant === "error"
                  ? "rgba(239,68,68,.1)"
                  : t.variant === "success"
                  ? "rgba(16,185,129,.12)"
                  : "rgba(59,130,246,.10)",
              backdropFilter: "saturate(1.2) blur(6px)",
              color: "var(--text,#111)",
            }}
          >
            {t.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{t.message}</span>
              {t.actionLabel && t.onAction && (
                <button
                  onClick={t.onAction}
                  style={{ fontWeight: 700, border: "none", background: "transparent", cursor: "pointer" }}
                >
                  {t.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}


