"use client";

import type { ReactNode } from "react";

/** Botón de envío que pide confirmación antes de una acción destructiva o que cuesta revertir. */
export function ConfirmButton({
  mensaje, children, tono = "peligro",
}: {
  mensaje: string;
  children: ReactNode;
  tono?: "peligro" | "neutro";
}) {
  return (
    <button
      className={tono === "peligro" ? "h-btn h-btn--ghost" : "h-btn"}
      style={tono === "peligro" ? { color: "var(--h-bad-text)" } : undefined}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
