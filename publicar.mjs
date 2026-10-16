import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * Publica una version del paquete y la instala en todas las aplicaciones.
 *
 * Compartir de verdad tiene un precio: hasta que cada aplicacion no reinstala,
 * sigue con la version que tenia. Es a proposito —nadie cambia de menu por
 * sorpresa al desplegar otra cosa— pero son tres `npm install` que se olvidan.
 * Esto los hace de una vez.
 *
 *   node publicar.mjs 0.3.0
 *
 * NO despliega nada: dejar los cambios en el arbol de cada aplicacion es
 * deliberado. Asi se pueden mirar, probar en local y commitear cuando toque, en
 * vez de que un menu llegue a produccion sin que nadie lo haya visto.
 */
const AQUI = dirname(fileURLToPath(import.meta.url));

/**
 * El paquete se llamo `@dosxdos/ui` hasta la 0.18.0. Una aplicacion que todavia
 * lo tenga con el nombre viejo tambien se actualiza, y se le quita ese nombre.
 */
const NOMBRES = ["@dosxdos/shared", "@dosxdos/ui"];

/**
 * Las aplicaciones se BUSCAN, no se escriben aqui.
 *
 * Una lista a mano es una cosa mas que actualizar al crear un modulo, y la que
 * nadie recuerda: el modulo nuevo se quedaria con la version vieja del menu sin
 * que nada avisara. Se mira en las carpetas hermanas y se coge a quien tenga
 * `@dosxdos/shared` (o el nombre viejo, `@dosxdos/ui`) entre sus dependencias,
 * que es la definicion exacta de "esto
 * hay que actualizarlo".
 */
function buscarAplicaciones() {
  const raiz = resolve(AQUI, "..");

  return readdirSync(raiz, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && entrada.name !== basename(AQUI))
    .map((entrada) => resolve(raiz, entrada.name))
    .filter((ruta) => {
      const manifiesto = resolve(ruta, "package.json");
      if (!existsSync(manifiesto)) return false;

      try {
        const paquete = JSON.parse(readFileSync(manifiesto, "utf8"));
        return NOMBRES.some((nombre) => Boolean(paquete.dependencies?.[nombre]));
      } catch {
        // Un package.json ilegible no es asunto de este script.
        return false;
      }
    });
}

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Uso: node publicar.mjs <version>   (por ejemplo 0.3.0)");
  process.exit(1);
}

const sh = (cmd, cwd = AQUI) =>
  execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

// Nada a medias: publicar con cambios sin guardar deja una etiqueta que no
// corresponde a ningun commit y es imposible saber despues que se publico.
const sucio = sh("git status --porcelain");
if (sucio) {
  console.error("Hay cambios sin guardar. Haz commit antes de publicar:\n" + sucio);
  process.exit(1);
}

const etiqueta = `v${version}`;

if (sh("git tag").split("\n").includes(etiqueta)) {
  console.error(
    `La etiqueta ${etiqueta} ya existe.\n` +
      "Mover una etiqueta publicada hace que dos aplicaciones con la misma " +
      "version tengan codigo distinto. Sube el numero."
  );
  process.exit(1);
}

// 1. La version en package.json y la etiqueta, juntas.
const manifiesto = resolve(AQUI, "package.json");
const paquete = JSON.parse(readFileSync(manifiesto, "utf8"));
paquete.version = version;
writeFileSync(manifiesto, JSON.stringify(paquete, null, 2) + "\n");

sh("git add package.json");
sh(`git commit -m "v${version}"`);
sh(`git tag -a ${etiqueta} -m "v${version}"`);
sh("git push origin main --tags");
console.log(`· publicado ${etiqueta}`);

// 2. Y a cada aplicacion que este al lado.
const destino = `github:DosxDos/dosxdos_shared#${etiqueta}`;
const aplicaciones = buscarAplicaciones();

if (aplicaciones.length === 0) {
  console.log(
    "· ninguna aplicacion al lado usa el paquete todavia, no hay nada que actualizar"
  );
}

const fallos = [];

for (const ruta of aplicaciones) {
  const nombre = ruta.split("/").pop();

  try {
    sh(`npm install @dosxdos/shared@${destino}`, ruta);
    const suyo = JSON.parse(readFileSync(resolve(ruta, "package.json"), "utf8"));
    if (suyo.dependencies?.["@dosxdos/ui"]) sh("npm uninstall @dosxdos/ui", ruta);
    console.log(`· ${nombre}: actualizado`);
  } catch (error) {
    fallos.push(nombre);
    console.error(`· ${nombre}: FALLO -> ${error.message.split("\n")[0]}`);
  }
}

console.log(`
Listo. En cada aplicacion han cambiado package.json y package-lock.json.
Miralas, pruebalas y haz commit cuando estes conforme.`);

// Salir con error si alguna se quedo atras: una aplicacion con la version
// vieja y sin avisar es justo lo que este script existe para evitar.
if (fallos.length > 0) {
  console.error(`\nSe quedaron sin actualizar: ${fallos.join(", ")}`);
  process.exit(1);
}
