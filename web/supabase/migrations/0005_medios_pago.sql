-- Mi vida · Medios de pago: tarjetas de débito y tarjeta con que se cobra cada suscripción.
-- Ejecutar en Supabase → SQL Editor después de 0004_sueldo.sql.

create type tipo_tarjeta as enum ('credito', 'debito');

alter table cards add column tipo tipo_tarjeta not null default 'credito';
alter table cards alter column dia_facturacion drop not null;
alter table cards alter column dia_pago drop not null;
alter table cards add constraint credito_con_dias
  check (tipo <> 'credito' or (dia_facturacion is not null and dia_pago is not null));

-- Tarjeta con que se paga la suscripción (null = pago manual / transferencia).
alter table providers add column card_id uuid references cards on delete set null;
create index providers_card on providers (card_id);
