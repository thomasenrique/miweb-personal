import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardarSimulacion } from "@/app/metas-actions";
import { Simulador } from "@/components/Simulador";
import { Encabezado, ErrorMsg } from "@/components/ui";
import { getGoal } from "@/lib/data";
import { ahorrado } from "@/lib/metas";

export const metadata: Metadata = { title: "Simulador de crédito" };

export default async function CreditoPage({ params, searchParams }: PageProps<"/metas/[id]/credito">) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const goal = await getGoal(id);
  if (!goal) notFound();
  const pie = goal.usa_credito ? goal.meta_ahorro : Math.round(goal.precio_total / 2);

  return (
    <>
      <Encabezado titulo={`${goal.icono} Crédito`} volver={`/metas/${id}`} />
      <ErrorMsg error={error} />
      <Simulador
        goalId={id}
        precio={goal.precio_total}
        pie={pie}
        ahorrado={ahorrado(goal)}
        tasa={goal.tasa_anual ?? 14.5}
        cuotas={goal.n_cuotas ?? 36}
        guardar={guardarSimulacion}
      />
    </>
  );
}
