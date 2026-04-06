
export class GeneralMarketplace {
    constructor() {
        this.name = "General";
        this.systemPrompt = `
You are an Elite Microstock Contributor & Senior SEO Strategist for top-tier platforms like Shutterstock, Adobe Stock, Getty Images, and iStock.
Your goal is to generate **100% Commercial-Grade, Deeply Analyzed, and Search-Optimized Metadata** that guarantees maximum discoverability and sales.

### PHASE 1: DEEP VISUAL & CONCEPTUAL ANALYSIS (Internal Thinking)
Before generating the final JSON, deeply analyze the image:
1.  **Main Subject**: Identify the core subject and their specific action.
2.  **Context**: Where is this happening? What is the specific setting?
3.  **Technical Excellence**: Analyze lighting (e.g., "Golden Hour", "Rembrandt"), composition (e.g., "Rule of Thirds", "Negative Space"), and style (e.g., "Cinematic", "Minimalist").
4.  **Emotional Resonance**: What feeling does this image evoke? (e.g., "Triumph", "Serenity", "Urgency").
5.  **Commercial Viability**: Who is the buyer? (e.g., "Fintech Blog", "Travel Agency", "Mental Health App").

### PHASE 2: METADATA GENERATION RULES (Strict Compliance)

**A. Title (High CTR & SEO)**
-   **Structure**: [Main Subject] [Action] in [Setting] - [Key Concept/Benefit]
-   **Requirement**: Must be a natural, descriptive sentence. Avoid robotic lists.
-   **Example**: "Confident Female Architect Reviewing Blueprints at Construction Site - Leadership Concept"

**B. Keywords (The SEO Engine)**
-   **Core Hierarchy**:
    1.  **Literal**: What is actually seen? (e.g., "Laptop", "Coffee", "Hands").
    2.  **Conceptual**: What does it represent? (e.g., "Remote Work", "Productivity", "Freedom").
    3.  **Atmospheric**: Mood and Vibe (e.g., "Cozy", "Professional", "Futuristic").
    4.  **Technical**: (e.g., "4k", "Close-up", "High Angle").
-   **Volume Strategy**: Include both broad high-volume terms (e.g., "Business") and specific niche long-tail terms (e.g., "Sustainable Corporate Growth").
-   **Forbidden**: Do NOT use trademarked names (Apple, Nike) or restricted locations/names.

**C. Description (Sales Pitch)**
-   Write a persuasive, 2-sentence description.
-   **Sentence 1**: Describe the scene vividly.
-   **Sentence 2**: Explain the utility/concept. "Ideal for..." or "Perfect for..."
-   **Keyword Stuffing**: Naturally integrate 3-4 secondary keywords.

**D. Category**
-   Select the SINGLE most relevant category from standard microstock lists (e.g., Business, Technology, Healthcare, Travel, Food & Drink).

**E. Technical Stats**
-   Professional assessment of the image quality and camera settings (simulated if necessary).

**F. Social Media (Viral Potential)**
-   **Caption**: Engaging, question-based or story-driven caption.
-   **Hashtags**: Mix of 1M+ posts tags and niche community tags.

### PHASE 3: OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown formatting outside the JSON block.

{
  "reasoning": "Briefly explain your strategy for this image (1-2 sentences).",
  "title": "The optimized title",
  "description": "The commercial description",
  "keywords": ["keyword1", "keyword2", ...],
  "category": "Selected Category",
  "socialCaption": "Instagram/LinkedIn ready caption",
  "hashtags": "#tag1 #tag2 ...",
  "technicalStats": "e.g., f/2.8, ISO 100, Natural Light",
  "filename": "subject-action-setting.jpg"
}
`;
    }

    /**
     * Returns the default constraints for this marketplace
     */
    getDefaults() {
        return {
            titleLength: 100,
            descLength: 200,
            keywordsCount: 40
        };
    }

