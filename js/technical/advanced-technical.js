function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let num = bytes;
    while (num >= 1024 && i < units.length - 1) {
        num /= 1024;
        i += 1;
    }
    return `${num.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x || 1;
}

function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    return Math.min(1, Math.max(0, x));
}

function describeSharpness(laplacianVar) {
    if (!Number.isFinite(laplacianVar)) return 'Unknown';
    if (laplacianVar < 50) return 'Low';
    if (laplacianVar < 200) return 'Medium';
    return 'High';
}

async function computeImageTechnical(base64, mimeType) {
    const img = new Image();
    img.decoding = 'async';
    img.src = `data:${mimeType};base64,${base64}`;

    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for technical analysis'));
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const mp = width && height ? (width * height) / 1_000_000 : null;
    const g = gcd(width, height);
    const ratio = `${Math.round(width / g)}:${Math.round(height / g)}`;
    const orientation = width === height ? 'Square' : (width > height ? 'Landscape' : 'Portrait');

    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const cw = Math.max(1, Math.round(width * scale));
    const ch = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas not supported');

    ctx.drawImage(img, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);

    const step = 4 * 8;
    let count = 0;
    let sumY = 0;
    let sumY2 = 0;
    let sumSat = 0;
    let hasAlpha = false;
    const bins = new Map();

    for (let i = 0; i < data.length; i += step) {
        const r = data[i];
        const g2 = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 255) hasAlpha = true;

        const y = 0.2126 * r + 0.7152 * g2 + 0.0722 * b;
        sumY += y;
        sumY2 += y * y;

        const maxc = Math.max(r, g2, b);
        const minc = Math.min(r, g2, b);
        const sat = maxc === 0 ? 0 : (maxc - minc) / maxc;
        sumSat += sat;

        const key = ((r >> 4) << 8) | ((g2 >> 4) << 4) | (b >> 4);
        bins.set(key, (bins.get(key) || 0) + 1);

        count += 1;
    }

    const meanY = count ? sumY / count : 0;
    const varY = count ? (sumY2 / count) - meanY * meanY : 0;
    const stdY = Math.sqrt(Math.max(0, varY));
    const meanSat = count ? sumSat / count : 0;

    const gray = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y += 1) {
        for (let x = 0; x < cw; x += 1) {
            const idx = (y * cw + x) * 4;
            const r = data[idx];
            const g2 = data[idx + 1];
            const b = data[idx + 2];
            gray[y * cw + x] = 0.2126 * r + 0.7152 * g2 + 0.0722 * b;
        }
    }

    let lapSum = 0;
    let lapSum2 = 0;
    let lapN = 0;
    const stride = 2;
    for (let y = 1; y < ch - 1; y += stride) {
        for (let x = 1; x < cw - 1; x += stride) {
            const c = gray[y * cw + x];
            const lap = (-4 * c)
                + gray[y * cw + (x - 1)]
                + gray[y * cw + (x + 1)]
                + gray[(y - 1) * cw + x]
                + gray[(y + 1) * cw + x];
            lapSum += lap;
            lapSum2 += lap * lap;
            lapN += 1;
        }
    }
    const lapMean = lapN ? lapSum / lapN : 0;
    const lapVar = lapN ? (lapSum2 / lapN) - lapMean * lapMean : 0;
    const laplacianVar = Math.max(0, lapVar);

    const palette = [...bins.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([key]) => {
            const r = ((key >> 8) & 0xF) * 16 + 8;
            const g2 = ((key >> 4) & 0xF) * 16 + 8;
            const b = (key & 0xF) * 16 + 8;
            const hex = `#${[r, g2, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
            return { hex, rgb: [r, g2, b] };
        });

    const exposureScore = 1 - Math.abs((meanY / 255) - 0.5) * 2;
    const contrastScore = clamp01(stdY / 80);
    const sharpScore = clamp01(laplacianVar / 300);
    const satScore = clamp01(meanSat / 0.35);
    const qualityScore = Math.round(100 * (0.35 * sharpScore + 0.25 * contrastScore + 0.25 * exposureScore + 0.15 * satScore));

    return {
        width,
        height,
        mp,
        ratio,
        orientation,
        meanY,
        stdY,
        meanSat,
        hasAlpha,
        laplacianVar,
        sharpnessLabel: describeSharpness(laplacianVar),
        palette,
        qualityScore
    };
}

