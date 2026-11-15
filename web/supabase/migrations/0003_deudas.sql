-- Mi vida · Deudas: tarjetas de crédito, compras en cuotas y otros créditos
-- Ejecutar en Supabase → SQL Editor después de 0002_metas.sql.

create type tipo_deuda as enum ('compra', 'credito');

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nombre text not null,
  ultimos4 char(4) check (ultimos4 ~ '^\d{4}$'),
  cupo integer check (cupo >= 0),
  dia_facturacion smallint not null check (dia_facturacion between 1 and 31),
  dia_pago smallint not null check (dia_pago between 1 and 31),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  tipo tipo_deuda not null,
  card_id uuid references cards on delete restrict,
  descripcion text not null,
  institucion text,
  grupo grupo not null default 'personal',
  fecha date not null,
  monto_total integer not null check (monto_total > 0),
  n_cuotas smallint not null check (n_cuotas between 1 and 360),
  valor_cuota integer not null check (valor_cuota > 0),
  primer_mes_pago char(7) not null check (primer_mes_pago ~ '^\d{4}-\d{2}$'),
  dia_pago smallint check (dia_pago between 1 and 31),
  saldada boolean not null default false,
  notas text,
  created_at timestamptz not null default now(),
  constraint compra_con_tarjeta check (tipo <> 'compra' or card_id is not null)
);

create index debts_user on debts (user_id);
create index debts_card on debts (card_id);

alter table cards enable row level security;
alter table debts enable row level security;

create policy "tarjetas propias" on cards for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "deudas propias" on debts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
