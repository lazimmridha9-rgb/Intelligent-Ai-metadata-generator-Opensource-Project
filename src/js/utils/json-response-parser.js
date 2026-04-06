/**
 * Shared JSON response parsing utilities for AI providers.
 * Keeps parsing behavior consistent across Gemini, Grok, Groq, and OpenRouter.
 */

function normalizeTextFromParts(parts = []) {
    return parts
        .map((part) => {
            if (typeof part === 'string') return part;
            if (!part || typeof part !== 'object') return '';
            if (typeof part.text === 'string') return part.text;
            if (typeof part.content === 'string') return part.content;
            try {
                return JSON.stringify(part);
            } catch {
                return '';
            }
        })
        .join('\n')
        .trim();
}

function cleanupMarkdownFences(text) {
    return text
        .replace(/\uFEFF/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function tryParseJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function extractJsonFromCodeBlock(text) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (!match || !match[1]) return null;
    return tryParseJson(match[1].trim());
}

function fixCommonJsonIssues(text) {
    return text
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
}

function escapeControlCharsInsideStrings(text) {
    let out = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                out += ch;
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                out += ch;
                escaped = true;
                continue;
            }
            if (ch === '"') {
                out += ch;
                inString = false;
                continue;
            }
            if (ch === '\n') {
                out += '\\n';
                continue;
            }
            if (ch === '\r') {
                out += '\\r';
                continue;
            }
            if (ch === '\t') {
                out += '\\t';
                continue;
            }
            out += ch;
            continue;
        }

        if (ch === '"') {
            inString = true;
        }
        out += ch;
    }

    return out;
}

function extractFirstJsonStartIndex(text) {
    const objIdx = text.indexOf('{');
    const arrIdx = text.indexOf('[');
    if (objIdx === -1) return arrIdx;
    if (arrIdx === -1) return objIdx;
    return Math.min(objIdx, arrIdx);
}

