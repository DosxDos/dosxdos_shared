"use client";

import type { AuthenticatedUser } from "../../types/auth";
import { toAuthenticatedUser, decodeToken } from "./jwt";

/**
 * Donde vive la sesion de una aplicacion: el token de acceso y, desde el
 * 03/11/2026, el refresh token (sesiones revocables,
 * auth-service/docs/sesiones-revocables.md).
 *
 * localStorage y no sessionStorage: con sessionStorage la sesion moria al
 * cerrar la pestaña y cada vuelta pedia la contraseña. El token caducado no
 * es un problema de seguridad grande: cualquier backend lo rechaza como
 * caducado en cuanto lo lee. Para salir de verdad esta el boton de cerrar
 * sesion, que ademas revoca el refresh en auth-service.
 *
 * El refresh es lo que permite pedir un token de acceso nuevo sin volver a
 * escribir la contraseña, y lo unico que auth-service puede revocar. Se guarda
 * aparte del token (`<clave>` para el token, `dxd_refresh` para el refresh)
 * para que las aplicaciones que configuran su propio almacen sigan igual.
 */

export interface TokenStore {
  read(): string | null;
  write(token: string): void;
  clear(): void;
}

function webStorage(kind: "localStorage" | "sessionStorage", key: string): TokenStore {
  return {
    read() {
      try {
        return window[kind].getItem(key);
      } catch {
        return null;
      }
    },
    write(token) {
      try {
        window[kind].setItem(key, token);
      } catch {
        // La navegacion privada puede rechazar la escritura. Se sigue: el token
        // vive en memoria durante esta carga y la persona puede trabajar.
      }
    },
    clear() {
      try {
        window[kind].removeItem(key);
      } catch {
        // nada que hacer
      }
    },
  };
}

/** El token en localStorage, con esa clave. Lo normal. */
export function localStorageStore(key: string): TokenStore {
  return webStorage("localStorage", key);
}

/** Solo mientras dure la pestaña. */
export function sessionStorageStore(key: string): TokenStore {
  return webStorage("sessionStorage", key);
}

/** Una cookie (no httpOnly: la lee JavaScript). Para quien ya la tenia asi. */
export function cookieStore(name: string, days = 1): TokenStore {
  return {
    read() {
      if (typeof document === "undefined") return null;
      const found = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
      return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
    },
    write(token) {
      const secure = window.location.protocol === "https:" ? "; secure" : "";
      document.cookie = `${name}=${encodeURIComponent(token)}; path=/; max-age=${days * 86400}; samesite=lax${secure}`;
    },
    clear() {
      document.cookie = `${name}=; path=/; max-age=0`;
    },
  };
}

let store: TokenStore = localStorageStore("dxd_token");
let refreshStore: TokenStore = localStorageStore("dxd_refresh");
/**
 * Cuando caduca el token segun el reloj de ESTE navegador (0.24, 05/11/2026).
 *
 * El `exp` del token lo pone el servidor con su reloj; si el del PC va
 * adelantado unos minutos (pasa, y no siempre se puede arreglar), un token de
 * cinco minutos parece caducado nada mas llegar y la aplicacion rebota al
 * acceso en bucle. Por eso la caducidad se calcula aqui, al guardar el token,
 * a partir de lo que el servidor dice que le queda (`expiraEn`, segundos) o,
 * si no lo dice, de `exp - iat`: ambos son duraciones, que valen en cualquier
 * reloj. Se guarda junto a un trozo del token para no aplicarla a otro.
 */
const expiryStore: TokenStore = localStorageStore("dxd_expira");

function huella(token: string): string {
  return token.slice(-24);
}

/** Apunta cuando caduca el token recien guardado. `segundos`: lo que le queda, segun el servidor. */
function recordarCaducidad(token: string, segundos?: number | null): void {
  let vida = typeof segundos === "number" && segundos > 0 ? segundos : null;
  if (vida === null) {
    const payload = decodeToken(token);
    if (payload && typeof payload.iat === "number" && payload.exp > payload.iat) vida = payload.exp - payload.iat;
  }
  if (vida === null) {
    expiryStore.clear();
    return;
  }
  expiryStore.write(`${huella(token)}|${Date.now() + vida * 1000}`);
}

