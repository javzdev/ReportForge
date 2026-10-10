# ReportForge Local

Aplicación de escritorio **100% local y sin conexión** para redactar, organizar y exportar
reportes de evaluaciones de seguridad **autorizadas** (pentest, revisiones de configuración,
análisis de vulnerabilidades, etc.).

> **Importante**: esta aplicación NO ejecuta escaneos, ataques ni pruebas contra sistemas.
> Es exclusivamente un gestor y editor de documentación que el usuario redacta manualmente.

## Principios de privacidad

- Sin conexión a internet requerida para funcionar.
- Sin cuentas, sin inicio de sesión, sin roles de usuario.
- Sin sincronización en la nube, sin servicios externos, sin IA, sin telemetría ni analítica.
- Todos los datos (proyectos, reportes, hallazgos, evidencias, respaldos) se guardan
  únicamente en el dispositivo del usuario.
- **Los datos NO están cifrados en esta versión.** Ver [docs/PRIVACIDAD.md](docs/PRIVACIDAD.md)
  para el detalle completo de qué protege la aplicación y qué depende del usuario/sistema operativo.

## Requisitos

- Node.js 18 o superior (probado con Node 22).
- Windows, macOS o Linux (desarrollado y probado en Windows).

## Instalación

```bash
npm install
```

`npm install` reconstruye automáticamente el módulo nativo `better-sqlite3` contra el ABI
de Electron (vía el hook `postinstall` → `electron-builder install-app-deps`), que es lo
que necesitan `npm run dev`, `npm run start` y `npm run package:win`.

### Nota importante sobre el módulo nativo `better-sqlite3`

`better-sqlite3` es un módulo nativo compilado para una versión concreta de Node (ABI).
Electron embebe su propio runtime de Node con un ABI distinto al de un Node.js "normal"
instalado en el sistema. Esto significa que el mismo `node_modules/better-sqlite3` **no
sirve simultáneamente** para ejecutar Vitest (que corre bajo Node del sistema) y para
ejecutar la app empaquetada en Electron:

- Para **correr o compilar la app** (`npm run dev`, `npm start`, `npm run package:win`):
  el módulo debe estar compilado para Electron. Esto ya ocurre automáticamente tras
  `npm install`. Si cambias de rama o reinstalas dependencias, puedes forzarlo con:
  ```bash
  npm run rebuild:electron
  ```
- Para **correr las pruebas** (`npm test`): el módulo debe estar compilado para el Node
  del sistema. Si acabas de correr la app y ahora las pruebas fallan con un error de
  `NODE_MODULE_VERSION`, ejecuta:
  ```bash
  npm run rebuild:node
  ```

Si ves un error como `was compiled against a different Node.js version using
NODE_MODULE_VERSION ...`, es exactamente este problema: ejecuta el script `rebuild:*`
correspondiente a lo que intentas correr.

### Nota sobre el preload y `sandbox: true`

La ventana principal se crea con `sandbox: true` (ver `src/main/index.ts`) para minimizar lo
que el proceso de preload puede hacer. Una consecuencia poco documentada de esto es que,
dentro de ese modo, Electron ejecuta el script de preload con un `require()` muy restringido
que **no puede resolver módulos propios del proyecto** (como `../shared/ipcChannels`), solo
el módulo `electron` en sí. Por eso el preload se compila por separado con **esbuild**
(`scripts/build-preload.js`) como un único archivo autocontenido (`dist/preload/index.js`)
que incluye inline todo lo que importa de `src/shared`, en vez of compilarse con `tsc` como
el resto del proceso principal. Si ves en DevTools un error como `Unable to load preload
script` seguido de `module not found: ../shared/...`, significa que `dist/preload/index.js`
quedó generado por `tsc` en vez de por `npm run build:preload` — ejecuta `npm run build` (o
`npm run dev`, que ya incluye el watcher de preload) para regenerarlo correctamente.

## Ejecutar en modo desarrollo

```bash
npm run dev
```

Esto levanta Vite (renderer con hot-reload), compila el proceso principal en modo watch,
y lanza Electron apuntando al servidor de desarrollo local.

## Ejecutar pruebas

```bash
npm test
```

Ejecuta la suite completa con Vitest: pruebas de repositorios (proyectos, plantillas,
reportes, hallazgos), validación y almacenamiento de adjuntos, y creación/validación/
importación de respaldos.

## Verificación de tipos

```bash
npm run typecheck
```

## Compilar para producción (sin empaquetar instalador)

```bash
npm run build
```

Genera `dist/renderer` (UI compilada) y `dist/main` (proceso principal compilado).

## Generar instalador de Windows

```bash
npm run package:win
```

Genera un instalador `.exe` (NSIS) en `dist-electron-builder/`. No requiere ni configura
ningún servicio de actualización remota (`publish: null` en la configuración de
electron-builder).

## Dónde se guardan los datos

- **Base de datos** (proyectos, plantillas, reportes, hallazgos, metadatos de evidencias):
  un único archivo SQLite en la carpeta de datos de usuario de Electron
  (`app.getPath('userData')`). En Windows: `%APPDATA%\ReportForge Local\reportforge.db`.
- **Evidencias/adjuntos**: subcarpeta `evidence/<id-del-proyecto>/` dentro de esa misma
  carpeta de datos de usuario.
- **Respaldos**: archivos `.json` que el usuario exporta explícitamente a la ubicación que
  elija mediante el diálogo nativo de guardado del sistema operativo.

La aplicación muestra esta misma información dentro de la pantalla de Configuración /
Privacidad, obtenida en tiempo real (no es un valor hardcodeado en la documentación).

## Estructura del proyecto

```
src/
  main/        proceso principal de Electron: ventana, IPC, almacenamiento de adjuntos,
               backups, plantillas incorporadas, datos de demostración
  preload/     API mínima y tipada expuesta al renderer vía contextBridge
  renderer/    interfaz de usuario en React
  shared/      tipos TypeScript y definición de canales IPC compartidos entre procesos
  db/          esquema SQL y repositorios de acceso a datos
  export/      generación del HTML del reporte y exportación a PDF
tests/
  unit/        pruebas de lógica pura (validación/sanitización de adjuntos)
  integration/ pruebas de repositorios y flujos de backup contra una base SQLite real
docs/          documentación de privacidad, decisiones técnicas y checklist de distribución
```

## Limitaciones conocidas del MVP

Ver [docs/DECISIONES_Y_LIMITACIONES.md](docs/DECISIONES_Y_LIMITACIONES.md) para el detalle
completo. En resumen:

- No hay cifrado de datos en reposo ni de los respaldos.
- La exportación DOCX no forma parte de este MVP; solo PDF.
- Los campos de tipo "tabla" en el editor de secciones son simplificados (no son una grilla
  completamente editable celda por celda).
- Interfaz solo en español (estructura preparada para añadir inglés más adelante).
