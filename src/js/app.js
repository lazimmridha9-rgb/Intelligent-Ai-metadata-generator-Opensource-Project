import { GeminiAPI } from './gemini/gemini-api.js';
import { GroqAPI } from './groq/groq-api.js';
import { OpenRouterAPI } from './OpenRouter/openrouter-api.js';
import { MetadataEngine } from './metadata-engine.js';
import { HistoryManager } from './history-manager.js';
import { ModelTemperature } from './Model-Temperature.js';
import { MetadataAdj } from './Metadata-adj.js';
import { TagInput } from '../tag-input/tag-input.js';
import { CustomPromptManager } from './custom-prompt/custom-prompt-manager.js';
import { SpeedControl } from './speed-control/speed-control.js';
import { getMaxTokens, getBatchDelay } from './speed-control/speed-config.js';
import { showToast, showErrorModal } from './ui/feedback-ui.js';
import { updateCharCount, updateCount } from './ui/count-utils.js';
import { renderAdvancedTechnical } from './technical/advanced-technical.js';
import { EmbeddedDownloadManager } from './export/embedded-download-manager.js';
import { storageGetItem, storageSetItem } from './utils/safe-storage.js';
import {
    getStoredProvider,
    setStoredProvider,
    loadProviderState,
    saveProviderApiKey,
    saveProviderModel
} from './providers/provider-registry.js';

// Initialize modules
const api = new GeminiAPI();
const groqApi = new GroqAPI();
const openRouterApi = new OpenRouterAPI();
const engine = new MetadataEngine();
const tempControl = new ModelTemperature();
const metadataAdj = new MetadataAdj();
const customPromptManager = new CustomPromptManager('customPromptContainer');
const tagInput = new TagInput('targetKeywordsContainer', 'targetKeywords', 'targetKeywordsCount', 'clearTargetKeywordsBtn');
const speedControl = new SpeedControl();
const embeddedDownloadManager = new EmbeddedDownloadManager({ showToast, showErrorModal });
let historyManager; // Will be initialized after DOM load
const providerClients = {
    gemini: api,
    groq: groqApi,
    openrouter: openRouterApi
};
const providerMinTokens = {
    gemini: 3072,
    openrouter: 2048
};
const DIRECT_PROVIDER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTRA_IMAGE_EXTENSIONS = ['.svg', '.svgz', '.heic', '.heif', '.avif', '.bmp', '.tif', '.tiff', '.ico'];
const MAX_ANALYSIS_IMAGE_DIMENSION = 3072;

// State
let selectedProvider = getStoredProvider();
let apiKey = ''; // Will be loaded based on provider
let selectedModel = ''; // Will be loaded based on provider
// history state removed, managed by HistoryManager
let currentImageBase64 = null;
let currentMimeType = null;
let currentFile = null;
let currentMetadata = null;
let batchQueue = [];
let isProcessingBatch = false;
let activeBatchMode = 'pending';
const DEBUG_MODE =
    storageGetItem('metadata_debug_mode') === '1' ||
    new URLSearchParams(window.location.search).get('debug') === '1';

