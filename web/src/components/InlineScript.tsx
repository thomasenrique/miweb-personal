"use client";

/**
 * Script en línea que corre al cargar el HTML (antes del primer pintado).
 * En el cliente se marca text/plain para que React no avise por renderizar un <script> (patrón de la guía de Next).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
