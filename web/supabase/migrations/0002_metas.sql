-- Mi vida · F3: metas de ahorro y simulador de crédito
-- Ejecutar en Supabase → SQL Editor después de 0001_cuentas.sql.

create type estado_meta as enum ('activa', 'lograda', 'pausada');

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nombre text not null,
  icono text not null default '🎯',
  precio_total integer not null check (precio_total > 0),
  -- Cuánto ahorrar antes de comprar. Sin crédito = precio_total.
  meta_ahorro integer not null check (meta_ahorro > 0),
  aporte_mensual_plan integer check (aporte_mensual_plan > 0),
  fecha_inicio date not null default current_date,
  fecha_objetivo date,
  usa_credito boolean not null default false,
  tasa_anual numeric(5, 2) check (tasa_anual >= 0),
  n_cuotas smallint check (n_cuotas between 1 and 120),
  estado estado_meta not null default 'activa',
  created_at timestamptz not null default now()
);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  goal_id uuid not null references goals on delete cascade,
  monto integer not null check (monto <> 0), -- negativo = retiro
  fecha date not null default current_date,
  nota text,
  created_at timestamptz not null default now()
);

create index contributions_goal on contributions (goal_id, fecha);

alter table goals enable row level security;
alter table contributions enable row level security;

create policy "metas propias" on goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "aportes propios" on contributions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
