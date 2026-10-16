# @dosxdos/shared

> Se llamaba `@dosxdos/ui` hasta la 0.18.0: ya no es solo interfaz (sesion, foto, paginas legales). El repositorio era `dosxdos_ui`; GitHub redirige el nombre viejo.

> # ⚠️ ¿Has tocado algo aquí?
>
> **`git push` NO cambia nada en ninguna aplicación.** Cada una está clavada a
> una etiqueta y seguirá con la que tenía hasta que alguien la actualice.
>
> Para que tu cambio llegue a alguna parte:
>
> ```bash
> git commit -am "lo que sea"
> node publicar.mjs 0.4.0        # <- sube el número
> ```
>
> Eso etiqueta, empuja y reinstala en todas las aplicaciones. Luego revisa el
> `package.json` que ha cambiado en cada una y haz commit allí.
>
> **Si no lo haces, tu cambio existe solo en este repositorio y en tu cabeza.**

Lo que comparten los módulos de Dos por Dos: la cabecera, el pie y la sesión. Funciona igual en Next y en Vite: nada de lo que exporta `@dosxdos/shared` importa Next; lo único de Next vive en `@dosxdos/shared/next`.

Existe para que un cambio en el menú se haga **una sola vez**. Antes estos
ficheros vivían copiados en cada repositorio, con la regla de acordarse de
copiarlos a todos —y ya habían empezado a separarse: `UserMenu` era distinto en
el portal y en logística sin que nadie lo hubiera decidido.

Para entender el sistema entero —el acceso compartido, el token, los
subdominios— está `ARQUITECTURA.md`, en la raíz de cualquiera de los módulos.

---

## Qué hay dentro

| Pieza | Qué es |
|---|---|
| `AppHeader` | La barra superior entera: logotipo, nombre de la aplicación, fecha, menú y cuenta. `appName`, `perfilHref` y, fuera del portal, `portalUrl`. |
| `AppsMenu` | El menú de aplicaciones. Se pinta con lo que sirve `/api/modules`. |
| `UserMenu` | La cuenta: nombre, perfil y cerrar sesión. |
| `Footer` | La firma y los enlaces legales. Con `legalBaseUrl` (la dirección del portal) enlaza a las páginas legales del portal, para las aplicaciones que no tienen las suyas. Con `center`, un contenido opcional en medio de la fila (p. ej. el crédito de una colaboración): columna central desde `xl`, línea propia al final por debajo. |
| `AvisoLegalContent` / `PoliticaPrivacidadContent` | El texto de las páginas legales, igual en todas las aplicaciones. Cada una lo mete en su propia página. |
| `LinkProvider` | Le da al paquete el enlace de la aplicación para sus páginas internas. Sin él, un `<a>` normal. |
| `@dosxdos/shared/next` → `TransitionLink` | Solo Next: el enlace con el router de Next. Se le pasa a `LinkProvider`. |
| `Icons` | Los iconos del proyecto. Cambiar de librería es tocar un fichero. |
| `ModuleIcon` / `RemoteIcon` | El icono de un módulo, que llega como SVG desde la base de datos. |
| `SessionProvider` / `useSession` | Quién eres. Lee el token y redirige si no hay. |
| `ModulesProvider` / `useModules` | El catálogo de aplicaciones, pedido una sola vez. |
| `utils/auth/*` | Leer, guardar y descodificar el token. `configureTokenStore(localStorageStore("clave") \| sessionStorageStore(...) \| cookieStore(...))` al arrancar, si la aplicación guarda su token en otro sitio. |

Todo se importa de `"@dosxdos/shared"`, **nunca** de una ruta interna: así se puede
mover un fichero aquí dentro sin romper a nadie.

---

## Instalar

```bash
npm install github:DosxDos/dosxdos_shared#v0.4.0
```

Se fija una **etiqueta**, no una rama. Con `#main`, cualquier `npm install` se
traería lo último y una aplicación podría cambiar de menú sin que nadie la
hubiera tocado.

> **No lo instales con `file:../dosxdos_shared`.** npm crea un enlace simbólico y
> Turbopack no resuelve paquetes a través de uno: el build falla con
> `Module not found: Can't resolve '@dosxdos/shared'` aunque el paquete esté
> perfectamente. Costó un rato averiguarlo. Desde GitHub se instala como una
> carpeta de verdad y funciona.

---

## Los cuatro pasos en cada aplicación

### 1. Transpilarlo

