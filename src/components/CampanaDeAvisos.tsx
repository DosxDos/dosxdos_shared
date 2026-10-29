"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ABRIR_AVISOS, useAvisos } from "../hooks/useAvisos";
import { useBodyLock } from "../hooks/useBodyLock";
import { withSessionToken } from "../utils/auth/session";
import type { AvisoDelHistorial } from "../types/aviso";
import { IconBell, IconClose } from "./Icons";

/** Lo que dura la salida del cajon: lo mismo que `dxd-sheet-out` en styles.css. */
const SALIDA_MS = 220;

const dia = (iso: string) => new Date(iso).toDateString();

/** «Hoy», «Ayer» o «Lunes 26 de octubre», para los grupos por dia. */
function nombreDelDia(iso: string): string {
  const fecha = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
  if (fecha.toDateString() === ayer.toDateString()) return "Ayer";
  const texto = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(fecha.getFullYear() === hoy.getFullYear() ? {} : { year: "numeric" }),
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(",", "");
}

/** El historial en grupos por dia, en el orden en que llega (el mas reciente primero). */
function porDia(avisos: readonly AvisoDelHistorial[]) {
  const grupos: { clave: string; nombre: string; avisos: AvisoDelHistorial[] }[] = [];
  for (const aviso of avisos) {
    const clave = dia(aviso.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.clave === clave) ultimo.avisos.push(aviso);
    else grupos.push({ clave, nombre: nombreDelDia(aviso.fecha), avisos: [aviso] });
  }
  return grupos;
}

/**
 * A donde lleva un aviso. A otra aplicacion, con el token (la sesion se
 * guarda por origen); a esta misma, sin el, que ya hay sesion.
 */
function enlaceDe(url: string): string {
  try {
    return new URL(url).origin === window.location.origin ? url : withSessionToken(url);
  } catch {
    return url;
  }
}

