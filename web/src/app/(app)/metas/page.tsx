import type { Metadata } from "next";

export const metadata: Metadata = { title: "Metas" };

export default function MetasPage() {
  return (
    <>
      <h1>Metas</h1>
      <section className="h-card h-card--soft">
        <p style={{ margin: 0 }}>
          Aquí vas a planificar el ahorro del auto (pie + crédito) y otras metas como la Nintendo Switch.
          Llega en la fase 3.
        </p>
      </section>
    </>
  );
}