function fallbackExtractMetadataObject(text) {
    if (!text || typeof text !== 'string') return null;

    const result = {};
    const stringField = (key) => {
        const re = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`, 'i');
        const m = text.match(re);
        if (!m || !m[1]) return '';
        return m[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .trim();
    };

    const rawReasoning = stringField('reasoning');
    const rawTitle = stringField('title') || stringField('seoTitle');
    const rawDescription = stringField('description') || stringField('metaDescription');
    const rawCategory = stringField('category');
    const rawHashtags = stringField('hashtags');
    const rawSocialCaption = stringField('socialCaption');
    const rawTechnicalStats = stringField('technicalStats');
    const rawFilename = stringField('filename') || stringField('suggestedFilename');

    if (rawReasoning) result.reasoning = rawReasoning;
    if (rawTitle) result.title = rawTitle;
    if (rawDescription) result.description = rawDescription;
    if (rawCategory) result.category = rawCategory;
    if (rawHashtags) result.hashtags = rawHashtags;
    if (rawSocialCaption) result.socialCaption = rawSocialCaption;
    if (rawTechnicalStats) result.technicalStats = rawTechnicalStats;
    if (rawFilename) result.filename = rawFilename;

    const keywordsMatch = text.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/i);
    if (keywordsMatch && keywordsMatch[1]) {
        const keywords = keywordsMatch[1]
            .split(',')
            .map((item) => item.trim())
            .map((item) => item.replace(/^"+|"+$/g, ''))
            .map((item) => item.replace(/\\"/g, '"'))
            .map((item) => item.trim())
            .filter(Boolean);
        if (keywords.length) result.keywords = keywords;
    }

    if (Object.keys(result).length === 0) return null;
    return result;
}


function balanceJsonDelimiters(text) {
    let balanced = text;
    const openBraces = (balanced.match(/{/g) || []).length;
    const closeBraces = (balanced.match(/}/g) || []).length;
    const openBrackets = (balanced.match(/\[/g) || []).length;
    const closeBrackets = (balanced.match(/]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i += 1) {
        balanced += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i += 1) {
        balanced += ']';
    }
    return balanced;
}

function salvageTruncatedJson(candidate, options = {}) {
    const { autoBalance = false } = options;
    if (!candidate || typeof candidate !== 'string') return null;

    let text = candidate.trim();
    if (!text.startsWith('{') && !text.startsWith('[')) return null;

    // If JSON ended with an incomplete escape sequence, remove it.
    if (text.endsWith('\\')) {
        text = text.slice(0, -1);
    }

    let inString = false;
    let escaped = false;
    let out = '';

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        out += ch;

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
        }
    }

    // If the response got cut inside a string, close it.
    if (inString) {
        out += '"';
    }

    // Remove obviously invalid trailing delimiters (: , [ {) before balancing.
    let trimmed = out.trimEnd();
    while (trimmed.length > 0) {
        const last = trimmed[trimmed.length - 1];
        if (last === ':' || last === ',' || last === '[' || last === '{') {
            trimmed = trimmed.slice(0, -1).trimEnd();
            continue;
        }
        break;
    }

    if (!trimmed) return null;

    const fixed = escapeControlCharsInsideStrings(fixCommonJsonIssues(trimmed));
    const balanced = autoBalance ? balanceJsonDelimiters(fixed) : balanceJsonDelimiters(fixed);
    return tryParseJson(balanced);
}

export function parseJsonFromModelText(textContent, options = {}) {
    const { providerName = 'AI', autoBalance = false } = options;

    if (!textContent || typeof textContent !== 'string') {
        throw new Error('Empty or invalid response content');
    }

    let cleanedText = textContent.trim();

    const codeBlockJson = extractJsonFromCodeBlock(cleanedText);
    if (codeBlockJson) return codeBlockJson;

    const direct = tryParseJson(escapeControlCharsInsideStrings(cleanedText));
    if (direct) return direct;

    cleanedText = cleanupMarkdownFences(cleanedText);
    const afterFenceCleanup = tryParseJson(escapeControlCharsInsideStrings(cleanedText));
    if (afterFenceCleanup) return afterFenceCleanup;

    const firstBrace = cleanedText.indexOf('{');
    if (firstBrace !== -1) {
        const lastBrace = cleanedText.lastIndexOf('}');
        let candidate = '';

        if (lastBrace !== -1 && lastBrace > firstBrace) {
            candidate = cleanedText.substring(firstBrace, lastBrace + 1);
        } else {
            candidate = cleanedText.substring(firstBrace);
        }

        const fixedCandidate = escapeControlCharsInsideStrings(fixCommonJsonIssues(candidate));
        const balancedCandidate = autoBalance ? balanceJsonDelimiters(fixedCandidate) : fixedCandidate;

        const parsedFixed = tryParseJson(balancedCandidate);
        if (parsedFixed) return parsedFixed;

        const parsedCandidate = tryParseJson(escapeControlCharsInsideStrings(candidate));
        if (parsedCandidate) return parsedCandidate;
    }

    const jsonLikeMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonLikeMatch) {
        const parsedJsonLike = tryParseJson(escapeControlCharsInsideStrings(jsonLikeMatch[0]));
        if (parsedJsonLike) return parsedJsonLike;

        const salvagedJsonLike = salvageTruncatedJson(jsonLikeMatch[0], { autoBalance });
        if (salvagedJsonLike) return salvagedJsonLike;
    }

    const startIdx = extractFirstJsonStartIndex(cleanedText);
    if (startIdx !== -1) {
        const truncatedCandidate = cleanedText.substring(startIdx);
        const salvaged = salvageTruncatedJson(truncatedCandidate, { autoBalance });
        if (salvaged) return salvaged;
    }

    const fallbackObject = fallbackExtractMetadataObject(cleanedText);
    if (fallbackObject) return fallbackObject;

    throw new Error(`Failed to parse ${providerName} JSON response. Preview: ${cleanedText.substring(0, 200)}...`);
}

export function parseGeminiResponse(responseData, options = {}) {
    if (!responseData?.candidates?.[0]?.content) {
        throw new Error('Invalid API response structure');
    }

    const content = responseData.candidates[0].content;
    let textContent = '';

    if (Array.isArray(content.parts)) {
        textContent = normalizeTextFromParts(content.parts);
    } else if (typeof content === 'string') {
        textContent = content.trim();
    }

    return parseJsonFromModelText(textContent, {
        providerName: options.providerName || 'Gemini',
        autoBalance: options.autoBalance || false
    });
}

export function parseOpenAICompatibleResponse(responseData, options = {}) {
    if (!responseData?.choices?.[0]?.message) {
        throw new Error('Invalid API response structure');
    }

    const messageContent = responseData.choices[0].message.content;

    if (messageContent && typeof messageContent === 'object' && !Array.isArray(messageContent)) {
        return messageContent;
    }

    let textContent = '';
    if (Array.isArray(messageContent)) {
        textContent = normalizeTextFromParts(messageContent);
    } else if (typeof messageContent === 'string') {
        textContent = messageContent.trim();
    }

    return parseJsonFromModelText(textContent, {
        providerName: options.providerName || 'AI',
        autoBalance: options.autoBalance || false
    });
}
