"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { archivarHabito, guardarHabito, marcarHabito } from "@/app/habitos-actions";
import {
  COLORES_HABITO, ICONOS_HABITO, MARCAS_DIA_COMPLETO, RANGOS, diaSemana, habitosActivos, marcasPorDia, mesVecino, racha,
  rangoDelMes, rangoMes, resumenMes, semanaDeHabito, semanaISO, sumarDias,
} from "@/lib/habitos";
import type { Habit, HabitMark } from "@/lib/types";

export type Estilo = "bitacora" | "cuaderno";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* Textos de cada estilo: la lógica es la misma, cambia el tono */
const TXT = {
  bitacora: {
    unidad: "marcas", estrella: "días completos", racha: "días de racha", semanas: "semanas cerradas",
    ico: ["✔", "⚡", "🔥", "▣"], badge: "⚡", stamp: <>SEMANA<br />CERRADA</>,
    cheer: (dias: number, tot: number, total: number): ReactNode =>
      total === 0 ? "Mes nuevo. A sumar."
        : dias / tot >= 0.9 ? <>Constancia: <b>{dias}/{tot}</b> días activos. Sigue empujando.</>
        : dias / tot >= 0.6 ? <>Buen ritmo: <b>{dias}</b> días activos este mes.</>
        : <>Cada marca suma: <b>{total}</b> este mes.</>,
    toast: ["Hecho", "Sumando", "Bien ahí", "Una más"], toastStar: "Día completo ⚡",
    nota: (n: number) => n === 0 ? "Marca lo que hiciste" : n < MARCAS_DIA_COMPLETO ? `${n} hecho${n > 1 ? "s" : ""} · con ${MARCAS_DIA_COMPLETO} el día queda completo ⚡` : "Día completo ⚡",
    medalla: "Rango del mes", falta: (n: number, t: string) => <>Te faltan <b>{n} marcas</b> para el rango {t.toLowerCase()}</>, oro: "Rango oro. Mes impecable.",
    hecho: "Hecho",
  },
  cuaderno: {
    unidad: "stickers", estrella: "días estrella", racha: "días de racha", semanas: "semanas perfectas",
    ico: ["🏅", "⭐", "🔥", "💮"], badge: "★", stamp: <>¡Muy<br />bien!</>,
    cheer: (dias: number, tot: number, total: number): ReactNode =>
      total === 0 ? "¡Un mes nuevo para llenar de stickers! ✏️"
        : dias / tot >= 0.9 ? `¡Vas increíble! Te moviste ${dias} de ${tot} días ✨`
        : dias / tot >= 0.6 ? `¡Muy bien! ${dias} días con al menos un hábito 💪`
        : `Cada sticker cuenta: ya llevas ${total} este mes 🌱`,
    toast: ["¡Bien hecho!", "¡Otro sticker!", "¡Sigue así!", "¡Bacán!"], toastStar: "¡Día estrella! ⭐",
    nota: (n: number) => n === 0 ? "Elige lo que lograste hoy" : n < MARCAS_DIA_COMPLETO ? `${n} sticker${n > 1 ? "s" : ""} · con ${MARCAS_DIA_COMPLETO} ganas una estrella ⭐` : "¡Día estrella! ⭐",
    medalla: "Medalla del mes", falta: (n: number, t: string) => <>Te faltan <b>{n} stickers</b> para la medalla de {t.toLowerCase()}</>, oro: "¡Medalla de oro! Este mes fue de campeonato 🏆",
    hecho: "¡Hecho!",
  },
} as const;

function Mancuerna() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="1" y="9" width="3" height="6" rx="1" /><rect x="4" y="6" width="3.5" height="12" rx="1.2" />
      <rect x="7.5" y="10.8" width="9" height="2.4" rx="1" /><rect x="16.5" y="6" width="3.5" height="12" rx="1.2" />
      <rect x="20" y="9" width="3" height="6" rx="1" />
    </svg>
  );
}

const Icono = ({ k }: { k: string }) => (k === "svg:mancuerna" ? <Mancuerna /> : <>{k}</>);

