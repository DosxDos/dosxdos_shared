"use client";

import { useSession } from "../hooks/useSession";
import { usePanel } from "../hooks/usePanel";
import { useFotoDePerfil } from "../hooks/useFotoDePerfil";
import { displayName, initials } from "../utils/apps";
import { IconChevronDown, IconFlag, IconLogout, IconUser } from "./Icons";
import { enlaceDeIncidencia } from "../utils/incidencias";
import { EnlacePerfil } from "./EnlacePerfil";

/**
 * La cuenta: la pastilla con las iniciales y el nombre, y debajo el perfil y
 * la salida. Solo lo que es de la cuenta; las aplicaciones van en su menu.
 *
 * Entra y sale con animacion (styles.css: `dxd-pop`), y las iniciales llevan
 * un halo que se enciende al pasar por encima.
 */
export function UserMenu({ perfilHref, incidenciasUrl, appId, appNombre }: {
  /**
   * A donde lleva "Mi perfil". En el portal es una ruta suya (`/perfil`); desde
   * otro modulo, la URL absoluta del portal CON el token.
   */
  perfilHref: string;
  /**
   * La direccion del modulo de incidencias. OPCIONAL a proposito: sin ella el
   * menu queda exactamente como antes, asi que una aplicacion que actualice el
   * paquete por otro motivo no cambia. Con ella aparece "Reportar incidencia".
   */
  incidenciasUrl?: string;
  /** El id de esta aplicacion en el catalogo del portal, para la incidencia. */
  appId?: string;
  /** Su nombre, por si el modulo de incidencias no encuentra el id. */
  appNombre?: string;
}) {
  const { user, signOut } = useSession();
  const panel = usePanel<HTMLDivElement, HTMLButtonElement>();
  // La foto de la cuenta, si la tiene; si no, las iniciales de siempre.
  const foto = useFotoDePerfil();

  if (!user) return null;

  return (
    <div ref={panel.containerRef} className="relative">
      <button
        ref={panel.triggerRef}
        type="button"
        onClick={panel.toggle}
        aria-expanded={panel.isOpen}
        aria-controls="user-menu"
        aria-label={`Menú de ${displayName(user)}`}
        data-open={panel.isOpen ? "" : undefined}
        className="dxd-control dxd-pill flex items-center rounded-full text-primary keyboard-focus-ring-inverse md:gap-2.5 md:bg-secondary md:py-1 md:pl-1 md:pr-3"
      >
        <span
          aria-hidden="true"
          className="dxd-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-body font-bold text-primary md:bg-primary md:text-secondary"
        >
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" className="h-full w-full rounded-full object-cover ring-2 ring-white" />
          ) : (
            initials(user)
          )}
        </span>
        <span className="hidden max-w-[160px] truncate text-body font-semibold md:block">{displayName(user)}</span>
        <IconChevronDown
          className={`mr-1 hidden h-4 w-4 shrink-0 text-primary/50 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1)] md:block ${panel.isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {panel.isMounted && (
        <div
          id="user-menu"
          data-closing={panel.isClosing ? "" : undefined}
          className="dxd-pop absolute right-0 top-[calc(100%+0.75rem)] z-dropdown w-[min(17rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_-20px_rgba(40,21,40,0.45)] ring-1 ring-primary/8"
        >
          <div className="flex items-center gap-3 border-b border-primary/8 p-4">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-body font-bold text-secondary">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                initials(user)
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-semibold text-primary">{displayName(user)}</span>
              <span className="truncate text-body-sm text-primary/55">{user.email}</span>
            </span>
          </div>

          <div className="dxd-stagger p-2">
            <EnlacePerfil
              href={perfilHref}
              onClick={() => panel.close()}
              className="dxd-row flex items-center gap-3 rounded-lg px-3 py-2.5 text-body text-primary keyboard-focus-ring"
            >
              <IconUser className="h-4 w-4 shrink-0 text-primary/60" />
              Mi perfil
            </EnlacePerfil>

            {incidenciasUrl && (
              <button
                type="button"
                onClick={() => {
                  panel.close();
                  // El enlace se construye AL PULSAR, no al pintar: asi lleva
                  // la pantalla en la que se esta de verdad.
                  window.open(enlaceDeIncidencia(incidenciasUrl, appId, appNombre), "_blank", "noopener");
                }}
                className="dxd-row flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-body text-primary keyboard-focus-ring"
              >
                <IconFlag className="h-4 w-4 shrink-0 text-primary/60" />
                Reportar incidencia
              </button>
            )}

            <button
              type="button"
              onClick={signOut}
              className="dxd-row flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-body text-primary keyboard-focus-ring"
            >
              <IconLogout className="h-4 w-4 shrink-0 text-primary/60" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
