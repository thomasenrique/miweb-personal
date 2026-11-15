"use client";

import type { ReactNode } from "react";

/** Botón de envío que pide confirmación antes de una acción destructiva. */
export function ConfirmButton({ mensaje, children }: { mensaje: string; children: ReactNode }) {
  return (
    <button
      className="h-btn h-btn--ghost"
      style={{ color: "var(--h-bad-text)" }}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
