import { Nav } from "@/components/Nav";
import { modoDemo } from "@/lib/data";

// Los datos cambian en cada visita (cuentas, fecha de hoy): nunca prerenderizar.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {modoDemo && (
        <p className="h-banner">Modo demo: datos de ejemplo. Conecta Supabase para guardar tus cuentas.</p>
      )}
      <Nav />
      <main className="h-page h-stack">{children}</main>
    </>
  );
}