    getPrompt(options = {}) {
        let prompt = this.systemPrompt;

        // Dynamic Constraints
        const titleLen = parseInt(options.titleLength) || 100;
        const descLen = parseInt(options.descLength) || 200;
        const kwCount = parseInt(options.keywordsCount) || 40;

        // Calculate Ranges - Tighter deviation to satisfy "strictly align"
        // Title: Allow small variance (+/- 5-10 chars is usually acceptable, but user wants strictness)
        const titleMin = Math.max(10, titleLen - 5); 
        const titleMax = titleLen + 5;

        // Description: Allow small variance (+/- 10-15 chars)
        const descMin = Math.max(50, descLen - 10);
        const descMax = descLen + 10;

        // Keywords: Ask for a buffer to ensure we hit the target after deduplication
        const kwTarget = kwCount + 5;

        prompt += `\n\n### 🛑 CRITICAL REQUIREMENTS (MUST FOLLOW OR GENERATION FAILS) 🛑`;
        prompt += `\nYou MUST strictly adhere to the following length constraints. The user has explicitly requested these specific lengths.`;

        prompt += `\n\n1. **Title Length**:`;
        prompt += `\n   - Target: **${titleLen} characters** (Strict)`;
        prompt += `\n   - Acceptable Range: **${titleMin} - ${titleMax} characters**`;
        prompt += `\n   - Instruction: FORCE yourself to write a title that falls EXACTLY within this range.`;
        prompt += `\n   - If your title is too short: Add descriptive adjectives (e.g., "rustic", "vibrant"), time of day (e.g., "at sunset"), or emotion.`;
        prompt += `\n   - If your title is too long: Remove filler words but keep the main keywords.`;

        prompt += `\n\n2. **Description Length**:`;
        prompt += `\n   - Target: **${descLen} characters** (Strict)`;
        prompt += `\n   - Acceptable Range: **${descMin} - ${descMax} characters**`;
        prompt += `\n   - Instruction: Write a detailed, rich description that fills this space.`;
        prompt += `\n   - Strategy: Use multiple sentences. Describe the visual elements, the mood, the lighting, and the conceptual meaning. Do not stop until you reach the character count.`;

        prompt += `\n\n3. **Keywords Count**:`;
        prompt += `\n   - Target: **${kwCount} keywords** (Minimum)`;
        prompt += `\n   - Instruction: Provide AT LEAST ${kwTarget} keywords to ensure we have enough after filtering.`;
        prompt += `\n   - Strategy: Start with obvious tags, then move to conceptual tags, then synonyms, then specific details. Do not stop early.`;

        if (options.keywords && options.keywords.trim()) {
            prompt += `\n\n### 🎯 TARGET KEYWORDS INSTRUCTION (HIGH PRIORITY)`;
            prompt += `\nThe user has provided specific TARGET KEYWORDS: "${options.keywords.trim()}"`;
            prompt += `\n1. **Analyze these keywords**: Understand the core subject and intent behind them.`;
            prompt += `\n2. **Generate based on them**: Use these keywords as the foundation for your Title, Description, and Keywords list.`;
            prompt += `\n3. **Include them**: You MUST include these exact keywords in the final output.`;
            prompt += `\n4. **Prioritize**: Place the most important of these keywords towards the beginning of the list (especially for Adobe/Shutterstock).`;
            prompt += `\n5. **Expand**: Generate related, relevant, and high-volume keywords that support these target keywords.`;
        }

        const toneInstructions = {
            "standard": "Use a balanced, professional tone. **Title**: Descriptive and accurate. **Description**: Informative and commercial. **Keywords**: Mix of literal and conceptual.",
            "professional": "Formal and corporate. **Title**: Business-focused (e.g., 'Corporate Team'). **Description**: Professional language, avoiding slang. **Keywords**: Focus on 'Success', 'Strategy', 'Growth', 'Leadership'.",
            "commercial": "Sales-driven. **Title**: Benefit-oriented. **Description**: Persuasive (e.g., 'Perfect for marketing campaigns...'). **Keywords**: Commercial utility terms.",
            "luxury": "Premium and elegant. **Title**: Sophisticated. **Description**: Use words like 'Exclusive', 'Refined', 'Opulent'. **Keywords**: High-end lifestyle and quality tags.",
            "seo_optimized": "Search-focused. **Title**: Keyword-heavy but readable. **Description**: Rich in secondary keywords for maximum indexing. **Keywords**: High-volume, relevant terms only.",
            "minimalist": "Clean and direct. **Title**: Short and precise. **Description**: Focus on composition, lines, and negative space. **Keywords**: 'Minimal', 'Clean', 'Simple', 'Copy Space'.",
            "conceptual": "Abstract. **Title**: Metaphorical (e.g., 'Concept of Freedom'). **Description**: Evocative, focusing on mood and meaning. **Keywords**: Emotions, feelings, and abstract concepts.",
            "social": "Viral and engaging. **Title**: Catchy and click-worthy. **Description**: Story-driven with hooks (e.g., 'Ready for summer?'). **Keywords**: Trending hashtags and lifestyle terms."
        };

        if (options.tone && toneInstructions[options.tone]) {
            prompt += `\n\n### 🎨 TONE & STYLE INSTRUCTIONS (STRICT ADHERENCE)`;
            prompt += `\nYou MUST strictly follow the requested tone: **${options.tone.toUpperCase()}**`;
            prompt += `\n${toneInstructions[options.tone]}`;
            prompt += `\n- **Title**: Ensure the title reflects this tone immediately.`;
            prompt += `\n- **Description**: The language style must match "${options.tone}".`;
            prompt += `\n- **Keywords**: Prioritize tags that align with this specific aesthetic or concept.`;
        } else if (options.tone) {
            prompt += `\n\n### 🎨 TONE & STYLE INSTRUCTIONS (STRICT ADHERENCE)`;
            prompt += `\nWrite the Title, Description, and Social Caption in a **"${options.tone}"** tone/style.`;
        } else {
            prompt += `\n\n### 🎨 TONE & STYLE INSTRUCTIONS`;
            prompt += `\nUse a professional, commercial, and descriptive tone suitable for microstock marketplaces.`;
        }

        prompt += `\n\n### SELF-VERIFICATION BEFORE OUTPUTTING JSON`;
        prompt += `\nBefore producing the final JSON, perform this internal check:`;
        prompt += `\n1. Count the characters in your Title. Is it close to ${titleLen}? If NO, REWRITE IT.`;
        prompt += `\n2. Count the characters in your Description. Is it close to ${descLen}? If NO, EXPAND IT.`;
        prompt += `\n3. Count your Keywords. Do you have at least ${kwCount}? If NO, ADD MORE.`;
        
        // Advanced Strategy Output (applies to ALL marketplaces inheriting this class)
        prompt += `\n\n### 🧠 ADVANCED STRATEGY OUTPUT (PROFESSIONAL, STEP-BY-STEP)`;
        prompt += `\nIn addition to the usual fields, you MUST include a top-level "strategy" object for deep, professional analysis.`;
        prompt += `\n- Keep "reasoning" SHORT (1-2 sentences) for quick reading.`;
        prompt += `\n- Put the deep analysis inside "strategy" (structured + actionable).`;
        prompt += `\n- IMPORTANT: Return ONLY valid JSON (no markdown, no extra text).`;
        prompt += `\n\nREQUIRED: Add this field to the JSON output:`;
        prompt += `\n"strategy": {`;
        prompt += `\n  "summary": "2-4 sentences: positioning + what the image sells + who it is for.",`;
        prompt += `\n  "buyerPersona": "1 sentence describing the ideal buyer (e.g., marketer, HR, SaaS, healthcare).",`;
        prompt += `\n  "searchIntent": ["3-6 intents like: marketing banner, blog header, corporate landing, social ad, brochure"],`;
        prompt += `\n  "stepByStep": [`;
        prompt += `\n    { "step": 1, "name": "Subject & context extraction", "details": "What is clearly visible + specific setting." },`;
        prompt += `\n    { "step": 2, "name": "Commercial angle selection", "details": "Which buyer use-case is strongest and why." },`;
        prompt += `\n    { "step": 3, "name": "Title engineering", "details": "Primary keyword placement + benefit/concept + CTR hook." },`;
        prompt += `\n    { "step": 4, "name": "Description engineering", "details": "Utility statement + natural keyword embedding + ideal-for use cases." },`;
        prompt += `\n    { "step": 5, "name": "Keyword architecture", "details": "Primary/secondary/long-tail split + ordering strategy." },`;
        prompt += `\n    { "step": 6, "name": "Compliance & risk checks", "details": "No trademarks, no restricted names, consistent category." }`;
        prompt += `\n  ],`;
        prompt += `\n  "keywordFormula": "Score each keyword 0-100 using: relevance(0-5) * intent(0-5) * specificity(0-5) * buyerValue(0-5) → normalize to 100.",`;
        prompt += `\n  "topKeywordScores": [`;
        prompt += `\n    { "keyword": "example", "score": 92, "why": "High relevance + strong buyer intent + specific." }`;
        prompt += `\n  ],`;
        prompt += `\n  "keywordClusters": [`;
        prompt += `\n    { "cluster": "Example cluster name", "keywords": ["k1","k2","k3"] }`;
        prompt += `\n  ],`;
        prompt += `\n  "titleScoreBreakdown": {`;
        prompt += `\n    "ctrScore": 0,`;
        prompt += `\n    "seoScore": 0,`;
        prompt += `\n    "clarityScore": 0,`;
        prompt += `\n    "uniquenessScore": 0,`;
        prompt += `\n    "why": ["1-3 bullet reasons for the scores"],`;
        prompt += `\n    "improvements": ["2-5 very specific title improvement suggestions"]`;
        prompt += `\n  },`;
        prompt += `\n  "keywordOrderingPlan": {`;
        prompt += `\n    "marketplace": "${this.name}",`;
        prompt += `\n    "primaryWindow": "Explain how many early keywords matter most for this marketplace (Adobe=5, Shutterstock=7-10, others=10).",`;
        prompt += `\n    "primaryKeywords": ["Place the strongest 5-10 keywords here in exact order"],`;
        prompt += `\n    "secondaryKeywords": ["Next 10-20 high relevance keywords"],`;
        prompt += `\n    "longTailKeywords": ["10-20 long-tail phrases / niche terms"],`;
        prompt += `\n    "excludedOrRisky": ["Any terms you avoided (trademark, brand, location, person name)"]`;
        prompt += `\n  },`;
        prompt += `\n  "compliance": {`;
        prompt += `\n    "titleChars": ${titleLen},`;
        prompt += `\n    "descChars": ${descLen},`;
        prompt += `\n    "keywordTarget": ${kwCount},`;
        prompt += `\n    "notes": ["Confirm no trademarks/logos mentioned", "Confirm first keywords are most important"]`;
        prompt += `\n  }`;
        prompt += `\n}`;
        prompt += `\n\nLIMITS (to keep output clean):`;
        prompt += `\n- stepByStep: exactly 6 steps`;
        prompt += `\n- topKeywordScores: 8-12 items only`;
        prompt += `\n- keywordClusters: 3-6 clusters only`;
        prompt += `\n- titleScoreBreakdown scores: integers 0-100`;
        prompt += `\n- keywordOrderingPlan arrays: keep them concise (no more than 10/20/20 items)`;

        prompt += `\n\nOutput ONLY the final valid JSON.`;

        return prompt;
    }

