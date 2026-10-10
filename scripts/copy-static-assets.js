// Copia archivos estaticos que tsc no procesa (p.ej. el esquema SQL) desde src/ a dist/,
// manteniendo la misma ruta relativa para que los imports en tiempo de ejecucion
// (p.ej. path.join(__dirname, 'schema.sql')) sigan funcionando igual que en desarrollo.
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

const staticAssets = [{ from: 'src/db/schema.sql', to: 'dist/db/schema.sql' }];

for (const asset of staticAssets) {
  const fromPath = path.join(projectRoot, asset.from);
  const toPath = path.join(projectRoot, asset.to);

  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  fs.copyFileSync(fromPath, toPath);
  console.log(`[copy-static-assets] ${asset.from} -> ${asset.to}`);
}