/** Giro estable (−8° a 8°) por sticker para el estilo Cuaderno. */
function giro(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(h) % 17) - 8;
}

function Sticker({ h, semilla, pop }: { h: Pick<Habit, "nombre" | "icono" | "color">; semilla: string; pop?: boolean }) {
  return (
    <span className={`hb-stk${pop ? " pop" : ""}`} style={{ "--c": `var(${h.color})`, "--r": `${giro(semilla)}deg` } as CSSProperties} title={h.nombre}>
      <Icono k={h.icono} />
    </span>
  );
}

type Cambio = { habit_id: string; fecha: string; hecho: boolean };

export function HabitosVista({ habits, marks, mes, hoy, estiloInicial }: {
  habits: Habit[]; marks: HabitMark[]; mes: string; hoy: string; estiloInicial: Estilo;
}) {
  const [estilo, setEstilo] = useState<Estilo>(estiloInicial);
  const t = TXT[estilo];
  const [, startTransition] = useTransition();
  const [optMarks, aplicar] = useOptimistic(marks, (st: HabitMark[], c: Cambio) =>
    c.hecho ? [...st, { id: `tmp-${c.habit_id}-${c.fecha}`, habit_id: c.habit_id, fecha: c.fecha }]
      : st.filter((m) => !(m.habit_id === c.habit_id && m.fecha === c.fecha)));

  const porId = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);
  const activos = useMemo(() => habitosActivos(habits), [habits]);
  const porDia = useMemo(() => marcasPorDia(optMarks.filter((m) => porId.has(m.habit_id))), [optMarks, porId]);
  const r = resumenMes(mes, porDia, hoy);
  const esActual = mes === hoy.slice(0, 7);

  const [dia, setDia] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Habit | "nuevo" | null>(null);
  const dlgDia = useRef<HTMLDialogElement>(null);
  const dlgHab = useRef<HTMLDialogElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const hostFx = useRef<HTMLDivElement>(null);

  useEffect(() => { if (dia) dlgDia.current?.showModal(); }, [dia]);
  useEffect(() => { if (editando) dlgHab.current?.showModal(); }, [editando]);
  // El aviso va en la capa superior (popover) para verse también sobre el diálogo abierto
  useEffect(() => {
    const el = toastRef.current;
    if (!aviso || !el) return;
    try { el.showPopover(); } catch {}
    const id = setTimeout(() => { setAviso(null); try { el.hidePopover(); } catch {} }, 1600);
    return () => clearTimeout(id);
  }, [aviso]);

  function cambiarEstilo(e: Estilo) {
    setEstilo(e);
    document.cookie = `habitos-estilo=${e}; path=/; max-age=31536000; samesite=lax`;
  }

  function efecto(x: number, y: number, color: string) {
    const host = (dlgDia.current?.open ? dlgDia.current : hostFx.current) ?? document.body;
    const piezas = estilo === "bitacora" ? ["+1"] : ["★", "✦", "●", "★", "✦", "●", "★", "✦"];
    piezas.forEach((p, i) => {
      const s = document.createElement("span");
      s.textContent = p;
      if (estilo === "bitacora") {
        s.className = "hb-fx hb-plus1";
        s.style.cssText = `left:${x - 10}px;top:${y - 30}px`;
      } else {
        const ang = (i / piezas.length) * Math.PI * 2;
        s.className = "hb-fx hb-confetti";
        s.style.cssText = `left:${x}px;top:${y}px;color:var(${i % 2 ? color : "--hb-gold"});--dx:${Math.cos(ang) * 70}px;--dy:${Math.sin(ang) * 70 - 20}px`;
      }
      host.appendChild(s);
      setTimeout(() => s.remove(), 950);
    });
  }

  function alternar(h: Habit, fecha: string, x: number, y: number) {
    const hecho = !(porDia.get(fecha) ?? []).includes(h.id);
    setError(null);
    if (hecho) {
      const n = (porDia.get(fecha)?.length ?? 0) + 1;
      setUltimo(`${fecha}|${h.id}`);
      efecto(x, y, h.color);
      setAviso(n === MARCAS_DIA_COMPLETO ? t.toastStar : t.toast[n % t.toast.length]);
    }
    startTransition(async () => {
      aplicar({ habit_id: h.id, fecha, hecho });
      const err = await marcarHabito(h.id, fecha, hecho);
      if (err) setError(err);
    });
  }

  // ——— Calendario ———
  const { inicio, dias } = rangoMes(mes);
  const [y, m] = mes.split("-").map(Number);
  const celdas: ReactNode[] = [];
  for (let i = 0; i < diaSemana(inicio); i++) celdas.push(<div key={`v${i}`} className="hb-day is-out" aria-hidden="true" />);
  for (let n = 1; n <= dias; n++) {
    const f = sumarDias(inicio, n - 1);
    const ids = porDia.get(f) ?? [];
    const futuro = f > hoy;
    const star = ids.length >= MARCAS_DIA_COMPLETO;
    const max = 4;
    const vis = ids.slice(0, ids.length > max ? max - 1 : max);
    celdas.push(
      <button key={f} type="button" className={`hb-day${f === hoy ? " is-today" : ""}${star ? " is-star" : ""}`} disabled={futuro}
        onClick={() => setDia(f)} aria-label={`${DIAS[diaSemana(f)]} ${n}: ${ids.length} hábitos`}>
        <span className="hb-n">{n}</span>
        <span className="hb-stickers">
          {vis.map((id) => <Sticker key={id} h={porId.get(id)!} semilla={f + id} pop={ultimo === `${f}|${id}`} />)}
          {ids.length > vis.length && <span className="hb-more">+{ids.length - vis.length}</span>}
        </span>
        {star && <span className="hb-badge" aria-hidden="true">{t.badge}</span>}
        {r.semanasCerradas.includes(f) && <span className="hb-stamp">{t.stamp}</span>}
      </button>,
    );
  }

  const rango = rangoDelMes(r.total);
  const tope = RANGOS[RANGOS.length - 1].min;
  const idsDia = dia ? porDia.get(dia) ?? [] : [];
  const nDia = dia ? diaSemana(dia) : 0;

  return (
    <div className="hb h-stack" data-skin={estilo} ref={hostFx}>
      <div className="h-row">
        <h1 className="hb-title">Hábitos</h1>
        <button type="button" className="h-btn h-btn--primary" onClick={() => setEditando("nuevo")}>+ Nuevo hábito</button>
      </div>
      <div className="hb-skin">
        <span className="h-muted">Estilo</span>
        <div className="h-seg" role="group" aria-label="Estilo de la vista">
          <button type="button" aria-pressed={estilo === "bitacora"} onClick={() => cambiarEstilo("bitacora")}>Bitácora</button>
          <button type="button" aria-pressed={estilo === "cuaderno"} onClick={() => cambiarEstilo("cuaderno")}>Cuaderno</button>
        </div>
      </div>
      {error && <p className="h-error" role="alert">{error}</p>}

      <section className="hb-planner" aria-label="Calendario de hábitos">
        <div className="hb-rings" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
        <div className="hb-month">
          <h2>{MESES[m - 1]}<small>{y}</small></h2>
          {esActual && <span className="hb-tag">Semana {semanaISO(hoy)}</span>}
          <span className="hb-spacer" />
          <Link className="hb-arrow" href={`/habitos?mes=${mesVecino(mes, -1)}`} aria-label="Mes anterior">‹</Link>
          <Link className="hb-arrow" href={`/habitos?mes=${mesVecino(mes, 1)}`} aria-label="Mes siguiente" aria-disabled={esActual}>›</Link>
        </div>
        <p className="hb-cheer">{t.cheer(r.diasActivos, Math.max(1, r.diasTranscurridos), r.total)}</p>
        <div className="hb-stats">
          {([[r.total, t.unidad], [r.diasCompletos, t.estrella], [esActual ? racha(porDia, hoy) : "—", t.racha], [r.semanasCerradas.length, t.semanas]] as const).map(([v, l], i) => (
            <span className="hb-stat" key={l}><span className="hb-e">{t.ico[i]}</span><b>{v}</b><span>{l}</span></span>
          ))}
        </div>
        <div className="hb-dow" aria-hidden="true">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="hb-cal">{celdas}</div>
        {activos.length > 0 && (
          <div className="hb-legend">
            {activos.map((h) => <span key={h.id}><Sticker h={h} semilla={h.id} />{h.nombre} <b>{r.porHabito[h.id] ?? 0}</b></span>)}
          </div>
        )}
      </section>

      <section className="h-card">
        <div className="h-row">
          <h3 className="hb-title" style={{ margin: 0 }}>{t.medalla}</h3>
          <span className="h-pill h-pill--accent">{rango.logrado ? `${rango.logrado.icono} ${rango.logrado.nombre}` : "En camino"}</span>
        </div>
        <div className="hb-track">
          <div className="hb-fill" style={{ width: `${Math.min(100, (r.total / tope) * 100)}%` }} />
          {RANGOS.map((x) => (
            <div key={x.nombre} className={`hb-tier${r.total >= x.min ? " got" : ""}`} style={{ left: `${(x.min / tope) * 100}%` }}>
              <div className="hb-m">{x.icono}</div><small>{x.nombre} · {x.min}</small>
            </div>
          ))}
        </div>
        <p className="h-muted" style={{ margin: 0 }}>{rango.siguiente ? <>{t.falta(rango.faltan, rango.siguiente.nombre)} {rango.siguiente.icono}</> : t.oro}</p>
      </section>

      <section className="h-card">
        <div className="h-row"><h3 className="hb-title" style={{ margin: 0 }}>Mis hábitos</h3><span className="h-muted">esta semana · este mes</span></div>
        {activos.length === 0 && (
          <div className="hb-empty">
            <p className="h-muted">Todavía no tienes hábitos. Crea el primero, por ejemplo Gimnasio con la mancuerna.</p>
            <button type="button" className="h-btn h-btn--primary" onClick={() => setEditando("nuevo")}>+ Crear hábito</button>
          </div>
        )}
        {activos.map((h) => {
          const semana = semanaDeHabito(h.id, porDia, hoy);
          const hechos = semana.filter(Boolean).length;
          return (
            <div className="hb-habit" key={h.id} style={{ "--c": `var(${h.color})` } as CSSProperties}>
              <Sticker h={h} semilla={h.id} />
              <div className="hb-info">
                <b>{h.nombre}</b>
                <div className="h-muted">
                  {h.meta_semanal ? (hechos >= h.meta_semanal ? <span className="h-pill h-pill--ok">Meta lograda ✓</span> : `${hechos} de ${h.meta_semanal} esta semana`) : "Sin meta semanal"}
                </div>
                <div className="hb-week" aria-hidden="true">{semana.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</div>
              </div>
              <div className="hb-count"><b>{r.porHabito[h.id] ?? 0}</b>este mes</div>
              <button type="button" className="h-btn h-btn--ghost" onClick={() => setEditando(h)} aria-label={`Editar ${h.nombre}`}>✎</button>
            </div>
          );
        })}
      </section>

      {/* Marcar un día */}
      <dialog ref={dlgDia} className="hb-dlg" onClose={() => setDia(null)} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        {dia && (
          <div className="hb-dlg-body">
            <header>
              <h3>{DIAS[nDia][0].toUpperCase() + DIAS[nDia].slice(1)} {Number(dia.slice(8))} de {MESES[Number(dia.slice(5, 7)) - 1].toLowerCase()}</h3>
              <button type="button" className="hb-x" onClick={() => dlgDia.current?.close()} aria-label="Cerrar">✕</button>
            </header>
            {activos.length === 0 ? <p className="h-muted">Primero crea un hábito.</p> : (
              <div className="hb-toggles">
                {activos.map((h) => {
                  const on = idsDia.includes(h.id);
                  return (
                    <button key={h.id} type="button" className="hb-tg" style={{ "--c": `var(${h.color})` } as CSSProperties} aria-pressed={on}
                      onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); alternar(h, dia, b.left + 28, b.top + b.height / 2); }}>
                      <Sticker h={h} semilla={dia + h.id} />
                      <span><b>{h.nombre}</b><small>{on ? t.hecho : "Toca para marcar"}</small></span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="hb-note">{t.nota(idsDia.length)}</p>
          </div>
        )}
      </dialog>

      {/* Crear / editar hábito */}
      <dialog ref={dlgHab} className="hb-dlg" onClose={() => setEditando(null)} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        {editando && (
          <EditorHabito
            key={editando === "nuevo" ? "nuevo" : editando.id}
            habito={editando === "nuevo" ? null : editando}
            colorInicial={COLORES_HABITO[activos.length % COLORES_HABITO.length]}
            cerrar={(msg) => { dlgHab.current?.close(); if (msg) setAviso(msg); }}
          />
        )}
      </dialog>

      <div ref={toastRef} className="hb-toast" role="status" popover="manual">{aviso}</div>
    </div>
  );
}

function EditorHabito({ habito, colorInicial, cerrar }: { habito: Habit | null; colorInicial: string; cerrar: (msg?: string) => void }) {
  const [nombre, setNombre] = useState(habito?.nombre ?? "");
  const [icono, setIcono] = useState(habito?.icono ?? "🏃");
  const [color, setColor] = useState(habito?.color ?? colorInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  async function guardar(fd: FormData) {
    const err = await guardarHabito(fd);
    if (err) setError(err);
    else cerrar(habito ? "Hábito actualizado" : "Nuevo hábito listo");
  }

  function archivar() {
    if (!habito || !confirm(`¿Archivar "${habito.nombre}"? Deja de aparecer, pero sus marcas antiguas se conservan.`)) return;
    startTransition(async () => {
      const err = await archivarHabito(habito.id);
      if (err) setError(err);
      else cerrar("Archivado · su historial se conserva");
    });
  }

  return (
    <form className="hb-dlg-body" action={guardar}>
      <header>
        <h3>{habito ? "Editar hábito" : "Nuevo hábito"}</h3>
        <button type="button" className="hb-x" onClick={() => cerrar()} aria-label="Cerrar">✕</button>
      </header>
      <input type="hidden" name="id" value={habito?.id ?? ""} />
      <input type="hidden" name="icono" value={icono} />
      <input type="hidden" name="color" value={color} />
      <div className="hb-preview"><Sticker h={{ nombre: nombre || "Vista previa", icono, color }} semilla="prev" /></div>
      {error && <p className="h-error" role="alert">{error}</p>}
      <div className="h-field">
        <label htmlFor="hb-nombre">Nombre</label>
        <input className="h-input" id="hb-nombre" name="nombre" required maxLength={24} placeholder="Ej: Gimnasio" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <span className="hb-lbl">Ícono</span>
        <div className="hb-icons">
          {ICONOS_HABITO.map((i) => (
            <button key={i} type="button" aria-pressed={i === icono} aria-label={i === "svg:mancuerna" ? "Mancuerna" : i} onClick={() => setIcono(i)}><Icono k={i} /></button>
          ))}
        </div>
      </div>
      <div>
        <span className="hb-lbl">Color</span>
        <div className="hb-colors">
          {COLORES_HABITO.map((c, i) => (
            <button key={c} type="button" aria-pressed={c === color} aria-label={`Color ${i + 1}`} style={{ "--c": `var(${c})` } as CSSProperties} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <div className="h-field">
        <label htmlFor="hb-meta">Meta semanal (opcional)</label>
        <select className="h-input" id="hb-meta" name="meta_semanal" defaultValue={habito?.meta_semanal ?? 0}>
          <option value="0">Sin meta, cuando se pueda</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "vez" : "veces"} por semana</option>)}
          <option value="7">Todos los días</option>
        </select>
      </div>
      <div className="h-row">
        {habito ? <button type="button" className="h-btn h-btn--ghost" onClick={archivar} disabled={pendiente}>Archivar</button> : <span />}
        <button type="submit" className="h-btn h-btn--primary">Guardar</button>
      </div>
    </form>
  );
}
