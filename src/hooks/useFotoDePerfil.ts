"use client";

import { useEffect, useState } from "react";
import { useSession } from "./useSession";
import { readToken } from "../utils/auth/session";

/**
 * El nombre del aviso que una aplicacion lanza cuando la persona cambia su
 * foto, para que la cabecera la vuelva a pedir sin recargar la pagina.
 */
export const FOTO_CAMBIADA = "dxd:foto-cambiada";

/** Lo lanza quien acaba de guardar o quitar la foto de la propia cuenta. */
export function avisarFotoCambiada(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOTO_CAMBIADA));
  }
}

/**
 * Una bajada por sesion y por aplicacion, no una por cada cabecera que se
 * pinte. La clave lleva la version, que sube con cada aviso de cambio.
 */
const bajadas = new Map<string, Promise<string | null>>();

/**
 * La foto de la persona que ha entrado, como URL para un `<img>`, o null si
 * no tiene (o todavia no ha llegado): entonces se pintan las iniciales.
 *
 * Se pide al modulo de acceso (`authUrl`, que cada aplicacion ya conoce) y
 * no a auth-service: es el unico sitio que todas las aplicaciones tienen
 * permitido llamar desde el navegador. Va con el token en la cabecera, por
 * eso no vale un `<img src>` a pelo. Si falla por lo que sea, iniciales.
 */
export function useFotoDePerfil(): string | null {
  const { user, authUrl } = useSession();
  const [url, setUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const alCambiar = () => {
      bajadas.clear();
      setVersion((v) => v + 1);
    };
    window.addEventListener(FOTO_CAMBIADA, alCambiar);
    return () => window.removeEventListener(FOTO_CAMBIADA, alCambiar);
  }, []);

  useEffect(() => {
    if (!user || !authUrl) {
      setUrl(null);
      return;
    }
    const token = readToken();
    if (!token) {
      setUrl(null);
      return;
    }

    const clave = `${user.email}:${version}`;
    if (!bajadas.has(clave)) {
      bajadas.set(
        clave,
        fetch(`${authUrl.replace(/\/$/, "")}/api/auth/me/foto`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.blob().then((b) => URL.createObjectURL(b)) : null))
          .catch(() => null)
      );
    }

    let cancelado = false;
    bajadas.get(clave)!.then((u) => {
      if (!cancelado) setUrl(u);
    });
    return () => {
      cancelado = true;
    };
  }, [user?.email, authUrl, version]); // eslint-disable-line react-hooks/exhaustive-deps

  return url;
}
