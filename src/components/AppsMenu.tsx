"use client";

import { visibleApps } from "../utils/apps";
import { groupByCategory, shouldLabelGroups } from "../utils/categories";
import { useSession } from "../hooks/useSession";
import { useModules } from "../hooks/useModules";
import { usePanel } from "../hooks/usePanel";
import { useBodyLock } from "../hooks/useBodyLock";
import { useLinkComponent } from "../contexts/LinkContext";
import { withSessionToken } from "../utils/auth/session";
import { ModuleIcon } from "./ModuleIcon";
import { MenuToggle } from "./MenuToggle";
import { enlaceDeIncidencia } from "../utils/incidencias";
import { IconAlert, IconClock, IconExternal } from "./Icons";

/**
 * El menu de aplicaciones que abre el boton de la barra.
 *
 * En escritorio, un panel bajo el boton con las aplicaciones en filas ligeras
 * (icono pequeño, nombre y una linea de descripcion), agrupadas por categoria
 * y en tres columnas. Antes eran baldosas rellenas con la descripcion en dos
 * lineas: pesaban, y con catorce aplicaciones el panel se salia de la
 * pantalla. Ahora tiene alto maximo y se desplaza por dentro. En
 * movil no cabe un panel flotante: es una hoja que sube desde abajo, a
 * pantalla casi completa, con el fondo oscurecido.
 *
 * Entra y sale con animacion (styles.css: `dxd-pop`, `dxd-sheet`), y las
 * baldosas llegan en cascada. Se cierra al pulsar fuera, con Escape y al
 * elegir una aplicacion.
 */
