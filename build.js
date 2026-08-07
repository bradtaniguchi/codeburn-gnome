import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/extension.ts', 'src/prefs.ts'],
  outdir: '.',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  external: [
    'gi://*',
    'resource://*'
  ],
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
}