El paquete viaja como TypeScript **sin compilar**, y Next no toca `node_modules`
por defecto:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@dosxdos/shared"],
};
```

Es a propósito: publicarlo compilado obliga a un paso de build y a versionar
artefactos, y para tres aplicaciones que comparten cuatro componentes no
compensa. El precio es esta línea.

### 2. Que Tailwind mire dentro, y traerse los estilos

Dos lineas en `globals.css`. Sin la primera los componentes llegan con el HTML
correcto y **ninguna regla que los pinte** —un menu sin estilos, que parece que
se ha roto el CSS entero—:

```css
@import "tailwindcss";

@source "./node_modules/@dosxdos/shared/src";
@import "@dosxdos/shared/styles.css";

@import "./styles/theme.css";   /* los tuyos, DESPUES */
```

**La ruta del `@source` es relativa al fichero CSS**, y `globals.css` esta en la
raiz del proyecto: es `./node_modules`, no `../node_modules`. Con la de mas se
apunta fuera del proyecto, a una carpeta que no existe —y Tailwind no dice
nada—: escanea cero ficheros, purga todas las clases del paquete y los
componentes salen con el HTML correcto y sin un solo estilo. Paso.

`@dosxdos/shared/styles.css` trae los colores de la marca y las clases que usan sus
componentes (`.text-body`, `.text-label`, `.keyboard-focus-ring`, `.sr-only`),
para que el paquete se pinte aunque la aplicacion no haya definido nada.

**El orden importa y es todo el truco:** lo del paquete va primero y lo de la
aplicacion despues, asi que si un modulo define sus propios colores, ganan los
suyos por llegar los ultimos. Comprobado: con el paquete puesto en rojo y el
portal en berenjena, el CSS compilado sale berenjena.

Las clases van ademas con `:where()`, que tiene especificidad CERO: una
aplicacion puede redefinir `.text-body` a su manera sin pelear con nada ni
recurrir a `!important`.

### 3. Si la aplicacion va en Docker: git y HTTPS

El paquete no viene de npm, viene de GitHub. La imagen de node no trae `git`, y
npm falla con `spawn git ENOENT` —que no dice en ningun sitio que lo que falta
sea git—. Ademas hay que forzar HTTPS:

```dockerfile
RUN apk add --no-cache git

# npm reescribe la URL a git+ssh:// cuando quien hace `npm install` tiene llave
# de GitHub (un portatil), y eso queda escrito en el package-lock. Dentro del
# build no hay llave, y ssh SIEMPRE pide una aunque el repositorio sea publico.
RUN git config --global url."https://github.com/".insteadOf "git@github.com:" \
 && git config --global url."https://github.com/".insteadOf "git+ssh://git@github.com/" \
 && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
```

Va ANTES del `npm install`. El repositorio del paquete es publico justamente
para que esto funcione sin credenciales ni secretos que rotar.

### 4. Montar los proveedores

Reciben lo que el paquete no puede saber:

```tsx
// components/layout/Providers.tsx
import { SessionProvider, ModulesProvider } from "@dosxdos/shared";
import { appConfig } from "@/config/app.config";
import { fetchModules } from "@/services/modules-service";

<SessionProvider siteUrl={appConfig.siteUrl} authUrl={appConfig.authUrl}>
  <ModulesProvider fetchModules={fetchModules}>
    {children}
  </ModulesProvider>
</SessionProvider>
```

**`fetchModules` lo pone cada aplicación** porque pide el catálogo a SU propio
origen (`/api/modules`), y ese route handler se lo pide por dentro al portal.
Ese rodeo evita CORS: el portal no lleva lista de orígenes permitidos y un
módulo nuevo no obliga a redesplegarlo.

### Lo que ya no hace falta

Antes esto pedia que la aplicacion definiera ciertos tokens y clases, y si
faltaba alguno el menu salia sin pintar sin que nada lo dijera. Ya no: van en
`@dosxdos/shared/styles.css` con valores de respaldo. Definir los tuyos sigue
siendo lo normal —y siguen ganando—, pero ahora es una opcion, no un requisito.

---

## El menú de usuario y la URL del perfil

Es la única diferencia de verdad entre el portal y los demás módulos, y por eso
viaja como prop:

```tsx
// En el PORTAL: el perfil es una ruta suya
<UserMenu perfilHref="/perfil" />

