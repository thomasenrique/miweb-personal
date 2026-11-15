import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DebtForm } from "@/components/DebtForm";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getCards, getDebt } from "@/lib/data";

export const metadata: Metadata = { title: "Editar deuda" };

export default async function EditarDeudaPage({ params, searchParams }: PageProps<"/deudas/[id]/editar">) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [debt, cards] = await Promise.all([getDebt(id), getCards()]);
  if (!debt) notFound();
  return (
    <>
      <Encabezado titulo={`Editar ${debt.descripcion}`} volver={`/deudas/${id}`} />
      <ErrorMsg error={error} />
      <DebtForm tipo={debt.tipo} cards={cards} debt={debt} />
    </>
  );
}
