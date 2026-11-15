import type { Metadata } from "next";
import { GoalForm } from "@/components/GoalForm";
import { Encabezado, ErrorMsg } from "@/components/ui";

export const metadata: Metadata = { title: "Nueva meta" };

export default async function NuevaMetaPage({ searchParams }: PageProps<"/metas/nueva">) {
  const { error } = await searchParams;
  return (
    <>
      <Encabezado titulo="Nueva meta" volver="/metas" />
      <ErrorMsg error={error} />
      <GoalForm />
    </>
  );
}
