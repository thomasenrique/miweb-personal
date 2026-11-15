import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoalForm } from "@/components/GoalForm";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getGoal } from "@/lib/data";

export const metadata: Metadata = { title: "Editar meta" };

export default async function EditarMetaPage({ params, searchParams }: PageProps<"/metas/[id]/editar">) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const goal = await getGoal(id);
  if (!goal) notFound();
  return (
    <>
      <Encabezado titulo={`Editar ${goal.nombre}`} volver={`/metas/${id}`} />
      <ErrorMsg error={error} />
      <GoalForm goal={goal} />
    </>
  );
}
