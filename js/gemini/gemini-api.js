/**
 * Gemini API Interaction Module
 * Handles communication with Google's Gemini API for image analysis.
 */

import { parseGeminiResponse } from '../utils/json-response-parser.js';

export class GeminiAPI {
    constructor() {
        // Base URL will be constructed dynamically
        this.apiBase = 'https://generativelanguage.googleapis.com/v1beta/models/';
    }

    /**
     * Analyzes an image using Gemini Vision API
     * @param {string} apiKey - The user's API Key
     * @param {string} model - The model name (e.g., gemini-1.5-pro)
     * @param {string} imageBase64 - Base64 encoded image string
     * @param {string} mimeType - The mime type of the image
     * @param {string} prompt - The prompt to send to the model
     * @returns {Promise<Object>} - The JSON response from the API
     */

    async analyzeImage(apiKey, model, imageBase64, mimeType, prompt, temperature = 0.4, maxTokens = 4096) {
        if (!apiKey) {
            throw new Error("API Key is missing. Please configure it in Settings.");
        }

        // Construct URL dynamically based on model
        const url = `${this.apiBase}${model}:generateContent?key=${apiKey}`;

        console.log(`[GeminiAPI] Requesting: ${this.apiBase}${model}:generateContent?key=***`);

        const requestBody = {
            contents: [{
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: temperature,
                topK: 32,
                topP: 1,
                maxOutputTokens: maxTokens,
                responseMimeType: "application/json"
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });


            if (!response.ok) {
                let errorMessage = `API Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    // Ignore JSON parse error
                }

                if (errorMessage.includes('API Key not found')) {
                    errorMessage = "API Key not found or invalid. Please check your key in settings.";
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            try {
                return this._parseResponse(data);
            } catch (parseError) {
                console.warn('[GeminiAPI] Primary parse failed, attempting one repair retry...', parseError?.message || parseError);
                return await this._retryWithRepairPrompt({
                    url,
                    prompt,
                    imageBase64,
                    mimeType,
                    temperature,
                    maxTokens
                });
            }

        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }

    async _retryWithRepairPrompt({ url, prompt, imageBase64, mimeType, temperature, maxTokens }) {
        const repairPrompt = `${prompt}\n\nCRITICAL OUTPUT REPAIR MODE:\nReturn ONLY strict valid JSON.\nNo markdown.\nNo prose.\nNo trailing commas.\nNo comments.\nEscape all newlines inside strings as \\n.\nIf needed, shorten fields but keep valid JSON.`;
        const repairTokens = Math.max(maxTokens, 6144);

        const retryBody = {
            contents: [{
                parts: [
                    { text: repairPrompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: Math.min(temperature, 0.3),
                topK: 32,
                topP: 1,
                maxOutputTokens: repairTokens,
                responseMimeType: "application/json"
            }
        };

        const retryResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(retryBody)
        });

        if (!retryResponse.ok) {
            let errorMessage = `Gemini retry failed: ${retryResponse.status} ${retryResponse.statusText}`;
            try {
                const errorData = await retryResponse.json();
                if (errorData?.error?.message) errorMessage = errorData.error.message;
            } catch {
                // ignore
            }
            throw new Error(errorMessage);
        }

        const retryData = await retryResponse.json();
        return this._parseResponse(retryData);
    }

    /**
     * Fetches the list of available models from the API
     * @param {string} apiKey - The user's API Key
     * @returns {Promise<Array>} - Array of model objects
     */
    async listModels(apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Failed to fetch models: ${response.statusText}`);
            }

            const data = await response.json();
            // Filter for models that support generateContent and are user-visible
            return data.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes("generateContent")
            );

        } catch (error) {
            console.error("Gemini List Models Error:", error);
            throw error;
        }
    }

    /**
     * Parses the raw API response to extract the generated text
     * @param {Object} responseData - Raw response from Gemini
     * @returns {Object} - Parsed JSON object from the model output
     */
    _parseResponse(responseData) {
        try {
            return parseGeminiResponse(responseData, {
                providerName: 'Gemini',
                autoBalance: true
            });
        } catch (error) {
            console.error("Response Parsing Error:", error);
            console.error("Full Response Data:", JSON.stringify(responseData, null, 2));
            throw new Error(`Failed to parse AI response. ${error.message || 'The model might not have returned valid JSON. Check console for details.'}`);
        }
    }
}
