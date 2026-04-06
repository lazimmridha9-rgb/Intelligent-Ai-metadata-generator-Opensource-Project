import assert from 'node:assert/strict';
import {
    parseJsonFromModelText,
    parseGeminiResponse,
    parseOpenAICompatibleResponse
} from '../src/js/utils/json-response-parser.js';
import { MetadataEngine } from '../src/js/metadata-engine.js';
import {
    getStoredProvider,
    setStoredProvider,
    loadProviderState,
    saveProviderApiKey,
    saveProviderModel
} from '../src/js/providers/provider-registry.js';

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }
}

global.localStorage = new MemoryStorage();

function runParserChecks() {
    const plain = parseJsonFromModelText('{"title":"ok","keywords":["a"]}');
    assert.equal(plain.title, 'ok');

    const fenced = parseJsonFromModelText('```json\n{"title":"from fence"}\n```');
    assert.equal(fenced.title, 'from fence');

    const openAiStyle = parseOpenAICompatibleResponse({
        choices: [{ message: { content: '{"description":"from openai"}' } }]
    });
    assert.equal(openAiStyle.description, 'from openai');

    const geminiStyle = parseGeminiResponse({
        candidates: [{
            content: {
                parts: [{ text: '{"filename":"image.jpg"}' }]
            }
        }]
    });
    assert.equal(geminiStyle.filename, 'image.jpg');
}

function runProviderRegistryChecks() {
    assert.equal(getStoredProvider(), 'gemini');
    assert.equal(setStoredProvider('groq'), 'groq');
    assert.equal(getStoredProvider(), 'groq');

    saveProviderApiKey('groq', ' demo-key ');
    saveProviderModel('groq', 'meta-llama/llama-4-scout-17b-16e-instruct');
    const state = loadProviderState('groq');
    assert.equal(state.apiKey, 'demo-key');
    assert.equal(state.providerId, 'groq');
    assert.ok(Array.isArray(state.models) && state.models.length > 0);
}

function runMetadataEngineChecks() {
    const engine = new MetadataEngine();
    engine.setMarketplace('adobe');
    assert.equal(engine.currentStrategy.name, 'Adobe Stock');

    const result = engine.processResult(
        { keywords: ['Cat', 'Animal', 'cat'], hashtags: ['pets', '#cute'] },
        5,
        'Cat, Studio'
    );

    assert.deepEqual(result.keywords, ['Cat', 'Studio', 'Animal']);
    assert.equal(result.hashtags, '#pets #cute');
}

runParserChecks();
runProviderRegistryChecks();
runMetadataEngineChecks();

console.log('Verification passed: parsers, provider registry, and metadata engine are working.');
