"use client";

import { useSyncExternalStore } from "react";
import type { AvisoDelHistorial, PaginaDeAvisos } from "../types/aviso";
import { readToken } from "../utils/auth/session";

/** Evento del documento para abrir la campana desde otro sitio de la pagina. */
export const ABRIR_AVISOS = "dxd:abrir-avisos";

/** Cada cuanto se vuelve a preguntar mientras la pestaña esta a la vista. */
const CADA_MS = 120_000;
const TIMEOUT_MS = 8_000;

export interface EstadoDeAvisos {
  avisos: AvisoDelHistorial[];
  sinLeer: number;
  hayAvisoRojo: boolean;
  hayMas: boolean;
  /** Ya ha llegado la primera respuesta. Antes, la campana no dice «nada». */
  cargado: boolean;
  cargandoMas: boolean;
}

const VACIO: EstadoDeAvisos = {
  avisos: [],
  sinLeer: 0,
  hayAvisoRojo: false,
  hayMas: false,
  cargado: false,
  cargandoMas: false,
};

/**
 * El historial, UNO por pagina, compartido por todo el que lo pinte (la
 * campana de la cabecera y, en el portal, la tarjeta «Tienes N avisos»): asi
 * son una sola peticion y el mismo estado, y leer en un sitio se ve en el otro.
 */
const almacenes = new Map<string, ReturnType<typeof crearAlmacen>>();

function crearAlmacen(base: string) {
  let estado = VACIO;
  const oyentes = new Set<() => void>();
  let intervalo: ReturnType<typeof setInterval> | null = null;

  const poner = (cambio: Partial<EstadoDeAvisos>) => {
    estado = { ...estado, ...cambio };
    oyentes.forEach((oyente) => oyente());
  };

  const pedir = async (ruta: string, init?: RequestInit): Promise<unknown> => {
    const token = readToken();
    if (!token) return null;
    try {
      const respuesta = await fetch(`${base}${ruta}`, {
        ...init,
        headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: init?.keepalive ? undefined : AbortSignal.timeout(TIMEOUT_MS),
      });
      return respuesta.ok ? await respuesta.json() : null;
    } catch {
      return null;
    }
  };

  /**
   * La primera pagina, otra vez. Lo mas viejo que ya se hubiera cargado bajando
   * se conserva detras, para que la lista no encoja mientras se mira.
   */
  const refrescar = async () => {
    const pagina = (await pedir("/api/avisos")) as PaginaDeAvisos | null;
    if (!pagina) {
      if (!estado.cargado) poner({ cargado: true });
      return;
    }
    const ultima = pagina.avisos[pagina.avisos.length - 1];
    const masViejos = ultima
      ? estado.avisos.filter((a) => a.fecha < ultima.fecha && !pagina.avisos.some((n) => n.id === a.id))
      : [];
    poner({
      avisos: [...pagina.avisos, ...masViejos],
      sinLeer: pagina.sinLeer,
      hayAvisoRojo: pagina.hayAvisoRojo,
      hayMas: masViejos.length > 0 ? estado.hayMas : pagina.hayMas,
      cargado: true,
    });
  };

  const cargarMas = async () => {
    const ultimo = estado.avisos[estado.avisos.length - 1];
    if (!ultimo || !estado.hayMas || estado.cargandoMas) return;
    poner({ cargandoMas: true });
    const pagina = (await pedir(`/api/avisos?antes=${encodeURIComponent(ultimo.id)}`)) as PaginaDeAvisos | null;
    if (!pagina) {
      poner({ cargandoMas: false });
      return;
    }
    poner({
      avisos: [...estado.avisos, ...pagina.avisos.filter((n) => !estado.avisos.some((a) => a.id === n.id))],
      hayMas: pagina.hayMas,
      sinLeer: pagina.sinLeer,
      hayAvisoRojo: pagina.hayAvisoRojo,
      cargandoMas: false,
    });
  };

  /**
   * Marca como leidos, primero en pantalla y luego en el portal. `keepalive`:
   * al pulsar un aviso la pagina se va a su modulo, y sin el la peticion
   * moriria con ella.
   */
  const marcar = async (cuerpo: { ids: string[] } | { todos: true }) => {
    const todos = "todos" in cuerpo;
    const ids = todos ? [] : cuerpo.ids;
    const sinLeerAntes = estado.avisos.filter((a) => !a.leido && (todos || ids.includes(a.id)));
    if (sinLeerAntes.length === 0 && !todos) return;
    poner({
      avisos: estado.avisos.map((a) => (todos || ids.includes(a.id) ? { ...a, leido: true } : a)),
      sinLeer: todos ? 0 : Math.max(0, estado.sinLeer - sinLeerAntes.length),
      hayAvisoRojo: todos ? false : estado.hayAvisoRojo,
    });
    const recuento = (await pedir("/api/avisos/leidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      keepalive: true,
    })) as { sinLeer: number; hayAvisoRojo: boolean } | null;
    if (recuento) poner(recuento);
  };

  const alVolver = () => {
    if (!document.hidden) void refrescar();
  };

  return {
    leer: () => estado,
    refrescar,
    cargarMas,
    marcarLeidos: (ids: string[]) => marcar({ ids }),
    marcarTodos: () => marcar({ todos: true }),
    suscribir(oyente: () => void) {
      oyentes.add(oyente);
      if (oyentes.size === 1) {
        void refrescar();
        intervalo = setInterval(alVolver, CADA_MS);
        document.addEventListener("visibilitychange", alVolver);
      }
      return () => {
        oyentes.delete(oyente);
        if (oyentes.size === 0) {
          if (intervalo) clearInterval(intervalo);
          document.removeEventListener("visibilitychange", alVolver);
        }
      };
    },
  };
}

/**
 * Los avisos de todas las aplicaciones de esta persona, del portal.
 *
 * `portalUrl` es la direccion del portal; en el propio portal se omite y se
 * pide a su mismo origen. Se piden al montar, cada dos minutos con la pestaña
 * a la vista y al volver a ella. Lo leido vive en el portal, asi que es lo
 * mismo en todas las aplicaciones.
 */
export function useAvisos(portalUrl?: string) {
  const base = portalUrl ? new URL(portalUrl).origin : "";
  let almacen = almacenes.get(base);
  if (!almacen) {
    almacen = crearAlmacen(base);
    almacenes.set(base, almacen);
  }
  const estado = useSyncExternalStore(almacen.suscribir, almacen.leer, () => VACIO);

  return {
    ...estado,
    refrescar: almacen.refrescar,
    cargarMas: almacen.cargarMas,
    marcarLeidos: almacen.marcarLeidos,
    marcarTodos: almacen.marcarTodos,
  };
}