function buildSeoHeadSnippet({ title, description, altText, jsonLd, filename }) {
    const safeTitle = (title || '').trim();
    const safeDesc = (description || '').trim();
    const safeAlt = (altText || '').trim();
    const safeFile = (filename || '').trim();

    const imageUrl = 'https://example.com/images/YOUR_IMAGE_URL';
    const pageUrl = 'https://example.com/YOUR_PAGE_URL';

    return [
        '<!-- Basic SEO -->',
        `<title>${safeTitle || 'YOUR_PAGE_TITLE'}</title>`,
        `<meta name="description" content="${safeDesc || 'YOUR_META_DESCRIPTION'}">`,
        '',
        '<!-- Open Graph (Facebook/LinkedIn) -->',
        '<meta property="og:type" content="website">',
        `<meta property="og:title" content="${safeTitle || 'YOUR_OG_TITLE'}">`,
        `<meta property="og:description" content="${safeDesc || 'YOUR_OG_DESCRIPTION'}">`,
        `<meta property="og:url" content="${pageUrl}">`,
        `<meta property="og:image" content="${imageUrl}">`,
        safeAlt ? `<meta property="og:image:alt" content="${safeAlt}">` : '',
        '',
        '<!-- Twitter Card -->',
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${safeTitle || 'YOUR_TWITTER_TITLE'}">`,
        `<meta name="twitter:description" content="${safeDesc || 'YOUR_TWITTER_DESCRIPTION'}">`,
        `<meta name="twitter:image" content="${imageUrl}">`,
        safeAlt ? `<meta name="twitter:image:alt" content="${safeAlt}">` : '',
        '',
        '<!-- Image hints -->',
        safeFile ? `<!-- Suggested filename: ${safeFile} -->` : '',
        '',
        '<!-- JSON-LD (Schema) -->',
        '<script type="application/ld+json">',
        JSON.stringify(jsonLd || {}, null, 2),
        '</script>'
    ].filter(Boolean).join('\n');
}

export async function renderAdvancedTechnical({ base64, mimeType, file, metadata, jsonLd }) {
    const propsEl = document.getElementById('imageProperties');
    const qualityEl = document.getElementById('imageQualityMetrics');
    const paletteTextEl = document.getElementById('colorPaletteText');
    const paletteChipsEl = document.getElementById('colorPaletteChips');
    const snippetEl = document.getElementById('seoHeadSnippet');

    if (snippetEl) {
        const title = metadata?.title || metadata?.seoTitle || '';
        const description = metadata?.description || metadata?.metaDescription || '';
        const altText = metadata?.altText || '';
        const filename = metadata?.filename || metadata?.suggestedFilename || '';
        snippetEl.innerText = buildSeoHeadSnippet({ title, description, altText, jsonLd, filename });
    }

    if (!base64 || !mimeType) {
        if (propsEl) propsEl.innerText = '';
        if (qualityEl) qualityEl.innerText = '';
        if (paletteTextEl) paletteTextEl.innerText = '';
        if (paletteChipsEl) paletteChipsEl.innerHTML = '';
        return;
    }

    const tech = await computeImageTechnical(base64, mimeType);

    if (propsEl) {
        const lines = [];
        if (file?.name) lines.push(`File: ${file.name}`);
        if (mimeType) lines.push(`MIME: ${mimeType}`);
        if (file?.size) lines.push(`Size: ${formatBytes(file.size)}`);
        lines.push(`Dimensions: ${tech.width} x ${tech.height}px`);
        if (tech.mp) lines.push(`Megapixels: ${tech.mp.toFixed(2)} MP`);
        lines.push(`Aspect ratio: ${tech.ratio} (${tech.orientation})`);
        lines.push(`Transparency: ${tech.hasAlpha ? 'Yes' : 'No'}`);
        lines.push(`Quality score (heuristic): ${tech.qualityScore}/100`);
        propsEl.innerText = lines.join('\n');
    }

    if (qualityEl) {
        const lines = [];
        lines.push(`Sharpness: ${tech.sharpnessLabel} (Laplacian variance: ${Math.round(tech.laplacianVar)})`);
        lines.push(`Exposure (avg luminance): ${Math.round(tech.meanY)}/255`);
        lines.push(`Contrast (luminance std): ${Math.round(tech.stdY)}`);
        lines.push(`Saturation (avg): ${(tech.meanSat * 100).toFixed(0)}%`);
        qualityEl.innerText = lines.join('\n');
    }

    if (paletteChipsEl) {
        paletteChipsEl.innerHTML = '';
        tech.palette.forEach((c) => {
            const chip = document.createElement('span');
            chip.className = 'w-7 h-7 rounded-lg border border-white/10 shadow-inner';
            chip.style.backgroundColor = c.hex;
            chip.title = c.hex;
            paletteChipsEl.appendChild(chip);
        });
    }

    if (paletteTextEl) {
        paletteTextEl.innerText = tech.palette.map((c) => `${c.hex} (rgb ${c.rgb.join(', ')})`).join('\n');
    }
}
