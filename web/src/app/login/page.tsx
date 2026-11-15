import type { Metadata } from "next";
import { enviarEnlace } from "../actions";
import { ErrorMsg } from "@/components/ui";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, enviado } = await searchParams;
  return (
    <main className="h-page h-stack" style={{ maxWidth: 420, paddingTop: "15vh", paddingLeft: 16 }}>
      <h1>Mi vida</h1>
      <p className="h-muted">Entra con un enlace que te llega al correo.</p>
      <ErrorMsg error={error} />
      {enviado ? (
        <p className="h-card h-card--soft">Revisa tu correo y abre el enlace para entrar.</p>
      ) : (
        <form action={enviarEnlace} className="h-card h-stack">
          <div className="h-field">
            <label htmlFor="email">Correo</label>
            <input className="h-input" id="email" name="email" type="email" autoComplete="email" placeholder="tu@correo.cl" required />
          </div>
          <button className="h-btn h-btn--primary" style={{ width: "100%" }}>Enviar enlace</button>
        </form>
      )}
    </main>
  );
}
