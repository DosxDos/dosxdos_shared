"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "../types/auth";
import {
  adoptSession,
  configureAuthUrl,
  consumeTokenFromUrl,
  currentUser,
  keepSessionAlive,
  readRefresh,
  renewSession,
  signOutEverywhere,
} from "../utils/auth/session";

interface SessionValue {
  user: AuthenticatedUser | null;
  isResolving: boolean;
  signOut: () => void;
  authUrl: string;
}

export const SessionContext = createContext<SessionValue | null>(null);

/**
 * La sesion de la aplicacion: quien esta dentro, o nadie (y entonces al modulo
 * de acceso).
 *
 * Desde el 03/11/2026 (sesiones revocables) tambien la mantiene viva: si el
 * modulo de acceso le dio un refresh, renueva el token de acceso antes de que
 * caduque y al volver a la pestaña, y si auth-service dice que la sesion ya no
 * vale (la cerraron, cambiaron los permisos o la contraseña), manda al acceso
 * con `returnUrl` para volver aqui tras entrar. Sin refresh, todo sigue como
 * antes: el token vale hasta que caduca.
 */
export function SessionProvider({
  children,
  siteUrl,
  authUrl,
}: {
  children: ReactNode;
  siteUrl: string;
  authUrl: string;
}) {
  const [session, setSession] = useState<{ user: AuthenticatedUser | null } | null>(null);

  // Antes de que rendericen los hijos: los enlaces de la cabecera a otras
  // aplicaciones pasan por el acceso cuando la sesion es renovable (0.25).
  configureAuthUrl(authUrl);

  const alAcceso = useCallback(() => {
    // `replace` y no `assign` para que el boton de atras no devuelva a una
    // pantalla vacia en bucle.
    const returnUrl = encodeURIComponent(siteUrl);
    window.location.replace(`${authUrl}/?returnUrl=${returnUrl}`);
  }, [authUrl, siteUrl]);

  useEffect(() => {
    let cancelado = false;
    let parar: (() => void) | undefined;

    const resolver = async () => {
      // Primero el fragmento: si acaba de volver de iniciar sesion, ese token es
      // mas nuevo que el que pudiera haber guardado.
      consumeTokenFromUrl();

      let resolved = currentUser();
      // Token caducado pero con refresh: se pide uno nuevo antes de rendirse.
      // Si auth-service no contesta, al acceso: alli se intentara igual.
      if (!resolved && readRefresh()) {
        const r = await renewSession(authUrl);
        if (cancelado) return;
        if (r.ok) resolved = r.user;
      }
      // Con token pero sin refresh (vino de otra aplicacion, o de una sesion
      // recordada de antes): se pide una sesion con refresh. Si el modulo de
      // acceso no la da a esta aplicacion, se sigue con el token de siempre.
      if (resolved && !readRefresh()) {
        const adoptado = await adoptSession(authUrl);
        if (cancelado) return;
        if (adoptado) resolved = adoptado;
      }

      // La sesion vive en la URL y en localStorage, que solo existen despues de
      // montar. Resolverla durante el render devuelve "sin sesion" en el servidor
      // y "con sesion" en el cliente: justo el desajuste de hidratacion que este
      // codigo evita. El render de mas es el precio, y es uno solo.
      setSession({ user: resolved });

      if (!resolved) {
        alAcceso();
        return;
      }

      parar = keepSessionAlive(authUrl, (user) => {
        if (cancelado) return;
        if (user) {
          setSession({ user });
        } else {
          setSession({ user: null });
          alAcceso();
        }
      });
    };

    void resolver();
    return () => {
      cancelado = true;
      parar?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = session?.user ?? null;
  const isResolving = session === null;

  const signOut = useCallback(() => {
    setSession({ user: null });
    // Primero se avisa a auth-service (revoca la familia) y luego se va a
    // /salir, que borra la sesion recordada del modulo de acceso.
    void signOutEverywhere(authUrl).finally(() => {
      window.location.replace(`${authUrl}/salir`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, isResolving, signOut, authUrl }),
    [user, isResolving, signOut, authUrl]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
