/**
 * Lo que el paquete ofrece a los modulos.
 *
 * Es la UNICA puerta: los modulos importan de "@dosxdos/ui" y nunca de una ruta
 * de dentro. Asi se puede mover un fichero aqui sin romper a nadie.
 */

// La cabecera compartida
export { AppHeader } from "./components/AppHeader";
export { AppsMenu } from "./components/AppsMenu";
export { UserMenu } from "./components/UserMenu";
export { Footer } from "./components/Footer";

// Piezas sueltas que los modulos tambien usan
export { ModuleIcon } from "./components/ModuleIcon";
export { RemoteIcon } from "./components/RemoteIcon";
export * from "./components/Icons";

// La sesion y el catalogo
export { SessionProvider } from "./contexts/SessionContext";
export { ModulesProvider } from "./contexts/ModulesContext";
export { useSession } from "./hooks/useSession";
export { useFotoDePerfil, avisarFotoCambiada, FOTO_CAMBIADA } from "./hooks/useFotoDePerfil";
export { useModules } from "./hooks/useModules";
export { LinkProvider, useLinkComponent } from "./contexts/LinkContext";
export type { LinkComponent } from "./contexts/LinkContext";

// El token
export {
  consumeTokenFromUrl,
  storeToken,
  readToken,
  clearToken,
  currentUser,
  withSessionToken,
  configureTokenStore,
  localStorageStore,
  sessionStorageStore,
  cookieStore,
} from "./utils/auth/session";
export type { TokenStore } from "./utils/auth/session";
export { decodeToken, toAuthenticatedUser, isExpired } from "./utils/auth/jwt";

// Ayudas de presentacion
export { visibleApps, displayName, initials } from "./utils/apps";
export { enlaceDeIncidencia } from "./utils/incidencias";
export {
  groupByCategory,
  shouldLabelGroups,
  conFavoritosDelante,
  FAVOURITES_KEY,
} from "./utils/categories";
export type { AppGroup } from "./utils/categories";
export { LEGAL_LINKS } from "./constants/legal";

// Las paginas legales: el texto, igual en todas; el marco lo pone cada aplicacion
export { AvisoLegalContent } from "./legal/AvisoLegalContent";
export { PoliticaPrivacidadContent } from "./legal/PoliticaPrivacidadContent";
export { LegalSection } from "./legal/LegalSection";
export { LEGAL_COMPANY, LEGAL_UPDATED_AT } from "./legal/constants";
export { todayLabel } from "./utils/fecha";
export {
  DEFAULT_CATEGORY,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "./constants/categories";

// Tipos
export type { PortalApp } from "./types/app";
export type { AuthenticatedUser, JwtPayload } from "./types/auth";
