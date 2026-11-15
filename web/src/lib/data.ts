// Capa de acceso a datos: Supabase si está configurado, si no, datos de ejemplo en memoria.
import "server-only";
import { demo } from "./demo";
import { crearSupabase, supabaseConfigurado } from "./supabase/server";
import type {
  Bill, BillFull, Card, Category, Contribution, Debt, DebtFull, Goal, GoalFull, Provider, ProviderFull,
} from "./types";

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

// ——— Metas de ahorro ———

export type GoalInput = Omit<Goal, "id">;
export type ContributionInput = Omit<Contribution, "id">;

function ordenarAportes(c: Contribution[]) {
  return [...c].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function getGoals(): Promise<GoalFull[]> {
  let list: GoalFull[];
  if (modoDemo) {
    list = demo.goals.map((g) => ({ ...g, contributions: demo.contributions.filter((c) => c.goal_id === g.id) }));
  } else {
    const sb = await crearSupabase();
    const { data, error } = await sb.from("goals").select("*, contributions(*)");
    falla(error);
    list = (data as GoalFull[]).map((g) => ({ ...g, tasa_anual: g.tasa_anual == null ? null : Number(g.tasa_anual) }));
  }
  const orden = { activa: 0, pausada: 1, lograda: 2 } as const;
  return list
    .map((g) => ({ ...g, contributions: ordenarAportes(g.contributions) }))
    .sort((a, b) => orden[a.estado] - orden[b.estado] || a.fecha_inicio.localeCompare(b.fecha_inicio));
}

export async function getGoal(id: string): Promise<GoalFull | null> {
  return (await getGoals()).find((g) => g.id === id) ?? null;
}

/** Crea o actualiza una meta. Devuelve su id. */
export async function saveGoal(id: string | null, input: GoalInput): Promise<string> {
  if (modoDemo) {
    if (id) {
      const i = demo.goals.findIndex((g) => g.id === id);
      if (i >= 0) demo.goals[i] = { ...input, id };
      return id;
    }
    const nuevo = crypto.randomUUID();
    demo.goals.push({ ...input, id: nuevo });
    return nuevo;
  }
  const sb = await crearSupabase();
  if (id) {
    falla((await sb.from("goals").update(input).eq("id", id)).error);
    return id;
  }
  const { data, error } = await sb.from("goals").insert(input).select("id").single();
  falla(error);
  return (data as { id: string }).id;
}

export async function updateGoalFields(id: string, campos: Partial<GoalInput>) {
  if (modoDemo) {
    const g = demo.goals.find((x) => x.id === id);
    if (g) Object.assign(g, campos);
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("goals").update(campos).eq("id", id)).error);
}

export async function deleteGoal(id: string) {
  if (modoDemo) {
    demo.goals = demo.goals.filter((g) => g.id !== id);
    demo.contributions = demo.contributions.filter((c) => c.goal_id !== id);
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("goals").delete().eq("id", id)).error);
}

export async function addContribution(input: ContributionInput) {
  if (modoDemo) return void demo.contributions.push({ ...input, id: crypto.randomUUID() });
  const sb = await crearSupabase();
  falla((await sb.from("contributions").insert(input)).error);
}

export async function deleteContribution(id: string) {
  if (modoDemo) {
    demo.contributions = demo.contributions.filter((c) => c.id !== id);
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("contributions").delete().eq("id", id)).error);
}

// ——— Deudas: tarjetas, compras en cuotas y créditos ———

export type CardInput = Omit<Card, "id">;
export type DebtInput = Omit<Debt, "id">;

export async function getCards(): Promise<Card[]> {
  let list: Card[];
  if (modoDemo) list = [...demo.cards];
  else {
    const sb = await crearSupabase();
    const { data, error } = await sb.from("cards").select("*");
    falla(error);
    list = data as Card[];
  }
  return list.sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre));
}

export async function getCard(id: string): Promise<Card | null> {
  return (await getCards()).find((c) => c.id === id) ?? null;
}

export async function getDebts(): Promise<DebtFull[]> {
  if (modoDemo) {
    return demo.debts.map((d) => ({ ...d, card: demo.cards.find((c) => c.id === d.card_id) ?? null }));
  }
  const sb = await crearSupabase();
  const { data, error } = await sb.from("debts").select("*, card:cards(*)").order("fecha", { ascending: false });
  falla(error);
  return data as DebtFull[];
}

export async function getDebt(id: string): Promise<DebtFull | null> {
  return (await getDebts()).find((d) => d.id === id) ?? null;
}

export async function saveCard(id: string | null, input: CardInput) {
  if (modoDemo) {
    if (id) {
      const i = demo.cards.findIndex((c) => c.id === id);
      if (i >= 0) demo.cards[i] = { ...input, id };
    } else demo.cards.push({ ...input, id: crypto.randomUUID() });
    return;
  }
  const sb = await crearSupabase();
  falla((id ? await sb.from("cards").update(input).eq("id", id) : await sb.from("cards").insert(input)).error);
}

/** Elimina la tarjeta si no tiene compras; si tiene, la desactiva. */
export async function deleteCard(id: string): Promise<"eliminada" | "desactivada"> {
  if (modoDemo) {
    if (demo.debts.some((d) => d.card_id === id)) {
      const c = demo.cards.find((x) => x.id === id);
      if (c) c.activa = false;
      return "desactivada";
    }
    demo.cards = demo.cards.filter((c) => c.id !== id);
    return "eliminada";
  }
  const sb = await crearSupabase();
  const { count, error } = await sb.from("debts").select("id", { count: "exact", head: true }).eq("card_id", id);
  falla(error);
  if (count) {
    falla((await sb.from("cards").update({ activa: false }).eq("id", id)).error);
    return "desactivada";
  }
  falla((await sb.from("cards").delete().eq("id", id)).error);
  return "eliminada";
}

/** Crea o actualiza una deuda. Devuelve su id. */
export async function saveDebt(id: string | null, input: DebtInput): Promise<string> {
  if (modoDemo) {
    if (id) {
      const i = demo.debts.findIndex((d) => d.id === id);
      if (i >= 0) demo.debts[i] = { ...input, id };
      return id;
    }
    const nuevo = crypto.randomUUID();
    demo.debts.push({ ...input, id: nuevo });
    return nuevo;
  }
  const sb = await crearSupabase();
  if (id) {
    falla((await sb.from("debts").update(input).eq("id", id)).error);
    return id;
  }
  const { data, error } = await sb.from("debts").insert(input).select("id").single();
  falla(error);
  return (data as { id: string }).id;
}

export async function setDebtSaldada(id: string, saldada: boolean) {
  if (modoDemo) {
    const d = demo.debts.find((x) => x.id === id);
    if (d) d.saldada = saldada;
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("debts").update({ saldada }).eq("id", id)).error);
}

export async function deleteDebt(id: string) {
  if (modoDemo) {
    demo.debts = demo.debts.filter((d) => d.id !== id);
    return;
  }
  const sb = await crearSupabase();
  falla((await sb.from("debts").delete().eq("id", id)).error);
}
