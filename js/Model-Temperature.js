/**
 * Model Temperature Control Module
 * Handles the logic for the temperature slider and persistence.
 */
export class ModelTemperature {
    constructor() {
        this.defaultTemperature = 0.4;
        this.currentTemperature = this.loadTemperature();

        // DOM Elements
        this.slider = null;
        this.display = null;
        this.container = null;
        this.resetBtn = null;
    }

    init() {
        this.slider = document.getElementById('tempSlider');
        this.display = document.getElementById('tempDisplay');
        this.container = document.getElementById('tempContainer');
        this.resetBtn = document.getElementById('resetTempBtn');

        if (!this.slider || !this.display) {
            console.warn('Temperature controls not found in DOM');
            return;
        }

        console.log('ModelTemperature initialized. Current value:', this.currentTemperature);

        // Set initial values
        this.slider.value = this.currentTemperature;
        this.updateDisplay();

        // Event Listeners
        this.slider.addEventListener('input', (e) => {
            this.currentTemperature = parseFloat(e.target.value);
            this.updateDisplay();
            this.saveTemperature();
        });

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                this.currentTemperature = this.defaultTemperature;
                this.slider.value = this.defaultTemperature;
                this.updateDisplay();
                this.saveTemperature();
            });
        }
    }

    updateDisplay() {
        if (this.display) {
            this.display.innerText = this.currentTemperature.toFixed(1);
        }

        // Optional: Update color/style based on value (Cool vs Creative)
        // low = blueish, high = reddish/orange could be a nice touch
    }

    loadTemperature() {
        const saved = localStorage.getItem('model_temperature');
        return saved ? parseFloat(saved) : this.defaultTemperature;
    }

    saveTemperature() {
        localStorage.setItem('model_temperature', this.currentTemperature);
    }

    getTemperature() {
        return this.currentTemperature;
    }
}