function debugLog(...args) {
    if (DEBUG_MODE) console.log(...args);
}

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const generateBtn = document.getElementById('generateBtn');
const analysisStatus = document.getElementById('analysisStatus');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyLabel = document.getElementById('apiKeyLabel');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const getApiKeyLink = document.getElementById('getApiKeyLink');
const targetKeywordsHidden = document.getElementById('targetKeywords'); // The actual value store
const toneSelect = document.getElementById('toneSelect');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const emptyState = document.getElementById('emptyState');
const resultsContent = document.getElementById('resultsContent');
const copyAllBtn = document.getElementById('copyAllBtn');
const downloadEmbeddedCurrentBtn = document.getElementById('downloadEmbeddedCurrentBtn');
const downloadEmbeddedBtn = document.getElementById('downloadEmbeddedBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const metadataPreviewCard = document.getElementById('metadataPreviewCard');
const metadataPreviewImage = document.getElementById('metadataPreviewImage');
const metadataPreviewFileType = document.getElementById('metadataPreviewFileType');
const metadataPreviewFileName = document.getElementById('metadataPreviewFileName');
const metadataPreviewSummary = document.getElementById('metadataPreviewSummary');
const metadataPreviewMime = document.getElementById('metadataPreviewMime');
const metadataPreviewSize = document.getElementById('metadataPreviewSize');
const metadataPreviewKeywordCount = document.getElementById('metadataPreviewKeywordCount');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

const batchContainer = document.getElementById('batchContainer');
const queueContainer = document.getElementById('queueContainer');
const batchList = document.getElementById('batchList');
const batchCount = document.getElementById('batchCount');
const processBatchBtn = document.getElementById('processBatchBtn');
const downloadBatchBtn = document.getElementById('downloadBatchBtn');
const retryFailedBtn = document.getElementById('retryFailedBtn');

// --- Initialization ---

function init() {
    // Restore saved config
    providerSelect.value = selectedProvider;
    loadProviderSettings();

    // Setup UI
    setupEventListeners();
    setupTabs();

    // Initialize Temperature Control
    tempControl.init();

    // Initialize Metadata Adjustments
    metadataAdj.init(saveConfigBtn.parentElement);

    // Initialize Custom Prompt Manager
    customPromptManager.init();

    // Initialize Speed Control
    const speedContainer = document.getElementById('speedControlContainer');
    if (speedContainer) {
        speedControl.init(speedContainer);
    }

    // Initialize History Manager
    historyManager = new HistoryManager({
        onLoadItem: (item) => loadHistoryItem(item)
    });
    clearOutputPreviewCard();

    // Restore Marketplace Selection
    const savedMarket = storageGetItem('marketplace_selection') || 'general';
    updateMarketplaceSelection(savedMarket);
}

function updateMarketplaceSelection(market) {
    if (!market) return;

    // UI Update
    const marketButtons = document.querySelectorAll('.marketplace-btn');
    marketButtons.forEach(b => {
        b.classList.remove('active', 'border-primary', 'bg-primary/10');
        b.classList.add('border-white/5', 'bg-slate-800/50');
        if (b.dataset.market === market) {
            b.classList.add('active', 'border-primary', 'bg-primary/10');
            b.classList.remove('border-white/5', 'bg-slate-800/50');
        }
    });

    // Engine Update
    engine.setMarketplace(market);

    // Advanced Constraints Update
    if (engine.currentStrategy && engine.currentStrategy.getDefaults) {
        metadataAdj.setDefaults(engine.currentStrategy.getDefaults());
    }

    // Persist
    storageSetItem('marketplace_selection', market);
}

function loadProviderSettings() {
    selectedProvider = setStoredProvider(providerSelect.value);
    const providerState = loadProviderState(selectedProvider);

    apiKey = providerState.apiKey;
    selectedModel = providerState.model;
    apiKeyLabel.innerText = providerState.label;
    populateModels(providerState.models);
    apiKeyInput.value = apiKey;

    if (getApiKeyLink && providerState.apiKeyPageUrl) {
        getApiKeyLink.href = providerState.apiKeyPageUrl;
        getApiKeyLink.title = `Open official ${providerState.label} page`;
    }
}

function setupEventListeners() {
    // Marketplace Selection
    const marketButtons = document.querySelectorAll('.marketplace-btn');
    marketButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const market = btn.dataset.market;
            updateMarketplaceSelection(market);

            // Visual feedback
            const marketName = btn.querySelector('span').innerText;
            showToast(`Switched to ${marketName}`, 'success');

            // Optional: If results exist, maybe prompt to regenerate?
            if (currentImageBase64) {
                // We don't auto-regenerate to save tokens, but we notify the user
            }
        });
    });

    // API Key Management
    saveConfigBtn.addEventListener('click', saveConfiguration);

    // Provider Change
    providerSelect.addEventListener('change', loadProviderSettings);

    toggleKeyBtn.addEventListener('click', () => {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        toggleKeyBtn.querySelector('i').classList.toggle('fa-eye');
        toggleKeyBtn.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // File Upload
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-slate-800/50');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-slate-800/50');
    });
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Image Management
    removeImageBtn.addEventListener('click', resetApp);
    generateBtn.addEventListener('click', processSingleImage);

    // Output Actions
    copyAllBtn.addEventListener('click', copyAllMetadata);
    downloadEmbeddedCurrentBtn.addEventListener('click', downloadCurrentEmbeddedFile);
    downloadEmbeddedBtn.addEventListener('click', downloadAllEmbeddedFiles);
    downloadJsonBtn.addEventListener('click', downloadJson);

    // History Actions
    clearHistoryBtn.addEventListener('click', () => historyManager.clear());

    // Copy Buttons for individual fields
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = e.target.closest('.group');
            let content = '';

            const editable = group.querySelector('[contenteditable="true"]');
            const tagsContainer = group.querySelector('#tagsContainer');
            const pre = group.querySelector('pre');

            if (editable) {
                content = editable.innerText;
            } else if (pre) {
                content = pre.innerText;
            } else if (tagsContainer) {
                if (currentMetadata && currentMetadata.tags) {
                    content = currentMetadata.tags.join(', ');
                } else {
                    content = Array.from(tagsContainer.querySelectorAll('.seo-tag')).map(t => t.innerText).join(', ');
                }
            }

            if (content) {
                navigator.clipboard.writeText(content);
                showToast('Copied to clipboard!', 'success');
            }
        });
    });
    // Batch Actions
    processBatchBtn.addEventListener('click', processBatchQueue);
    if (retryFailedBtn) retryFailedBtn.addEventListener('click', retryFailedBatchItems);
    downloadBatchBtn.addEventListener('click', downloadBatchCsv);

    // Character Count Listeners
    const metaTitle = document.getElementById('metaTitle');
    const metaDescription = document.getElementById('metaDescription');

    if (metaTitle) {
        metaTitle.addEventListener('input', () => {
            updateCharCount('titleCount', metaTitle.innerText.length, 60);
        });
    }

    if (metaDescription) {
        metaDescription.addEventListener('input', () => {
            updateCharCount('descCount', metaDescription.innerText.length, 160);
        });
    }

    // Social & Technical Count Listeners
    const socialCaption = document.getElementById('socialCaption');
    const socialHashtags = document.getElementById('socialHashtags');
    const altText = document.getElementById('altText');

    if (socialCaption) {
        socialCaption.addEventListener('input', () => {
            updateCharCount('socialCaptionCount', socialCaption.innerText.length, 2200); // Instagram max is 2200
        });
    }

    if (socialHashtags) {
        socialHashtags.addEventListener('input', () => {
            // Count hashtags based on # symbol
            const count = (socialHashtags.innerText.match(/#/g) || []).length;
            updateCount('hashtagCount', count, 30, 'tags'); // Instagram max tags is 30
        });
    }

    if (altText) {
        altText.addEventListener('input', () => {
            updateCharCount('altTextCount', altText.innerText.length, 125); // Recommended max alt text
        });
    }
}

function populateModels(modelsList) {
    modelSelect.innerHTML = '';
    if (!Array.isArray(modelsList) || modelsList.length === 0) {
        selectedModel = '';
        return;
    }

    modelsList.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.text = model.name;

        if (model.id === selectedModel) {
            option.selected = true;
        }

        modelSelect.appendChild(option);
    });

    // If currently selected model is not in list, select the first one
    if (!modelsList.find(m => m.id === selectedModel)) {
        selectedModel = modelsList[0].id;
        modelSelect.value = selectedModel;
        saveModelSelection();
    }
}

// --- Event Listener for Model Change ---
modelSelect.addEventListener('change', () => {
    selectedModel = modelSelect.value;
    saveModelSelection();
});

function saveModelSelection() {
    saveProviderModel(selectedProvider, selectedModel);
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update Tabs
            tabs.forEach(t => {
                t.classList.remove('active', 'text-primary');
                t.classList.add('text-slate-400');

                // Hide indicator
                const indicator = t.querySelector('.tab-indicator');
                if (indicator) {
                    indicator.classList.remove('scale-x-100', 'opacity-100');
                    indicator.classList.add('scale-x-0', 'opacity-0');
                }
            });

            // Activate current tab
            tab.classList.add('active', 'text-primary');
            tab.classList.remove('text-slate-400');

            // Show indicator
            const indicator = tab.querySelector('.tab-indicator');
            if (indicator) {
                indicator.classList.remove('scale-x-0', 'opacity-0');
                indicator.classList.add('scale-x-100', 'opacity-100');
            }

            // Update Content
            contents.forEach(content => {
                content.classList.add('hidden');
                if (content.id === `tab-${target}`) {
                    content.classList.remove('hidden');
                }
            });
        });
    });
}