/** La caducidad apuntada para el token guardado, en ms de este reloj; null si no hay o es de otro token. */
function caducidadLocal(token: string): number | null {
  const apunte = expiryStore.read();
  if (!apunte) return null;
  const sep = apunte.lastIndexOf("|");
  if (sep < 0 || apunte.slice(0, sep) !== huella(token)) return null;
  const ms = Number(apunte.slice(sep + 1));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Donde guarda esta aplicacion su token. Cada aplicacion decide —su clave de
 * localStorage, una cookie, sessionStorage— y sus llamadas a la API lo leen de
 * ahi; lo que el paquete no decide es la clave, porque una clave compartida
 * entre aplicaciones del mismo dominio seria un lio y los subdominios no la
 * comparten de todas formas. Sin llamarla: localStorage, clave `dxd_token`.
 *
 * El refresh va aparte: `dxd_refresh` en localStorage salvo que se diga otro.
 */
export function configureTokenStore(next: TokenStore, refresh?: TokenStore): void {
  store = next;
  if (refresh) refreshStore = refresh;
}

/**
 * Lee la sesion que el modulo de acceso deja en el fragmento de la URL
 * (`#token=…`, y desde el 03/11/2026 tambien `&refresh=…`), la guarda y
 * limpia la URL. El modulo de acceso lo entrega en el fragmento justamente
 * porque el fragmento no viaja al servidor ni queda en los logs.
 *
 * Si el fragmento trae token pero no refresh (el modulo de acceso aun no se lo
 * da a esta aplicacion), se borra el refresh que hubiera: esa entrada nueva es
 * la que manda, y un refresh de otra entrada ya cerrada solo daria un 401.
 */
export function consumeTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#token=")) return null;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("token");
  if (!token) return null;
  const refresh = params.get("refresh");
  window.history.replaceState(null, "", window.location.pathname + window.location.search);

  // Un enlace de otra aplicacion (token solo, sin refresh) no pisa una sesion
  // propia vigente de la misma persona (0.25, 05/11/2026): el token que viene
  // puede ser el corto de una aplicacion con refresh (cinco minutos), y
  // quedarse con el seria perder la sesion larga de aqui y su refresh. Lo que
  // viene del modulo de acceso trae refresh y siempre manda.
  if (!refresh) {
    const propio = readToken();
    if (propio && msUntilExpiry() > 0) {
      const mio = decodeToken(propio);
      const suyo = decodeToken(token);
      if (mio && suyo && mio.sub === suyo.sub) return propio;
    }
  }

  storeToken(token);
  if (refresh) storeRefresh(refresh);
  else refreshStore.clear();
  return token;
}

/**
 * Guarda un token recien emitido. `expiraEn`: los segundos que le quedan segun
 * el servidor (lo devuelven el login, el refresh y sesion-desde-token); sin el,
 * se toma `exp - iat`. Con eso la caducidad se mide con este reloj y no con el
 * del servidor (ver `expiryStore`).
 */
export function storeToken(token: string, expiraEn?: number | null): void {
  store.write(token);
  recordarCaducidad(token, expiraEn);
}

export function readToken(): string | null {
  return store.read();
}

/** Borra la sesion entera: el token, el refresh y la caducidad apuntada. */
export function clearToken(): void {
  store.clear();
  refreshStore.clear();
  expiryStore.clear();
}

export function storeRefresh(refresh: string): void {
  refreshStore.write(refresh);
}

export function readRefresh(): string | null {
  return refreshStore.read();
}

/**
 * Quien esta dentro, segun el token guardado. Caducado no cuenta; pero si hay
 * refresh, no se borra: {@link renewSession} pedira uno nuevo.
 */
export function currentUser(): AuthenticatedUser | null {
  const token = readToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload || msUntilExpiry() <= 0) {
    if (!readRefresh()) clearToken();
    return null;
  }

  return toAuthenticatedUser(token);
}

/**
 * Cuantos milisegundos le quedan al token guardado; 0 si no hay o ya caduco.
 * Con la caducidad apuntada al guardarlo (este reloj); si no la hay, con el
 * `exp` del token (el reloj del servidor).
 */
export function msUntilExpiry(): number {
  const token = readToken();
  const payload = token ? decodeToken(token) : null;
  if (!token || !payload) return 0;
  const local = caducidadLocal(token);
  const limite = local ?? payload.exp * 1000;
  return Math.max(0, limite - Date.now());
}

/** Si la sesion guardada ya ha caducado (o no hay). Para quien tenga su propio `haCaducado`. */
export function isSessionExpired(): boolean {
  return msUntilExpiry() <= 0;
}

export type RenewResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "sin-refresh" | "caducada" | "no-disponible" };