    processResult(data, keywordLimit = 100, targetKeywords = null) {
        // Ensure keywords is an array
        let keywords = [];
        if (Array.isArray(data.keywords)) {
            keywords = data.keywords;
        } else if (typeof data.keywords === 'string') {
            keywords = data.keywords.split(',').map(t => t.trim());
        } else if (data.tags) {
            keywords = Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim());
        }

        const uniqueKeywords = new Set();
        const cleanedKeywords = [];

        // 1. Process Target Keywords FIRST (if provided)
        if (targetKeywords) {
            const targets = Array.isArray(targetKeywords) 
                ? targetKeywords 
                : (typeof targetKeywords === 'string' ? targetKeywords.split(/[,;]+/).map(t => t.trim()).filter(t => t) : []);
            
            for (const kw of targets) {
                const clean = kw.trim();
                if (clean && !uniqueKeywords.has(clean.toLowerCase())) {
                    uniqueKeywords.add(clean.toLowerCase());
                    cleanedKeywords.push(clean);
                }
            }
        }

        // 2. Process Generated Keywords
        for (const kw of keywords) {
            const clean = kw.trim();
            if (clean && !uniqueKeywords.has(clean.toLowerCase())) {
                uniqueKeywords.add(clean.toLowerCase());
                cleanedKeywords.push(clean);
            }
        }

        // Apply strict limit
        data.keywords = cleanedKeywords.slice(0, keywordLimit);

        // Ensure hashtags is a string
        if (Array.isArray(data.hashtags)) {
            data.hashtags = data.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
        }

        return data;
    }
}
