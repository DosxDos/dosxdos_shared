"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
}

/**
 * El boton del menu: tres barras que se convierten en una cruz al abrir.
 *
 * Dibujadas con CSS (`.dxd-burger` en styles.css) y no con dos iconos que se
 * cambian: el cambio de golpe entre la hamburguesa y la X es lo primero que
 * delata un menu hecho deprisa.
 */
export const MenuToggle = forwardRef<HTMLButtonElement, Props>(function MenuToggle({ open, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={`dxd-control group flex h-11 w-11 md:h-14 md:w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary keyboard-focus-ring-inverse ${className}`}
    >
      <span aria-hidden="true" className="dxd-burger" data-open={open ? "" : undefined}>
        <span />
        <span />
        <span />
      </span>
    </button>
  );
});
