/**
 * Speed Control Configuration
 * Defines settings for each speed level (1x, 2x, 3x, 4x)
 * Higher speed = faster generation but potentially lower quality
 */

export const SPEED_CONFIG = {
    '1x': {
        name: 'Normal Speed',
        description: 'Default quality, balanced speed',
        maxTokens: 4096,
        batchDelay: 1000, // ms delay between batch items
        useFastModel: false,
        skipValidation: false
    },
    '2x': {
        name: 'Fast',
        description: 'Faster generation, slightly reduced tokens',
        maxTokens: 3072,
        batchDelay: 500,
        useFastModel: true,
        skipValidation: false
    },
    '3x': {
        name: 'Very Fast',
        description: 'Much faster, optimized for speed',
        maxTokens: 2048,
        batchDelay: 250,
        useFastModel: true,
        skipValidation: true
    },
    '4x': {
        name: 'Maximum Speed',
        description: 'Fastest possible, minimal processing',
        maxTokens: 1536,
        batchDelay: 100,
        useFastModel: true,
        skipValidation: true
    }
};

/**
 * Get speed configuration for a given speed level
 * @param {string} speedLevel - Speed level ('1x', '2x', '3x', '4x')
 * @returns {Object} Speed configuration object
 */
export function getSpeedConfig(speedLevel = '1x') {
    return SPEED_CONFIG[speedLevel] || SPEED_CONFIG['1x'];
}

/**
 * Get max tokens for current speed
 * @param {string} speedLevel
 * @returns {number}
 */
export function getMaxTokens(speedLevel) {
    return getSpeedConfig(speedLevel).maxTokens;
}

/**
 * Get batch delay for current speed
 * @param {string} speedLevel
 * @returns {number}
 */
export function getBatchDelay(speedLevel) {
    return getSpeedConfig(speedLevel).batchDelay;
}
