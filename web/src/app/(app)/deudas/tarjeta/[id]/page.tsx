import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eliminarTarjeta, guardarTarjeta } from "@/app/deudas-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MoneyInput } from "@/components/MoneyInput";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getCard } from "@/lib/data";

export const metadata: Metadata = { title: "Tarjeta" };

const COLS = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))" };

/** /deudas/tarjeta/nueva crea una; cualquier otro id la edita. */
export default async function TarjetaPage({ params, searchParams }: PageProps<"/deudas/tarjeta/[id]">) {
  const [{ id }, { error, tipo: tipoParam }] = await Promise.all([params, searchParams]);
  const nueva = id === "nueva";
  const card = nueva ? null : await getCard(id);
  if (!nueva && !card) notFound();
  const tipo = card?.tipo ?? (tipoParam === "debito" ? "debito" : "credito");

  return (
    <>
      <Encabezado titulo={card ? card.nombre : "Nueva tarjeta"} volver={tipo === "debito" ? "/ajustes#medios" : "/deudas"} />
      <ErrorMsg error={error} />
      <form action={guardarTarjeta} className="h-card h-stack h-tarjeta">
        {card && <input type="hidden" name="id" value={card.id} />}
        <fieldset className="h-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="h-muted" style={{ marginBottom: 4 }}>Tipo</legend>
          <div className="h-seg h-seg--radio">
            <label><input type="radio" name="tipo" value="credito" defaultChecked={tipo === "credito"} />Crédito</label>
            <label><input type="radio" name="tipo" value="debito" defaultChecked={tipo === "debito"} />Débito / prepago</label>
          </div>
        </fieldset>
        <div className="h-grid" style={{ gridTemplateColumns: "1fr 110px" }}>
          <div className="h-field">
            <label htmlFor="nombre">Nombre</label>
            <input className="h-input" id="nombre" name="nombre" defaultValue={card?.nombre} placeholder="Visa BCI" required />
          </div>
          <div className="h-field">
            <label htmlFor="ultimos4">Últimos 4</label>
            <input className="h-input h-num" id="ultimos4" name="ultimos4" inputMode="numeric" maxLength={4} pattern="\d{4}" defaultValue={card?.ultimos4 ?? ""} placeholder="4821" />
          </div>
        </div>
        <p className="h-muted h-solo-debito" style={{ margin: 0 }}>
          Cuenta RUT, Mach, Tenpo… En Ajustes verás cuánto cargarle cada mes según las suscripciones que se cobran en ella.
        </p>
        <div className="h-stack h-solo-credito">
        <div className="h-field">
          <label htmlFor="cupo">Cupo total</label>
          <MoneyInput id="cupo" name="cupo" defaultValue={card?.cupo} placeholder="3.000.000" />
        </div>
        <div className="h-grid" style={COLS}>
          <div className="h-field">
            <label htmlFor="dia_facturacion">Día de facturación</label>
            <input className="h-input h-num" type="number" min={1} max={31} id="dia_facturacion" name="dia_facturacion" defaultValue={card?.dia_facturacion ?? ""} placeholder="20" />
          </div>
          <div className="h-field">
            <label htmlFor="dia_pago">Día de pago</label>
            <input className="h-input h-num" type="number" min={1} max={31} id="dia_pago" name="dia_pago" defaultValue={card?.dia_pago ?? ""} placeholder="5" />
          </div>
        </div>
        <p className="h-muted" style={{ margin: 0 }}>
          Los encuentras en tu estado de cuenta: «fecha de facturación» y «pagar hasta».
        </p>
        </div>
        <label className="h-row" style={{ justifyContent: "flex-start" }}>
          <input type="checkbox" name="activa" defaultChecked={card?.activa ?? true} style={{ width: 20, height: 20, accentColor: "var(--h-accent)" }} />
          Activa
        </label>
        <button className="h-btn h-btn--primary">{card ? "Guardar cambios" : "Crear tarjeta"}</button>
      </form>
      {card && (
        <form action={eliminarTarjeta}>
          <input type="hidden" name="id" value={card.id} />
          <ConfirmButton mensaje="¿Eliminar esta tarjeta? Si tiene compras registradas, solo se desactiva.">Eliminar tarjeta</ConfirmButton>
        </form>
      )}
    </>
  );
}
