import { GEMINI_MODELS } from '../gemini/gemini-models.js';
import { GROQ_MODELS } from '../groq/groq-models.js';
import { OPENROUTER_MODELS } from '../OpenRouter/openrouter-models.js';
import { storageGetItem, storageSetItem } from '../utils/safe-storage.js';

export const DEFAULT_PROVIDER = 'gemini';

export const PROVIDER_REGISTRY = {
    gemini: {
        id: 'gemini',
        label: 'Gemini API Key',
        apiKeyPageUrl: 'https://aistudio.google.com/apikey',
        apiKeyStorageKey: 'gemini_api_key',
        modelStorageKey: 'gemini_model',
        models: GEMINI_MODELS
    },
    groq: {
        id: 'groq',
        label: 'Groq API Key',
        apiKeyPageUrl: 'https://console.groq.com/keys',
        apiKeyStorageKey: 'groq_api_key',
        modelStorageKey: 'groq_model',
        models: GROQ_MODELS
    },
    openrouter: {
        id: 'openrouter',
        label: 'OpenRouter API Key',
        apiKeyPageUrl: 'https://openrouter.ai/keys',
        apiKeyStorageKey: 'openrouter_api_key',
        modelStorageKey: 'openrouter_model',
        models: OPENROUTER_MODELS
    }
};

function normalizeProvider(provider) {
    if (provider && PROVIDER_REGISTRY[provider]) return provider;
    return DEFAULT_PROVIDER;
}

export function getProviderConfig(provider) {
    return PROVIDER_REGISTRY[normalizeProvider(provider)];
}

export function getStoredProvider() {
    const storedProvider = storageGetItem('ai_provider');
    return normalizeProvider(storedProvider);
}

export function setStoredProvider(provider) {
    const normalized = normalizeProvider(provider);
    storageSetItem('ai_provider', normalized);
    return normalized;
}

export function loadProviderState(provider) {
    const config = getProviderConfig(provider);
    const models = Array.isArray(config.models) ? config.models : [];
    const apiKey = (storageGetItem(config.apiKeyStorageKey) || '').trim();
    const savedModel = storageGetItem(config.modelStorageKey) || '';
    const fallbackModel = models[0]?.id || '';
    const hasSavedModel = models.some((model) => model.id === savedModel);
    const selectedModel = hasSavedModel ? savedModel : fallbackModel;

    // Keep storage aligned with the active model list so removed models do not persist.
    if (!hasSavedModel && fallbackModel) {
        storageSetItem(config.modelStorageKey, fallbackModel);
    }

    return {
        providerId: config.id,
        label: config.label,
        apiKeyPageUrl: config.apiKeyPageUrl,
        apiKey,
        model: selectedModel,
        models
    };
}

export function saveProviderApiKey(provider, apiKey) {
    const config = getProviderConfig(provider);
    storageSetItem(config.apiKeyStorageKey, (apiKey || '').trim());
}

export function saveProviderModel(provider, modelId) {
    const config = getProviderConfig(provider);
    storageSetItem(config.modelStorageKey, modelId || '');
}
