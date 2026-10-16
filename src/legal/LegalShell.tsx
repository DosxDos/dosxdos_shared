"use client";

import type { MouseEvent, ReactNode } from "react";
import { useLinkComponent } from "../contexts/LinkContext";
import { IconBack } from "../components/Icons";

/**
 * El marco de las paginas legales, el mismo en todas las aplicaciones.
 *
 * Antes cada aplicacion tenia su copia, identica salvo por la cabecera. Ahora
 * la cabecera llega como `header` y lo demas vive aqui, para que no se separen.
 * El enlace de vuelta usa el de la aplicacion (`LinkProvider`), asi en Next
 * navega sin recargar.
 */
export function LegalShell({
  title,
  updatedAt,
  header,
  children,
}: {
  title: string;
  /** Fecha de la ultima revision, visible: una politica sin fecha no vale. */
  updatedAt: string;
  /** La cabecera de la aplicacion. */
  header: ReactNode;
  children: ReactNode;
}) {
  const Link = useLinkComponent();

  const saltarAlContenido = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById("main-content");
    if (!target) return;

    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <a
        href="#main-content"
        onClick={saltarAlContenido}
        className="sr-only focus:not-sr-only fixed top-4 left-4 z-toast bg-primary text-onink px-4 py-3 rounded-md text-body keyboard-focus-ring"
      >
        Saltar al contenido
      </a>

      <div className="flex min-h-screen flex-col bg-secondary">
        {header}

        <main id="main-content" className="flex-1 outline-none">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-5 pb-16 pt-8 md:px-10 lg:px-16">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 text-body text-primary hover:underline keyboard-focus-ring"
            >
              <IconBack className="h-4 w-4 shrink-0" />
              Volver al portal
            </Link>

            <div className="rounded-2xl border border-primary/10 bg-white/95 p-6 shadow-lg backdrop-blur-sm md:p-8">
              <h1 className="title-page text-primary">{title}</h1>
              <p className="mt-2 text-body text-primary/60">
                Última actualización: {updatedAt}
              </p>
            </div>

            {children}
          </div>
        </main>
      </div>
    </>
  );
}
