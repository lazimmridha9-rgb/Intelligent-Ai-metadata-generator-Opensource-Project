import { build as esbuild } from 'esbuild';
import { minify } from 'html-minifier-terser';
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OBFUSCATE = process.argv.includes('--obfuscate');

async function cleanDist() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
}

async function copyIfExists(srcRel, destRel = srcRel) {
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
    entryPoints: [path.join(ROOT, 'js', 'app.js')],
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

  const finalJs = await fs.readFile(outFile);
  const hash = crypto.createHash('sha256').update(finalJs).digest('hex').slice(0, 10);
  const hashedName = `app.bundle.${hash}.js`;
  const hashedPath = path.join(DIST, 'js', hashedName);
  await fs.rename(outFile, hashedPath);
  return `js/${hashedName}`;
}

async function buildHtml(bundlePath) {
  const input = path.join(ROOT, 'index.html');
  let html = await fs.readFile(input, 'utf8');

  html = html.replace(
    /<script\s+type="module"\s+src="js\/app\.js"><\/script>/i,
    `<script type="module" src="${bundlePath}"></script>`
  );

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
  const bundlePath = await buildJsBundle();
  await buildHtml(bundlePath);

  await copyIfExists('css');
  await copyIfExists('assets');
  await copyIfExists('Icon');
  await copyIfExists('tag-input');
  await copyIfExists('README.md');
  await copyIfExists('vercel.json');
  await copyIfExists('netlify.toml');
  await copyIfExists('_headers');
  await copyIfExists('.nojekyll');

  console.log(`Build complete: ${DIST}`);
  console.log(`Obfuscation: ${OBFUSCATE ? 'enabled' : 'disabled'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
