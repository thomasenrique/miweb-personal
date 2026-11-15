import type { Metadata } from "next";
import Link from "next/link";
import { cerrarSesion } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Encabezado, Monto } from "@/components/ui";
import { getProviders, modoDemo } from "@/lib/data";
import type { ProviderFull } from "@/lib/types";

export const metadata: Metadata = { title: "Ajustes" };

const AVISOS: Record<string, string> = {
  eliminado: "Proveedor eliminado.",
  desactivado: "El proveedor tiene cuentas registradas, así que quedó desactivado en vez de eliminarse.",
};

function Lista({ titulo, items }: { titulo: string; items: ProviderFull[] }) {
  return (
    <section className="h-card">
      <h3>{titulo}</h3>
      {items.length === 0 ? (
        <p className="h-muted">Sin proveedores todavía.</p>
      ) : (
        <ul className="h-list">
          {items.map((p) => (
            <li key={p.id} style={p.activo ? undefined : { opacity: 0.55 }}>
              <Link href={`/ajustes/proveedor/${p.id}`} className="h-link-row" style={{ display: "contents" }}>
                <span className="h-ico" aria-hidden="true">{p.category.icono}</span>
                <span className="h-grow">
                  <b>{p.nombre}</b>
                  <br />
                  <span className="h-muted">
                    {p.category.nombre}
                    {p.dia_vencimiento ? ` · día ${p.dia_vencimiento}` : ""}
                    {p.frecuencia === "anual" ? " · anual" : ""}
                    {p.moneda === "USD" ? " · USD" : ""}
                    {p.activo ? "" : " · inactivo"}
                  </span>
                </span>
                {p.monto_estimado != null && <Monto valor={p.monto_estimado} />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AjustesPage({ searchParams }: PageProps<"/ajustes">) {
  const { aviso } = await searchParams;
  const providers = await getProviders();

  return (
    <>
      <Encabezado
        titulo="Ajustes"
        accion={<Link className="h-btn h-btn--primary" href="/ajustes/proveedor/nuevo">+ Proveedor</Link>}
      />
      {typeof aviso === "string" && AVISOS[aviso] && <p className="h-card h-card--soft" role="status">{AVISOS[aviso]}</p>}
      <p className="h-muted" style={{ margin: 0 }}>
        Tus proveedores con su día de vencimiento y monto estimado. Con esto la app te avisa qué falta pagar.
      </p>
      <div className="h-grid">
        <Lista titulo="🏠 Hogar" items={providers.filter((p) => p.category.grupo === "hogar")} />
        <Lista titulo="🙋 Personal" items={providers.filter((p) => p.category.grupo === "personal")} />
      </div>
      {!modoDemo && (
        <section className="h-card h-card--soft h-stack" style={{ marginTop: "var(--h-s7)" }}>
          <h3>Sesión</h3>
          <p className="h-muted" style={{ margin: 0 }}>
            Al cerrar sesión necesitarás un enlace nuevo por correo para volver a entrar.
          </p>
          <form action={cerrarSesion}>
            <ConfirmButton tono="neutro" mensaje="¿Cerrar sesión? Para volver a entrar necesitarás un enlace nuevo por correo.">
              Cerrar sesión
            </ConfirmButton>
          </form>
        </section>
      )}
    </>
  );
}
