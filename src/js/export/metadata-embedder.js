const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const APP1_XMP_IDENTIFIER = 'http://ns.adobe.com/xap/1.0/\0';

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let j = 0; j < 8; j += 1) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function toUtf8Bytes(text) {
    return new TextEncoder().encode(String(text || ''));
}

function uint32ToBytes(num) {
    return new Uint8Array([
        (num >>> 24) & 0xff,
        (num >>> 16) & 0xff,
        (num >>> 8) & 0xff,
        num & 0xff
    ]);
}

function bytesToUint32(bytes, offset) {
    return (
        (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]
    ) >>> 0;
}

function concatBytes(parts) {
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
        crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function stripFileExtension(name) {
    return String(name || '').replace(/\.[^/.]+$/, '');
}

function normalizeKeywords(metadata) {
    if (Array.isArray(metadata?.keywords)) {
        return metadata.keywords.map(k => String(k || '').trim()).filter(Boolean);
    }
    if (Array.isArray(metadata?.tags)) {
        return metadata.tags.map(k => String(k || '').trim()).filter(Boolean);
    }
    return [];
}

function buildXmpPacket(metadata, sourceName = '') {
    const title = metadata?.title || metadata?.seoTitle || '';
    const description = metadata?.description || metadata?.metaDescription || '';
    const keywords = normalizeKeywords(metadata);
    const category = metadata?.category || metadata?.suggestedCategory || '';
    const altText = metadata?.altText || '';
    const filename = metadata?.filename || metadata?.suggestedFilename || stripFileExtension(sourceName) || 'image';
    const socialCaption = metadata?.socialCaption || '';
    const hashtags = metadata?.hashtags || '';
    const payloadJson = JSON.stringify(metadata || {});

    const subjectBag = keywords.map(k => `<rdf:li>${escapeXml(k)}</rdf:li>`).join('');

    return [
        '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>',
        '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
        '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"',
        '           xmlns:dc="http://purl.org/dc/elements/1.1/"',
        '           xmlns:xmp="http://ns.adobe.com/xap/1.0/"',
        '           xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"',
        '           xmlns:ai="https://metadata-gen.local/ns/ai/1.0/">',
        '    <rdf:Description rdf:about="">',
        `      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>`,
        `      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(description)}</rdf:li></rdf:Alt></dc:description>`,
        `      <dc:subject><rdf:Bag>${subjectBag}</rdf:Bag></dc:subject>`,
        `      <photoshop:Category>${escapeXml(category)}</photoshop:Category>`,
        `      <xmp:Label>${escapeXml(filename)}</xmp:Label>`,
        `      <ai:AltText>${escapeXml(altText)}</ai:AltText>`,
        `      <ai:SocialCaption>${escapeXml(socialCaption)}</ai:SocialCaption>`,
        `      <ai:Hashtags>${escapeXml(hashtags)}</ai:Hashtags>`,
        `      <ai:MetadataJson>${escapeXml(payloadJson)}</ai:MetadataJson>`,
        '    </rdf:Description>',
        '  </rdf:RDF>',
        '</x:xmpmeta>',
        '<?xpacket end="w"?>'
    ].join('\n');
}

function buildPngChunk(type, data) {
    const typeBytes = toUtf8Bytes(type);
    const chunkBody = concatBytes([typeBytes, data]);
    const crc = crc32(chunkBody);
    return concatBytes([
        uint32ToBytes(data.length),
        typeBytes,
        data,
        uint32ToBytes(crc)
    ]);
}

function buildPngXmpChunk(xmpPacket) {
    const keyword = toUtf8Bytes('XML:com.adobe.xmp');
    const nullByte = new Uint8Array([0]);
    const compressionFlag = new Uint8Array([0]);
    const compressionMethod = new Uint8Array([0]);
    const langTag = new Uint8Array([0]);
    const translatedKeyword = new Uint8Array([0]);
    const textBytes = toUtf8Bytes(xmpPacket);

    const data = concatBytes([
        keyword,
        nullByte,
        compressionFlag,
        compressionMethod,
        langTag,
        translatedKeyword,
        textBytes
    ]);
    return buildPngChunk('iTXt', data);
}

function ensurePngSignature(bytes) {
    if (bytes.length < PNG_SIGNATURE.length) return false;
    for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
        if (bytes[i] !== PNG_SIGNATURE[i]) return false;
    }
    return true;
}

