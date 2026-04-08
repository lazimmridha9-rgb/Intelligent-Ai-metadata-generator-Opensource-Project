import JSZip from 'jszip';
import { embedMetadataIntoFile } from './metadata-embedder.js';

function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function sanitizeName(text, fallback = 'file') {
    const safe = String(text || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').trim();
    return safe || fallback;
}

function hasMetadata(item) {
    return Boolean(item && item.metadata && typeof item.metadata === 'object');
}

function buildZipName() {
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `embedded-metadata-batch-${ts}.zip`;
}

function buildUniqueZipEntryName(name, usedNames) {
    const safe = sanitizeName(name, 'embedded-image');
    if (!usedNames.has(safe)) {
        usedNames.add(safe);
        return safe;
    }

    const dot = safe.lastIndexOf('.');
    const hasExt = dot > 0;
    const base = hasExt ? safe.slice(0, dot) : safe;
    const ext = hasExt ? safe.slice(dot) : '';

    let counter = 2;
    while (true) {
        const candidate = `${base}-${counter}${ext}`;
        if (!usedNames.has(candidate)) {
            usedNames.add(candidate);
            return candidate;
        }
        counter += 1;
    }
}

export class EmbeddedDownloadManager {
    constructor({ showToast, showErrorModal }) {
        this.showToast = typeof showToast === 'function' ? showToast : () => {};
        this.showErrorModal = typeof showErrorModal === 'function' ? showErrorModal : () => {};
    }

    async downloadAll({ currentFile, currentMetadata, batchQueue }) {
        try {
            const queue = Array.isArray(batchQueue) ? batchQueue : [];
            const completedBatch = queue
                .filter(item => item?.status === 'done' && item?.file && hasMetadata(item));
            const isBatchWorkflow = queue.length > 0;

            if (isBatchWorkflow && completedBatch.length >= 1) {
                await this._downloadBatchZip(completedBatch);
                return;
            }

            if (!currentFile || !hasMetadata({ metadata: currentMetadata })) {
                this.showToast('No ready file found. Generate metadata first.', 'error');
                return;
            }

            await this._downloadSingleEmbedded(currentFile, currentMetadata);
        } catch (error) {
            console.error('[EmbeddedDownloadManager] Download failed:', error);
            this.showErrorModal('Embedded Download Failed', error.message || 'Could not embed metadata into file(s).');
        }
    }

    async downloadCurrent({ currentFile, currentMetadata }) {
        try {
            if (!currentFile || !hasMetadata({ metadata: currentMetadata })) {
                this.showToast('No current generated file found.', 'error');
                return;
            }
            await this._downloadSingleEmbedded(currentFile, currentMetadata);
        } catch (error) {
            console.error('[EmbeddedDownloadManager] Current download failed:', error);
            this.showErrorModal('Embedded Download Failed', error.message || 'Could not embed metadata into the current file.');
        }
    }

    async _downloadSingleEmbedded(file, metadata) {
        const output = await embedMetadataIntoFile(file, metadata);
        triggerBlobDownload(output.blob, sanitizeName(output.fileName, 'embedded-image'));
        if (output.note) {
            this.showToast(output.note, 'success');
        } else {
            this.showToast('Embedded file downloaded successfully.', 'success');
        }
    }

    async _downloadBatchZip(items) {
        const zip = new JSZip();
        const notes = [];
        const failures = [];
        const usedNames = new Set();
        let successCount = 0;

        for (const item of items) {
            try {
                const output = await embedMetadataIntoFile(item.file, item.metadata);
                const outputName = buildUniqueZipEntryName(output.fileName || item.file?.name || 'embedded-image', usedNames);
                zip.file(outputName, output.blob);
                successCount += 1;
                if (output.note) {
                    notes.push(`${item.file?.name || 'file'} -> ${output.note}`);
                }
            } catch (error) {
                const message = error?.message || 'Unknown embed error';
                failures.push(`${item.file?.name || 'file'} -> ${message}`);
            }
        }

        if (successCount === 0) {
            throw new Error('Could not embed metadata into any batch file.');
        }

        if (notes.length) {
            zip.file('embedding-notes.txt', notes.join('\n'));
        }
        if (failures.length) {
            zip.file('failed-embeds.txt', failures.join('\n'));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        triggerBlobDownload(zipBlob, buildZipName());
        if (failures.length) {
            this.showToast(`Batch ZIP ready (${successCount}/${items.length} embedded). Check failed-embeds.txt for issues.`, 'error');
        } else {
            this.showToast('Batch ZIP with embedded metadata is ready.', 'success');
        }
    }
}