export function AppsMenu({ appId, appNombre }: {
  /** La aplicación desde la que se abre: «Reportar incidencia» la lleva ya puesta. */
  appId?: string;
  appNombre?: string;
} = {}) {
  const Link = useLinkComponent();
  const { user } = useSession();
  const { modules } = useModules();
  const panel = usePanel<HTMLDivElement, HTMLButtonElement>();
  // Solo en movil hace falta bloquear la pagina: la hoja la tapa entera.
  useBodyLock(panel.isOpen && typeof window !== "undefined" && window.innerWidth < 768);

  if (!user) return null;

  const visibles = visibleApps(modules, user);
  // Las herramientas de fuera van aparte y al final: no son aplicaciones
  // nuestras, se abren en otra pestaña y nunca llevan el token.
  const externas = visibles
    .filter((app) => app.externa === true && !app.comingSoon)
    .sort((x, y) => x.name.localeCompare(y.name, "es"));
  const groups = groupByCategory(visibles.filter((app) => app.externa !== true));
  // Las acciones rápidas del portal, también aquí y encima de las aplicaciones:
  // cosas que se HACEN sin ir a buscar el módulo. Cada una sale solo si quien
  // la ve tiene ese módulo.
  const reloj = visibles.find((app) => app.id === "reloj-laboral" && !app.comingSoon);
  const incidencias = visibles.find((app) => app.id === "incidencias" && !app.comingSoon);
  const withLabels = shouldLabelGroups(groups) || externas.length > 0;

  return (
    <div ref={panel.containerRef} className="md:relative">
      <MenuToggle
        ref={panel.triggerRef}
        open={panel.isOpen}
        onClick={panel.toggle}
        aria-expanded={panel.isOpen}
        aria-controls="apps-menu"
        aria-label={panel.isOpen ? "Cerrar el menú" : "Abrir el menú de aplicaciones"}
      />

      {panel.isMounted && (
        <>
          {/* El fondo oscurecido, solo en movil: en escritorio el panel es un
              desplegable y la pagina sigue a la vista. */}
          <div
            aria-hidden="true"
            data-closing={panel.isClosing ? "" : undefined}
            className="dxd-scrim fixed inset-0 z-dropdown bg-primary/50 backdrop-blur-[2px] md:hidden"
          />
          <div
            id="apps-menu"
            role="dialog"
            aria-label="Aplicaciones"
            data-closing={panel.isClosing ? "" : undefined}
            data-lenis-prevent
            className="dxd-sheet fixed inset-x-0 bottom-0 z-dropdown flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-2xl md:dxd-pop md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-[calc(100%+0.75rem)] md:max-h-[calc(100dvh-9rem)] md:w-[min(92vw,54rem)] md:origin-top-right md:rounded-xl md:shadow-[0_24px_60px_-20px_rgba(40,21,40,0.45)] md:ring-1 md:ring-primary/8"
          >
            {/* El asa de la hoja, solo en movil: dice "esto se puede cerrar". */}
            <div className="flex items-center justify-between px-5 pb-1 pt-3 md:hidden">
              <span aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-full bg-primary/15" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2 md:hidden">
              <p className="title-section text-primary">Aplicaciones</p>
              <button
                type="button"
                onClick={() => panel.close(true)}
                aria-label="Cerrar"
                className="dxd-control flex h-10 w-10 items-center justify-center rounded-full bg-primary/6 text-primary keyboard-focus-ring"
              >
                <span aria-hidden="true" className="dxd-burger" data-open="">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>

            <div className="dxd-stagger flex min-h-0 flex-col gap-5 overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 md:p-4">
              {(reloj || incidencias) && (
              // Botones, no filas: son cosas que se HACEN, no sitios a los que ir.
              <section aria-labelledby="menu-acciones" className="flex flex-col gap-2.5">
                <h3 id="menu-acciones" className="px-3 pt-1 text-label text-primary/45">Acciones rápidas</h3>
                <div className="flex flex-wrap gap-2 px-3">
                  {reloj && (
                    <Link href={withSessionToken(reloj.url)} onClick={() => panel.close()} className="keyboard-focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-body font-medium text-primary ring-1 ring-primary/15 transition-colors duration-150 hover:bg-primary hover:text-white">
                      <IconClock className="h-[1.1rem] w-[1.1rem] shrink-0" />
                      Fichar jornada
                    </Link>
                  )}
                  {incidencias && (
                    <Link href={enlaceDeIncidencia(incidencias.url, appId, appNombre)} onClick={() => panel.close()} className="keyboard-focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-body font-medium text-primary ring-1 ring-primary/15 transition-colors duration-150 hover:bg-primary hover:text-white">
                      <IconAlert className="h-[1.1rem] w-[1.1rem] shrink-0" />
                      Reportar incidencia
                    </Link>
                  )}
                </div>
              </section>
              )}

              {groups.map((group) => (
                <section key={group.key} aria-labelledby={`menu-${group.key}`} className="flex flex-col gap-1.5">
                  <h3 id={`menu-${group.key}`} className={withLabels ? "px-3 pt-1 text-label text-primary/45" : "sr-only"}>
                    {group.label}
                  </h3>

                  <ul className="grid grid-cols-1 gap-0.5 md:grid-cols-2 lg:grid-cols-3">
                    {/* Por orden alfabético dentro de cada sección: en el menú se
                        busca un nombre, no el orden del portal. */}
                    {[...group.apps].sort((x, y) => x.name.localeCompare(y.name, "es")).map((app) => {
                      if (app.comingSoon) {
                        return (
                          <li key={app.id}>
                            <div
                              aria-label={`${app.name}, próximamente`}
                              className="flex h-full items-center gap-3 rounded-lg p-3 opacity-55"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/5">
                                <ModuleIcon app={app} className="h-[1.1rem] w-[1.1rem] text-primary/60" />
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate text-body font-medium text-primary/70">{app.name}</span>
                                <span className="truncate text-body-sm text-primary/45">Próximamente</span>
                              </span>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li key={app.id}>
                          <Link
                            href={withSessionToken(app.url)}
                            onClick={() => panel.close()}
                            className="dxd-tile group flex h-full items-center gap-3 rounded-lg p-3 text-left keyboard-focus-ring"
                          >
                            <span className="dxd-tile-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
                              <ModuleIcon app={app} className="h-[1.1rem] w-[1.1rem]" />
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-body font-medium text-primary">{app.name}</span>
                              {app.description && (
                                <span className="truncate text-body-sm text-primary/50">{app.description}</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              {externas.length > 0 && (
                <section aria-labelledby="menu-externas" className="flex flex-col gap-1.5">
                  <h3 id="menu-externas" className="px-3 pt-1 text-label text-primary/45">Herramientas externas</h3>
                  <ul className="grid grid-cols-1 gap-0.5 md:grid-cols-2 lg:grid-cols-3">
                    {externas.map((app) => (
                      <li key={app.id}>
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => panel.close()}
                          aria-label={`${app.name} (se abre en una pestaña nueva)`}
                          className="dxd-tile group flex h-full items-center gap-3 rounded-lg p-3 text-left keyboard-focus-ring"
                        >
                          <span className="dxd-tile-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
                            <ModuleIcon app={app} className="h-[1.1rem] w-[1.1rem]" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-body font-medium text-primary">{app.name}</span>
                            {app.description && (
                              <span className="truncate text-body-sm text-primary/50">{app.description}</span>
                            )}
                          </span>
                          <IconExternal className="h-4 w-4 shrink-0 text-primary/40" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