function embedXmpIntoPngBytes(inputBytes, xmpPacket) {
    if (!ensurePngSignature(inputBytes)) {
        throw new Error('Invalid PNG file.');
    }

    const chunks = [];
    let offset = PNG_SIGNATURE.length;
    let seenIend = false;

    while (offset + 12 <= inputBytes.length) {
        const length = bytesToUint32(inputBytes, offset);
        const type = new TextDecoder().decode(inputBytes.slice(offset + 4, offset + 8));
        const fullChunkLength = 12 + length;

        if (offset + fullChunkLength > inputBytes.length) {
            throw new Error('Corrupted PNG chunk structure.');
        }

        const chunkBytes = inputBytes.slice(offset, offset + fullChunkLength);
        offset += fullChunkLength;

        if (type === 'IEND') {
            seenIend = true;
            chunks.push(buildPngXmpChunk(xmpPacket));
            chunks.push(chunkBytes);
            break;
        }

        // Remove pre-existing XMP iTXt block to keep output deterministic.
        if (type === 'iTXt') {
            const dataStart = 8;
            const dataEnd = 8 + length;
            const keywordBytes = inputBytes.slice(offset - fullChunkLength + dataStart, offset - fullChunkLength + dataEnd);
            const keyword = new TextDecoder().decode(keywordBytes.slice(0, Math.min(keywordBytes.length, 17)));
            if (keyword.startsWith('XML:com.adobe.xmp')) {
                continue;
            }
        }

        chunks.push(chunkBytes);
    }

    if (!seenIend) {
        throw new Error('PNG IEND chunk not found.');
    }

    return concatBytes([PNG_SIGNATURE, ...chunks]);
}

function isJpeg(bytes) {
    return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function findJpegInsertOffset(bytes) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        if (length < 2) break;
        offset += 2 + length;
        if (marker < 0xe0 || marker > 0xef) {
            // Insert before non-APP marker for better compatibility.
            break;
        }
    }
    return Math.max(2, offset);
}

function buildJpegXmpSegment(xmpPacket) {
    const idBytes = toUtf8Bytes(APP1_XMP_IDENTIFIER);
    const xmpBytes = toUtf8Bytes(xmpPacket);
    const app1Payload = concatBytes([idBytes, xmpBytes]);
    const segmentLength = app1Payload.length + 2;
    if (segmentLength > 0xffff) {
        throw new Error('XMP payload too large for JPEG APP1 segment.');
    }

    return concatBytes([
        new Uint8Array([0xff, 0xe1, (segmentLength >>> 8) & 0xff, segmentLength & 0xff]),
        app1Payload
    ]);
}

function embedXmpIntoJpegBytes(inputBytes, xmpPacket) {
    if (!isJpeg(inputBytes)) {
        throw new Error('Invalid JPEG file.');
    }
    const insertAt = findJpegInsertOffset(inputBytes);
    const segment = buildJpegXmpSegment(xmpPacket);

    return concatBytes([
        inputBytes.slice(0, insertAt),
        segment,
        inputBytes.slice(insertAt)
    ]);
}

