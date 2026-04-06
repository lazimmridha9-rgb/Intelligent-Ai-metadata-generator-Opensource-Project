/**
 * Grok API Interaction Module
 * Handles communication with xAI's Grok API for image analysis.
 */

import { parseOpenAICompatibleResponse } from '../utils/json-response-parser.js';

export class GrokAPI {
    constructor() {
        this.apiBase = 'https://api.x.ai/v1/chat/completions';
    }

    /**
     * Analyzes an image using Grok Vision API
     * @param {string} apiKey - The user's API Key
     * @param {string} model - The model name
     * @param {string} imageBase64 - Base64 encoded image string
     * @param {string} mimeType - The mime type of the image
     * @param {string} prompt - The prompt to send to the model
     * @returns {Promise<Object>} - The JSON response from the API
     */

    async analyzeImage(apiKey, model, imageBase64, mimeType, prompt, temperature = 0.4, maxTokens = 4096) {
        if (!apiKey) {
            throw new Error("API Key is missing. Please configure it in Settings.");
        }

        const requestBody = {
            model: model,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            temperature: temperature,
            max_tokens: maxTokens,
            stream: false,
            response_format: { type: "json_object" } // Grok supports JSON mode
        };

        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMsg = `API Error: ${response.status} ${response.statusText}`;

                try {
                    const errorText = await response.text();
                    console.error("Grok API Error Body:", errorText);

                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error && errorData.error.message) {
                            errorMsg = `API Error ${response.status}: ${errorData.error.message}`;
                        } else if (errorData.message) {
                            errorMsg = `API Error ${response.status}: ${errorData.message}`;
                        }
                    } catch (e) {
                        // Use raw text if not JSON, but limit length
                        if (errorText && errorText.length < 200) {
                            errorMsg += ` - ${errorText}`;
                        }
                    }
                } catch (e) {
                    console.warn("Could not read error response", e);
                }

                // Help text for common issues
                if (response.status === 403) {
                    errorMsg += "\n\nPossibilities:\n1. Invalid API Key.\n2. Insufficient Credits.\n3. The endpoint requires a Project ID (not currently supported in this tool).";
                }

                throw new Error(errorMsg);
            }

            const data = await response.json();
            return this._parseResponse(data);

        } catch (error) {
            console.error("Grok API Error:", error);
            throw error;
        }
    }

    /**
     * Parses the raw API response to extract the generated text
     * @param {Object} responseData - Raw response from Grok
     * @returns {Object} - Parsed JSON object from the model output
     */
    _parseResponse(responseData) {
        try {
            return parseOpenAICompatibleResponse(responseData, {
                providerName: 'Grok',
                autoBalance: false
            });

        } catch (error) {
            console.error("Response Parsing Error:", error);
            console.error("Full Response Data:", JSON.stringify(responseData, null, 2));
            throw new Error(`Failed to parse AI response. ${error.message || 'The model might not have returned valid JSON.'}`);
        }
    }
}
