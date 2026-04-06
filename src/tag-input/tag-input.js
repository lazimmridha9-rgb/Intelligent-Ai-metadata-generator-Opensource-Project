
/**
 * Tag Input Component
 * Handles the creation and management of tag chips for input fields.
 */
export class TagInput {
    constructor(containerId, hiddenInputId, countId = null, clearBtnId = null) {
        this.container = document.getElementById(containerId);
        this.hiddenInput = document.getElementById(hiddenInputId);
        this.countElement = countId ? document.getElementById(countId) : null;
        this.clearBtn = clearBtnId ? document.getElementById(clearBtnId) : null;
        
        if (!this.container || !this.hiddenInput) return;

        this.input = this.container.querySelector('input[type="text"]');
        this.tags = [];
        
        if (!this.input) return;

        this.init();
    }

    init() {
        // Load initial value if any
        if (this.hiddenInput.value) {
            this.tags = this.hiddenInput.value.split(',').map(t => t.trim()).filter(t => t);
            this.renderTags();
        }

        // Event Listeners
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container || e.target === this.input) {
                this.input.focus();
            }
        });
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(this.input.value);
            } else if (e.key === ',' || e.key === ';') {
                e.preventDefault();
                this.addTag(this.input.value);
            } else if (e.key === 'Backspace' && this.input.value === '' && this.tags.length > 0) {
                // Remove the last tag when backspace is pressed on empty input
                this.removeTag(this.tags.length - 1);
            }
        });

        // Add tag on blur (if text exists)
        this.input.addEventListener('blur', () => {
            this.commitPendingInput();
        });
        
        // Paste support
        this.input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            // Split by comma, semicolon, or newline
            const items = text.split(/[,;\n]+/).map(t => t.trim()).filter(t => t);
            this.addTags(items);
        });

        // Clear button support
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clear();
            });
        }
    }
    clear() {
        this.tags = [];
        this.updateHiddenInput();
        this.renderTags();
    }

    addTag(text) {
        this.addTags([text]);
    }

    addTags(texts) {
        let changed = false;
        texts.forEach(text => {
            const cleanText = text.trim();
            // Prevent empty tags and duplicates (case-insensitive check for duplicates, but store original case)
            if (cleanText && !this.tags.some(t => t.toLowerCase() === cleanText.toLowerCase())) {
                this.tags.push(cleanText);
                changed = true;
            }
        });

        if (changed) {
            this.updateHiddenInput();
            this.renderTags();
        }
        this.input.value = '';
    }

    removeTag(index) {
        if (index >= 0 && index < this.tags.length) {
            this.tags.splice(index, 1);
            this.updateHiddenInput();
            this.renderTags();
        }
    }
    
    commitPendingInput() {
        if (!this.input) return;
        const raw = this.input.value;
        if (!raw) return;
        const items = raw.split(/[,;\n]+/).map(t => t.trim()).filter(t => t);
        if (items.length === 0) return;
        this.addTags(items);
    }

    updateHiddenInput() {
        this.hiddenInput.value = this.tags.join(', ');
        // Trigger change event so other scripts know it changed
        this.hiddenInput.dispatchEvent(new Event('change'));
        this.hiddenInput.dispatchEvent(new Event('input'));
    }

    renderTags() {
        // Remove existing tags (but keep the input)
        const existingTags = this.container.querySelectorAll('.tag-chip');
        existingTags.forEach(t => t.remove());

        // Insert new tags before the input
        this.tags.forEach((tag, index) => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip animate-fade-in-up';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'text-xs font-medium';
            textSpan.textContent = tag;
            textSpan.title = tag; // Show full text on hover
            chip.appendChild(textSpan);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'ml-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/10';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark text-[10px]"></i>';
            
            // Remove button click
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent focusing input
                this.removeTag(index);
            });
            chip.appendChild(removeBtn);

            this.container.insertBefore(chip, this.input);
        });

        // Update count and clear button visibility
        if (this.countElement) {
            this.countElement.textContent = this.tags.length;
            if (this.tags.length > 0) {
                this.countElement.classList.remove('hidden');
            } else {
                this.countElement.classList.add('hidden');
            }
        }
        
        if (this.clearBtn) {
            if (this.tags.length > 0) {
                this.clearBtn.classList.remove('hidden');
            } else {
                this.clearBtn.classList.add('hidden');
            }
        }
    }
}
