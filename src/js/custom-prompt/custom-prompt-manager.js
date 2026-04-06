export class CustomPromptManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.storageKey = 'custom_system_prompt';
        this.defaultPrompt = '';
        this.currentPrompt = '';

        // Preset Templates - Optimized for Freelancers, Contributors & Productivity
        this.templates = {
            british_english: "Always use British English spelling (colour, centre, optimise, analyse). Use formal, professional language. Avoid American spellings. Target UK/EU markets.",
            emotional_keywords: "Focus on emotional and evocative keywords like 'joy', 'nostalgia', 'serenity', 'vibrant', 'peaceful', 'inspiring'. Make descriptions story-driven and engaging. Perfect for lifestyle and creative content.",
            minimalist: "Keep all text concise and minimalist. Titles under 60 characters, descriptions under 120 characters. Use simple, clean language. Focus on 'minimal', 'clean', 'simple', 'copy space'. Ideal for modern design assets.",
            seo_heavy: "Maximize SEO optimization for maximum sales. Include long-tail keywords, trending search phrases, and high-volume terms. Prioritize discoverability and search ranking. Essential for competitive marketplaces.",
            brand_guidelines: "Follow professional brand voice: clear, approachable, authoritative. Avoid jargon. Use active voice. Emphasize quality, innovation, and professionalism. Perfect for corporate and business content.",
            social_first: "Optimize for social media virality and engagement. Use trending hashtags, emoji-friendly language, and call-to-action phrases. Make content shareable and click-worthy. Ideal for Instagram, Pinterest, and TikTok."
        };

        // UI Elements
        this.inputElement = null;
        this.statusElement = null;
        this.resetBtn = null;
        this.activeIndicator = null;
    }

    init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`CustomPromptManager: Container ${this.containerId} not found.`);
            return;
        }

        this.render();
        this.loadSettings();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="glass-panel rounded-3xl p-6 hover-card relative overflow-hidden">
                <!-- Background Glow - Updated to match theme -->
                <div class="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl hover:bg-primary/10 transition-colors duration-500 pointer-events-none"></div>

                <!-- Header -->
                <div class="flex justify-between items-center mb-6 border-b border-white/5 pb-4 relative z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <h3 class="text-sm font-bold text-white leading-tight">Custom System Prompt</h3>
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="customPromptActive" class="hidden text-[9px] font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 uppercase tracking-wider">
                            <i class="fa-solid fa-check-circle"></i> Active
                        </span>
                        <span id="customPromptStatus" class="text-[10px] font-mono text-slate-500 transition-colors">Saved</span>
                    </div>
                </div>

                <!-- Quick Templates -->
                <div class="mb-4">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Quick Templates</label>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="template-btn group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 hover:border-primary/30 transition-all text-left" data-template="british_english">
                            <i class="fa-solid fa-language text-[10px] text-slate-500 group-hover:text-primary"></i>
                            <span class="text-[10px] font-semibold text-slate-300 group-hover:text-white">British English</span>
                        </button>
                        <button class="template-btn group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 hover:border-primary/30 transition-all text-left" data-template="emotional_keywords">
                            <i class="fa-solid fa-heart text-[10px] text-slate-500 group-hover:text-primary"></i>
                            <span class="text-[10px] font-semibold text-slate-300 group-hover:text-white">Emotional</span>
                        </button>
                        <button class="template-btn group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 hover:border-primary/30 transition-all text-left" data-template="minimalist">
                            <i class="fa-solid fa-minimize text-[10px] text-slate-500 group-hover:text-primary"></i>
                            <span class="text-[10px] font-semibold text-slate-300 group-hover:text-white">Minimalist</span>
                        </button>
                        <button class="template-btn group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 hover:border-primary/30 transition-all text-left" data-template="seo_heavy">
                            <i class="fa-solid fa-chart-line text-[10px] text-slate-500 group-hover:text-primary"></i>
                            <span class="text-[10px] font-semibold text-slate-300 group-hover:text-white">SEO Heavy</span>
                        </button>
                        <button class="template-btn group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 hover:border-primary/30 transition-all text-left" data-template="brand_guidelines">
                            <i class="fa-solid fa-building text-[10px] text-slate-500 group-hover:text-primary"></i>
                            <span class="text-[10px] font-semibold text-slate-300 group-hover:text-white">Brand Voice</span>
                        </button>
                        <button class="template-btn group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-white/5 hover:border-primary/30 transition-all text-left" data-template="social_first">
                            <i class="fa-solid fa-share-nodes text-[10px] text-slate-500 group-hover:text-primary"></i>
                            <span class="text-[10px] font-semibold text-slate-300 group-hover:text-white">Social First</span>
                        </button>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="relative group/input mb-4">
                    <textarea id="customPromptInput" 
                        class="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-900/80 focus:shadow-[0_0_15px_rgba(96,165,250,0.1)] transition-all resize-none custom-scrollbar leading-relaxed"
                        placeholder="e.g., Always use British English, focus on emotional keywords, keep titles under 80 characters..."
                        maxlength="500"></textarea>
                    
                    <!-- Character Count -->
                    <div class="absolute bottom-3 right-3 text-[10px] pointer-events-none transition-colors" id="charCountContainer">
                        <span id="charCount" class="text-slate-600 group-focus-within/input:text-primary/70">0</span><span class="text-slate-700">/500</span>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-between items-center mb-4">
                    <button id="resetCustomPromptBtn" class="group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/50 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all">
                        <i class="fa-solid fa-rotate-left text-[10px] text-slate-500 group-hover:text-red-400 transition-transform group-hover:-rotate-180"></i>
                        <span class="text-[10px] font-bold text-slate-500 group-hover:text-red-400 uppercase tracking-wider">Clear</span>
                    </button>
                    
                    <div class="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-900/50 border border-white/5">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                        <span class="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Auto-saved</span>
                    </div>
                </div>

                <!-- Info Section -->
                <div class="p-3 bg-slate-800/30 rounded-xl border border-white/5">
                    <div class="flex items-start gap-2.5">
                        <i class="fa-solid fa-circle-info text-blue-400/70 text-xs mt-0.5"></i>
                        <div class="space-y-1.5">
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                <span class="text-slate-300 font-semibold">How it works:</span> 
                                Your custom instructions will be appended to the core system prompt with <span class="text-primary font-semibold">PRIORITY OVERRIDE</span>. The AI will prioritize your specific rules.
                            </p>
                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                <span class="text-slate-400 font-semibold">Tip:</span> 
                                Click a template above to quickly insert common instructions, then customize as needed.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.inputElement = document.getElementById('customPromptInput');
        this.statusElement = document.getElementById('customPromptStatus');
        this.resetBtn = document.getElementById('resetCustomPromptBtn');
        this.charCount = document.getElementById('charCount');
        this.activeIndicator = document.getElementById('customPromptActive');
        this.charCountContainer = document.getElementById('charCountContainer');
    }

    loadSettings() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.currentPrompt = saved;
            this.inputElement.value = saved;
            this.updateCharCount();
            this.updateActiveIndicator();
        }
    }

    saveSettings() {
        this.currentPrompt = this.inputElement.value;
        localStorage.setItem(this.storageKey, this.currentPrompt);
        this.showStatus('Saved', 'text-green-400');
        this.updateActiveIndicator();
        setTimeout(() => this.showStatus('Saved', 'text-slate-500'), 2000);
    }

    setupEventListeners() {
        let timeout;
        this.inputElement.addEventListener('input', () => {
            this.updateCharCount();
            this.showStatus('Typing...', 'text-yellow-400');

            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.saveSettings();
            }, 800); // Auto-save after 800ms
        });

        this.resetBtn.addEventListener('click', () => {
            if (this.inputElement.value.trim() === '' || confirm('Are you sure you want to clear your custom prompt?')) {
                this.inputElement.value = '';
                this.saveSettings();
                this.updateCharCount();
            }
        });

        // Template buttons
        const templateBtns = document.querySelectorAll('.template-btn');
        templateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const templateKey = btn.dataset.template;
                const templateText = this.templates[templateKey];

                // Always REPLACE the content with the selected template
                // This prevents text accumulation when clicking different templates
                this.inputElement.value = templateText;

                this.updateCharCount();
                this.saveSettings();

                // Visual feedback
                btn.classList.add('bg-primary/20', 'border-primary/50');
                setTimeout(() => {
                    btn.classList.remove('bg-primary/20', 'border-primary/50');
                }, 300);
            });
        });
    }

    updateCharCount() {
        const count = this.inputElement.value.length;
        this.charCount.textContent = count;

        // Warning color if approaching limit
        if (count > 450) {
            this.charCountContainer.classList.add('text-red-400');
            this.charCountContainer.classList.remove('text-slate-600');
        } else if (count > 400) {
            this.charCountContainer.classList.add('text-yellow-400');
            this.charCountContainer.classList.remove('text-slate-600', 'text-red-400');
        } else {
            this.charCountContainer.classList.remove('text-yellow-400', 'text-red-400');
        }
    }

    updateActiveIndicator() {
        if (this.currentPrompt.trim().length > 0) {
            this.activeIndicator.classList.remove('hidden');
        } else {
            this.activeIndicator.classList.add('hidden');
        }
    }

    showStatus(text, colorClass) {
        this.statusElement.textContent = text;
        this.statusElement.className = `text-[10px] font-mono transition-colors ${colorClass}`;
    }

    getPrompt() {
        // CRITICAL FIX: Always return the current textarea value, not the cached value
        // This ensures we get the latest user input even if auto-save hasn't triggered yet
        if (this.inputElement) {
            return this.inputElement.value.trim();
        }
        // Fallback to cached value if input element is not available
        return this.currentPrompt.trim();
    }
}