function Aviso({ aviso, onAbrir }: { aviso: AvisoDelHistorial; onAbrir: () => void }) {
  const sinLeer = !aviso.leido;
  const hora = new Date(aviso.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return (
    <li>
      <a
        href={enlaceDe(aviso.url)}
        onClick={onAbrir}
        className={`flex flex-col gap-1 px-6 py-4 transition-colors duration-200 keyboard-focus-ring ${
          sinLeer ? "bg-primary/[0.045] hover:bg-primary/[0.08]" : "hover:bg-primary/[0.03]"
        }`}
      >
        <span className="flex items-center justify-between gap-3 text-body-sm">
          <span
            className={`rounded-full px-2.5 py-0.5 font-semibold ${
              aviso.tono === "aviso" ? "bg-accent/10 text-accent" : "bg-primary/[0.07] text-primary/75"
            }`}
          >
            {aviso.moduloNombre}
          </span>
          <span className="flex items-center gap-2">
            <time dateTime={aviso.fecha} className="tabular-nums text-primary/45">
              {hora}
            </time>
            {sinLeer && (
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${aviso.tono === "aviso" ? "bg-accent" : "bg-primary"}`}
              />
            )}
          </span>
        </span>
        <span className={`text-body leading-snug text-primary ${sinLeer ? "font-semibold" : "font-medium"}`}>
          {sinLeer && <span className="sr-only">Sin leer: </span>}
          {aviso.texto}
        </span>
        {aviso.detalle && <span className="text-body-sm leading-relaxed text-primary/70">{aviso.detalle}</span>}
      </a>
    </li>
  );
}

/**
 * La campana de la cabecera compartida: los avisos de TODAS las aplicaciones
 * de esta persona (el reloj, gastos, logistica, incidencias...), del portal.
 *
 * Abre un cajon con el historial, como en Facebook: lo leido y lo no leido se
 * quedan, lo mas reciente arriba y en grupos por dia; lo no leido va tintado
 * hasta que se abre, y lo anterior se carga al llegar abajo. Pulsar un aviso
 * lo marca leido y lleva a su modulo. Lo leido vive en el portal, asi que es lo
 * mismo en todas las aplicaciones.
 *
 * La chapa cuenta lo no leido, y es roja solo si entre ello hay una incidencia.
 * Otra parte de la pagina la puede abrir con el evento `ABRIR_AVISOS`.
 */
export function CampanaDeAvisos({ portalUrl }: { portalUrl?: string }) {
  const avisos = useAvisos(portalUrl);
  const [abierta, setAbierta] = useState(false);
  const [montada, setMontada] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const final = useRef<HTMLDivElement>(null);
  const temporizador = useRef<number | null>(null);
  useBodyLock(abierta);

  const { refrescar, cargarMas, hayMas } = avisos;

  const abrir = useCallback(() => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    setMontada(true);
    setAbierta(true);
    void refrescar();
  }, [refrescar]);

  const cerrar = useCallback((devolverFoco = false) => {
    setAbierta(false);
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setMontada(false), SALIDA_MS);
    if (devolverFoco) boton.current?.focus();
  }, []);

  useEffect(() => {
    document.addEventListener(ABRIR_AVISOS, abrir);
    return () => document.removeEventListener(ABRIR_AVISOS, abrir);
  }, [abrir]);

  useEffect(() => {
    if (!abierta) return;
    panel.current?.focus({ preventScroll: true });
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrar(true);
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierta, cerrar]);

  // Lo anterior entra solo al acercarse al final de la lista.
  useEffect(() => {
    const fin = final.current;
    if (!montada || !fin || !hayMas) return;
    const observador = new IntersectionObserver((entradas) => entradas[0]?.isIntersecting && void cargarMas(), {
      rootMargin: "200px",
    });
    observador.observe(fin);
    return () => observador.disconnect();
  }, [montada, hayMas, cargarMas, avisos.avisos.length]);

  useEffect(() => () => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
  }, []);

  const { sinLeer } = avisos;
  const cerrando = montada && !abierta;

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={() => (abierta ? cerrar() : abrir())}
        aria-haspopup="dialog"
        aria-expanded={abierta}
        aria-label={sinLeer > 0 ? `Avisos, ${sinLeer} sin leer` : "Avisos"}
        className="dxd-control relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary keyboard-focus-ring-inverse md:h-14 md:w-14"
      >
        <IconBell className="h-5 w-5 md:h-6 md:w-6" />
        {sinLeer > 0 && (
          <span
            aria-hidden="true"
            className={`absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.75rem] font-bold leading-none tabular-nums ring-2 ring-primary ${
              avisos.hayAvisoRojo ? "bg-accent text-white" : "bg-secondary text-primary"
            }`}
          >
            {sinLeer > 99 ? "99+" : sinLeer}
          </span>
        )}
      </button>

      {montada &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              onClick={() => cerrar()}
              data-closing={cerrando ? "" : undefined}
              className="dxd-scrim dxd-cajon-fondo fixed inset-0 bg-primary/40"
            />
            <div
              ref={panel}
              role="dialog"
              aria-label="Avisos"
              tabIndex={-1}
              data-closing={cerrando ? "" : undefined}
              className="dxd-cajon fixed inset-x-0 bottom-0 flex h-[88dvh] min-h-0 flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-20px_50px_-14px_rgba(40,21,40,0.45)] outline-none lg:inset-x-auto lg:right-0 lg:top-0 lg:h-dvh lg:w-[30rem] lg:rounded-none lg:rounded-l-2xl lg:shadow-[-20px_0_50px_-14px_rgba(40,21,40,0.45)]"
            >
              <button
                type="button"
                onClick={() => cerrar(true)}
                aria-label="Cerrar"
                className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-primary/10 bg-white text-primary shadow-[0_2px_8px_-2px_rgba(40,21,40,0.25)] transition-colors duration-150 hover:bg-primary hover:text-white keyboard-focus-ring"
              >
                <IconClose className="h-4 w-4" />
              </button>

              <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-10 pt-6">
                <div className="flex flex-col gap-3 px-6">
                  <h2 className="title-section pr-12 text-primary">Avisos</h2>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <p className="text-body text-primary/60">
                      {!avisos.cargado
                        ? "Cargando…"
                        : sinLeer === 0
                          ? "Todo leído."
                          : sinLeer === 1
                            ? "1 sin leer."
                            : `${sinLeer} sin leer.`}
                    </p>
                    {sinLeer > 0 && (
                      <button
                        type="button"
                        onClick={() => void avisos.marcarTodos()}
                        className="rounded-full px-4 py-2 text-body-sm font-semibold text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/5 keyboard-focus-ring"
                      >
                        Marcar todos como leídos
                      </button>
                    )}
                  </div>
                </div>

                {avisos.cargado && avisos.avisos.length === 0 ? (
                  <div className="flex flex-col items-start gap-3 px-6 pt-10">
                    <IconBell className="h-8 w-8 text-primary/30" />
                    <p className="max-w-[22rem] text-body leading-relaxed text-primary/70">
                      Aquí verás lo que te necesite en cualquier aplicación: tus ausencias y teletrabajo, tickets de
                      gastos, incidencias…
                    </p>
                  </div>
                ) : (
                  <div>
                    {porDia(avisos.avisos).map((grupo) => (
                      <section key={grupo.clave} aria-label={grupo.nombre} className="pt-6">
                        <h3 className="px-6 pb-2 font-[family-name:var(--font-display)] text-xl font-bold leading-tight text-primary">{grupo.nombre}</h3>
                        <ul className="divide-y divide-primary/10">
                          {grupo.avisos.map((aviso) => (
                            <Aviso
                              key={aviso.id}
                              aviso={aviso}
                              onAbrir={() => {
                                void avisos.marcarLeidos([aviso.id]);
                                cerrar();
                              }}
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                    {avisos.avisos.length > 0 && (
                      <div ref={final} className="px-6 pt-6 text-body-sm text-primary/50">
                        {avisos.cargandoMas ? (
                          <p role="status">Cargando anteriores…</p>
                        ) : hayMas ? (
                          <button
                            type="button"
                            onClick={() => void cargarMas()}
                            className="rounded-full px-4 py-2 font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/5 keyboard-focus-ring"
                          >
                            Ver anteriores
                          </button>
                        ) : (
                          <p>No hay más avisos.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
