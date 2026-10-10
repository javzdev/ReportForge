# Decisiones técnicas y limitaciones conocidas

## Por qué Electron y no Tauri

El entorno de desarrollo disponible tenía Node.js 22 instalado pero no la toolchain de Rust
(`rustc`/`cargo`), requerida por Tauri. Electron permite empezar a desarrollar de inmediato
sobre lo ya disponible. La contrapartida (binarios más pesados, mayor huella de Chromium) se
mitiga con las medidas descritas en [docs/PRIVACIDAD.md](PRIVACIDAD.md): sandboxing,
contextIsolation, sin nodeIntegration, y una API de preload mínima y cerrada.

Si en el futuro se migra a Tauri, el modelo de datos (`src/shared/types.ts`), el esquema
SQL (`src/db/schema.sql`) y la lógica de negocio de los repositorios son reutilizables casi
sin cambios; lo que cambiaría es la capa de IPC y el empaquetado.

## Por qué SQLite (better-sqlite3) y no archivos JSON sueltos

SQLite da transacciones atómicas (importante para que un backup a medio importar no corrompa
el estado), índices para búsqueda/filtrado de hallazgos, y relaciones con `ON DELETE CASCADE`
que simplifican el borrado consistente de proyectos y sus reportes/hallazgos asociados. Es
un único archivo local, consistente con "sin bases de datos alojadas en la nube".

## Exportación de documentos: PDF sí, DOCX no (en este MVP)

Se evaluó generar DOCX además de PDF. Generar un DOCX con calidad profesional (estilos,
tabla de contenido real, numeración de páginas, portada) de forma confiable requiere o bien
una librería de plantillas DOCX con buen soporte de estilos, o bien lógica adicional no
trivial de generación de XML de OOXML. Para no entregar una función "a medias" que luego
produzca documentos con formato roto, el MVP prioriza una exportación a PDF completa y bien
probada (usando el motor de impresión de Chromium integrado en Electron, sin dependencias de
red). DOCX queda documentado como función candidata para una versión posterior.

## Campos de tipo "tabla" en el editor de secciones

El modelo de plantillas soporta un tipo de campo `table` genérico (para secciones como
"historial de versiones"). En este MVP se renderiza como un área de texto libre en vez de
una grilla celda-por-celda completamente editable, para mantener el editor simple y evitar
construir un componente de tabla editable complejo antes de validar que el resto del flujo
(creación, guardado, hallazgos, export) funciona de punta a punta. El tipo `findings_table`
(usado para listar hallazgos dentro de un reporte) sí es una tabla real de solo lectura
generada a partir de los hallazgos vinculados.

## Sin cifrado: ver PRIVACIDAD.md

Explicado en detalle en [docs/PRIVACIDAD.md](PRIVACIDAD.md). No se simula ni se anuncia
cifrado que no esté implementado y probado.

## Supuestos adoptados por falta de información explícita

- Los "datos ficticios" de demostración se insertan automáticamente solo en el primer
  arranque (base de datos vacía), y están claramente etiquetados como ficticios en su
  contenido (prefijo "[Ejemplo ficticio]" en hallazgos, nombres de cliente que incluyen
  "(datos de ejemplo)").
- El límite de tamaño de adjuntos por defecto es 25 MB, configurable desde Configuración;
  no se especificó un valor concreto en los requisitos.
- La clasificación de confidencialidad por defecto para reportes nuevos es "Confidencial"
  (opción intermedia, ni la más laxa ni la más restrictiva).
- El "responsable" (owner) de un hallazgo es un campo de texto libre opcional, sin validarlo
  contra una lista de usuarios (no existen cuentas de usuario en la aplicación).

## Limitaciones de seguridad que dependen del sistema operativo

Ver la sección "Qué depende del usuario" en [docs/PRIVACIDAD.md](PRIVACIDAD.md).
