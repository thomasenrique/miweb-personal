import Link from "next/link";
import { eliminarProveedor, guardarProveedor } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MoneyInput } from "@/components/MoneyInput";
import type { Card, Category, ProviderFull } from "@/lib/types";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function ProviderForm({ categories, cards, provider }: { categories: Category[]; cards: Card[]; provider?: ProviderFull | null }) {
  const tarjetas = cards.filter((c) => c.activa || c.id === provider?.card_id);
  return (
    <>
      <form action={guardarProveedor} className="h-card h-stack">
        {provider && <input type="hidden" name="id" value={provider.id} />}

        <div className="h-field">
          <label htmlFor="nombre">Nombre</label>
          <input className="h-input" id="nombre" name="nombre" defaultValue={provider?.nombre} placeholder="Enel" required />
        </div>

        <div className="h-field">
          <label htmlFor="category_id">Categoría</label>
          <select className="h-input" id="category_id" name="category_id" defaultValue={provider?.category_id ?? ""} required>
            <option value="" disabled>Elige una categoría</option>
            <optgroup label="Hogar">
              {categories.filter((c) => c.grupo === "hogar").map((c) => (
                <option key={c.id} value={c.id} data-sub={c.es_suscripcion ? "" : undefined}>{c.icono} {c.nombre}</option>
              ))}
            </optgroup>
            <optgroup label="Personal">
              {categories.filter((c) => c.grupo === "personal").map((c) => (
                <option key={c.id} value={c.id} data-sub={c.es_suscripcion ? "" : undefined}>{c.icono} {c.nombre}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="h-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}>
          <div className="h-field">
            <label htmlFor="monto_estimado">Monto estimado (CLP)</label>
            <MoneyInput id="monto_estimado" name="monto_estimado" defaultValue={provider?.monto_estimado} placeholder="42.000" />
          </div>
          <div className="h-field">
            <label htmlFor="dia_vencimiento">Día de vencimiento o cobro</label>
            <input className="h-input" type="number" min={1} max={31} id="dia_vencimiento" name="dia_vencimiento" defaultValue={provider?.dia_vencimiento ?? ""} placeholder="18" />
          </div>
        </div>

        <div className="h-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}>
          <div className="h-field">
            <label htmlFor="frecuencia">Frecuencia</label>
            <select className="h-input" id="frecuencia" name="frecuencia" defaultValue={provider?.frecuencia ?? "mensual"}>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div className="h-field">
            <label htmlFor="mes_cobro">Mes de cobro (si es anual)</label>
            <select className="h-input" id="mes_cobro" name="mes_cobro" defaultValue={provider?.mes_cobro ?? ""}>
              <option value="">—</option>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="h-field">
            <label htmlFor="moneda">Se cobra en</label>
            <select className="h-input" id="moneda" name="moneda" defaultValue={provider?.moneda ?? "CLP"}>
              <option value="CLP">Pesos (CLP)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>
        </div>

        <div className="h-field h-solo-sub">
          <label htmlFor="card_id">Se paga con</label>
          <select className="h-input" id="card_id" name="card_id" defaultValue={provider?.card_id ?? ""}>
            <option value="">Pago manual / transferencia</option>
            {tarjetas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.ultimos4 ? ` ··${c.ultimos4}` : ""} ({c.tipo === "credito" ? "crédito" : "débito"})
              </option>
            ))}
          </select>
          <span className="h-muted">
            Con tarjeta de crédito se marca pagada sola el día de cobro y se suma al pago de la tarjeta.
            {" "}<Link href="/deudas/tarjeta/nueva?tipo=debito">+ Agregar tarjeta de débito</Link>
          </span>
        </div>

        <div className="h-field">
          <label htmlFor="numero_cliente">N° de cliente (opcional)</label>
          <input className="h-input" id="numero_cliente" name="numero_cliente" defaultValue={provider?.numero_cliente ?? ""} />
        </div>

        <label className="h-row" style={{ justifyContent: "flex-start" }}>
          <input type="checkbox" name="monto_variable" defaultChecked={provider?.monto_variable ?? false} style={{ width: 20, height: 20, accentColor: "var(--h-accent)" }} />
          <span>
            Monto variable
            <br />
            <span className="h-muted">Cambia cada mes (luz, agua, gas): Inicio te pide el monto real hasta que lo ingreses.</span>
          </span>
        </label>

        <label className="h-row" style={{ justifyContent: "flex-start" }}>
          <input type="checkbox" name="activo" defaultChecked={provider?.activo ?? true} style={{ width: 20, height: 20, accentColor: "var(--h-accent)" }} />
          Activo (aparece en pendientes)
        </label>

        <button className="h-btn h-btn--primary">{provider ? "Guardar cambios" : "Crear proveedor"}</button>
      </form>

      {provider && (
        <form action={eliminarProveedor}>
          <input type="hidden" name="id" value={provider.id} />
          <ConfirmButton mensaje="¿Eliminar este proveedor? Si tiene cuentas registradas, solo se desactiva.">Eliminar proveedor</ConfirmButton>
        </form>
      )}
    </>
  );
}
