import type { Metadata } from "next";
import { DebtForm } from "@/components/DebtForm";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getCards } from "@/lib/data";

export const metadata: Metadata = { title: "Nueva deuda" };

export default async function NuevaDeudaPage({ searchParams }: PageProps<"/deudas/nueva">) {
  const sp = await searchParams;
  const tipo = sp.tipo === "credito" ? "credito" : "compra";
  const cards = await getCards();
  return (
    <>
      <Encabezado titulo={tipo === "compra" ? "Nueva compra" : "Nuevo crédito"} volver="/deudas" />
      <ErrorMsg error={sp.error} />
      <DebtForm tipo={tipo} cards={cards} />
    </>
  );
}
