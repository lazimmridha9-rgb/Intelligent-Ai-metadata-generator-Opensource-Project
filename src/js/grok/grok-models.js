/**
 * Grok API Model Definitions
 * Configuration for xAI Grok models.
 */

export const GROK_MODELS = [
    {
        id: "grok-4",
        name: "Grok 4 (Top Quality, Paid)",
        type: "image",
        description: "Highest quality option for complex metadata generation."
    },
    {
        id: "grok-4-fast",
        name: "Grok 4 Fast (Lower Cost, Paid)",
        type: "image",
        description: "Faster and cheaper Grok 4 variant for higher throughput."
    },
    {
        id: "grok-3-mini",
        name: "Grok 3 Mini (Legacy Fallback)",
        type: "image",
        description: "Compatibility fallback for older xAI accounts."
    }
];
