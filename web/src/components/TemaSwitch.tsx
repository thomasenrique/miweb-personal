"use client";

import { useEffect, useState } from "react";

type Tema = "light" | "dark";
const CLAVE = "tema";

/** Tema efectivo: el elegido a mano (data-theme en <html>) o, si no hay, el del sistema. */
function temaActual(): Tema {
  const elegido = document.documentElement.dataset.theme;
  if (elegido === "dark" || elegido === "light") return elegido;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Interruptor claro/oscuro para toda la web. Guarda la elección en localStorage (lo lee el script del layout raíz). */
export function TemaSwitch({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    const sync = () => setTema(temaActual());
    sync();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    // Otras instancias (menú lateral y Ajustes) avisan cuando cambian el tema
    window.addEventListener("tema-cambio", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("tema-cambio", sync);
    };
  }, []);

  function cambiar(oscuro: boolean) {
    const nuevo: Tema = oscuro ? "dark" : "light";
    document.documentElement.dataset.theme = nuevo;
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {}
    window.dispatchEvent(new Event("tema-cambio"));
  }

  const oscuro = tema === "dark";
  return (
    <label className={`h-switch ${className}`}>
      <input type="checkbox" role="switch" checked={oscuro} disabled={tema === null} onChange={(e) => cambiar(e.target.checked)} />
      <span className="h-switch__track">
        <span className="h-switch__thumb" aria-hidden="true">{oscuro ? "🌙" : "☀️"}</span>
      </span>
      <span>Modo oscuro</span>
    </label>
  );
}
