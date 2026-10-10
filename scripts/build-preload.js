// El preload corre con sandbox:true (ver src/main/index.ts), lo cual limita su require()
// a un polyfill minimo de Electron que no puede resolver modulos propios del proyecto
// (como '../shared/ipcChannels'). La solucion es compilar el preload como un unico
// archivo CommonJS autocontenido: todo lo que importa de src/shared queda incluido
// inline en dist/preload/index.js, sin requires externos salvo 'electron' (que el
// entorno sandboxed si provee nativamente).
const esbuild = require('esbuild');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

async function buildPreload(watch) {
  const ctx = await esbuild.context({
    entryPoints: [path.join(projectRoot, 'src/preload/index.ts')],
    outfile: path.join(projectRoot, 'dist/preload/index.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron'],
    sourcemap: true,
    logLevel: 'info',
  });

  if (watch) {
    await ctx.watch();
    console.log('[build-preload] watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[build-preload] done.');
  }
}

const watchMode = process.argv.includes('--watch');
buildPreload(watchMode).catch((err) => {
  console.error('[build-preload] failed:', err);
  process.exit(1);
});