/**
 * Un token de acceso nuevo, con los permisos de ahora, a cambio del refresh
 * (sesiones revocables, 03/11/2026). Se pide al modulo de acceso
 * (`<authUrl>/api/auth/refresh`), que es quien tiene CORS para las
 * aplicaciones y reenvia a auth-service.
 *
 * - `caducada`: auth-service ya no admite esa sesion (se cerro, cambiaron los
 *   permisos o la contraseña, o el refresh se reutilizo). Se borra todo:
 *   toca volver a entrar.
 * - `no-disponible`: no se pudo preguntar. No se borra nada; se reintenta.
 *
 * Varias pestañas comparten el refresh (localStorage): se renueva bajo un
 * cerrojo (`navigator.locks`) y, al cogerlo, se vuelve a leer el refresh. Si
 * otra pestaña acaba de renovar, se usa su token y no se gasta nada.
 */
export async function renewSession(authUrl: string): Promise<RenewResult> {
  const refreshAntes = readRefresh();
  if (!refreshAntes) return { ok: false, reason: "sin-refresh" };

  const renovar = async (): Promise<RenewResult> => {
    const refresh = readRefresh();
    if (!refresh) return { ok: false, reason: "sin-refresh" };
    if (refresh !== refreshAntes) {
      // Otra pestaña ya renovo: su token vale para esta tambien.
      const user = currentUser();
      return user ? { ok: true, user } : pedir(refresh);
    }
    return pedir(refresh);
  };

  const pedir = async (refresh: string): Promise<RenewResult> => {
    let r: Response;
    try {
      r = await fetch(`${authUrl.replace(/\/+$/, "")}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        credentials: "omit",
      });
    } catch {
      return { ok: false, reason: "no-disponible" };
    }
    if (r.status === 401) {
      clearToken();
      return { ok: false, reason: "caducada" };
    }
    if (!r.ok) return { ok: false, reason: "no-disponible" };
    let d: { token?: unknown; refresh?: unknown; expiraEn?: unknown } | null = null;
    try {
      d = (await r.json()) as { token?: unknown; refresh?: unknown; expiraEn?: unknown };
    } catch {
      d = null;
    }
    if (!d || typeof d.token !== "string" || typeof d.refresh !== "string") {
      return { ok: false, reason: "no-disponible" };
    }
    storeToken(d.token, typeof d.expiraEn === "number" ? d.expiraEn : null);
    storeRefresh(d.refresh);
    const user = toAuthenticatedUser(d.token);
    return user ? { ok: true, user } : { ok: false, reason: "no-disponible" };
  };

  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request("dxd-refresh", renovar);
  }
  return renovar();
}

const MARCA_SIN_REFRESH = "dxd_sin_refresh";

/**
 * Pide una sesion con refresh para quien ya tiene un token de acceso valido
 * pero no refresh: llego por un enlace de otra aplicacion (el portal pasa solo
 * su token), con una sesion recordada de antes, o entro con Google/Microsoft
 * (04/11/2026). El modulo de acceso solo la concede a las aplicaciones de su
 * lista; si contesta 403 se apunta en sessionStorage para no volver a pedirla
 * en esta pestaña. Devuelve el usuario con el token nuevo, o null si no hubo.
 */
export async function adoptSession(authUrl: string): Promise<AuthenticatedUser | null> {
  const token = readToken();
  if (!token || readRefresh()) return null;
  try {
    if (window.sessionStorage.getItem(MARCA_SIN_REFRESH)) return null;
  } catch {
    // sin sessionStorage se pide igual
  }
  let r: Response;
  try {
    r = await fetch(`${authUrl.replace(/\/+$/, "")}/api/auth/sesion-desde-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      credentials: "omit",
    });
  } catch {
    return null;
  }
  if (r.status === 403) {
    try {
      window.sessionStorage.setItem(MARCA_SIN_REFRESH, "1");
    } catch {
      // nada
    }
    return null;
  }
  if (!r.ok) return null;
  let d: { token?: unknown; refresh?: unknown; expiraEn?: unknown } | null = null;
  try {
    d = (await r.json()) as { token?: unknown; refresh?: unknown; expiraEn?: unknown };
  } catch {
    return null;
  }
  if (!d || typeof d.token !== "string" || typeof d.refresh !== "string") return null;
  storeToken(d.token, typeof d.expiraEn === "number" ? d.expiraEn : null);
  storeRefresh(d.refresh);
  return toAuthenticatedUser(d.token);
}

/**
 * Mantiene la sesion viva mientras la pestaña esta abierta: renueva un minuto
 * antes de que caduque el token y al volver a la pestaña si queda poco. Si no
 * hay refresh (el modulo de acceso aun no se lo da a esta aplicacion), no hace
 * nada. Devuelve la funcion para pararlo.
 *
 * `onChange` recibe el usuario nuevo tras cada renovacion (por si cambiaron los
 * permisos) o `null` cuando la sesion caduco de verdad y hay que ir al acceso.
 */