// --- Configuration Logic ---

function saveConfiguration() {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (key) {
        apiKey = key;
        selectedModel = model;
        saveProviderApiKey(selectedProvider, apiKey);

        saveModelSelection();

        showToast('Configuration Saved!', 'success');

        if (currentImageBase64 && !currentMetadata) {
            processSingleImage();
        }
    } else {
        showToast('Please enter a valid API Key.', 'error');
    }
}

// --- Image Handling ---

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('border-primary', 'bg-slate-800/50');

    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
}

function isLikelyImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    const lowerName = (file.name || '').toLowerCase();
    return EXTRA_IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result || '');
        reader.onerror = () => reject(new Error(`Failed to read file: ${file?.name || 'unknown'}`));
        reader.readAsDataURL(file);
    });
}

function getResizedDimensions(width, height, maxDimension = MAX_ANALYSIS_IMAGE_DIMENSION) {
    const safeWidth = Math.max(1, width || 1);
    const safeHeight = Math.max(1, height || 1);
    const maxSide = Math.max(safeWidth, safeHeight);
    if (maxSide <= maxDimension) {
        return { width: safeWidth, height: safeHeight };
    }
    const scale = maxDimension / maxSide;
    return {
        width: Math.max(1, Math.round(safeWidth * scale)),
        height: Math.max(1, Math.round(safeHeight * scale))
    };
}

