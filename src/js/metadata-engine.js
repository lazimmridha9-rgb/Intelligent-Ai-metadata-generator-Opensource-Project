import { GeneralMarketplace } from './MicroStock-Market/general.js';
import { AdobeMarketplace } from './MicroStock-Market/adobe.js';
import { ShutterstockMarketplace } from './MicroStock-Market/shutterstock.js';
import { IStockMarketplace } from './MicroStock-Market/istock.js';
import { GettyMarketplace } from './MicroStock-Market/getty.js';
import { Pond5Marketplace } from './MicroStock-Market/pond5.js';
import { CreativeFabricaMarketplace } from './MicroStock-Market/creativefabrica.js';
import { VecteezyMarketplace } from './MicroStock-Market/vecteezy.js';
import { FreepikMarketplace } from './MicroStock-Market/freepik.js';

/**
 * Metadata Engine
 * Constructs the complex prompts for deep analysis and structures the output.
 */

export class MetadataEngine {
    constructor() {
        this.strategies = {
            'general': new GeneralMarketplace(),
            'adobe': new AdobeMarketplace(),
            'shutterstock': new ShutterstockMarketplace(),
            'istock': new IStockMarketplace(),
            'getty': new GettyMarketplace(),
            'pond5': new Pond5Marketplace(),
            'creativefabrica': new CreativeFabricaMarketplace(),
            'vecteezy': new VecteezyMarketplace(),
            'freepik': new FreepikMarketplace()
        };
        this.currentStrategy = this.strategies['general'];
    }

    setMarketplace(marketplaceId) {
        if (this.strategies[marketplaceId]) {
            this.currentStrategy = this.strategies[marketplaceId];
            console.log(`Metadata Engine: Switched to ${this.currentStrategy.name}`);
        } else {
            console.warn(`Metadata Engine: Marketplace ${marketplaceId} not found, defaulting to General.`);
            this.currentStrategy = this.strategies['general'];
        }
    }

    /**
     * Generates the full prompt for the API
     * @param {Object} options - Configuration options
     * @returns {string} The prompt text
     */
    getPrompt(options = {}) {
        let prompt = this.currentStrategy.getPrompt(options);

        // Append Custom User Prompt if available with STRONG EMPHASIS
        if (options.customPrompt && options.customPrompt.trim().length > 0) {
            prompt += `\n\n${'='.repeat(80)}\n`;
            prompt += `⚡ CRITICAL: USER CUSTOM INSTRUCTIONS - HIGHEST PRIORITY ⚡\n`;
            prompt += `${'='.repeat(80)}\n\n`;
            prompt += `The user has provided the following MANDATORY instructions that OVERRIDE all general guidelines.\n`;
            prompt += `You MUST strictly follow these requirements in your analysis and output:\n\n`;
            prompt += `📋 USER INSTRUCTIONS:\n`;
            prompt += `"${options.customPrompt.trim()}"\n\n`;
            prompt += `⚠️ IMPORTANT RULES:\n`;
            prompt += `1. If these custom instructions conflict with general guidelines, ALWAYS PRIORITIZE the custom instructions.\n`;
            prompt += `2. Apply these instructions to ALL parts of your output (title, description, keywords, etc.).\n`;
            prompt += `3. Do NOT ignore or partially implement these instructions - follow them COMPLETELY.\n`;
            prompt += `4. If the instructions specify a language, tone, or style, use it CONSISTENTLY throughout.\n`;
            prompt += `5. If the instructions mention specific keywords or themes, ENSURE they are prominently featured.\n\n`;
            prompt += `${'='.repeat(80)}\n`;
        }

        return prompt;
    }

    /**
     * Validates and cleans the resulting data
     * @param {Object} data - The raw JSON data from the API
     * @param {number} keywordLimit - Max keywords to return
     * @param {string|Array} targetKeywords - Keywords to force-include
     * @returns {Object} - The sanitized data
     */
    processResult(data, keywordLimit = 100, targetKeywords = null) {
        return this.currentStrategy.processResult(data, keywordLimit, targetKeywords);
    }
}
