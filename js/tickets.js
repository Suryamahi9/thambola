// ===== TAMBOLA TICKET GENERATOR =====
const BATCH_KEY = 'tambola-batches-v2';

// ---- 3x9 ticket grid with exactly 15 numbers, 5 per row, columns by tens ----
// Rows are filled with randomized tie-breaks so numbers spread evenly
// (no stacked blocks, no long consecutive runs) for a clean ticket look.
function generateTicket() {
    for (let attempt = 0; attempt < 300; attempt++) {
        const grid = tryGenerateTicket();
        if (grid && isValidTicket(grid)) return grid;
    }
    return tryGenerateTicket();
}

function tryGenerateTicket() {
    const grid = [
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null]
    ];

    const colRanges = [];
    for (let c = 0; c < 9; c++) {
        const start = c === 0 ? 1 : c * 10;
        const end = c === 8 ? 90 : c * 10 + 9;
        colRanges.push({ start, end });
    }

    // Column counts: 1-3 each, total 15
    const colCounts = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    let remaining = 6;
    while (remaining > 0) {
        const col = Math.floor(Math.random() * 9);
        if (colCounts[col] < 3) {
            colCounts[col]++;
            remaining--;
        }
    }

    // Assign rows (each row gets exactly 5). Shuffle tie-breaks so rows
    // interleave instead of stacking vertically.
    const rowCounts = [0, 0, 0];
    const colRows = [[], [], [], [], [], [], [], [], []];
    const colOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        .sort((a, b) => colCounts[b] - colCounts[a] || Math.random() - 0.5);

    for (const col of colOrder) {
        const count = colCounts[col];
        const avail = [0, 1, 2].filter(r => rowCounts[r] < 5);
        for (let i = avail.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [avail[i], avail[j]] = [avail[j], avail[i]];
        }
        avail.sort((a, b) => rowCounts[a] - rowCounts[b]);
        const chosen = avail.slice(0, count);
        for (const r of chosen) {
            colRows[col].push(r);
            rowCounts[r]++;
        }
    }

    if (rowCounts[0] !== 5 || rowCounts[1] !== 5 || rowCounts[2] !== 5) {
        return null;
    }

    // Fill numbers
    for (let col = 0; col < 9; col++) {
        const { start, end } = colRanges[col];
        const count = colCounts[col];
        const pool = [];
        for (let n = start; n <= end; n++) pool.push(n);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const nums = pool.slice(0, count).sort((a, b) => a - b);
        // Assign in ascending row order so each column reads top-to-bottom
        // (e.g. 68 above 70, never 70 above 68).
        const rows = colRows[col].slice().sort((a, b) => a - b);
        for (let i = 0; i < rows.length; i++) {
            grid[rows[i]][col] = nums[i];
        }
    }

    return grid;
}

// ===== FULL TAMBOLA TICKET RULES =====
// Every generated ticket must satisfy ALL of these:
//   1. 3 rows x 9 columns grid
//   2. Exactly 15 numbers
//   3. Exactly 5 numbers in every row
//   4. At least 1 and at most 3 numbers in every column
//   5. No column may be completely empty
//   6. Column 1 = 1-9, col 2 = 10-19 ... col 9 = 80-90
//   7. Numbers in a column are sorted top-to-bottom
//   8. Numbers in a row are sorted left-to-right
//   9. No number repeats on a ticket
//  10. Aesthetic: no row has 3+ consecutive filled cells (looks bunched)
//      — relaxed for full-set strips (run < 4), since real tickets allow 3-in-a-row
function isValidTicket(grid, maxRun = 3) {
    let total = 0;
    const colCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let r = 0; r < 3; r++) {
        let rowCount = 0;
        let prev = 0;
        for (let c = 0; c < 9; c++) {
            const v = grid[r][c];
            if (v !== null) {
                total++;
                rowCount++;
                colCounts[c]++;
                // Rule 8 + 9: rows ascending left-to-right (no repeats)
                if (v <= prev) return false;
                prev = v;
            }
        }
        // Rule 3: exactly 5 per row
        if (rowCount !== 5) return false;
    }

    // Rule 2: exactly 15 numbers
    if (total !== 15) return false;

    for (let c = 0; c < 9; c++) {
        // Rules 4 & 5: 1-3 per column, none empty
        if (colCounts[c] < 1 || colCounts[c] > 3) return false;
        // Rule 7: column sorted top-to-bottom
        let prev = 0;
        for (let r = 0; r < 3; r++) {
            const v = grid[r][c];
            if (v !== null) {
                if (v <= prev) return false;
                prev = v;
            }
        }
    }

    // Rule 10: no long consecutive filled cells in a row
    for (let r = 0; r < 3; r++) {
        let run = 0;
        for (let c = 0; c < 9; c++) {
            run = grid[r][c] === null ? 0 : run + 1;
            if (run >= maxRun) return false;
        }
    }

    return true;
}

// Serialize a grid so we can detect duplicate tickets.
function gridKey(grid) {
    return grid.map(row => row.map(v => v === null ? '' : v).join('|')).join('/');
}

