# Privacidad, almacenamiento y limitaciones de seguridad

Este documento describe honestamente qué hace y qué NO hace ReportForge Local en materia
de privacidad y seguridad de los datos. El objetivo es que el usuario tome decisiones
informadas sobre cómo proteger su información, en lugar de asumir garantías que la
aplicación no ofrece.

## Qué es local y qué no sale del dispositivo

- La aplicación no realiza ninguna solicitud de red saliente. No hay llamadas a APIs
  externas, servicios de analítica, telemetría, ni modelos de inteligencia artificial.
- No existen cuentas de usuario ni autenticación: cualquier persona con acceso al sistema
  operativo del dispositivo y permisos para leer la carpeta de datos de usuario puede
  acceder a los reportes guardados.
- Los respaldos (`backup.create`) se escriben únicamente en la ruta que el usuario elige
  explícitamente mediante el diálogo nativo de guardado del sistema operativo.

## Cifrado: estado real

**Esta versión NO implementa cifrado de datos en reposo.** Ni la base de datos SQLite, ni
los archivos de evidencia almacenados en disco, ni los respaldos JSON exportados están
cifrados. Esto es una decisión deliberada: el equipo prefiere no afirmar una protección que
no ha sido implementada y verificada con pruebas, en lugar de simular una falsa sensación de
seguridad.

Consecuencias practicas:

- Cualquier persona con acceso al archivo `reportforge.db` o a la carpeta `evidence/` puede
  leer su contenido directamente, sin necesidad de abrir la aplicación.
- Un respaldo `.json` exportado es texto plano legible por cualquier editor. **Debe
  tratarse con el mismo cuidado que el reporte final de un cliente.**
- La seguridad de los datos depende en esta versión de las protecciones del sistema
  operativo: cifrado de disco completo (BitLocker, FileVault, LUKS), control de acceso de
  cuentas de usuario, y buenas prácticas de manejo de archivos por parte de quien usa la
  aplicación.

Si en una versión futura se implementa cifrado, deberá cumplir, como mínimo:

- Usar una biblioteca de cifrado reconocida y mantenida (no una implementación propia).
- No almacenar la contraseña de cifrado junto a los datos cifrados.
- Advertir explícitamente que perder la contraseña puede hacer los datos irrecuperables.
- Cubrir también los archivos de respaldo, no solo la base de datos en uso.
- Incluir pruebas automatizadas que verifiquen cifrado y descifrado correctos.

Hasta que eso exista, la aplicación no debe describir ninguna función de cifrado como
disponible.

## Qué protege la aplicación (defensa en profundidad del proceso Electron)

Aunque no hay cifrado, se aplican varias medidas para reducir el riesgo de que el propio
programa sea un vector de ataque:

- El renderer (interfaz web) corre con `contextIsolation: true`, `sandbox: true` y
  `nodeIntegration: false`: no tiene acceso directo a Node.js, al sistema de archivos ni a
  comandos del sistema.
- La única superficie expuesta al renderer es una lista cerrada de funciones tipadas vía
  `contextBridge` (ver `src/preload/index.ts`); no existe un `invoke` genérico que permita
  ejecutar comandos arbitrarios.
- Toda ruta de archivo de evidencias se valida contra path traversal (el nombre de archivo
  se sanitiza y se verifica que la ruta resuelta quede dentro de la carpeta del proyecto).
- Solo se aceptan adjuntos con extensión y tipo MIME dentro de una lista blanca explícita
  (imágenes comunes, PDF, texto plano, CSV, JSON); no se permiten ejecutables ni scripts.
- La ventana principal no navega a contenido remoto ni abre ventanas adicionales sin
  control (`setWindowOpenHandler` deniega por defecto).
- Los mensajes de error mostrados al usuario están filtrados: los errores de validación de
  negocio muestran su mensaje (redactado en español, sin datos sensibles), mientras que
  errores inesperados del sistema (fallos de SQLite, de lectura de disco, etc.) se
  reemplazan por un mensaje genérico para no filtrar rutas internas ni detalles de la base
  de datos.

## Qué depende del usuario

- Proteger el acceso físico y de cuentas al dispositivo donde se ejecuta la aplicación.
- Activar cifrado de disco completo del sistema operativo si se almacenan datos de clientes
  reales.
- Proteger cualquier archivo de respaldo exportado (ubicación, permisos, y si se transfiere
  a otro medio, cifrarlo manualmente con una herramienta de confianza antes de hacerlo).
- No introducir en la aplicación credenciales, tokens ni secretos de los sistemas evaluados;
  la aplicación no tiene campos diseñados para almacenarlos y no debe usarse para ese fin.

## Dónde se guardan los datos (rutas reales)

Ver la sección correspondiente en [README.md](../README.md#dónde-se-guardan-los-datos) y la
pantalla de Configuración / Privacidad dentro de la propia aplicación, que muestra las rutas
reales del sistema en el que se está ejecutando.
