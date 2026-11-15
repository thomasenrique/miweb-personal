import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BillForm } from "@/components/BillForm";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getBill, getProviders } from "@/lib/data";

export const metadata: Metadata = { title: "Editar cuenta" };

export default async function EditarCuentaPage({ params, searchParams }: PageProps<"/cuentas/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [bill, providers] = await Promise.all([getBill(id), getProviders()]);
  if (!bill) notFound();

  return (
    <>
      <Encabezado titulo={bill.provider.nombre} volver={`/cuentas?mes=${bill.periodo}`} />
      <ErrorMsg error={sp.error} />
      {bill.fuente === "email" && <p className="h-muted" style={{ margin: 0 }}>✉ Registrada desde un correo reenviado.</p>}
      <BillForm providers={providers} bill={bill} />
    </>
  );
}
