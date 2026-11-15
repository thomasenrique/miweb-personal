"use client";

import { useState } from "react";

/** Input de monto que agrega puntos de miles mientras escribes (42100 → 42.100). */
export function MoneyInput({
  name, id, defaultValue, placeholder, decimales = false, required,
}: {
  name: string;
  id: string;
  defaultValue?: number | null;
  placeholder?: string;
  decimales?: boolean;
  required?: boolean;
}) {
  const formatear = (s: string) => {
    const [ent, dec] = s.replace(/[^\d,]/g, "").split(",");
    const miles = (ent ?? "").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decimales && dec !== undefined ? `${miles},${dec.slice(0, 2)}` : miles;
  };
  const inicial =
    defaultValue == null ? "" : formatear(String(defaultValue).replace(".", ","));
  const [valor, setValor] = useState(inicial);
  return (
    <input
      className="h-input h-num"
      id={id}
      name={name}
      inputMode={decimales ? "decimal" : "numeric"}
      autoComplete="off"
      placeholder={placeholder}
      required={required}
      value={valor}
      onChange={(e) => setValor(formatear(e.target.value))}
    />
  );
}
