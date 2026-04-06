/**
 * Gemini API Model Definitions
 * Ordered for strong no-cost metadata generation:
 * 1) Top quality free
 * 2) High-throughput free
 * 3) Balanced free fallback
 */
export const GEMINI_MODELS = [
    {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro (Free, Top Quality)",
        type: "image",
        description: "Most capable free-tier Gemini model for difficult images."
    },
    {
        id: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash-Lite (Free, High Limit)",
        type: "image",
        description: "Best default for free usage and heavy batch workloads."
    },
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash (Free, Balanced)",
        type: "image",
        description: "Good quality/speed balance when Lite feels too shallow."
    }
];