function renderFileToImage(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Unsupported or unreadable image format: ${file.name}`));
        };
        img.src = objectUrl;
    });
}

async function convertFileToPngDataUrl(file) {
    const img = await renderFileToImage(file);
    const originalWidth = img.naturalWidth || img.width || 2048;
    const originalHeight = img.naturalHeight || img.height || 2048;
    const resized = getResizedDimensions(originalWidth, originalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = resized.width;
    canvas.height = resized.height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
        throw new Error('Could not initialize canvas context for image conversion.');
    }

    // White background keeps transparency-safe output for APIs that do not preserve alpha well.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

async function normalizeImageForAnalysis(file) {
    const sourceMime = (file.type || '').toLowerCase();
    const useDirect = DIRECT_PROVIDER_MIME_TYPES.has(sourceMime);

    if (useDirect) {
        const dataUrl = await readFileAsDataURL(file);
        return {
            file,
            name: file.name,
            mimeType: sourceMime,
            base64: dataUrl.split(',')[1],
            wasConverted: false
        };
    }

    const convertedDataUrl = await convertFileToPngDataUrl(file);
    return {
        file,
        name: file.name,
        mimeType: 'image/png',
        base64: convertedDataUrl.split(',')[1],
        wasConverted: true
    };
}

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(isLikelyImageFile);

    if (validFiles.length === 0) {
        showToast('Please upload a valid image (JPG, PNG, WEBP, SVG, AVIF, BMP, TIFF, HEIC).', 'error');
        return;
    }

    const preparedFiles = [];
    for (const file of validFiles) {
        try {
            const prepared = await normalizeImageForAnalysis(file);
            preparedFiles.push(prepared);
        } catch (error) {
            console.warn('[Upload] Failed to prepare file:', file.name, error);
            showToast(`Skipped "${file.name}" (format decode failed).`, 'error');
        }
    }

    if (preparedFiles.length === 0) {
        showToast('No supported images could be processed from your selection.', 'error');
        return;
    }

    // If single file and queue is empty, treat as single mode
    if (preparedFiles.length === 1 && batchQueue.length === 0) {
        handleSingleFile(preparedFiles[0]);
        return;
    }

    // Batch Mode
    preparedFiles.forEach((prepared) => {
        const item = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            file: prepared.file,
            name: prepared.name,
            mimeType: prepared.mimeType,
            base64: prepared.base64,
            status: 'pending',
            metadata: null
        };
        batchQueue.push(item);
    });

    updateBatchUI();
    const convertedCount = preparedFiles.filter(f => f.wasConverted).length;
    if (convertedCount > 0) {
        showToast(`Added ${preparedFiles.length} images (${convertedCount} auto-converted for API support).`, 'success');
    } else {
        showToast(`Added ${preparedFiles.length} images to queue`, 'success');
    }
}

function handleSingleFile(preparedFile) {
    currentMimeType = preparedFile.mimeType;
    currentFile = preparedFile.file;
    currentImageBase64 = preparedFile.base64;
    clearOutputPreviewCard();

    // Show Preview
    imagePreview.src = `data:${preparedFile.mimeType};base64,${preparedFile.base64}`;
    dropZone.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    if (queueContainer) queueContainer.classList.remove('hidden');
    generateBtn.classList.remove('hidden');

    // Reset batch UI if we switched back to single mode
    batchContainer.classList.add('hidden');
    batchQueue = [];

    if (preparedFile.wasConverted) {
        showToast('Image normalized to PNG for broader AI provider compatibility.', 'success');
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);
    const precision = unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function getFileExtension(fileName) {
    const ext = fileName?.split('.').pop()?.trim();
    if (!ext || ext === fileName) return 'FILE';
    return ext.toUpperCase();
}

function clearOutputPreviewCard() {
    if (!metadataPreviewCard) return;

    metadataPreviewCard.classList.add('hidden');

    if (metadataPreviewImage) metadataPreviewImage.src = '';
    if (metadataPreviewFileType) metadataPreviewFileType.innerText = 'IMAGE';
    if (metadataPreviewFileName) metadataPreviewFileName.innerHTML = 'No file selected';
    if (metadataPreviewSummary) metadataPreviewSummary.innerHTML = 'Run metadata generation to see a clean preview with output details.';
    if (metadataPreviewMime) metadataPreviewMime.innerHTML = '<i class="fa-solid fa-code mr-1.5 opacity-60"></i> Format: -';
    if (metadataPreviewSize) metadataPreviewSize.innerHTML = '<i class="fa-solid fa-weight-hanging mr-1.5 opacity-60"></i> Size: -';
    if (metadataPreviewKeywordCount) metadataPreviewKeywordCount.innerHTML = '<i class="fa-solid fa-tags mr-1.5 opacity-60"></i> Keywords: 0';
}

function updateOutputPreviewCard(data = {}) {
    if (!metadataPreviewCard) return;

    const hasImage = Boolean(currentImageBase64 && currentMimeType);
    if (!hasImage) {
        clearOutputPreviewCard();
        return;
    }

    const safeMime = currentMimeType || currentFile?.type || 'image';
    const extension = currentFile?.name ? getFileExtension(currentFile.name) : safeMime.replace('image/', '').toUpperCase();
    const keywords = Array.isArray(data.keywords) ? data.keywords : (Array.isArray(data.tags) ? data.tags : []);
    const title = (data.title || data.seoTitle || '').toString().trim();
    const description = (data.description || data.metaDescription || '').toString().trim();

    metadataPreviewCard.classList.remove('hidden');
    if (metadataPreviewImage) metadataPreviewImage.src = `data:${currentMimeType};base64,${currentImageBase64}`;
    if (metadataPreviewFileType) metadataPreviewFileType.innerText = extension || 'IMAGE';
    if (metadataPreviewFileName) {
        const fileName = currentFile?.name || data.filename || data.suggestedFilename || 'Generated metadata image';
        metadataPreviewFileName.innerHTML = `<i class="fa-solid fa-file-image text-blue-400/80 mr-1"></i> ${fileName}`;
    }
    if (metadataPreviewSummary) {
        if (title || description) {
            const titleSnippet = title ? `<span class="text-white font-semibold">Title:</span> ${title}` : '';
            const descSnippet = description ? `<span class="text-white font-semibold">Description:</span> ${description}` : '';
            const summaryText = [titleSnippet, descSnippet].filter(Boolean).join(' | ');
            metadataPreviewSummary.innerHTML = summaryText;
        } else {
            metadataPreviewSummary.innerHTML = `<i class="fa-solid fa-circle-info mr-2 opacity-50"></i> Preview synced with your latest generated metadata output.`;
        }
    }
    if (metadataPreviewMime) metadataPreviewMime.innerHTML = `<i class="fa-solid fa-code mr-1.5 opacity-60"></i> Format: <span class="text-white">${(safeMime || '-').toUpperCase()}</span>`;
    if (metadataPreviewSize) metadataPreviewSize.innerHTML = `<i class="fa-solid fa-weight-hanging mr-1.5 opacity-60"></i> Size: <span class="text-white">${formatFileSize(currentFile?.size || 0)}</span>`;
    if (metadataPreviewKeywordCount) metadataPreviewKeywordCount.innerHTML = `<i class="fa-solid fa-tags mr-1.5 opacity-60"></i> Keywords: <span class="text-white">${keywords.length}</span>`;
}

function updateBatchUI() {
    if (batchQueue.length === 0) {
        batchContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
        return;
    }

    dropZone.classList.add('hidden');
    previewContainer.classList.add('hidden');
    generateBtn.classList.add('hidden');
    batchContainer.classList.remove('hidden');
    if (queueContainer) queueContainer.classList.remove('hidden');

    const fileLabel = batchQueue.length === 1 ? 'file' : 'files';
    batchCount.innerText = `${batchQueue.length} ${fileLabel}`;

    batchList.innerHTML = '';
    batchQueue.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `batch-item ${item.status === 'done' ? 'is-done' : ''} ${item.status === 'processing' ? 'is-processing' : ''}`;

        let statusIcon = '<i class="fa-regular fa-clock text-slate-500"></i>';
        let statusLabel = 'Pending';
        if (item.status === 'processing') statusIcon = '<i class="fa-solid fa-circle-notch fa-spin text-primary"></i>';
        if (item.status === 'processing') statusLabel = 'Processing';
        if (item.status === 'done') statusIcon = '<i class="fa-solid fa-check text-green-400"></i>';
        if (item.status === 'done') statusLabel = 'Done';
        if (item.status === 'error') statusIcon = '<i class="fa-solid fa-triangle-exclamation text-red-500"></i>';
        if (item.status === 'error') statusLabel = 'Error';

        const safeName = escapeHtml(item.name || 'Unnamed file');
        const fileSizeText = formatFileSize(item.file?.size || 0);
        const extension = getFileExtension(item.name);

        div.innerHTML = `
            <div class="batch-item-main">
                <div class="batch-thumb" style="background-image: url(data:${item.mimeType};base64,${item.base64})"></div>
                <div class="batch-item-copy">
                    <p class="batch-file-name" title="${safeName}">${safeName}</p>
                    <div class="batch-file-meta">
                        <span class="batch-file-ext">${extension}</span>
                        <span class="batch-file-size">${fileSizeText}</span>
                    </div>
                </div>
            </div>
            <div class="batch-item-actions">
                <span class="batch-status batch-status--${item.status}">
                    ${statusIcon}
                    <span class="status-label">${statusLabel}</span>
                </span>
                <button class="batch-remove-btn" onclick="removeFromBatch(${index}, event)" ${isProcessingBatch ? 'disabled' : ''} title="Remove file">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;

        div.addEventListener('click', () => loadBatchItemResults(index));
        batchList.appendChild(div);
    });

    // Enable/Disable buttons
    const hasPending = batchQueue.some(i => i.status === 'pending');
    const failedCount = batchQueue.filter(i => i.status === 'error').length;
    processBatchBtn.disabled = !hasPending || isProcessingBatch;
    processBatchBtn.innerHTML = isProcessingBatch ?
        '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...' :
        '<i class="fa-solid fa-bolt mr-2"></i> Process Batch';
    if (retryFailedBtn) {
        retryFailedBtn.classList.toggle('hidden', failedCount === 0);
        retryFailedBtn.disabled = isProcessingBatch;
        if (isProcessingBatch && activeBatchMode === 'retry') {
            retryFailedBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Retrying Failed...';
        } else {
            const label = failedCount === 1 ? 'File' : 'Files';
            retryFailedBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Retry Failed ${label} (${failedCount})`;
        }
    }

    const allDone = batchQueue.length > 0 && batchQueue.every(i => i.status === 'done');
    if (allDone) {
        downloadBatchBtn.classList.remove('hidden');
        downloadBatchBtn.disabled = false;
    } else {
        downloadBatchBtn.classList.add('hidden');
    }

    updateEmbeddedDownloadState();
}

// Global helper for inline onclick
window.removeFromBatch = function (index, e) {
    if (isProcessingBatch) return;
    e.stopPropagation();
    batchQueue.splice(index, 1);
    updateBatchUI();
    if (batchQueue.length === 0) {
        resetApp();
    }
};

function loadBatchItemResults(index) {
    const item = batchQueue[index];
    if (!item) return;

    // Set current context for technical analysis/export
    currentImageBase64 = item.base64;
    currentMimeType = item.mimeType;
    currentFile = item.file || null;

    // Update preview
    imagePreview.src = `data:${item.mimeType};base64,${item.base64}`;
    dropZone.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    if (queueContainer) queueContainer.classList.remove('hidden');
    generateBtn.classList.add('hidden'); // Hide generate button in batch mode preview

    // Update metadata if exists
    if (item.metadata) {
        currentMetadata = item.metadata;
        displayResults(item.metadata);
    } else {
        currentMetadata = null;
        // Clear results if not processed
        resultsContent.classList.add('hidden');
        emptyState.classList.remove('hidden');
        analysisStatus.classList.add('hidden');
        clearOutputPreviewCard();
        updateEmbeddedCurrentDownloadState();
        updateEmbeddedDownloadState();
    }
}

function resetApp() {
    currentImageBase64 = null;
    currentMetadata = null;
    currentFile = null;
    batchQueue = [];
    fileInput.value = '';
    dropZone.classList.remove('hidden');
    dropZone.classList.remove('border-primary', 'bg-slate-800/50');

    previewContainer.classList.add('hidden');
    batchContainer.classList.add('hidden');
    if (queueContainer) queueContainer.classList.add('hidden');

    // Reset Output
    resultsContent.classList.add('hidden');
    emptyState.classList.remove('hidden');
    analysisStatus.classList.add('hidden');

    // Clear fields
    document.querySelectorAll('[contenteditable="true"]').forEach(el => el.innerText = '');
    document.getElementById('tagsContainer').innerHTML = '';
    document.getElementById('structuredData').innerText = '';
    clearOutputPreviewCard();
    const seoHeadSnippet = document.getElementById('seoHeadSnippet');
    if (seoHeadSnippet) seoHeadSnippet.innerText = '';
    const colorPaletteChips = document.getElementById('colorPaletteChips');
    if (colorPaletteChips) colorPaletteChips.innerHTML = '';

    copyAllBtn.disabled = true;
    downloadEmbeddedCurrentBtn.disabled = true;
    downloadEmbeddedBtn.disabled = true;
    downloadJsonBtn.disabled = true;
}

// --- Analysis Logic ---

async function processSingleImage() {
    if (!currentImageBase64 || !currentMimeType) {
        showToast('Please upload an image first.', 'error');
        return;
    }

    await runAnalysis(currentImageBase64, currentMimeType, (data) => {
        currentMetadata = data;
        displayResults(data);
        historyManager.add(data, currentImageBase64, currentMimeType);
    });
}

async function processBatchQueue() {
    await processBatchQueueByStatus(['pending']);
}

async function retryFailedBatchItems() {
    await processBatchQueueByStatus(['error']);
}

async function processBatchQueueByStatus(targetStatuses = ['pending']) {
    if (!apiKey) {
        showToast('Please configure your API Key first.', 'error');
        apiKeyInput.focus();
        return;
    }

    const targetSet = new Set(targetStatuses);
    const targetIndexes = batchQueue
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => targetSet.has(item.status))
        .map(({ index }) => index);

    if (targetIndexes.length === 0) {
        if (targetSet.has('error')) {
            showToast('No failed files to retry.', 'error');
        } else {
            showToast('No pending files to process.', 'error');
        }
        return;
    }

    activeBatchMode = targetSet.has('error') && targetSet.size === 1 ? 'retry' : 'pending';
    isProcessingBatch = true;
    updateBatchUI();
    removeImageBtn.disabled = true;
    let failedCount = 0;
    let hasRenderedFirstSuccess = false;

    for (let i = 0; i < targetIndexes.length; i++) {
        const queueIndex = targetIndexes[i];
        const item = batchQueue[queueIndex];
        if (!item) continue;

        item.status = 'processing';
        updateBatchUI();

        // Keep preview synced with current processing item.
        // After the first successful output is shown, do not clear output card on next items.
        if (!hasRenderedFirstSuccess) {
            loadBatchItemResults(queueIndex);
            emptyState.classList.add('hidden');
        } else {
            currentImageBase64 = item.base64;
            currentMimeType = item.mimeType;
            currentFile = item.file || null;
            imagePreview.src = `data:${item.mimeType};base64,${item.base64}`;
            dropZone.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            if (queueContainer) queueContainer.classList.remove('hidden');
            generateBtn.classList.add('hidden');
        }
        analysisStatus.classList.remove('hidden');

        try {
            await runAnalysis(item.base64, item.mimeType, (data) => {
                item.metadata = data;
                item.status = 'done';
                historyManager.add(data, item.base64, item.mimeType);

                // In batch mode, show the first successful result immediately in output panel.
                if (!hasRenderedFirstSuccess) {
                    currentImageBase64 = item.base64;
                    currentMimeType = item.mimeType;
                    currentFile = item.file || null;
                    imagePreview.src = `data:${item.mimeType};base64,${item.base64}`;
                    currentMetadata = data;
                    displayResults(data);
                    hasRenderedFirstSuccess = true;
                }
            });
        } catch (error) {
            console.error(error);
            item.status = 'error';
            failedCount += 1;
        }

        updateBatchUI();
        // Speed-based delay to avoid rate limits (faster speeds = shorter delays)
        const currentSpeed = speedControl.getSpeed();
        const batchDelay = getBatchDelay(currentSpeed);
        debugLog(`[Batch] Processed ${i + 1}/${targetIndexes.length}, waiting ${batchDelay}ms (Speed: ${currentSpeed})`);
        await new Promise(r => setTimeout(r, batchDelay));
    }

    isProcessingBatch = false;
    activeBatchMode = 'pending';
    updateBatchUI();
    removeImageBtn.disabled = false;
    if (hasRenderedFirstSuccess && currentMetadata) {
        displayResults(currentMetadata);
    }
    if (targetSet.has('error') && targetSet.size === 1) {
        const retriedCount = targetIndexes.length;
        const successCount = retriedCount - failedCount;
        if (failedCount === 0) {
            showToast(`Retry complete! ${successCount}/${retriedCount} failed files recovered.`, 'success');
        } else {
            showToast(`Retry complete: ${successCount} fixed, ${failedCount} still failed.`, 'error');
        }
    } else {
        const pendingProcessed = targetIndexes.length;
        if (failedCount === 0) {
            showToast(`Batch processing complete! ${pendingProcessed}/${pendingProcessed} succeeded.`, 'success');
        } else {
            showToast(`Batch complete with issues: ${pendingProcessed - failedCount} succeeded, ${failedCount} failed.`, 'error');
        }
    }
}

async function runAnalysis(base64, mimeType, onSuccess) {
    if (!apiKey) {
        showToast('Please configure your API Key first.', 'error');
        throw new Error("No API Key");
    }
    if (!base64 || !mimeType) {
        showToast('Please upload a valid image before generating metadata.', 'error');
        throw new Error("No image data");
    }

    // UI Loading State (for single view)
    analysisStatus.classList.remove('hidden');
    generateBtn.classList.add('hidden'); // Hide button during processing
    emptyState.classList.add('hidden');
    // In batch mode, keep currently shown successful output visible while next items process.
    if (!isProcessingBatch || !currentMetadata) {
        resultsContent.classList.add('hidden');
    }

    try {
        const adjValues = metadataAdj.getValues();
        debugLog('App: Retrieving Advanced Constraints:', adjValues);

        tagInput.commitPendingInput();
        let prompt = engine.getPrompt({
            keywords: targetKeywordsHidden.value,
            tone: toneSelect.value,
            customPrompt: customPromptManager.getPrompt(),
            ...adjValues
        });
        prompt += `\n\n### DEEP ANALYSIS MODE (MANDATORY)\n`;
        prompt += `- Perform layered analysis: subject, scene context, visual hierarchy, composition, lighting, color psychology, commercial intent, and buyer search behavior.\n`;
        prompt += `- Prioritize high-converting stock metadata: strong primary keyword placement, semantic variants, and long-tail intent.\n`;
        prompt += `- Ensure title/description/keywords are not generic. Use precise, commercially meaningful terms.\n`;
        prompt += `- Return complete "strategy" object with actionable depth in every section.\n`;
        
        debugLog(`[Generation] Prompt length: ${prompt.length} chars`);

        const currentTemp = tempControl.getTemperature();
        const currentSpeed = speedControl.getSpeed();
        const speedConfig = speedControl.getSpeedConfig();
        const speedBasedMaxTokens = getMaxTokens(currentSpeed);
        const minTokensForProvider = providerMinTokens[selectedProvider] || 0;
        const maxTokens = Math.max(speedBasedMaxTokens, minTokensForProvider);
        
        debugLog(`[Generation] Starting analysis with:`);
        debugLog(`  - Model Temperature: ${currentTemp}`);
        debugLog(`  - Speed: ${currentSpeed} (${speedConfig.name})`);
        debugLog(`  - Max Tokens: ${maxTokens} (speed base: ${speedBasedMaxTokens})`);
        debugLog(`  - Batch Delay: ${speedConfig.batchDelay}ms`);

        const providerClient = providerClients[selectedProvider];
        if (!providerClient || typeof providerClient.analyzeImage !== 'function') {
            throw new Error(`Unknown AI provider: ${selectedProvider}. Please select a provider in Settings.`);
        }

        const data = await providerClient.analyzeImage(
            apiKey,
            selectedModel,
            base64,
            mimeType,
            prompt,
            currentTemp,
            maxTokens
        );

        const processedData = engine.processResult(
            data,
            adjValues.keywordsCount,
            targetKeywordsHidden.value,
            adjValues
        );

        onSuccess(processedData);

    } catch (error) {
        showErrorModal('Analysis Failed', error.message);
        analysisStatus.classList.add('hidden');
        throw error;
    } finally {
        if (!isProcessingBatch && batchQueue.length === 0 && currentImageBase64) {
            generateBtn.classList.remove('hidden');
        }
    }
}

