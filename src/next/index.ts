/**
 * Lo que SOLO sirve en Next: el enlace que navega con el router de Next.
 *
 * Vive aparte para que `@dosxdos/shared` no importe nada de Next y funcione igual
 * en una aplicacion Vite. Las aplicaciones Next lo importan de aqui y se lo dan
 * al paquete con `LinkProvider`, para que el menu navegue sin recargar.
 */
export { TransitionLink } from "./TransitionLink";
