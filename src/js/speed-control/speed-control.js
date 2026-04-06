/**
 * Speed Control Module
 * Handles speed selection UI and persistence.
 * Controls generation speed: 1x (normal) to 4x (fastest)
 */

import { getSpeedConfig } from './speed-config.js';

export class SpeedControl {
    constructor() {
        this.defaultSpeed = '1x';
        this.currentSpeed = this.loadSpeed();
        this.container = null;
        this.speedButtons = [];
    }

    /**
     * Initialize speed control UI
     * @param {HTMLElement} container - Container element for speed control
     */
    init(container) {
        if (!container) {
            console.warn('SpeedControl: Container not provided');
            return;
        }

        this.container = container;
        this.render();
        this.setupEventListeners();
        this.updateActiveSpeed(this.currentSpeed);
        this.updateSpeedInfo(this.currentSpeed);
    }

    /**
     * Render speed control UI
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="glass-panel rounded-3xl p-6 hover-card">
                <h3 class="text-sm font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/5 pb-4">
                    <i class="fa-solid fa-gauge-high text-primary"></i> Generation Speed
                </h3>

                <div class="mb-4">
                    <p class="text-[10px] text-slate-500 mb-4 leading-relaxed">
                        <i class="fa-solid fa-circle-info text-blue-400/50 mr-1"></i>
                        Higher speed = faster generation but may reduce quality. 1x is recommended for best results.
                    </p>
                </div>

                <!-- Speed Buttons Grid -->
                <div class="grid grid-cols-4 gap-2 mb-4">
                    <button class="speed-btn group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-slate-800/50 transition-all hover:scale-105 active:scale-95" 
                            data-speed="1x" 
                            title="Normal Speed - Default quality">
                        <div class="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold text-sm group-hover:bg-blue-500/30 transition-colors">
                            1x
                        </div>
                        <span class="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">Normal</span>
                    </button>

                    <button class="speed-btn group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-slate-800/50 transition-all hover:scale-105 active:scale-95" 
                            data-speed="2x" 
                            title="Fast - Faster generation">
                        <div class="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30 font-bold text-sm group-hover:bg-green-500/30 transition-colors">
                            2x
                        </div>
                        <span class="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">Fast</span>
                    </button>

                    <button class="speed-btn group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-slate-800/50 transition-all hover:scale-105 active:scale-95" 
                            data-speed="3x" 
                            title="Very Fast - Optimized for speed">
                        <div class="w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center border border-yellow-500/30 font-bold text-sm group-hover:bg-yellow-500/30 transition-colors">
                            3x
                        </div>
                        <span class="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">Very Fast</span>
                    </button>

                    <button class="speed-btn group flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-slate-800/50 transition-all hover:scale-105 active:scale-95" 
                            data-speed="4x" 
                            title="Maximum Speed - Fastest possible">
                        <div class="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 font-bold text-sm group-hover:bg-red-500/30 transition-colors">
                            4x
                        </div>
                        <span class="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">Max</span>
                    </button>
                </div>

                <!-- Speed Info Display -->
                <div class="mt-4 p-3 bg-slate-800/30 rounded-xl border border-white/5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Speed</span>
                        <span id="speedDisplay" class="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">1x</span>
                    </div>
                    <p id="speedDescription" class="text-[10px] text-slate-500 leading-relaxed">
                        Default quality, balanced speed
                    </p>
                </div>
            </div>
        `;

        this.speedButtons = this.container.querySelectorAll('.speed-btn');
    }

    /**
     * Setup event listeners for speed buttons
     */
    setupEventListeners() {
        this.speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = btn.dataset.speed;
                this.setSpeed(speed);
            });
        });
    }

    /**
     * Set current speed and update UI
     * @param {string} speedLevel - Speed level ('1x', '2x', '3x', '4x')
     */
    setSpeed(speedLevel) {
        if (!['1x', '2x', '3x', '4x'].includes(speedLevel)) {
            console.warn(`Invalid speed level: ${speedLevel}, defaulting to 1x`);
            speedLevel = '1x';
        }

        this.currentSpeed = speedLevel;
        this.saveSpeed();
        this.updateActiveSpeed(speedLevel);
        this.updateSpeedInfo(speedLevel);
        
        // Log speed change for debugging
        console.log(`[SpeedControl] Speed changed to: ${speedLevel}`);
    }

    /**
     * Update active speed button styling
     * @param {string} speedLevel
     */
    updateActiveSpeed(speedLevel) {
        if (!this.speedButtons || this.speedButtons.length === 0) {
            console.warn('[SpeedControl] Speed buttons not found, re-querying...');
            this.speedButtons = this.container.querySelectorAll('.speed-btn');
        }
        
        this.speedButtons.forEach(btn => {
            const speed = btn.dataset.speed;
            if (speed === speedLevel) {
                btn.classList.add('border-primary', 'bg-primary/10');
                btn.classList.remove('border-white/5', 'bg-slate-800/50');
            } else {
                btn.classList.remove('border-primary', 'bg-primary/10');
                btn.classList.add('border-white/5', 'bg-slate-800/50');
            }
        });
    }

    /**
     * Update speed info display
     * @param {string} speedLevel
     */
    updateSpeedInfo(speedLevel) {
        const config = getSpeedConfig(speedLevel);
        const display = document.getElementById('speedDisplay');
        const description = document.getElementById('speedDescription');

        if (display) {
            display.textContent = speedLevel;
        } else {
            console.warn('[SpeedControl] speedDisplay element not found');
        }
        
        if (description) {
            description.textContent = config.description;
        } else {
            console.warn('[SpeedControl] speedDescription element not found');
        }
    }

    /**
     * Get current speed level
     * @returns {string} Current speed ('1x', '2x', '3x', '4x')
     */
    getSpeed() {
        return this.currentSpeed;
    }

    /**
     * Get speed configuration for current speed
     * @returns {Object} Speed configuration
     */
    getSpeedConfig() {
        return getSpeedConfig(this.currentSpeed);
    }

    /**
     * Load speed from localStorage
     * @returns {string} Saved speed or default
     */
    loadSpeed() {
        const saved = localStorage.getItem('generation_speed');
        return saved && ['1x', '2x', '3x', '4x'].includes(saved) ? saved : this.defaultSpeed;
    }

    /**
     * Save speed to localStorage
     */
    saveSpeed() {
        localStorage.setItem('generation_speed', this.currentSpeed);
    }
}
