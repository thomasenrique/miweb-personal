"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", icono: "⌂", texto: "Inicio" },
  { href: "/cuentas", icono: "▤", texto: "Cuentas" },
  { href: "/metas", icono: "◎", texto: "Metas" },
  { href: "/ajustes", icono: "⚙", texto: "Ajustes" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="h-nav" aria-label="Principal">
      {ITEMS.map((i) => {
        const activo = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={activo ? "page" : undefined}>
            <b aria-hidden="true">{i.icono}</b>
            {i.texto}
          </Link>
        );
      })}
    </nav>
  );
}
