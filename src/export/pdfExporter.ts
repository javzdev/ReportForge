import { BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

/**
 * Genera un PDF a partir de un fragmento HTML ya construido (ver reportHtmlBuilder),
 * usando una ventana oculta de Electron (Chromium local, sin red). El HTML se escribe
 * primero a un archivo temporal local y se carga con loadFile: un data: URI se evita
 * porque algunos motores limitan la longitud de la URL, lo cual rompería reportes largos.
 */
export async function exportHtmlToPdf(html: string, outputPath: string): Promise<void> {
  const tempHtmlPath = path.join(os.tmpdir(), `reportforge-export-${randomUUID()}.html`);
  fs.writeFileSync(tempHtmlPath, html, 'utf-8');

  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      javascript: false,
    },
  });

  try {
    await pdfWindow.loadFile(tempHtmlPath);

    // Los tipos de Electron documentan los margenes como "en pixeles", pero en la practica
    // printToPDF los interpreta en PULGADAS (confirmado empiricamente: un valor de 38
    // lanza "margins must be less than or equal to pageSize" porque excede una pagina A4).
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
    });

    fs.writeFileSync(outputPath, pdfBuffer);
  } finally {
    pdfWindow.destroy();
    fs.rmSync(tempHtmlPath, { force: true });
  }
}
