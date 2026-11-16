import type { Metadata, Viewport } from "next";
import { InlineScript } from "@/components/InlineScript";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mi vida", template: "%s · Mi vida" },
  description: "Organiza tus cuentas, gastos y metas de ahorro.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1915" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado (claro/oscuro) antes del primer pintado; sin preferencia, sigue al sistema */}
        <InlineScript
          html={`(function(){try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
