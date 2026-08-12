// ===== TAMBOLA TICKET GENERATOR (UI layer) =====
// Pure ticket logic (generateTicket / generateUniqueGrids / generateStrip /
// isValidTicket / gridKey) lives in js/tickets-core.js — load it first.
const BATCH_KEY = 'tambola-batches-v2';
const ACTIVE_BATCH_KEY = 'tambola-active-batch-v1';

// ---- Batch persistence ----
function loadBatches() {
    try {
        const raw = localStorage.getItem(BATCH_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveBatch(batch) {
    const batches = loadBatches();
    batches.unshift({ time: new Date().toLocaleString(), tickets: batch });
    const trimmed = batches.slice(0, 5);
    try {
        localStorage.setItem(BATCH_KEY, JSON.stringify(trimmed));
    } catch (e) { /* ignore */ }
    // Latest batch becomes the active batch used by game.html for per-ticket win checks.
    try {
        localStorage.setItem(ACTIVE_BATCH_KEY, JSON.stringify({ tickets: batch }));
    } catch (e) { /* ignore */ }
    renderBatches();
}

// ---- Render single ticket ----
function buildTicketElement(grid, name, index, total) {
    const ticketEl = document.createElement('div');
    ticketEl.className = 'ticket';

    const header = document.createElement('div');
    header.className = 'ticket-header';
    const left = document.createElement('span');
    left.textContent = name ? '🎫 ' + name : 'Tambola Ticket';
    const right = document.createElement('span');
    right.textContent = '#' + String(index + 1).padStart(2, '0') + ' / ' + total;
    header.appendChild(left);
    header.appendChild(right);
    ticketEl.appendChild(header);

    const gridEl = document.createElement('div');
    gridEl.className = 'ticket-grid';
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'ticket-cell';
            if (grid[r][c] === null) {
                cell.classList.add('empty');
            } else {
                cell.textContent = grid[r][c];
            }
            gridEl.appendChild(cell);
        }
    }
    ticketEl.appendChild(gridEl);
    return ticketEl;
}

// ---- Main generate ----
let ticketMode = 'random';

function setTicketMode(mode) {
    ticketMode = mode;
    document.getElementById('modeRandom').classList.toggle('active', mode === 'random');
    document.getElementById('modeFullset').classList.toggle('active', mode === 'fullset');
    const label = document.getElementById('countLabel');
    if (label) label.textContent = mode === 'fullset' ? 'How many sets (6 each)' : 'How many tickets';
    const input = document.getElementById('ticketCount');
    if (mode === 'fullset') {
        const v = parseInt(input.value) || 1;
        input.value = Math.max(1, Math.min(5, Math.ceil(v / 6)));
        input.max = 5;
    } else {
        input.max = 30;
    }
    generateTickets();
}

function generateTickets() {
    const name = document.getElementById('playerName').value.trim();
    const container = document.getElementById('ticketsContainer');
    container.innerHTML = '';

    // Full-set book mode: 1-5 sets, each covering all 90 numbers exactly once
    if (ticketMode === 'fullset') {
        const sets = Math.max(1, Math.min(5, parseInt(document.getElementById('ticketCount').value) || 1));
        const setLabels = ['A', 'B', 'C', 'D', 'E'];
        const grids = [];
        let index = 0;

        for (let s = 0; s < sets; s++) {
            const strip = generateStrip();
            if (!strip) {
                container.innerHTML = '';
                showToast('Could not generate a full set — please try again');
                return;
            }
            strip.forEach(g => {
                grids.push(g);
                container.appendChild(buildTicketElement(g, 'Set ' + setLabels[s], index, sets * 6));
                index++;
            });
        }

        saveBatch(grids);
        showToast('Generated ' + grids.length + ' tickets — full set, 1–90 each exactly once');
        return;
    }

    const count = Math.max(1, Math.min(30, parseInt(document.getElementById('ticketCount').value) || 6));
    const grids = generateUniqueGrids(count);

    grids.forEach((grid, i) => {
        container.appendChild(buildTicketElement(grid, name || null, i, count));
    });

    saveBatch(grids);
    showToast('Generated ' + count + ' unique tickets');
}

// ---- Fill names from a name list (space separated) ----
function fillNames() {
    if (ticketMode === 'fullset') {
        showToast('Switch to Random Tickets mode to add player names');
        return;
    }
    const input = document.getElementById('playerName').value.trim();
    if (!input) {
        showToast('Type a name first, or enter multiple names separated by spaces');
        return;
    }
    const names = input.split(/\s+/).filter(Boolean);
    const count = Math.max(1, Math.min(30, parseInt(document.getElementById('ticketCount').value) || 6));
    const container = document.getElementById('ticketsContainer');
    container.innerHTML = '';

    const grids = generateUniqueGrids(count);

    for (let t = 0; t < count; t++) {
        const base = names[t] || 'Player';
        const label = base + '-' + (t + 1);
        container.appendChild(buildTicketElement(grids[t], label, t, count));
    }

    saveBatch(grids);
    showToast('Tickets with names generated');
}

// ---- Batch history rendering ----
function renderBatches() {
    const list = document.getElementById('batchList');
    const batches = loadBatches();
    if (batches.length === 0) {
        list.innerHTML = '<span class="history-empty">No batches yet — generate your first set of tickets above.</span>';
        return;
    }
    list.innerHTML = '';
    batches.forEach((batch, bIdx) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;';

        const info = document.createElement('div');
        const when = document.createElement('div');
        when.textContent = '🕐 ' + batch.time + ' · ' + batch.tickets.length + ' tickets';
        when.style.cssText = 'font-size:0.85rem; font-weight:600;';
        const grid = document.createElement('div');
        grid.style.cssText = 'font-size:0.72rem; color:var(--text-muted); margin-top:2px;';
        const first3 = batch.tickets[0].flat().filter(v => v !== null).slice(0, 10);
        grid.textContent = 'Sample: ' + first3.join(', ') + '…';
        info.appendChild(when);
        info.appendChild(grid);

        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'padding:8px 14px; font-size:0.8rem;';
        btn.textContent = '↻ Reuse';
        btn.onclick = () => {
            document.getElementById('ticketCount').value = batch.tickets.length;
            const container = document.getElementById('ticketsContainer');
            container.innerHTML = '';
            batch.tickets.forEach((g, i) => container.appendChild(buildTicketElement(g, null, i, batch.tickets.length)));
            showToast('Restored batch from ' + batch.time);
        };

        wrap.appendChild(info);
        wrap.appendChild(btn);
        list.appendChild(wrap);
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    renderBatches();
    generateTickets();
});
