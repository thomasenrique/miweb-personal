import type { Metadata } from "next";
import Link from "next/link";
import { BillForm } from "@/components/BillForm";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getProviders } from "@/lib/data";
import { esPeriodo, hoyChile, periodoDe } from "@/lib/finanzas";

export const metadata: Metadata = { title: "Nueva cuenta" };

export default async function NuevaCuentaPage({ searchParams }: PageProps<"/cuentas/nueva">) {
  const sp = await searchParams;
  const hoy = hoyChile();
  const mes = esPeriodo(sp.mes as string) ? (sp.mes as string) : periodoDe(hoy);
  const providers = await getProviders();

  return (
    <>
      <Encabezado titulo="Nueva cuenta" volver={`/cuentas?mes=${mes}`} />
      <ErrorMsg error={sp.error} />
      {providers.length === 0 ? (
        <section className="h-card h-stack">
          <p style={{ margin: 0 }}>Primero crea el proveedor (Enel, Spotify…) con su día de vencimiento.</p>
          <Link className="h-btn h-btn--primary" href="/ajustes/proveedor/nuevo">Crear proveedor</Link>
        </section>
      ) : (
        <BillForm
          providers={providers}
          sugerido={{
            provider_id: typeof sp.proveedor === "string" ? sp.proveedor : undefined,
            periodo: mes,
            fecha_pago: mes === periodoDe(hoy) ? hoy : `${mes}-01`,
          }}
        />
      )}
    </>
  );
}
