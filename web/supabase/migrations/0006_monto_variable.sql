-- Mi vida · Cuentas de monto variable (luz, agua, gas): Inicio pide el monto real cada mes.
-- Ejecutar en Supabase → SQL Editor después de 0005_medios_pago.sql.

alter table providers add column monto_variable boolean not null default false;

-- Luz, agua y gas parten como variables.
update providers set monto_variable = true
where category_id in (select id from categories where nombre in ('Luz', 'Agua', 'Gas'));