async function fileToImageElement(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Image decode failed for ${file.name}`));
        };
        img.src = objectUrl;
    });
}

async function convertFileToPngBlob(file) {
    const img = await fileToImageElement(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 1;
    canvas.height = img.naturalHeight || img.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
            if (!b) reject(new Error('PNG conversion failed.'));
            else resolve(b);
        }, 'image/png');
    });
    return blob;
}

async function convertFileToJpegBlob(file) {
    const img = await fileToImageElement(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 1;
    canvas.height = img.naturalHeight || img.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
            if (!b) reject(new Error('JPEG conversion failed.'));
            else resolve(b);
        }, 'image/jpeg', 0.92);
    });
    return blob;
}

function embedXmpIntoSvgText(svgText, xmpPacket) {
    const metadataBlock = `<metadata id="ai-metadata"><![CDATA[${xmpPacket}]]></metadata>`;
    if (/<metadata[\s>]/i.test(svgText)) {
        return svgText.replace(/<metadata[\s\S]*?<\/metadata>/i, metadataBlock);
    }
    return svgText.replace(/<svg\b([^>]*)>/i, `<svg$1>${metadataBlock}`);
}

function ensureExtension(filename, ext) {
    const safe = String(filename || 'image').trim() || 'image';
    const base = safe.replace(/\.[^/.]+$/, '');
    return `${base}${ext}`;
}

function buildOutputName(file, metadata, extOverride = null) {
    const suggested = metadata?.filename || metadata?.suggestedFilename || stripFileExtension(file?.name || 'image');
    const ext = extOverride || (/\.[^/.]+$/.exec(file?.name || '')?.[0] || '.jpg');
    return ensureExtension(suggested, ext);
}

async function embedIntoPngBlob(file, metadata, xmpPacket) {
    let sourceBlob = file;
    let input = new Uint8Array(await sourceBlob.arrayBuffer());

    // Some files are mislabeled as PNG even when bytes are not PNG.
    // Fallback to canvas conversion to guarantee valid PNG bytes.
    if (!ensurePngSignature(input)) {
        sourceBlob = await convertFileToPngBlob(file);
        input = new Uint8Array(await sourceBlob.arrayBuffer());
    }

    let embedded;
    try {
        embedded = embedXmpIntoPngBytes(input, xmpPacket);
    } catch {
        // Some PNG variants may decode fine in browser but break strict chunk parsing.
        // Re-encode through canvas and retry once.
        sourceBlob = await convertFileToPngBlob(file);
        input = new Uint8Array(await sourceBlob.arrayBuffer());
        embedded = embedXmpIntoPngBytes(input, xmpPacket);
    }
    return {
        blob: new Blob([embedded], { type: 'image/png' }),
        mimeType: 'image/png',
        fileName: buildOutputName(file, metadata, '.png')
    };
}

async function embedIntoJpegBlob(file, metadata, xmpPacket) {
    let sourceBlob = file;
    let input = new Uint8Array(await sourceBlob.arrayBuffer());

    // Some files are mislabeled as JPEG even when bytes are not JPEG.
    // Fallback to canvas conversion to guarantee valid JPEG bytes.
    if (!isJpeg(input)) {
        sourceBlob = await convertFileToJpegBlob(file);
        input = new Uint8Array(await sourceBlob.arrayBuffer());
    }

    let embedded;
    try {
        embedded = embedXmpIntoJpegBytes(input, xmpPacket);
    } catch {
        sourceBlob = await convertFileToJpegBlob(file);
        input = new Uint8Array(await sourceBlob.arrayBuffer());
        embedded = embedXmpIntoJpegBytes(input, xmpPacket);
    }
    return {
        blob: new Blob([embedded], { type: 'image/jpeg' }),
        mimeType: 'image/jpeg',
        fileName: buildOutputName(file, metadata, '.jpg')
    };
}

async function embedIntoSvgBlob(file, metadata, xmpPacket) {
    const raw = await file.text();
    const embeddedText = embedXmpIntoSvgText(raw, xmpPacket);
    return {
        blob: new Blob([embeddedText], { type: 'image/svg+xml' }),
        mimeType: 'image/svg+xml',
        fileName: buildOutputName(file, metadata, '.svg')
    };
}

function inferType(file) {
    const type = (file?.type || '').toLowerCase();
    if (type) return type;
    const name = (file?.name || '').toLowerCase();
    if (name.endsWith('.svg') || name.endsWith('.svgz')) return 'image/svg+xml';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
}

export async function embedMetadataIntoFile(file, metadata = {}) {
    if (!file) throw new Error('File is required for embedding.');
    const mimeType = inferType(file);
    const xmpPacket = buildXmpPacket(metadata, file.name);

    if (mimeType === 'image/png') {
        return embedIntoPngBlob(file, metadata, xmpPacket);
    }
    if (mimeType === 'image/jpeg') {
        return embedIntoJpegBlob(file, metadata, xmpPacket);
    }
    if (mimeType === 'image/svg+xml') {
        return embedIntoSvgBlob(file, metadata, xmpPacket);
    }

    // Fallback path: convert unsupported image formats (webp/heic/avif/bmp/...) to PNG and embed XMP there.
    const output = await embedIntoPngBlob(file, metadata, xmpPacket);
    return {
        ...output,
        note: `Original format "${mimeType}" was exported as PNG with embedded metadata for compatibility.`
    };
}
