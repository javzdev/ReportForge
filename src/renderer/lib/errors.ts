// Utilidades para normalizar errores que llegan desde el proceso principal via IPC.
// Los handlers en el main process ya redactan mensajes seguros en espanol (ver
// ipcHandlers.ts -> toSafeErrorMessage), pero Electron puede envolver el mensaje
// original con un prefijo tecnico ("Error invoking remote method ...: Error: <msg>").
// Esta funcion extrae el mensaje legible para mostrarlo directo al usuario.
export function getErrorMessage(error: unknown, fallback = 'Ocurrio un error inesperado.'): string {
  if (!error) return fallback;

  let message = error instanceof Error ? error.message : String(error);

  // Electron antepone a veces "Error invoking remote method 'canal': "
  const invokePrefixMatch = message.match(/Error invoking remote method '[^']*':\s*(.*)/s);
  if (invokePrefixMatch && invokePrefixMatch[1]) {
    message = invokePrefixMatch[1];
  }

  // Puede quedar un "Error: " duplicado al reenvolver del lado main.
  message = message.replace(/^Error:\s*/, '').trim();

  return message.length > 0 ? message : fallback;
}
