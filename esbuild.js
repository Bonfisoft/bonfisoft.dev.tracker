const esbuild = require('esbuild');

const production = process.argv.includes('--production');

async function build() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'],
    logLevel: 'info',
  });

  if (production) {
    await ctx.rebuild();
    ctx.dispose();
  } else {
    await ctx.watch();
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
