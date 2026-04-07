import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const failures = [];
const warnings = [];

function hashHex10(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(filePath, label) {
  if (!(await exists(filePath))) {
    failures.push(`${label} missing: ${path.relative(ROOT, filePath)}`);
    return false;
  }
  return true;
}

async function collectFilesRecursive(baseDir) {
  const out = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(path.relative(baseDir, full));
      }
    }
  }

  await walk(baseDir);
  out.sort();
  return out;
}

async function verifyHashedCssAndIndex() {
  const srcCssDir = path.join(SRC, 'css');
  const distCssDir = path.join(DIST, 'css');
  const distIndex = path.join(DIST, 'index.html');

  if (!(await ensureFile(distIndex, 'dist index'))) return;
  if (!(await exists(srcCssDir))) {
    warnings.push('src/css not found, skipped CSS hash verification');
    return;
  }
  if (!(await exists(distCssDir))) {
    failures.push('dist/css missing');
    return;
  }

  const srcCssFiles = (await fs.readdir(srcCssDir)).filter((f) => f.endsWith('.css'));
  const srcIndexPath = path.join(SRC, 'index.html');
  if (!(await ensureFile(srcIndexPath, 'src index'))) return;
  const srcIndexHtml = await fs.readFile(srcIndexPath, 'utf8');
  const distIndexHtml = await fs.readFile(distIndex, 'utf8');

  for (const sourceName of srcCssFiles) {
    const sourcePath = path.join(srcCssDir, sourceName);
    const sourceContent = await fs.readFile(sourcePath, 'utf8');
    const hash = hashHex10(sourceContent);
    const expectedDistName = sourceName.replace('.css', `.${hash}.css`);
    const expectedDistPath = path.join(distCssDir, expectedDistName);

    if (!(await exists(expectedDistPath))) {
      failures.push(`Hashed CSS missing for ${sourceName} -> ${expectedDistName}`);
      continue;
    }

    const distContent = await fs.readFile(expectedDistPath, 'utf8');
    if (distContent !== sourceContent) {
      failures.push(`Hashed CSS content mismatch: ${expectedDistName}`);
    }

    const isReferencedInSrcIndex = srcIndexHtml.includes(`href="css/${sourceName}"`);
    if (isReferencedInSrcIndex && !distIndexHtml.includes(`href="css/${expectedDistName}"`)) {
      failures.push(`dist/index.html does not reference ${expectedDistName} (from src/${sourceName})`);
    }
  }
}

async function verifyJsBundleAndIndex() {
  const distJsDir = path.join(DIST, 'js');
  const distIndex = path.join(DIST, 'index.html');
  if (!(await ensureFile(distIndex, 'dist index'))) return;
  if (!(await exists(distJsDir))) {
    failures.push('dist/js missing');
    return;
  }

  const jsFiles = (await fs.readdir(distJsDir)).filter((f) => /^app\.bundle\.[a-f0-9]{10}\.js$/i.test(f));
  if (jsFiles.length === 0) {
    failures.push('No hashed app bundle found in dist/js');
    return;
  }

  const distIndexHtml = await fs.readFile(distIndex, 'utf8');
  const bundleRef = distIndexHtml.match(/src="js\/(app\.bundle\.[a-f0-9]{10}\.js)"/i);
  if (!bundleRef) {
    failures.push('dist/index.html does not reference a hashed app bundle');
    return;
  }

  const bundleName = bundleRef[1];
  if (!jsFiles.includes(bundleName)) {
    failures.push(`dist/index.html references missing bundle: ${bundleName}`);
  }
}

async function verifyCopiedFolder(folderName) {
  const srcFolder = path.join(SRC, folderName);
  const distFolder = path.join(DIST, folderName);

  if (!(await exists(srcFolder))) return;
  if (!(await exists(distFolder))) {
    failures.push(`dist/${folderName} missing`);
    return;
  }

  const srcFiles = await collectFilesRecursive(srcFolder);
  const distFiles = await collectFilesRecursive(distFolder);

  const srcSet = new Set(srcFiles);
  const distSet = new Set(distFiles);

  for (const rel of srcFiles) {
    if (!distSet.has(rel)) {
      failures.push(`Missing copied file in dist/${folderName}: ${rel}`);
      continue;
    }

    const srcContent = await fs.readFile(path.join(srcFolder, rel));
    const distContent = await fs.readFile(path.join(distFolder, rel));
    if (!srcContent.equals(distContent)) {
      failures.push(`File content mismatch in ${folderName}: ${rel}`);
    }
  }

  for (const rel of distFiles) {
    if (!srcSet.has(rel)) {
      warnings.push(`Extra file in dist/${folderName}: ${rel}`);
    }
  }
}

async function main() {
  if (!(await exists(DIST))) {
    failures.push('dist folder missing. Run npm run build first.');
  }

  await verifyHashedCssAndIndex();
  await verifyJsBundleAndIndex();
  await verifyCopiedFolder('Icon');
  await verifyCopiedFolder('tag-input');
  await verifyCopiedFolder('assets');

  if (warnings.length > 0) {
    console.log('Dist sync warnings:');
    for (const warning of warnings) {
      console.log(`  - ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error('Dist sync verification failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('Dist sync verification passed: src -> dist mapping is consistent.');
}

main().catch((error) => {
  console.error(`Dist sync verification crashed: ${error.message}`);
  process.exit(1);
});