function displayResults(data) {
    // Hide loading
    analysisStatus.classList.add('hidden');
    emptyState.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    copyAllBtn.disabled = false;
    updateEmbeddedCurrentDownloadState();
    downloadJsonBtn.disabled = false;
    updateEmbeddedDownloadState();
    updateOutputPreviewCard(data);

    // Fill fields - Use new keys with fallbacks
    const title = data.title || data.seoTitle || '';
    const description = data.description || data.metaDescription || '';

    document.getElementById('metaTitle').innerText = title;
    document.getElementById('metaDescription').innerText = description;

    updateCharCount('titleCount', title.length, 60);
    updateCharCount('descCount', description.length, 160);

    const caption = data.socialCaption || '';
    document.getElementById('socialCaption').innerText = caption;
    updateCharCount('socialCaptionCount', caption.length, 2200);

    const hashtags = data.hashtags || '';
    const socialHashtags = document.getElementById('socialHashtags');
    if (socialHashtags) {
        socialHashtags.innerText = hashtags;
        const count = (hashtags.match(/#/g) || []).length;
        updateCount('hashtagCount', count, 30, 'tags');
    }

    const suggestedFilename = document.getElementById('suggestedFilename');
    if (suggestedFilename) suggestedFilename.innerText = data.filename || data.suggestedFilename || '';

    const suggestedCategory = document.getElementById('suggestedCategory');
    if (suggestedCategory) suggestedCategory.innerText = data.category || data.suggestedCategory || '';

    const alt = data.altText || '';
    const altText = document.getElementById('altText');
    if (altText) {
        altText.innerText = alt;
        updateCharCount('altTextCount', alt.length, 125);
    }

    const technicalStats = document.getElementById('technicalStats');
    if (technicalStats) technicalStats.innerText = data.technicalStats || '';

    // Technical tab (advanced): show the same estimated stats there too
    const aiTechnicalStats = document.getElementById('aiTechnicalStats');
    if (aiTechnicalStats) aiTechnicalStats.innerText = data.technicalStats || '';

    const aiReasoning = document.getElementById('aiReasoning');
    const strategy = data.strategy && typeof data.strategy === 'object' ? data.strategy : null;
    if (aiReasoning) aiReasoning.innerText = (data.reasoning || strategy?.summary || 'Strategy data not returned by AI.');

    // Advanced Strategy Rendering (safe fallbacks)
    const strategySummaryEl = document.getElementById('strategySummary');
    if (strategySummaryEl) {
        strategySummaryEl.innerText = strategy?.summary || '';
    }

    const stepsEl = document.getElementById('strategySteps');
    if (stepsEl) {
        const steps = Array.isArray(strategy?.stepByStep) ? strategy.stepByStep : [];
        stepsEl.innerText = steps.length
            ? steps.map(s => {
                const stepNum = (s?.step ?? '').toString().trim();
                const name = (s?.name ?? '').toString().trim();
                const details = (s?.details ?? '').toString().trim();
                const header = `${stepNum ? `${stepNum}. ` : ''}${name || 'Step'}`.trim();
                return details ? `${header}\n- ${details}` : header;
            }).join('\n\n')
            : '';
    }

    const clustersEl = document.getElementById('keywordClusters');
    if (clustersEl) {
        const clusters = Array.isArray(strategy?.keywordClusters) ? strategy.keywordClusters : [];
        clustersEl.innerText = clusters.length
            ? clusters.map(c => {
                const clusterName = (c?.cluster ?? '').toString().trim() || 'Cluster';
                const kws = Array.isArray(c?.keywords) ? c.keywords : [];
                return `${clusterName}: ${kws.filter(Boolean).join(', ')}`;
            }).join('\n')
            : '';
    }

    const scoresEl = document.getElementById('topKeywordScores');
    if (scoresEl) {
        const scores = Array.isArray(strategy?.topKeywordScores) ? strategy.topKeywordScores : [];
        const formula = (strategy?.keywordFormula ?? '').toString().trim();
        const header = formula ? `Formula: ${formula}\n\n` : '';
        scoresEl.innerText = scores.length
            ? header + scores.map(s => {
                const kw = (s?.keyword ?? '').toString().trim();
                const score = (s?.score ?? '').toString().trim();
                const why = (s?.why ?? '').toString().trim();
                const line = `${kw}${score ? ` - ${score}/100` : ''}`.trim();
                return why ? `${line}\n- ${why}` : line;
            }).join('\n\n')
            : header.trim();
    }

    const complianceEl = document.getElementById('strategyCompliance');
    if (complianceEl) {
        const compliance = strategy?.compliance && typeof strategy.compliance === 'object' ? strategy.compliance : null;
        if (!compliance) {
            complianceEl.innerText = '';
        } else {
            const titleChars = compliance.titleChars ?? '';
            const descChars = compliance.descChars ?? '';
            const kwTarget = compliance.keywordTarget ?? '';
            const notes = Array.isArray(compliance.notes) ? compliance.notes : [];
            const lines = [];
            if (titleChars !== '') lines.push(`Title target chars: ${titleChars}`);
            if (descChars !== '') lines.push(`Description target chars: ${descChars}`);
            if (kwTarget !== '') lines.push(`Keyword target: ${kwTarget}`);
            if (notes.length) {
                lines.push('');
                lines.push('Checks:');
                lines.push(...notes.filter(Boolean).map(n => `- ${n}`));
            }
            complianceEl.innerText = lines.join('\n');
        }
    }

    const titleScoreEl = document.getElementById('titleScoreBreakdown');
    if (titleScoreEl) {
        const ts = strategy?.titleScoreBreakdown && typeof strategy.titleScoreBreakdown === 'object' ? strategy.titleScoreBreakdown : null;
        if (!ts) {
            titleScoreEl.innerText = '';
        } else {
            const ctr = ts.ctrScore ?? '';
            const seo = ts.seoScore ?? '';
            const clarity = ts.clarityScore ?? '';
            const uniq = ts.uniquenessScore ?? '';
            const why = Array.isArray(ts.why) ? ts.why : [];
            const improvements = Array.isArray(ts.improvements) ? ts.improvements : [];

            const lines = [];
            lines.push(`CTR: ${ctr}/100`);
            lines.push(`SEO: ${seo}/100`);
            lines.push(`Clarity: ${clarity}/100`);
            lines.push(`Uniqueness: ${uniq}/100`);
            if (why.length) {
                lines.push('');
                lines.push('Why:');
                lines.push(...why.filter(Boolean).map(w => `- ${w}`));
            }
            if (improvements.length) {
                lines.push('');
                lines.push('Improvements:');
                lines.push(...improvements.filter(Boolean).map(i => `- ${i}`));
            }
            titleScoreEl.innerText = lines.join('\n');
        }
    }

    const orderingEl = document.getElementById('keywordOrderingPlan');
    if (orderingEl) {
        const kp = strategy?.keywordOrderingPlan && typeof strategy.keywordOrderingPlan === 'object' ? strategy.keywordOrderingPlan : null;
        if (!kp) {
            orderingEl.innerText = '';
        } else {
            const marketplace = (kp.marketplace ?? '').toString().trim();
            const windowText = (kp.primaryWindow ?? '').toString().trim();
            const primary = Array.isArray(kp.primaryKeywords) ? kp.primaryKeywords : [];
            const secondary = Array.isArray(kp.secondaryKeywords) ? kp.secondaryKeywords : [];
            const longTail = Array.isArray(kp.longTailKeywords) ? kp.longTailKeywords : [];
            const excluded = Array.isArray(kp.excludedOrRisky) ? kp.excludedOrRisky : [];

            const lines = [];
            if (marketplace) lines.push(`Marketplace: ${marketplace}`);
            if (windowText) lines.push(`Primary window: ${windowText}`);

            if (primary.length) {
                lines.push('');
                lines.push('Primary keywords (exact order):');
                lines.push(primary.filter(Boolean).map((k, idx) => `${idx + 1}. ${k}`).join('\n'));
            }
            if (secondary.length) {
                lines.push('');
                lines.push('Secondary keywords:');
                lines.push(secondary.filter(Boolean).join(', '));
            }
            if (longTail.length) {
                lines.push('');
                lines.push('Long-tail keywords:');
                lines.push(longTail.filter(Boolean).join(', '));
            }
            if (excluded.length) {
                lines.push('');
                lines.push('Excluded / risky:');
                lines.push(excluded.filter(Boolean).map(x => `- ${x}`).join('\n'));
            }

            orderingEl.innerText = lines.join('\n');
        }
    }

    // Create basic JSON-LD if not provided by AI
    const jsonLd = data.jsonLd || {
        "@context": "https://schema.org/",
        "@type": "ImageObject",
        "contentUrl": "URL_TO_IMAGE",
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "acquireLicensePage": "URL_TO_LICENSE_PAGE",
        "creditText": "Image Credit",
        "creator": {
            "@type": "Person",
            "name": "Creator Name"
        },
        "copyrightNotice": "Copyright 2026",
        "name": data.title || data.seoTitle,
        "description": data.description || data.metaDescription
    };

    const structuredData = document.getElementById('structuredData');
    if (structuredData) {
        structuredData.innerText = JSON.stringify(jsonLd, null, 2);
    }

    // Advanced Technical (calculated locally + SEO head snippet)
    renderAdvancedTechnical({
        base64: currentImageBase64,
        mimeType: currentMimeType,
        file: currentFile,
        metadata: data,
        jsonLd
    }).catch(err => console.warn('[Technical] Failed to render advanced technical:', err));

    // Keywords / Tags
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';
    const keywords = data.keywords || data.tags || [];

    // Update count
    const keywordCountEl = document.getElementById('keywordCount');
    if (keywordCountEl) {
        const activeTarget = Math.max(1, parseInt(metadataAdj.getValues()?.keywordsCount, 10) || 1);
        keywordCountEl.innerText = `${keywords.length}/${activeTarget}`;
        keywordCountEl.classList.remove('hidden');
        if (keywords.length > activeTarget) {
            keywordCountEl.classList.add('text-red-400', 'bg-red-500/10');
            keywordCountEl.classList.remove('text-blue-400', 'bg-blue-500/10');
        } else {
            keywordCountEl.classList.remove('text-red-400', 'bg-red-500/10');
            keywordCountEl.classList.add('text-blue-400', 'bg-blue-500/10');
        }
    }

    if (Array.isArray(keywords)) {
        keywords.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'seo-tag bg-slate-800 text-blue-400 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-700 transition-colors';
            span.innerText = tag;
            tagsContainer.appendChild(span);
        });
    }
}