// Desde CUALQUIER OTRO módulo: la URL del portal, con el token pegado
<UserMenu perfilHref={withSessionToken(`${appConfig.portalUrl}/perfil`)} />
```

La sesión se guarda **por origen**. Sin llevarse el token, el portal no tendría
ninguna y rebotaría a la pantalla de acceso: parecería que el enlace del perfil
está roto.

`EnlacePerfil` decide solo qué tipo de enlace usar mirando el href: una ruta que
empieza por `/` navega por dentro con `TransitionLink`, y una URL absoluta sale
con un `<a>` normal, porque el router de Next no cambia de origen.

---

## Reexportar en vez de reescribir imports

Al migrar una aplicación no hace falta tocar los cuarenta ficheros que importan
`@/hooks/useSession`. Basta con que ese fichero reexporte:

```ts
// hooks/useSession.ts
export { useSession } from "@dosxdos/shared";
```

**Importarlo del sitio equivocado no da error, da un fallo silencioso.** React
compara los contextos por identidad: si un componente lee el contexto local y el
proveedor montado es el del paquete, el hook dirá que no hay sesión y la
pantalla se quedará vacía sin que nada falle por ninguna parte.

---

## Publicar un cambio

```bash
git commit -am "lo que sea"
node publicar.mjs 0.3.0
```

El script sube la versión, etiqueta, empuja, y hace el `npm install` en todas
las aplicaciones.

**No hay ninguna lista que mantener.** Busca en las carpetas hermanas de esta y
actualiza a quien tenga `@dosxdos/shared` en sus dependencias. Un módulo nuevo entra
solo en cuanto lo instala; uno que deje de usarlo se cae solo de la lista. Una
lista escrita a mano sería una cosa más que actualizar al crear un módulo, y
justo la que nadie recuerda.

Requisito: que las aplicaciones estén como **carpetas hermanas** del paquete.

```
Desktop/dosxdos/
  dosxdos_shared/      <- aqui
  dosxdos_portal/
  dosxdos_logistica/
  dosxdos_tuapp/       <- entra solo
```

**No despliega nada.** Deja los cambios en el árbol de cada aplicación para que
se miren y se prueben antes de commitear. Un menú no debería llegar a producción
sin que nadie lo haya visto.

Se niega a publicar con cambios sin guardar —una etiqueta que no corresponde a
ningún commit es imposible de rastrear después— y a reutilizar una etiqueta que
ya existe, porque entonces dos aplicaciones con la misma versión tendrían código
distinto.

### ¿Y por qué no se actualiza solo?

Se puede: basta con apuntar a la rama en vez de a una etiqueta.

```json
"@dosxdos/shared": "github:DosxDos/dosxdos_shared#main"
```

**No lo hagas.** El despliegue hace `docker compose build`, que reinstala las
dependencias: desplegar logística se llevaría a producción lo último que
hubiera en el paquete, terminado o no. Un menú cambiando en producción porque
alguien desplegó otra aplicación es una tarde perdida.

La etiqueta es lo que hace que cada aplicación cambie **cuando tú decides**.

---

## Qué NO meter aquí

- **Nada que lea `@/config/app.config`.** Si el paquete necesita saber una URL,
  llega como prop. En cuanto importe la configuración de una aplicación, deja de
  ser compartido.
- **Nada de una sola aplicación.** Un componente que solo usa el portal vive en
  el portal, aunque sea "por si acaso".
- **Nada con estado de negocio.** Esto son piezas de interfaz y la sesión. Los
  datos los pide cada aplicación.

---

## Cuando algo no va

| Síntoma | Casi siempre es |
|---|---|
| `Module not found: Can't resolve '@dosxdos/shared'` | Instalado con `file:` o `npm link`: es un symlink y Turbopack no lo resuelve. Instálalo desde GitHub. |
| El menú sale sin estilos | Falta el `@source`, o apunta mal: es `./node_modules`, relativo a `globals.css`. Tailwind no avisa, simplemente no escanea nada. |
| `useSession necesita estar dentro de SessionProvider` | Un componente lee el contexto local y el proveedor es el del paquete (o al revés). Reexporta, no dupliques. |
| El menú sale vacío | El portal no responde: `curl localhost:3001/api/modules`. |
| «Mi perfil» rebota al acceso | Falta el token en `perfilHref`: usa `withSessionToken()`. |
| Cambio algo aquí y la aplicación no se entera | Sigue con la etiqueta antigua. Etiqueta y reinstala. |
| `spawn git ENOENT` al construir en Docker | Falta `apk add git` en el Dockerfile (paso 3). |
| `Permission denied (publickey)` al construir | El lock trae `git+ssh://` y dentro del build no hay llave. Fuerza HTTPS con los `git config` del paso 3. |
| Los colores del paquete pisan a los míos | `theme.css` se importa ANTES que `@dosxdos/shared/styles.css`. Va después. |
