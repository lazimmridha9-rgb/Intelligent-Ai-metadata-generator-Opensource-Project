import { build as esbuild } from 'esbuild';
import { minify } from 'html-minifier-terser';
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

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
  const jsDir = path.join(DIST, 'js');
  const tempOutFile = path.join(jsDir, 'app.bundle.js');
  await fs.mkdir(jsDir, { recursive: true });

  await esbuild({
    entryPoints: [path.join(SRC, 'js', 'app.js')],
    bundle: true,
    format: 'esm',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    target: ['es2020'],
    outfile: tempOutFile
  });

  if (OBFUSCATE) {
    const js = await fs.readFile(tempOutFile, 'utf8');
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
    await fs.writeFile(tempOutFile, obfuscated, 'utf8');
  }

  const finalJs = await fs.readFile(tempOutFile, 'utf8');
  const hash = crypto.createHash('sha256').update(finalJs).digest('hex').slice(0, 10);
  const hashedFileName = `app.bundle.${hash}.js`;
  const hashedOutFile = path.join(jsDir, hashedFileName);
  await fs.rename(tempOutFile, hashedOutFile);

  return hashedFileName;
}

async function buildCss() {
  const cssDir = path.join(DIST, 'css');
  await fs.mkdir(cssDir, { recursive: true });

  const srcCssDir = path.join(SRC, 'css');
  const files = await fs.readdir(srcCssDir);
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  const hashedFiles = {};

  for (const fileName of cssFiles) {
    const srcPath = path.join(srcCssDir, fileName);
    try {
      const content = await fs.readFile(srcPath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
      const hashedFileName = fileName.replace('.css', `.${hash}.css`);
      await fs.writeFile(path.join(cssDir, hashedFileName), content, 'utf8');
      hashedFiles[fileName] = hashedFileName;
    } catch (e) {
      console.warn(`[Build] Warning: Could not build CSS file: ${fileName}`);
    }
  }
  return hashedFiles;
}

async function buildHtml(bundleFileName, hashedCssFiles) {
  const input = path.join(SRC, 'index.html');
  let html = await fs.readFile(input, 'utf8');

  // Replace JS (Main bundle)
  html = html.replace(
    /<script\s+type="module"\s+src="js\/app\.js"><\/script>/i,
    `<script type="module" src="js/${bundleFileName}"></script>`
  );

  // Replace CSS with Hashed versions
  for (const [original, hashed] of Object.entries(hashedCssFiles)) {
    // Escape dots for regex
    const escapedOriginal = original.replace(/\./g, '\\.');
    const regex = new RegExp(`href="css/${escapedOriginal}"`, 'gi');
    html = html.replace(regex, `href="css/${hashed}"`);
  }

  // Handle any other CSS links that might be in other directories (like tag-input)
  // For simplicity, we copy those as-is for now, but ensure no hardcoded paths break.

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
  const bundleFileName = await buildJsBundle();
  const hashedCssFiles = await buildCss();
  await buildHtml(bundleFileName, hashedCssFiles);

  // Copy other folders (not individual files in css as they are already handled)
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