function updateEmbeddedCurrentDownloadState() {
    const hasCurrent = Boolean(currentMetadata && currentFile);
    downloadEmbeddedCurrentBtn.disabled = !hasCurrent;
}

function updateEmbeddedDownloadState() {
    if (batchQueue.length > 0) {
        const hasBatchOutput = batchQueue.every(item => item.status === 'done' && item.metadata && item.file);
        downloadEmbeddedBtn.disabled = !hasBatchOutput;
        return;
    }

    const hasSingleOutput = Boolean(currentMetadata && currentFile);
    downloadEmbeddedBtn.disabled = !hasSingleOutput;
}

// --- Export Logic ---

function copyAllMetadata() {
    if (!currentMetadata) return;
    const text = JSON.stringify(currentMetadata, null, 2);
    navigator.clipboard.writeText(text);
    showToast('All metadata copied to clipboard!', 'success');
}

function downloadJson() {
    if (!currentMetadata) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentMetadata, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", (currentMetadata.suggestedFilename || "metadata") + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function downloadAllEmbeddedFiles() {
    await embeddedDownloadManager.downloadAll({
        currentFile,
        currentMetadata,
        batchQueue
    });
}

async function downloadCurrentEmbeddedFile() {
    await embeddedDownloadManager.downloadCurrent({
        currentFile,
        currentMetadata
    });
}

