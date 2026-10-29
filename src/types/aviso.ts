/**
 * Un aviso del historial de la campana, tal y como lo sirve el portal en
 * `/api/avisos`. Viene de cualquier modulo (reloj, gastos, logistica,
 * incidencias...) y se queda aunque el modulo deje de darlo.
 */
export interface AvisoDelHistorial {
  /** El id de la fila en el portal: es el que se manda al marcarlo leido. */
  id: string;
  /** El id del modulo en el catalogo ("reloj-laboral", "gastos"...). */
  modulo: string;
  /** Su nombre, para la etiqueta del aviso. */
  moduloNombre: string;
  texto: string;
  detalle: string | null;
  /** "aviso" se pinta en rojo, y el rojo es solo para incidencias. */
  tono: "normal" | "aviso";
  /** A donde lleva: la direccion completa dentro de su modulo. */
  url: string;
  /** ISO 8601, en UTC. */
  fecha: string;
  leido: boolean;
}

/** Una pagina del historial, con el recuento de lo que queda sin leer. */
export interface PaginaDeAvisos {
  avisos: AvisoDelHistorial[];
  hayMas: boolean;
  sinLeer: number;
  /** Si entre lo no leido hay alguno rojo: la chapa se pinta en rojo. */
  hayAvisoRojo: boolean;
}
