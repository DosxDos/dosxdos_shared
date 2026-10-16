"use client";

import { createContext, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";

/** Lo que tiene que aceptar el enlace que ponga cada aplicacion. */
export type LinkComponent = ComponentType<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children: ReactNode }
>;

/** Un `<a>` de toda la vida: vale en cualquier aplicacion, recargando la pagina. */
function PlainLink({ href, children, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children: ReactNode }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

const LinkContext = createContext<LinkComponent>(PlainLink);

/**
 * El enlace que usa el paquete para ir a una pagina de LA MISMA aplicacion.
 *
 * El paquete no sabe si esta en Next o en Vite, y no debe: importar `next/link`
 * aqui rompe cualquier aplicacion Vite. Cada aplicacion le da el suyo —en Next,
 * `TransitionLink` de `@dosxdos/shared/next`; en Vite, el `Link` de su router— y sin
 * darle ninguno usa un `<a>` normal.
 */
export function LinkProvider({ component, children }: { component: LinkComponent; children: ReactNode }) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>;
}

export function useLinkComponent(): LinkComponent {
  return useContext(LinkContext);
}