function downloadBatchCsv() {
    const processedItems = batchQueue.filter(item => item.status === 'done' && item.metadata);

    if (processedItems.length === 0) {
        showToast('No processed items to export.', 'error');
        return;
    }

    // Define CSV Headers
    const headers = ['Original Filename', 'Title', 'Description', 'Keywords', 'Category', 'Social Caption', 'Hashtags', 'Suggested Filename', 'Alt Text'];

    // Construct CSV Content
    let csvContent = headers.join(',') + '\n';

    processedItems.forEach(item => {
        const m = item.metadata;

        // Helper to escape CSV fields
        const escape = (text) => {
            if (!text) return '';
            const stringified = String(text);
            // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
            if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
                return `"${stringified.replace(/"/g, '""')}"`;
            }
            return stringified;
        };

        const row = [
            escape(item.name),
            escape(m.title || m.seoTitle),
            escape(m.description || m.metaDescription),
            escape((m.keywords || m.tags || []).join(', ')),
            escape(m.category || m.suggestedCategory),
            escape(m.socialCaption),
            escape(m.hashtags),
            escape(m.filename || m.suggestedFilename),
            escape(m.altText)
        ];

        csvContent += row.join(',') + '\n';
    });

    // Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `metadata_batch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function loadHistoryItem(item) {
    currentImageBase64 = item.image || null;
    currentMimeType = item.mimeType || null;
    currentMetadata = item.metadata;
    currentFile = null;

    // Update Preview if image payload is available in history entry
    if (currentImageBase64 && currentMimeType) {
        imagePreview.src = `data:${currentMimeType};base64,${currentImageBase64}`;
        dropZone.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    } else {
        previewContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }
    if (queueContainer) queueContainer.classList.remove('hidden');
    generateBtn.classList.add('hidden'); // Hide generate button as we have results

    // Update Results
    displayResults(currentMetadata);
    if (currentImageBase64 && currentMimeType) {
        showToast('History item loaded!');
    } else {
        showToast('History metadata loaded (preview unavailable).');
    }
}

// Start Application
init();


