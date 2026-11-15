"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createBill, createProvider, deleteBill, deleteProvider, getProvider, modoDemo,
  updateBill, updateProvider, type BillInput, type ProviderInput,
} from "@/lib/data";
import { dolarDelDia } from "@/lib/dolar";
import { esPeriodo, parseMonto, periodoDe } from "@/lib/finanzas";
import { crearSupabase } from "@/lib/supabase/server";
import type { EstadoCuenta, Frecuencia, Moneda } from "@/lib/types";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function volverConError(ruta: string, msg: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
}

// ——— Cuentas ———

export async function guardarCuenta(form: FormData) {
  const id = texto(form, "id");
  const provider_id = texto(form, "provider_id");
  const mesForm = texto(form, "periodo");
  const volver = id
    ? `/cuentas/${id}`
    : `/cuentas/nueva?${new URLSearchParams({
        ...(esPeriodo(mesForm) ? { mes: mesForm } : {}),
        ...(provider_id ? { proveedor: provider_id } : {}),
      })}`;

  const provider = provider_id ? await getProvider(provider_id) : null;
  if (!provider) volverConError(volver, "Elige un proveedor.");

  const estado = texto(form, "estado") as EstadoCuenta;
  if (!["pagado", "pendiente", "revisar"].includes(estado)) volverConError(volver, "Estado no válido.");

  const fecha_pago = texto(form, "fecha_pago") || null;
  if (estado === "pagado" && !fecha_pago) volverConError(volver, "Indica la fecha de pago.");

  const periodo = texto(form, "periodo") || (fecha_pago ? periodoDe(fecha_pago) : "");
  if (!esPeriodo(periodo)) volverConError(volver, "Indica el mes que cubre la cuenta.");

  const moneda_original = (texto(form, "moneda_original") || "CLP") as Moneda;
  let monto = parseMonto(texto(form, "monto"));
  let monto_original: number | null = null;
  let tipo_cambio: number | null = null;

  if (moneda_original === "USD") {
    monto_original = parseMonto(texto(form, "monto_original"));
    if (!(monto_original > 0)) volverConError(volver, "Indica el monto en dólares.");
    if (Number.isNaN(monto)) {
      tipo_cambio = await dolarDelDia(fecha_pago ?? `${periodo}-01`);
      if (!tipo_cambio) volverConError(volver, "No pude obtener el dólar del día. Escribe el monto en pesos.");
      monto = Math.round(monto_original * tipo_cambio);
    } else {
      tipo_cambio = Math.round((monto / monto_original) * 100) / 100;
    }
  }
  if (!(monto >= 0) || Number.isNaN(monto)) volverConError(volver, "Escribe un monto válido, por ejemplo 42.100.");

  const input: BillInput = {
    provider_id,
    monto: Math.round(monto),
    moneda_original,
    monto_original,
    tipo_cambio,
    fecha_pago,
    periodo,
    fecha_vencimiento: texto(form, "fecha_vencimiento") || null,
    estado,
    fuente: (texto(form, "fuente") || "manual") as BillInput["fuente"],
    notas: texto(form, "notas") || null,
  };

  try {
    if (id) await updateBill(id, input);
    else await createBill(input);
  } catch (e) {
    volverConError(volver, `No se pudo guardar: ${(e as Error).message}`);
  }
  redirect(`/cuentas?mes=${periodo}`);
}

export async function eliminarCuenta(form: FormData) {
  const id = texto(form, "id");
  const periodo = texto(form, "periodo");
  try {
    await deleteBill(id);
  } catch (e) {
    volverConError(`/cuentas/${id}`, `No se pudo eliminar: ${(e as Error).message}`);
  }
  redirect(`/cuentas${esPeriodo(periodo) ? `?mes=${periodo}` : ""}`);
}

// ——— Proveedores ———

export async function guardarProveedor(form: FormData) {
  const id = texto(form, "id");
  const volver = id ? `/ajustes/proveedor/${id}` : "/ajustes/proveedor/nuevo";

  const nombre = texto(form, "nombre");
  if (!nombre) volverConError(volver, "Escribe el nombre del proveedor.");
  const category_id = texto(form, "category_id");
  if (!category_id) volverConError(volver, "Elige una categoría.");

  const dia = texto(form, "dia_vencimiento");
  const dia_vencimiento = dia ? Number(dia) : null;
  if (dia_vencimiento !== null && !(dia_vencimiento >= 1 && dia_vencimiento <= 31)) {
    volverConError(volver, "El día de vencimiento va del 1 al 31.");
  }

  const frecuencia = (texto(form, "frecuencia") || "mensual") as Frecuencia;
  const mes = texto(form, "mes_cobro");
  const mes_cobro = frecuencia === "anual" ? Number(mes) || null : null;
  if (frecuencia === "anual" && !mes_cobro) volverConError(volver, "Indica en qué mes se cobra la suscripción anual.");

  const montoTxt = texto(form, "monto_estimado");
  const monto_estimado = montoTxt ? parseMonto(montoTxt) : null;
  if (monto_estimado !== null && Number.isNaN(monto_estimado)) volverConError(volver, "Monto estimado no válido.");

  const input: ProviderInput = {
    nombre,
    category_id,
    numero_cliente: texto(form, "numero_cliente") || null,
    dia_vencimiento,
    frecuencia,
    mes_cobro,
    moneda: (texto(form, "moneda") || "CLP") as Moneda,
    monto_estimado: monto_estimado === null ? null : Math.round(monto_estimado),
    activo: form.get("activo") === "on",
  };

  try {
    if (id) await updateProvider(id, input);
    else await createProvider(input);
  } catch (e) {
    volverConError(volver, `No se pudo guardar: ${(e as Error).message}`);
  }
  redirect("/ajustes");
}

export async function eliminarProveedor(form: FormData) {
  const id = texto(form, "id");
  let r: string;
  try {
    r = await deleteProvider(id);
  } catch (e) {
    volverConError(`/ajustes/proveedor/${id}`, `No se pudo eliminar: ${(e as Error).message}`);
  }
  redirect(`/ajustes?aviso=${r === "desactivado" ? "desactivado" : "eliminado"}`);
}

// ——— Sesión ———

export async function enviarEnlace(form: FormData) {
  if (modoDemo) redirect("/");
  const email = texto(form, "email").toLowerCase();
  const permitido = (process.env.ALLOWED_EMAIL ?? "").toLowerCase();
  if (!email) redirect("/login?error=" + encodeURIComponent("Escribe tu correo."));
  if (permitido && email !== permitido) {
    // Misma respuesta que un envío correcto, para no revelar qué correo está permitido.
    redirect("/login?enviado=1");
  }
  const h = await headers();
  const origen = h.get("origin") ?? `https://${h.get("host")}`;
  const sb = await crearSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origen}/auth/callback` },
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/login?enviado=1");
}

export async function cerrarSesion() {
  if (!modoDemo) {
    const sb = await crearSupabase();
    await sb.auth.signOut();
  }
  redirect("/login");
}
