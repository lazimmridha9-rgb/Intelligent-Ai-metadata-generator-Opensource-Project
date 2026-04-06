import { build as esbuild } from 'esbuild';
import { minify } from 'html-minifier-terser';
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const OBFUSCATE = process.argv.includes('--obfuscate');

async function cleanDist() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
}

async function copyIfExists(srcRel, destRel = srcRel) {
  const src = path.join(SRC, srcRel);
  const dest = path.join(DIST, destRel);
  try {
    await fs.access(src);
  } catch {
    return;
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

async function copyFromRootIfExists(srcRel, destRel = srcRel) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(DIST, destRel);
  try {
    await fs.access(src);
  } catch {
    return;
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

async function buildJsBundle() {
  const outFile = path.join(DIST, 'js', 'app.bundle.js');
  await fs.mkdir(path.dirname(outFile), { recursive: true });

  await esbuild({
    entryPoints: [path.join(SRC, 'js', 'app.js')],
    bundle: true,
    format: 'esm',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    target: ['es2020'],
    outfile: outFile
  });

  if (OBFUSCATE) {
    const js = await fs.readFile(outFile, 'utf8');
    const obfuscated = JavaScriptObfuscator.obfuscate(js, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      stringArray: true,
      stringArrayShuffle: true,
      stringArrayThreshold: 0.75,
      splitStrings: true,
      splitStringsChunkLength: 8
    }).getObfuscatedCode();
    await fs.writeFile(outFile, obfuscated, 'utf8');
  }
}

async function buildHtml() {
  const input = path.join(SRC, 'index.html');
  let html = await fs.readFile(input, 'utf8');

  html = html.replace(/<script\s+type="module"\s+src="js\/app\.js"><\/script>/i, '<script type="module" src="js/app.bundle.js"></script>');

  const minified = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: false
  });

  await fs.writeFile(path.join(DIST, 'index.html'), minified, 'utf8');
}

async function main() {
  await cleanDist();
  await buildJsBundle();
  await buildHtml();

  await copyIfExists('css');
  await copyIfExists('assets');
  await copyIfExists('Icon');
  await copyIfExists('tag-input');
  await copyFromRootIfExists('README.md');
  await copyFromRootIfExists('vercel.json');
  await copyFromRootIfExists('netlify.toml');
  await copyFromRootIfExists('_headers');
  await copyFromRootIfExists('.nojekyll');

  console.log(`Build complete: ${DIST}`);
  console.log(`Obfuscation: ${OBFUSCATE ? 'enabled' : 'disabled'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
