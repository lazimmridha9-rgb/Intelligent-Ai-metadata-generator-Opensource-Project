/**
 * OpenRouter API Interaction Module
 * Handles communication with OpenRouter's API for image analysis.
 * Uses OpenAI-compatible /chat/completions endpoint with vision support.
 * @see https://openrouter.ai/docs
 */

import { OPENROUTER_MODELS } from './openrouter-models.js';
import { parseOpenAICompatibleResponse } from '../utils/json-response-parser.js';

export class OpenRouterAPI {
    constructor() {
        this.apiBase = 'https://openrouter.ai/api/v1/chat/completions';
    }

    /**
     * Analyzes an image using OpenRouter (vision-capable model)
     * @param {string} apiKey - The user's OpenRouter API Key
     * @param {string} model - The model id (e.g. openai/gpt-4o, anthropic/claude-3-sonnet)
     * @param {string} imageBase64 - Base64 encoded image string
     * @param {string} mimeType - The mime type of the image
     * @param {string} prompt - The prompt to send to the model
     * @param {number} temperature - Model temperature (0-1)
     * @returns {Promise<Object>} - The JSON response from the API
     */
    async analyzeImage(apiKey, model, imageBase64, mimeType, prompt, temperature = 0.4, maxTokens = 4096) {
        if (!apiKey) {
            throw new Error("API Key is missing. Please configure it in Settings.");
        }

        // Validate model supports vision (basic check - full validation would require API call)
        if (!model || typeof model !== 'string') {
            throw new Error("Invalid model selected. Please choose a vision-capable model.");
        }

        // Warn if model is not in our known vision-capable list (but still allow it - user might have custom model)
        const knownVisionModel = OPENROUTER_MODELS.find(m => m.id === model);
        if (!knownVisionModel) {
            console.warn(`[OpenRouterAPI] Model "${model}" is not in the known vision-capable models list. It may not support image input.`);
        }

        console.log(`[OpenRouterAPI] Using model: ${model}`);

        const requestBody = this._buildRequestBody({
            model,
            imageBase64,
            mimeType,
            prompt,
            temperature,
            maxTokens
        });

        const headers = this._buildHeaders(apiKey);

        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw await this._handleErrorResponse(response, model);
            }

            const data = await response.json();
            try {
                return this._parseResponse(data);
            } catch (parseError) {
                console.warn('[OpenRouterAPI] Primary parse failed, attempting one repair retry...', parseError?.message || parseError);
                return await this._retryWithRepairPrompt({
                    apiKey,
                    model,
                    imageBase64,
                    mimeType,
                    prompt,
                    temperature,
                    maxTokens
                });
            }
        } catch (error) {
            console.error("OpenRouter API Error:", error);
            throw error;
        }
    }

    _buildRequestBody({ model, imageBase64, mimeType, prompt, temperature, maxTokens }) {
        return {
            model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            temperature,
            max_tokens: maxTokens,
            stream: false,
            response_format: { type: "json_object" }
        };
    }

    async _retryWithRepairPrompt({ apiKey, model, imageBase64, mimeType, prompt, temperature, maxTokens }) {
        const repairPrompt = `${prompt}\n\nCRITICAL OUTPUT REPAIR MODE:\nReturn ONLY strict valid JSON.\nNo markdown.\nNo prose.\nNo commentary.\nNo trailing commas.\nEscape newlines as \\n.`;
        const retryBody = this._buildRequestBody({
            model,
            imageBase64,
            mimeType,
            prompt: repairPrompt,
            temperature: Math.min(temperature, 0.3),
            maxTokens: Math.min(Math.max(maxTokens + 200, 900), 2500)
        });

        const retryResponse = await fetch(this.apiBase, {
            method: 'POST',
            headers: this._buildHeaders(apiKey),
            body: JSON.stringify(retryBody)
        });

        if (!retryResponse.ok) {
            throw await this._handleErrorResponse(retryResponse, model);
        }

        const retryData = await retryResponse.json();
        return this._parseResponse(retryData);
    }

    /**
     * Build request headers (auth + content type). Extensible for future API version or site URL.
     * @param {string} apiKey
     * @returns {Record<string, string>}
     */
    _buildHeaders(apiKey) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin || 'https://metadata-generator.app', // OpenRouter custom header for app identification
            'X-Title': 'Metadata Generator' // Optional app name
        };
        return headers;
    }

    /**
     * Normalize API error response into a single Error with a clear message.
     * @param {Response} response
     * @param {string} model - The model ID that was used
     * @returns {Error}
     */
    async _handleErrorResponse(response, model = 'unknown') {
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;

        try {
            const errorText = await response.text();
            console.error("OpenRouter API Error Body:", errorText);
            console.error("Model used:", model);

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error && errorData.error.message) {
                    const apiMessage = errorData.error.message;
                    errorMsg = `API Error ${response.status}: ${apiMessage}`;
                    
                    // Handle vision-specific errors (404 typically means model doesn't support vision)
                    if (response.status === 404 || 
                        apiMessage.includes('image input') || 
                        apiMessage.includes('vision') ||
                        apiMessage.includes('No endpoints found') ||
                        apiMessage.includes('does not support')) {
                        
                        // Extract model name from the model ID for display
                        const modelDisplayName = model.split('/').pop().replace(/-/g, ' ').replace(/_/g, ' ');
                        
                        errorMsg = `The model "${modelDisplayName}" (${model}) does not support image input. `;
                        errorMsg += `Please select a vision-capable model from the dropdown, such as:\n`;
                        errorMsg += `- GPT-4o (openai/gpt-4o)\n`;
                        errorMsg += `- Claude 3.7 Sonnet (anthropic/claude-3.7-sonnet)\n`;
                        errorMsg += `- Gemini 2.0 Flash (google/gemini-2.0-flash-001)`;
                    }
                }
                if (errorData.error && errorData.error.code) {
                    if (errorData.error.code === 'invalid_api_key' || response.status === 401) {
                        errorMsg = "Invalid or missing API key. Please check your OpenRouter key in Settings.";
                    }
                    if (errorData.error.code === 'rate_limit_exceeded' || response.status === 429) {
                        errorMsg = "Rate limit exceeded. Please try again in a few moments.";
                    }
                }
            } catch (e) {
                if (errorText && errorText.length < 200) {
                    errorMsg += ` - ${errorText}`;
                }
            }
        } catch (e) {
            console.warn("Could not read error response", e);
        }

        return new Error(errorMsg);
    }

    /**
     * Parses the raw API response to extract the generated JSON from the model output.
     * @param {Object} responseData - Raw response from OpenRouter
     * @returns {Object} - Parsed JSON object from the model output
     */
    _parseResponse(responseData) {
        try {
            return parseOpenAICompatibleResponse(responseData, {
                providerName: 'OpenRouter',
                autoBalance: true
            });

        } catch (error) {
            console.error("OpenRouter Response Parsing Error:", error);
            console.error("Full Response Data:", JSON.stringify(responseData, null, 2));
            throw new Error(`Failed to parse AI response. ${error.message || 'The model might not have returned valid JSON.'}`);
        }
    }
}

