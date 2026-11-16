-- Mi vida · Sueldo líquido mensual (para calcular el libre disponible)
-- Ejecutar en Supabase → SQL Editor después de 0003_deudas.sql.

create table settings (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  sueldo_liquido integer check (sueldo_liquido >= 0),
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

create policy "ajustes propios" on settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
