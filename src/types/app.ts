/** An application a person can open from the portal. */
export interface PortalApp {
  /** Stable key. Used for React keys and analytics, never shown. */
  id: string;
  name: string;
  /** One line explaining what it is for. */
  description: string;
  url: string;
  /** La clave del icono. El SVG lo resuelve el servidor, no el navegador. */
  icon: string;
  /** El icono ya resuelto, tal y como llega de /api/modules. */
  iconSvg?: import("./icon").SerializedIcon | null;
  /**
   * La seccion en la que se agrupa la tarjeta.
   *
   * Texto libre a proposito: las secciones que se pintan salen de lo que haya
   * en la tabla, asi que añadir una es escribirla en el panel, sin desplegar.
   * `constants/categories.ts` solo pone el titulo y el orden de las conocidas.
   */
  category?: string;
  /**
   * Roles allowed to see it. Empty means NOBODY sees it.
   *
   * Cerrado por defecto a proposito: cuando vacio significaba "todo el mundo",
   * un modulo recien creado y todavia sin permisos lo veia la empresa entera.
   * No uses ROLE_USER para "que lo vean todos" — lo tiene toda cuenta, asi que
   * equivale a no poner ninguno. Dale a cada modulo su propio rol.
   *
   * This is presentation only: hiding a card is not access control. Every app
   * checks the token's roles itself, because a hidden link is still typeable.
   */
  roles?: string[];
  /** Shown as "próximamente" and not clickable. */
  comingSoon?: boolean;
  /**
   * Una herramienta de fuera (Notion, Zoho…): se abre en pestaña nueva y SIN
   * nuestro token, que su JavaScript leería del `#token=` sin esfuerzo.
   */
  externa?: boolean;
  /**
   * El orden en que sale dentro de su seccion. Menor, mas arriba.
   *
   * Viaja al cliente para que editar un modulo pueda conservarlo. Cuando no lo
   * hacia, el formulario lo reenviaba como 0 y cada edicion recolocaba el
   * portal entero sin que nadie lo hubiera pedido.
   */
  position?: number;
}