// Generate `count` tickets, guaranteed to be all different.
function generateUniqueGrids(count) {
    const seen = new Set();
    const grids = [];
    let attempts = 0;
    const maxAttempts = Math.max(800, count * 120);

    while (grids.length < count && attempts < maxAttempts) {
        attempts++;
        const grid = generateTicket();
        const key = gridKey(grid);
        if (seen.has(key)) continue;
        seen.add(key);
        grids.push(grid);
    }

    // Fallback: force-unique by re-rolling until all distinct (very rare).
    let guard = 0;
    while (grids.length < count && guard < 500) {
        guard++;
        const grid = generateTicket();
        const key = gridKey(grid);
        if (seen.has(key)) continue;
        seen.add(key);
        grids.push(grid);
    }

    return grids;
}

// ===== FULL-SET 6-TICKET BOOK (all 90 numbers exactly once) =====
// A strip/book of 6 tickets covers every number 1-90 exactly once.
// Column totals: col0 = 1-9 (9 nums), cols1-7 = 10 nums, col8 = 80-90 (11 nums).
// Each column is shared across the 6 tickets; each ticket gets 1 or 2 numbers
// per column (six columns of 2 + three columns of 1 = 15 numbers).
const STRIP_TWOS_PER_COL = [3, 4, 4, 4, 4, 4, 4, 4, 5];

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Decide which tickets get 2 numbers per column so that every ticket ends with
// six 2-columns and three 1-columns (15 numbers).
function buildStripCounts() {
    for (let attempt = 0; attempt < 20000; attempt++) {
        const cc = Array.from({ length: 6 }, () => Array(9).fill(0));
        const twos = Array(6).fill(0);
        const ones = Array(6).fill(0);
        let ok = true;

        for (let c = 0; c < 9 && ok; c++) {
            const k = STRIP_TWOS_PER_COL[c];
            const candidates = shuffle([0, 1, 2, 3, 4, 5].filter(t => twos[t] < 6));
            const chosen = [];
            for (const t of candidates) {
                if (chosen.length >= k) break;
                const remainingCols = 9 - c - 1;
                const needTwos = 6 - (twos[t] + 1);
                const needOnes = 3 - ones[t];
                if (needTwos + needOnes <= remainingCols) chosen.push(t);
            }
            if (chosen.length !== k) { ok = false; break; }
            for (let t = 0; t < 6; t++) {
                cc[t][c] = chosen.includes(t) ? 2 : 1;
                if (chosen.includes(t)) twos[t]++; else ones[t]++;
            }
            // Everyone must still be able to reach six 2-columns
            for (let t = 0; t < 6; t++) {
                if (twos[t] + (9 - c - 1) < 6) { ok = false; break; }
            }
        }

        if (!ok) continue;
        if (twos.every(x => x === 6) && ones.every(x => x === 3)) return cc;
    }
    return null;
}

// Generate one full set: 6 valid, unique tickets covering 1-90 exactly once.
function generateStrip() {
    for (let attempt = 0; attempt < 2000; attempt++) {
        const cc = buildStripCounts();
        if (!cc) continue;

        const tickets = Array.from({ length: 6 }, () => Array.from({ length: 3 }, () => Array(9).fill(null)));
        const colNums = Array.from({ length: 6 }, () => Array(9));
        let ok = true;

        // Distribute each column's number range across the 6 tickets
        for (let c = 0; c < 9 && ok; c++) {
            const start = c === 0 ? 1 : c * 10;
            const end = c === 8 ? 90 : c * 10 + 9;
            const pool = [];
            for (let n = start; n <= end; n++) pool.push(n);
            shuffle(pool);
            let idx = 0;
            for (let t = 0; t < 6; t++) {
                const cnt = cc[t][c];
                colNums[t][c] = pool.slice(idx, idx + cnt).sort((a, b) => a - b);
                idx += cnt;
            }
        }

        // Place each ticket's numbers into rows (5 per row, spaced)
        for (let t = 0; t < 6 && ok; t++) {
            const colCounts = cc[t];
            const rowCounts = [0, 0, 0];
            const colRows = Array.from({ length: 9 }, () => []);
            const colOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8]
                .sort((a, b) => colCounts[b] - colCounts[a] || Math.random() - 0.5);

            for (const col of colOrder) {
                const count = colCounts[col];
                const avail = [0, 1, 2].filter(r => rowCounts[r] < 5);
                shuffle(avail);
                avail.sort((a, b) => rowCounts[a] - rowCounts[b]);
                const chosen = avail.slice(0, count);
                for (const r of chosen) { colRows[col].push(r); rowCounts[r]++; }
            }

            if (rowCounts[0] !== 5 || rowCounts[1] !== 5 || rowCounts[2] !== 5) { ok = false; break; }

            for (let col = 0; col < 9; col++) {
                const rows = colRows[col].slice().sort((a, b) => a - b);
                for (let i = 0; i < rows.length; i++) {
                    tickets[t][rows[i]][col] = colNums[t][col][i];
                }
            }

            if (!isValidTicket(tickets[t], 4)) { ok = false; break; }
        }

        if (!ok) continue;

        // Coverage check: all 90 numbers used exactly once
        const seen = new Set();
        let covered = true;
        for (let t = 0; t < 6 && covered; t++) {
            for (let r = 0; r < 3 && covered; r++) {
                for (let c = 0; c < 9; c++) {
                    const v = tickets[t][r][c];
                    if (v === null) continue;
                    if (seen.has(v)) { covered = false; break; }
                    seen.add(v);
                }
            }
        }
        if (covered && seen.size === 90) return tickets;
    }
    return null;
}

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
