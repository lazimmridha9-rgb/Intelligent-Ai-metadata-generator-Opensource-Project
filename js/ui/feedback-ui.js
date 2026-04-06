export function showToast(message, type = 'info') {
    const toast = document.createElement('div');

    let bgClass = 'bg-slate-800/90 border border-white/10';
    let textClass = 'text-slate-200';
    let iconColor = 'text-blue-400';

    if (type === 'error') {
        bgClass = 'bg-red-500/10 border border-red-500/20';
        textClass = 'text-red-200';
        iconColor = 'text-red-400';
    }
    if (type === 'success') {
        bgClass = 'bg-green-500/10 border border-green-500/20';
        textClass = 'text-green-200';
        iconColor = 'text-green-400';
    }

    toast.className = `fixed bottom-6 right-6 ${bgClass} ${textClass} backdrop-blur-md px-5 py-4 rounded-2xl shadow-2xl text-sm font-medium z-50 animate-fade-in flex items-center gap-3 transform hover:-translate-y-1 transition-transform cursor-pointer`;

    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';

    toast.innerHTML = `<span class="${iconColor} text-lg">${icon}</span> <span>${message}</span>`;

    toast.addEventListener('click', () => {
        toast.remove();
    });

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

export function showErrorModal(title, message) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center opacity-0 transition-opacity duration-300';

    const modal = document.createElement('div');
    modal.className = 'glass-panel bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg mx-4 transform scale-95 transition-all duration-300 overflow-hidden flex flex-col max-h-[90vh]';

    const header = document.createElement('div');
    header.className = 'bg-red-500/10 p-6 border-b border-red-500/10 flex items-start gap-4 shrink-0';
    header.innerHTML = `
        <div class="bg-red-500/20 p-3 rounded-xl shrink-0 flex items-center justify-center">
            <i class="fa-solid fa-triangle-exclamation text-red-400 text-xl"></i>
        </div>
        <div>
            <h3 class="text-lg font-bold text-white leading-tight">${title}</h3>
            <p class="text-sm text-red-300 font-medium mt-1">An error occurred while processing</p>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'p-6 overflow-y-auto custom-scrollbar';

    let contentHtml = message;
    contentHtml = contentHtml.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>'
    );

    body.innerHTML = `
        <div class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">${contentHtml}</div>
    `;

    const footer = document.createElement('div');
    footer.className = 'bg-slate-900/50 px-6 py-4 flex justify-end border-t border-white/5 shrink-0';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-black/20 active:scale-95 border border-white/5';
    closeBtn.innerText = 'Dismiss';

    footer.appendChild(closeBtn);
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('scale-95');
        modal.classList.add('scale-100');
    });

    const close = () => {
        overlay.classList.add('opacity-0');
        modal.classList.remove('scale-100');
        modal.classList.add('scale-95');
        setTimeout(() => overlay.remove(), 300);
    };

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}
