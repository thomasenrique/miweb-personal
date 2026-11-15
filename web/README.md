# Mi vida · app web

Next.js 16 + Tailwind 4 + Supabase. Usa el sistema de diseño compartido en `../design-system/`.

## Correr en local
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas de la lógica de finanzas
```
Sin `.env.local` corre en **modo demo**: datos de ejemplo en memoria (se pierden al reiniciar).

## Conectar Supabase (una vez)
1. Crea un proyecto gratis en supabase.com (región São Paulo, la más cercana a Chile).
2. **SQL Editor** → pega y ejecuta `supabase/migrations/0001_cuentas.sql`.
3. **Authentication → URL Configuration**: Site URL `http://localhost:3000` (luego la URL de Vercel) y agrega `http://localhost:3000/auth/callback` a Redirect URLs.
4. Copia `.env.example` a `.env.local` y completa URL, anon key (Project Settings → API) y tu correo en `ALLOWED_EMAIL`.
5. `npm run dev`, entra con tu correo y abre el enlace que llega.
6. Después del primer ingreso: **Authentication → Sign In / Providers** → desactiva "Allow new users to sign up".

## Estructura
```
src/app/(app)/        páginas con navegación: inicio, cuentas, metas, ajustes
src/app/actions.ts    server actions (guardar/eliminar, login)
src/lib/finanzas.ts   lógica pura + pruebas (finanzas.test.ts)
src/lib/data.ts       acceso a datos (Supabase o demo)
src/proxy.ts          refresca sesión y protege rutas
supabase/migrations/  esquema SQL con RLS
```
