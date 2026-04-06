import { storageGetItem, storageRemoveItem, storageSetItem } from './utils/safe-storage.js';

export class HistoryManager {
    constructor(callbacks) {
        this.history = JSON.parse(storageGetItem('gemini_history') || '[]');
        if (!Array.isArray(this.history)) {
            this.history = [];
        }
        this.onLoadItem = callbacks.onLoadItem;
        this.historyList = document.getElementById('historyList');
        this.historySection = document.getElementById('historySection');

        // Initial render
        this.render();
    }

    add(metadata, imageBase64, mimeType) {
        const newItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            metadata: metadata,
            image: imageBase64,
            mimeType: mimeType
        };

        // Add to beginning
        this.history.unshift(newItem);

        // Limit to 5 items to prevent localStorage overflow
        if (this.history.length > 5) {
            this.history.pop();
        }

        this._save();
        this.render();
    }

    _save() {
        const trySave = (items) => {
            try {
                storageSetItem('gemini_history', JSON.stringify(items));
                return true;
            } catch (e) {
                return false;
            }
        };

        if (trySave(this.history)) return;

        // If storage is tight, progressively drop oldest entries.
        while (this.history.length > 1) {
            this.history.pop();
            if (trySave(this.history)) return;
        }

        // If even one item is too heavy (large base64), keep metadata but remove image payload.
        this.history = this.history.map(item => ({ ...item, image: null, mimeType: null }));
        if (trySave(this.history)) return;

        // Final fallback: keep a single minimal metadata-only entry in memory.
        this.history = this.history[0] ? [this.history[0]] : [];
        try {
            storageSetItem('gemini_history', JSON.stringify(this.history));
        } catch (e) {
            console.warn('History persistence unavailable due to storage limits.');
        }
    }

    delete(index) {
        this.history.splice(index, 1);
        this._save();
        this.render();
    }

    render() {
        if (!this.historyList || !this.historySection) return;

        this.historyList.innerHTML = '';
        this.historySection.classList.remove('hidden');

        if (this.history.length === 0) {
            this.historyList.innerHTML = `
                <div class="text-center py-8 text-slate-500 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl">
                    <i class="fa-regular fa-clock text-2xl mb-2 opacity-30"></i>
                    <p class="text-xs font-medium">No recent activity yet</p>
                </div>
            `;
            // Disable clear button if empty
            const clearBtn = document.getElementById('clearHistoryBtn');
            if (clearBtn) clearBtn.disabled = true;
            return;
        }

        // Enable clear button if items exist
        const clearBtn = document.getElementById('clearHistoryBtn');
        if (clearBtn) clearBtn.disabled = false;

        this.history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden';
            
            // Item Content
            const previewHtml = item.image && item.mimeType
                ? `<img src="data:${item.mimeType};base64,${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">`
                : `<div class="w-full h-full flex items-center justify-center text-slate-500"><i class="fa-regular fa-image"></i></div>`;

            div.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                
                <div class="relative w-12 h-12 rounded-lg bg-slate-900 overflow-hidden border border-white/10 shrink-0">
                    ${previewHtml}
                </div>
                
                <div class="flex-grow min-w-0 relative z-10 pr-6">
                    <h4 class="text-xs font-bold text-slate-200 truncate group-hover:text-primary transition-colors mb-0.5">
                        ${item.metadata.title || item.metadata.seoTitle || 'Untitled Image'}
                    </h4>
                    <div class="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <span><i class="fa-regular fa-clock mr-1"></i>${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                
                <div class="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    <i class="fa-solid fa-chevron-right text-xs text-primary"></i>
                </div>
            `;

            // Delete Button (Programmatically created to handle events cleanly)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-1/2 -translate-y-1/2 right-8 w-6 h-6 flex items-center justify-center rounded-full bg-slate-900/80 text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110 shadow-lg';
            deleteBtn.innerHTML = '<i class="fa-solid fa-xmark text-[10px]"></i>';
            deleteBtn.title = "Remove from history";
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent loading the item
                this.delete(index);
            });

            // Load Action
            div.addEventListener('click', () => {
                if (this.onLoadItem) {
                    this.onLoadItem(item);
                }
            });

            div.appendChild(deleteBtn);
            this.historyList.appendChild(div);
        });
    }

    clear() {
        if (confirm('Are you sure you want to clear your history?')) {
            this.history = [];
            storageRemoveItem('gemini_history');
            this.render();
            return true;
        }
        return false;
    }
}
