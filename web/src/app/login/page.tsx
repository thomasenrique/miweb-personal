import type { Metadata } from "next";
import { enviarEnlace } from "../actions";
import { ErrorMsg } from "@/components/ui";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, enviado } = await searchParams;
  return (
    <main className="h-stack" style={{ maxWidth: 420, margin: "0 auto", padding: "15vh 16px 32px" }}>
      <h1>Mi vida</h1>
      <p className="h-muted">Entra con un enlace que te llega al correo.</p>
      <ErrorMsg error={error} />
      {enviado ? (
        <div className="h-card h-card--soft h-stack">
          <p style={{ margin: 0 }}>Revisa tu correo (también spam) y abre el enlace para entrar.</p>
          <a className="h-btn" href="/login">Usar otro correo</a>
        </div>
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
