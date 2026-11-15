// Capa de acceso a datos: Supabase si está configurado, si no, datos de ejemplo en memoria.
import "server-only";
import { demo } from "./demo";
import { crearSupabase, supabaseConfigurado } from "./supabase/server";
import type { Bill, BillFull, Category, Provider, ProviderFull } from "./types";

export const modoDemo = !supabaseConfigurado;

export type BillInput = Omit<Bill, "id">;
export type ProviderInput = Omit<Provider, "id">;

const SELECT_PROVIDER = "*, category:categories(*)";
const SELECT_BILL = `*, provider:providers(${SELECT_PROVIDER})`;

function falla(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function ordenarCategorias(c: Category[]) {
  return [...c].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

// ——— Lecturas ———

export async function getCategories(): Promise<Category[]> {
  if (modoDemo) return ordenarCategorias(demo.categories);
  const sb = await crearSupabase();
  const { data, error } = await sb.from("categories").select("*");
  falla(error);
  return ordenarCategorias(data as Category[]);
}

function unirProviders(): ProviderFull[] {
  return demo.providers.map((p) => ({ ...p, category: demo.categories.find((c) => c.id === p.category_id)! }));
}

export async function getProviders(): Promise<ProviderFull[]> {
  let list: ProviderFull[];
  if (modoDemo) list = unirProviders();
  else {
    const sb = await crearSupabase();
    const { data, error } = await sb.from("providers").select(SELECT_PROVIDER);
    falla(error);
    list = data as ProviderFull[];
  }
  return list.sort(
    (a, b) => a.category.orden - b.category.orden || a.nombre.localeCompare(b.nombre),
  );
}

export async function getProvider(id: string): Promise<ProviderFull | null> {
  return (await getProviders()).find((p) => p.id === id) ?? null;
}

export async function getBills(periodos: string[]): Promise<BillFull[]> {
  let list: BillFull[];
  if (modoDemo) {
    const provs = unirProviders();
    list = demo.bills
      .filter((b) => periodos.includes(b.periodo))
      .map((b) => ({ ...b, provider: provs.find((p) => p.id === b.provider_id)! }));
  } else {
    const sb = await crearSupabase();
    const { data, error } = await sb.from("bills").select(SELECT_BILL).in("periodo", periodos);
    falla(error);
    list = data as BillFull[];
  }
  return list.sort((a, b) => (b.fecha_pago ?? "").localeCompare(a.fecha_pago ?? ""));
}

export async function getBill(id: string): Promise<BillFull | null> {
  if (modoDemo) {
    const b = demo.bills.find((x) => x.id === id);
    if (!b) return null;
    return { ...b, provider: unirProviders().find((p) => p.id === b.provider_id)! };
  }
  const sb = await crearSupabase();
  const { data, error } = await sb.from("bills").select(SELECT_BILL).eq("id", id).maybeSingle();
  falla(error);
  return data as BillFull | null;
}

// ——— Escrituras ———

export async function createBill(input: BillInput) {
  if (modoDemo) return void demo.bills.push({ ...input, id: crypto.randomUUID() });
  const sb = await crearSupabase();
  falla((await sb.from("bills").insert(input)).error);
}

export async function updateBill(id: string, input: BillInput) {
  if (modoDemo) {
    const i = demo.bills.findIndex((b) => b.id === id);
    if (i >= 0) demo.bills[i] = { ...input, id };
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("bills").update(input).eq("id", id)).error);
}

export async function deleteBill(id: string) {
  if (modoDemo) {
    demo.bills = demo.bills.filter((b) => b.id !== id);
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("bills").delete().eq("id", id)).error);
}

export async function createProvider(input: ProviderInput) {
  if (modoDemo) return void demo.providers.push({ ...input, id: crypto.randomUUID() });
  const sb = await crearSupabase();
  falla((await sb.from("providers").insert(input)).error);
}

export async function updateProvider(id: string, input: ProviderInput) {
  if (modoDemo) {
    const i = demo.providers.findIndex((p) => p.id === id);
    if (i >= 0) demo.providers[i] = { ...input, id };
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("providers").update(input).eq("id", id)).error);
}

/** Elimina el proveedor si no tiene cuentas; si tiene, lo desactiva. Devuelve qué hizo. */
export async function deleteProvider(id: string): Promise<"eliminado" | "desactivado"> {
  if (modoDemo) {
    if (demo.bills.some((b) => b.provider_id === id)) {
      const p = demo.providers.find((x) => x.id === id);
      if (p) p.activo = false;
      return "desactivado";
    }
    demo.providers = demo.providers.filter((p) => p.id !== id);
    return "eliminado";
  }
  const sb = await crearSupabase();
  const { count, error } = await sb.from("bills").select("id", { count: "exact", head: true }).eq("provider_id", id);
  falla(error);
  if (count) {
    falla((await sb.from("providers").update({ activo: false }).eq("id", id)).error);
    return "desactivado";
  }
  falla((await sb.from("providers").delete().eq("id", id)).error);
  return "eliminado";
}
