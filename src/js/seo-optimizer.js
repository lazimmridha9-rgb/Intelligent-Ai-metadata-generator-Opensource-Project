/**
 * SEO Optimizer
 * Provides utility functions to score and format metadata.
 */

export class SeoOptimizer {
    
    /**
     * Checks if the title length is optimal (50-60 chars)
     * @param {string} title 
     * @returns {Object} { valid: boolean, message: string }
     */
    validateTitle(title) {
        const len = title.length;
        if (len < 30) return { valid: false, message: "Too short (aim for 50-60 chars)" };
        if (len > 60) return { valid: false, message: "Too long (aim for 50-60 chars)" };
        return { valid: true, message: "Optimal length" };
    }

    /**
     * Checks if description length is optimal (150-160 chars)
     * @param {string} desc 
     * @returns {Object} { valid: boolean, message: string }
     */
    validateDescription(desc) {
        const len = desc.length;
        if (len < 120) return { valid: false, message: "Too short (aim for 150-160 chars)" };
        if (len > 160) return { valid: false, message: "Too long (aim for 150-160 chars)" };
        return { valid: true, message: "Optimal length" };
    }

    /**
     * Formats tags as a comma-separated string
     * @param {string[]} tags 
     * @returns {string}
     */
    formatTags(tags) {
        if (!Array.isArray(tags)) return tags;
        return tags.join(', ');
    }

    /**
     * Generates a basic HTML snippet for the image
     * @param {string} filename 
     * @param {string} alt 
     * @param {string} title 
     * @returns {string}
     */
    generateImgTag(filename, alt, title) {
        return `<img src="${filename}" alt="${alt}" title="${title}">`;
    }
}
