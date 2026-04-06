export function updateCharCount(elementId, count, recommendedMax) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerText = `${count} chars`;
    el.classList.remove('hidden');

    if (count > recommendedMax) {
        el.classList.add('text-orange-400', 'bg-orange-500/10');
        el.classList.remove('text-blue-400', 'bg-blue-500/10');
    } else {
        el.classList.remove('text-orange-400', 'bg-orange-500/10');
        el.classList.add('text-blue-400', 'bg-blue-500/10');
    }
}

export function updateCount(elementId, count, recommendedMax, unit) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerText = `${count} ${unit}`;
    el.classList.remove('hidden');

    if (count > recommendedMax) {
        el.classList.add('text-orange-400', 'bg-orange-500/10');
        el.classList.remove('text-blue-400', 'bg-blue-500/10');
    } else {
        el.classList.remove('text-orange-400', 'bg-orange-500/10');
        el.classList.add('text-blue-400', 'bg-blue-500/10');
    }
}
