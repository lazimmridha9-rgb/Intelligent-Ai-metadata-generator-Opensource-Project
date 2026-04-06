
/**
 * Metadata Adjustment Controls
 * Handles the logic for adjustable Title Length, Description Length, and Keywords Count.
 */
export class MetadataAdj {
    constructor() {
        // Default Values
        this.defaults = {
            titleLength: 100,
            descLength: 200,
            keywordsCount: 40
        };

        // Current Values
        this.settings = this.loadSettings();

        // DOM Elements
        this.container = null;
    }

    /**
     * Initialize the component
     * @param {HTMLElement} parentElement - The element to append the controls to (or insert before)
     */
    init(parentElement) {
        if (!parentElement) {
            console.error('MetadataAdj: Parent element not provided.');
            return;
        }

        // Create Container
        this.container = document.createElement('div');
        this.container.className = 'mb-6 animate-fade-in';
        this.container.innerHTML = this.getHTML();

        // Insert before the Save Button (or append if not found)
        const saveBtn = document.getElementById('saveConfigBtn');
        if (saveBtn && saveBtn.parentNode === parentElement) {
            parentElement.insertBefore(this.container, saveBtn);
        } else {
            parentElement.appendChild(this.container);
        }

        this.setupEventListeners();
        this.updateDisplays();
    }

    /**
     * Generates the HTML for the controls
     */
    getHTML() {
        return `
            <div class="border-t border-white/5 pt-5 mt-5">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span class="flex items-center gap-2"><i class="fa-solid fa-sliders text-primary"></i> Advanced Constraints</span>
                    <button id="resetConstraintsBtn" class="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-white/10 transition-all text-[10px] font-medium text-slate-400 hover:text-primary shadow-sm" title="Reset to Defaults">
                        <i class="fa-solid fa-rotate-right group-hover:rotate-180 transition-transform duration-500"></i>
                        <span>Reset</span>
                    </button>
                </h4>

                <!-- Title Length Control -->
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-xs text-slate-300">Title Length</label>
                        <span id="titleLenDisplay" class="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">${this.settings.titleLength} chars</span>
                    </div>
                    <input type="range" id="titleLenSlider" min="30" max="200" step="5" value="${this.settings.titleLength}" 
                        class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-blue-400 transition-all">
                    <div class="flex justify-between text-[9px] text-slate-600 mt-1">
                        <span>Short (30)</span>
                        <span>Long (200)</span>
                    </div>
                </div>

                <!-- Description Length Control -->
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-xs text-slate-300">Description Length</label>
                        <span id="descLenDisplay" class="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">${this.settings.descLength} chars</span>
                    </div>
                    <input type="range" id="descLenSlider" min="100" max="500" step="10" value="${this.settings.descLength}" 
                        class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-blue-400 transition-all">
                    <div class="flex justify-between text-[9px] text-slate-600 mt-1">
                        <span>Concise (100)</span>
                        <span>Detailed (500)</span>
                    </div>
                </div>

                <!-- Keywords Count Control -->
                <div class="mb-2">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-xs text-slate-300">Keywords Count</label>
                        <span id="kwCountDisplay" class="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">${this.settings.keywordsCount} tags</span>
                    </div>
                    <input type="range" id="kwCountSlider" min="10" max="100" step="1" value="${this.settings.keywordsCount}" 
                        class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-blue-400 transition-all">
                    <div class="flex justify-between text-[9px] text-slate-600 mt-1">
                        <span>Min (10)</span>
                        <span>Max (100)</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Sets up event listeners for the controls
     */
    setupEventListeners() {
        const titleSlider = this.container.querySelector('#titleLenSlider');
        const descSlider = this.container.querySelector('#descLenSlider');
        const kwSlider = this.container.querySelector('#kwCountSlider');
        const resetBtn = this.container.querySelector('#resetConstraintsBtn');

        titleSlider.addEventListener('input', (e) => {
            this.settings.titleLength = parseInt(e.target.value);
            this.updateDisplays();
            this.saveSettings();
            console.log('Advanced Constraints Updated: Title Length =', this.settings.titleLength);
        });

        descSlider.addEventListener('input', (e) => {
            this.settings.descLength = parseInt(e.target.value);
            this.updateDisplays();
            this.saveSettings();
            console.log('Advanced Constraints Updated: Description Length =', this.settings.descLength);
        });

        kwSlider.addEventListener('input', (e) => {
            this.settings.keywordsCount = parseInt(e.target.value);
            this.updateDisplays();
            this.saveSettings();
            console.log('Advanced Constraints Updated: Keywords Count =', this.settings.keywordsCount);
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Reset to defaults
                this.settings = { ...this.defaults };
                
                // Update UI Sliders
                titleSlider.value = this.settings.titleLength;
                descSlider.value = this.settings.descLength;
                kwSlider.value = this.settings.keywordsCount;

                // Update Text Displays
                this.updateDisplays();
                
                // Save and Log
                this.saveSettings();
                console.log('Advanced Constraints Reset to Defaults:', this.settings);
            });
        }
    }

    /**
     * Updates the display values in the UI
     */
    updateDisplays() {
        const titleDisplay = this.container.querySelector('#titleLenDisplay');
        const descDisplay = this.container.querySelector('#descLenDisplay');
        const kwDisplay = this.container.querySelector('#kwCountDisplay');

        if (titleDisplay) titleDisplay.innerText = `${this.settings.titleLength} chars`;
        if (descDisplay) descDisplay.innerText = `${this.settings.descLength} chars`;
        if (kwDisplay) kwDisplay.innerText = `${this.settings.keywordsCount} tags`;
    }

    /**
     * Loads settings from localStorage or returns defaults
     */
    loadSettings() {
        const saved = localStorage.getItem('metadata_adj_settings');
        if (saved) {
            try {
                return { ...this.defaults, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to parse metadata settings', e);
                return this.defaults;
            }
        }
        return this.defaults;
    }

    /**
     * Saves current settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('metadata_adj_settings', JSON.stringify(this.settings));
    }

    /**
     * Returns the current settings for the API
     */
    getValues() {
        return this.settings;
    }

    /**
     * Updates the default values based on the selected marketplace
     * @param {Object} newDefaults - The new default values
     */
    setDefaults(newDefaults) {
        if (!newDefaults) return;
        
        // Update defaults
        this.defaults = { ...this.defaults, ...newDefaults };
        
        // Update current settings to match new defaults
        this.settings = { ...this.defaults };
        
        // Update UI
        if (this.container) {
            const titleSlider = this.container.querySelector('#titleLenSlider');
            const descSlider = this.container.querySelector('#descLenSlider');
            const kwSlider = this.container.querySelector('#kwCountSlider');

            if (titleSlider) titleSlider.value = this.settings.titleLength;
            if (descSlider) descSlider.value = this.settings.descLength;
            if (kwSlider) kwSlider.value = this.settings.keywordsCount;

            this.updateDisplays();
            
            // We do NOT save to localStorage here to avoid overwriting user's global preference 
            // with temporary marketplace defaults if they switch back and forth. 
            // Or maybe we should? Let's save it so it persists if they reload.
            this.saveSettings();
        }
        
        console.log('MetadataAdj: Defaults updated for new marketplace', this.defaults);
    }
}
