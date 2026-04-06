/**
 * OpenRouter Model Configuration
 * Model list, selection logic, and provider-specific settings.
 * Add new OpenRouter models here to keep the API module unchanged.
 * @see https://openrouter.ai/docs#models
 */

/** Default temperature when not overridden by the global Model Temperature control */
export const OPENROUTER_DEFAULT_TEMPERATURE = 0.4;

/**
 * Vision-capable models available via OpenRouter.
 * id = OpenRouter model id.
 * name = Display name in the UI.
 * description = Short hint for users.
 */
export const OPENROUTER_MODELS = [
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o (Vision)',
        description: 'High quality multimodal model with strong metadata output.'
    },
    {
        id: 'anthropic/claude-3.7-sonnet',
        name: 'Claude 3.7 Sonnet (Vision)',
        description: 'Excellent reasoning and image understanding for nuanced scenes.'
    },
    {
        id: 'google/gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash (Vision)',
        description: 'Fast multimodal model with strong speed-to-cost balance.'
    },
    {
        id: 'meta-llama/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision',
        description: 'Powerful open vision model option on OpenRouter.'
    }
];

/**
 * Resolve the model id to use for API calls.
 * @param {string} selectedId - Value from model dropdown
 * @param {Array<{id: string}>} models - OPENROUTER_MODELS or subset
 * @returns {string} Model id for the API
 */
export function getOpenRouterModelId(selectedId, models = OPENROUTER_MODELS) {
    const found = models.find(m => m.id === selectedId);
    return found ? found.id : (models[0]?.id || selectedId);
}
