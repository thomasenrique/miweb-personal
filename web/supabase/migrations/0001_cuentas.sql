-- Mi vida · F1: cuentas y gastos fijos
-- Ejecutar en Supabase → SQL Editor (o con `supabase db push`).

create type grupo as enum ('hogar', 'personal');
create type frecuencia as enum ('mensual', 'anual');
create type moneda as enum ('CLP', 'USD');
create type estado_cuenta as enum ('pagado', 'pendiente', 'revisar');
create type fuente_cuenta as enum ('email', 'manual');
create type estado_correo as enum ('recibido', 'procesado', 'descartado', 'error');

-- Categorías: user_id null = categoría por defecto (visible para todos los usuarios autenticados)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade default auth.uid(),
  nombre text not null,
  icono text not null default '•',
  grupo grupo not null,
  es_suscripcion boolean not null default false,
  orden smallint not null default 100,
  created_at timestamptz not null default now()
);

create table providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nombre text not null,
  category_id uuid not null references categories on delete restrict,
  alias text[] not null default '{}',
  numero_cliente text,
  dia_vencimiento smallint check (dia_vencimiento between 1 and 31),
  frecuencia frecuencia not null default 'mensual',
  mes_cobro smallint check (mes_cobro between 1 and 12),
  moneda moneda not null default 'CLP',
  monto_estimado integer check (monto_estimado >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table inbound_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  message_id text not null unique,
  remitente text,
  asunto text,
  recibido_en timestamptz not null default now(),
  raw jsonb,
  extraccion jsonb,
  estado estado_correo not null default 'recibido',
  error text,
  created_at timestamptz not null default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  provider_id uuid not null references providers on delete restrict,
  monto integer not null check (monto >= 0),
  moneda_original moneda not null default 'CLP',
  monto_original numeric(12, 2),
  tipo_cambio numeric(10, 2),
  fecha_pago date,
  periodo char(7) not null check (periodo ~ '^\d{4}-\d{2}$'),
  fecha_vencimiento date,
  estado estado_cuenta not null default 'pagado',
  fuente fuente_cuenta not null default 'manual',
  inbound_email_id uuid references inbound_emails on delete set null,
  comprobante_path text,
  notas text,
  created_at timestamptz not null default now()
);

create index bills_user_periodo on bills (user_id, periodo);
create index providers_user on providers (user_id);

-- Row Level Security: cada usuario ve solo lo suyo
alter table categories enable row level security;
alter table providers enable row level security;
alter table inbound_emails enable row level security;
alter table bills enable row level security;

create policy "categorias visibles" on categories for select to authenticated
  using (user_id is null or user_id = auth.uid());
create policy "categorias propias" on categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "proveedores propios" on providers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "correos propios" on inbound_emails for select to authenticated
  using (user_id = auth.uid());

create policy "cuentas propias" on bills for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Categorías por defecto
insert into categories (user_id, nombre, icono, grupo, es_suscripcion, orden) values
  (null, 'Luz', '💡', 'hogar', false, 1),
  (null, 'Agua', '💧', 'hogar', false, 2),
  (null, 'Gas', '🔥', 'hogar', false, 3),
  (null, 'Internet / teléfono', '📶', 'hogar', false, 4),
  (null, 'Gastos comunes', '🏢', 'hogar', false, 5),
  (null, 'Arriendo o dividendo', '🏠', 'hogar', false, 6),
  (null, 'Suscripciones', '🔁', 'personal', true, 10),
  (null, 'Otros personales', '🧾', 'personal', false, 11);
