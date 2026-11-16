import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProviderForm } from "@/components/ProviderForm";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getCards, getCategories, getProvider } from "@/lib/data";

export const metadata: Metadata = { title: "Proveedor" };

/** /ajustes/proveedor/nuevo crea uno; cualquier otro id lo edita. */
export default async function ProveedorPage({ params, searchParams }: PageProps<"/ajustes/proveedor/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const nuevo = id === "nuevo";
  const [categories, cards, provider] = await Promise.all([
    getCategories(),
    getCards().catch(() => []),
    nuevo ? null : getProvider(id),
  ]);
  if (!nuevo && !provider) notFound();

  return (
    <>
      <Encabezado titulo={nuevo ? "Nuevo proveedor" : provider!.nombre} volver="/ajustes" />
      <ErrorMsg error={sp.error} />
      <ProviderForm categories={categories} cards={cards} provider={provider} />
    </>
  );
}