export function keepSessionAlive(
  authUrl: string,
  onChange: (user: AuthenticatedUser | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  let timer: number | undefined;
  let parado = false;

  const planificar = () => {
    if (parado || !readRefresh()) return;
    const quedan = msUntilExpiry();
    // Un minuto antes; nunca antes de cinco segundos (por si el token es cortisimo).
    timer = window.setTimeout(renovar, Math.max(quedan - 60_000, 5_000));
  };

  const renovar = async () => {
    if (parado || !readRefresh()) return;
    const r = await renewSession(authUrl);
    if (parado) return;
    if (r.ok) {
      onChange(r.user);
      planificar();
    } else if (r.reason === "caducada") {
      onChange(null);
    } else if (r.reason === "no-disponible") {
      timer = window.setTimeout(renovar, 30_000);
    }
  };

  const alVolver = () => {
    if (document.visibilityState !== "visible" || !readRefresh()) return;
    if (msUntilExpiry() < 120_000) {
      window.clearTimeout(timer);
      void renovar();
    }
  };

  document.addEventListener("visibilitychange", alVolver);
  planificar();
  return () => {
    parado = true;
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", alVolver);
  };
}

/**
 * Cierra la sesion en auth-service (revoca la familia: la del modulo de acceso y
 * la de todas las aplicaciones de esa entrada) y borra lo guardado. Espera a
 * que auth-service conteste, con un tope de segundo y medio: si no llega, se
 * sale igual y el refresh caduca solo. `keepalive` por si la pagina cambia
 * antes de tiempo.
 */
export async function signOutEverywhere(authUrl: string): Promise<void> {
  const refresh = readRefresh();
  clearToken();
  if (!refresh || typeof fetch === "undefined") return;
  const tope = new Promise<void>((resolve) => setTimeout(resolve, 1_500));
  try {
    const peticion = fetch(`${authUrl.replace(/\/+$/, "")}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      credentials: "omit",
      keepalive: true,
    }).then(() => undefined, () => undefined);
    await Promise.race([peticion, tope]);
  } catch {
    // Se sale igual: el refresh caduca solo.
  }
}

let authUrlConocida: string | null = null;

/**
 * El modulo de acceso de esta aplicacion. Lo registra `SessionProvider` al
 * montarse; una aplicacion sin el lo llama a mano. Hace falta para que los
 * enlaces a otras aplicaciones pasen por el acceso cuando la sesion de aqui es
 * corta (ver {@link withSessionToken}).
 */
export function configureAuthUrl(url: string): void {
  authUrlConocida = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Un enlace a otra aplicacion que no vuelva a pedir la contraseña.
 *
 * Con una sesion renovable (hay refresh; el token de aqui es corto, de minutos)
 * el enlace pasa por el modulo de acceso: `<authUrl>/?returnUrl=<destino>`.
 * El acceso tiene la sesion recordada, la renueva y entrega al destino SU
 * token (largo, o con refresh si esta en su lista) sin pedir nada. Pasarle el
 * token corto de aqui era darle una sesion de cinco minutos y, al caducar,
 * mandarle al acceso de verdad (facturas → portal, 04/11/2026).
 *
 * Sin refresh, como siempre: el token de aqui en el fragmento. Solo el token:
 * el refresh es de esta aplicacion; la otra pedira el suyo al modulo de acceso.
 */
export function withSessionToken(url: string): string {
  // Una ruta del propio portal no necesita token: la sesion ya esta aqui.
  // Ademas `new URL` la rechazaria por no ser absoluta.
  if (url.startsWith("/")) return url;

  const token = readToken();
  if (!token) return url;

  try {
    const target = new URL(url);
    const propio = typeof window !== "undefined" && target.origin === window.location.origin;
    if (!propio && authUrlConocida && readRefresh()) {
      return `${authUrlConocida}/?returnUrl=${encodeURIComponent(target.toString())}`;
    }
    target.hash = `token=${encodeURIComponent(token)}`;
    return target.toString();
  } catch {
    // URL mal formada: mejor mandar a la persona sin sesion que no mandarla.
    return url;
  }
}

/**
 * Vuelve a hacer un enlace que ya llevaba `#token=…` (una aplicacion lo
 * calculo antes de montar el proveedor de sesion, cuando aun no se sabia el
 * modulo de acceso): se le quita el token y se rehace con la regla de ahora.
 */
export function relinkWithSession(url: string): string {
  try {
    const target = new URL(url);
    if (!target.hash.startsWith("#token=")) return url;
    target.hash = "";
    return withSessionToken(target.toString());
  } catch {
    return url;
  }
}
