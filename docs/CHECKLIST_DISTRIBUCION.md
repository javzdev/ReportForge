# Lista de comprobación antes de distribuir ReportForge Local

Usar antes de compartir un instalador con otras personas (incluso en contextos internos de
prueba).

## Funcionalidad

- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm test` pasa sin fallos.
- [ ] `npm run build` genera `dist/renderer` y `dist/main` sin errores.
- [ ] La app arranca con `npm run start` y muestra el panel de inicio sin consola de
      DevTools abierta automáticamente.
- [ ] Se puede crear un proyecto, un reporte desde plantilla, editar secciones, y los
      cambios persisten tras cerrar y reabrir la aplicación.
- [ ] Se puede registrar un hallazgo con severidad y estado, y aparece en los filtros.
- [ ] Se puede adjuntar un archivo permitido y se rechaza uno con extensión no permitida.
- [ ] La vista previa de un reporte muestra las secciones y hallazgos correctamente.
- [ ] La exportación a PDF genera un archivo legible con portada y clasificación visible.
- [ ] Se puede crear un respaldo y restaurarlo en una instalación limpia (o tras "Eliminar
      todos los datos").
- [ ] "Eliminar todos los datos" requiere confirmación explícita y efectivamente limpia la
      base de datos y la carpeta de evidencias.

## Privacidad y honestidad del producto

- [ ] Ninguna pantalla afirma que los datos están cifrados (no lo están en esta versión).
- [ ] La pantalla de Privacidad muestra las rutas reales de almacenamiento del sistema
      actual, no rutas de ejemplo hardcodeadas.
- [ ] No hay ninguna llamada de red saliente (verificar con una herramienta de monitoreo de
      red del sistema operativo mientras se usa la app con el adaptador de red desconectado;
      la app debe funcionar igual sin conexión).
- [ ] No hay claves de API, tokens ni credenciales en el código fuente ni en archivos de
      configuración versionados.
- [ ] Los datos de demostración son reconociblemente ficticios.

## Empaquetado

- [ ] `npm run package:win` genera el instalador sin errores.
- [ ] El instalador no requiere conexión a internet para instalarse ni para ejecutarse.
- [ ] La configuración de `electron-builder` tiene `publish: null` (sin canal de
      actualización automática contra un servidor remoto).

## Documentación

- [ ] README actualizado con los pasos reales de instalación/ejecución/pruebas/compilación.
- [ ] `docs/PRIVACIDAD.md` y `docs/DECISIONES_Y_LIMITACIONES.md` reflejan el estado real del
      código (no funciones planeadas pero no implementadas).
