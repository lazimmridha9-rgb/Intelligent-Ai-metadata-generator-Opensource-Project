/**
 * Gemini API Model Definitions
 * Ordered for strong metadata generation across:
 * - Latest Gemini 3 series (preview, high-tier scaling)
 * - Stable Gemini 2.5 family (best free + high-throughput defaults)
 */
export const GEMINI_MODELS = [
    {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro Preview (Latest 3 Series, High Tier)",
        type: "image",
        description: "Most capable Gemini 3 preview for deep reasoning and complex image analysis."
    },
    {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash Preview (Latest 3 Series, Fast)",
        type: "image",
        description: "Fast Gemini 3 preview model for strong multimodal quality with lower latency."
    },
    {
        id: "gemini-3.1-flash-lite-preview",
        name: "Gemini 3.1 Flash-Lite Preview (Latest 3 Series, High Limit)",
        type: "image",
        description: "Most cost-efficient Gemini 3.1 variant, ideal for very high-volume workloads."
    },
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
