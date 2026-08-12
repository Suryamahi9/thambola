// ===== TAMBOLA GAME ENGINE =====
const SAVE_KEY = 'tambola-game-v1';
const PRESETS_KEY = 'tambola-presets-v1';
const ACTIVE_BATCH_KEY = 'tambola-active-batch-v1';

const state = {
    mode: 'manual',
    language: 'en-IN',
    speed: 4000,
    rate: 0.85,
    voiceURI: '',
    luckyOn: true,
    calledNumbers: [],
    remainingNumbers: [],
    lastNumber: null,
    autoTimer: null,
    isAutoRunning: false,
    countdown: 0,
    houseCalls: [],
    announced: new Set(),
    winners: [],
    activeTickets: null,
    labels: []
};

// ===== PERSISTENCE =====
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            calledNumbers: state.calledNumbers,
            lastNumber: state.lastNumber,
            mode: state.mode,
            language: state.language,
            speed: state.speed,
            rate: state.rate,
            voiceURI: state.voiceURI,
            luckyOn: state.luckyOn,
            houseCalls: state.houseCalls,
            announced: Array.from(state.announced),
            winners: state.winners
        }));
    } catch (e) { /* storage full / private mode */ }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!Array.isArray(data.calledNumbers)) return false;
        state.calledNumbers = data.calledNumbers;
        state.lastNumber = data.lastNumber || null;
        if (data.mode) state.mode = data.mode;
        if (data.language) state.language = data.language;
        if (data.speed) state.speed = data.speed;
        if (data.rate != null) state.rate = data.rate;
        if (data.voiceURI) state.voiceURI = data.voiceURI;
        if (data.luckyOn != null) state.luckyOn = data.luckyOn;
        if (Array.isArray(data.houseCalls)) state.houseCalls = data.houseCalls;
        if (Array.isArray(data.announced)) state.announced = new Set(data.announced);
        if (Array.isArray(data.winners)) state.winners = data.winners;
        return true;
    } catch (e) {
        return false;
    }
}

function rebuildRemaining() {
    state.remainingNumbers = [];
    const calledSet = new Set(state.calledNumbers);
    for (let i = 1; i <= 90; i++) {
        if (!calledSet.has(i)) state.remainingNumbers.push(i);
    }
}

// ===== TICKET-TO-GAME SYNC =====
function loadActiveTickets() {
    try {
        const raw = localStorage.getItem(ACTIVE_BATCH_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!Array.isArray(data.tickets)) return;
        state.activeTickets = data.tickets.map(t => ({
            name: t.name || 'Ticket',
            grid: t.grid || t
        }));
    } catch (e) { /* ignore */ }
}

// ===== WIN PATTERNS =====
const BOARD_PATTERNS = [
    { id: 'early5', label: 'Early Five', icon: '5️⃣', nums: null, target: 5 },
    { id: 'corners', label: 'Corners', icon: '⛶', nums: [1, 10, 81, 90] },
    { id: 'top', label: 'Top Line (1–30)', icon: '1️⃣', nums: range(1, 30) },
    { id: 'middle', label: 'Middle Line (31–60)', icon: '3️⃣', nums: range(31, 60) },
    { id: 'bottom', label: 'Bottom Line (61–90)', icon: '9️⃣', nums: range(61, 90) },
    { id: 'fullhouse', label: 'Full House', icon: '🏆', nums: range(1, 90) }
];
function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }

function patternProgress(p) {
    if (p.id === 'early5') {
        return { done: state.calledNumbers.length >= p.target, have: Math.min(state.calledNumbers.length, 5), total: 5 };
    }
    const have = p.nums.filter(n => state.calledNumbers.includes(n)).length;
    return { done: have === p.nums.length, have, total: p.nums.length };
}

function ticketRowNums(grid, row) {
    return grid[row].filter(v => v !== null);
}
function ticketCorners(grid) {
    const c0 = grid[0].findIndex(v => v !== null);
    const c9 = grid[0].findLastIndex(v => v !== null);
    const corners = [];
    if (c0 >= 0) corners.push(grid[0][c0]);
    if (c9 > c0) corners.push(grid[0][c9]);
    const b0 = grid[2].findIndex(v => v !== null);
    const b9 = grid[2].findLastIndex(v => v !== null);
    if (b0 >= 0) corners.push(grid[2][b0]);
    if (b9 > b0) corners.push(grid[2][b9]);
    return corners;
}
function ticketAllNums(grid) {
    return grid.flat().filter(v => v !== null);
}

function checkWins() {
    const calledSet = new Set(state.calledNumbers);

    if (state.activeTickets && state.activeTickets.length) {
        state.activeTickets.forEach((t, ti) => {
            const grid = t.grid;
            const keyBase = 't' + ti;
            const rowDefs = [
                { id: keyBase + '-top', label: 'Top Line', nums: ticketRowNums(grid, 0) },
                { id: keyBase + '-mid', label: 'Middle Line', nums: ticketRowNums(grid, 1) },
                { id: keyBase + '-bot', label: 'Bottom Line', nums: ticketRowNums(grid, 2) },
                { id: keyBase + '-corn', label: 'Corners', nums: ticketCorners(grid) },
                { id: keyBase + '-full', label: 'Full House', nums: ticketAllNums(grid) }
            ];
            rowDefs.forEach(def => {
                if (state.announced.has(def.id)) return;
                if (def.nums.length > 0 && def.nums.every(n => calledSet.has(n))) {
                    state.announced.add(def.id);
                    announceWin(t.name, def.label);
                    if (def.label === 'Full House') {
                        recordWinner(t.name, 'Full House');
                    }
                }
            });
        });
        return;
    }

    // Board-level patterns (no tickets synced)
    BOARD_PATTERNS.forEach(p => {
        if (state.announced.has(p.id)) return;
        const prog = patternProgress(p);
        if (prog.done) {
            state.announced.add(p.id);
            announceWin('Board', p.label);
            if (p.id === 'fullhouse') {
                recordWinner('Board', 'Full House');
                endGame();
            }
        }
    });
}

function announceWin(who, label) {
    showToast('🎉 ' + who + ' — ' + label + '!');
    playDing();
    const banner = document.getElementById('winBanner');
    if (banner) {
        banner.innerHTML = '🎉 ' + who + ' completes <strong>' + label + '</strong>!';
        banner.classList.add('show');
        clearTimeout(announceWin._t);
        announceWin._t = setTimeout(() => banner.classList.remove('show'), 4000);
    }
}

function recordWinner(name, pattern) {
    if (state.winners.some(w => w.name === name && w.pattern === pattern)) return;
    state.winners.push({ name, pattern, at: state.calledNumbers.length, time: new Date().toISOString() });
    saveGame();
}

function endGame() {
    stopAuto();
    playCheer();
    showToast('🏆 Full House! Game complete — share results to celebrate!');
    updateStatus('Game Over!');
}

function renderPatterns() {
    const panel = document.getElementById('patternsPanel');
    if (!panel) return;
    if (state.activeTickets && state.activeTickets.length) {
        panel.innerHTML = '';
        state.activeTickets.forEach((t, ti) => {
            const row = document.createElement('div');
            row.className = 'player-win-row';
            const name = document.createElement('span');
            name.className = 'player-win-name';
            name.textContent = t.name;
            const badges = document.createElement('span');
            badges.className = 'player-win-badges';
            const defs = [
                { label: 'Top', nums: ticketRowNums(t.grid, 0) },
                { label: 'Middle', nums: ticketRowNums(t.grid, 1) },
                { label: 'Bottom', nums: ticketRowNums(t.grid, 2) },
                { label: 'Corners', nums: ticketCorners(t.grid) },
                { label: 'Full House', nums: ticketAllNums(t.grid) }
            ];
            const set = new Set(state.calledNumbers);
            defs.forEach(d => {
                const ok = d.nums.length > 0 && d.nums.every(n => set.has(n));
                const el = document.createElement('span');
                el.className = 'win-badge' + (ok ? ' done' : '');
                el.textContent = d.label + ' ' + (d.nums.filter(n => set.has(n)).length) + '/' + d.nums.length;
                badges.appendChild(el);
            });
            row.appendChild(name);
            row.appendChild(badges);
            panel.appendChild(row);
        });
        return;
    }
    panel.innerHTML = '';
    BOARD_PATTERNS.forEach(p => {
        const prog = patternProgress(p);
        const item = document.createElement('div');
        item.className = 'pattern-item' + (prog.done ? ' done' : '');
        item.innerHTML = '<span class="pattern-icon">' + p.icon + '</span>' +
            '<span class="pattern-label">' + p.label + '</span>' +
            '<span class="pattern-bar"><span class="pattern-fill" style="width:' + (prog.total ? Math.round(prog.have / prog.total * 100) : 0) + '%"></span></span>' +
            '<span class="pattern-nums">' + prog.have + '/' + prog.total + '</span>';
        panel.appendChild(item);
    });
}

// ===== AUDIO =====
let currentAudio = null;
let voicesLoaded = false;

function playLocalNumber(num, langCode) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    const audio = new Audio('audio/' + langCode + '/' + num + '.mp3');
    currentAudio = audio;
    audio.play().catch(function () {
        document.getElementById('audioWarning').classList.add('show');
    });
}

function speakNumber(num) {
    const lang = state.language;
    // Hindi / Telugu → pre-recorded audio; other languages → TTS
    if (lang === 'hi-IN' || lang === 'te-IN') {
        playLocalNumber(num, lang === 'hi-IN' ? 'hi' : 'te');
        return;
    }
    if (!('speechSynthesis' in window)) {
        document.getElementById('audioWarning').classList.add('show');
        return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(num));
    utterance.lang = lang;
    utterance.rate = state.rate;
    utterance.pitch = 1;
    if (state.voiceURI) {
        const match = speechSynthesis.getVoices().find(v => v.voiceURI === state.voiceURI);
        if (match) utterance.voice = match;
    }
    speechSynthesis.speak(utterance);
}

function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    const select = document.getElementById('voiceSelect');
    if (!select) return;
    const all = speechSynthesis.getVoices();
    const matching = all.filter(v => (v.lang || '').toLowerCase().startsWith((state.language || 'en').toLowerCase()));
    select.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Default voice';
    select.appendChild(def);
    (matching.length ? matching : all).forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = v.name + ' (' + v.lang + ')';
        select.appendChild(opt);
    });
    if (state.voiceURI) select.value = state.voiceURI;
}

// Synthesized victory cheer + ding via WebAudio (no audio files needed)
let audioCtx = null;
function ensureCtx() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playDing() {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [880, 1174].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.5);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.12);
        o.stop(t + i * 0.12 + 0.6);
    });
}

function playCheer() {
    const ctx = ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.15 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.8);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.15);
        o.stop(t + i * 0.15 + 0.9);
    });
}

// ===== INIT BOARD =====
function initBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let i = 1; i <= 90; i++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell' + (isLuckyNumber(i) ? ' lucky' : '');
        cell.id = 'cell-' + i;
        cell.textContent = i;
        board.appendChild(cell);
    }
    // Board is display-only — numbers are drawn randomly via Next/Auto mode
    board.onclick = null;
}

function isLuckyNumber(num) {
    return state.luckyOn && String(num).includes('7');
}

function restoreBoard() {
    state.calledNumbers.forEach(num => {
        const cell = document.getElementById('cell-' + num);
        if (cell) cell.classList.add('called', isLuckyNumber(num) ? 'lucky-called' : '');
    });
    if (state.lastNumber) {
        const cell = document.getElementById('cell-' + state.lastNumber);
        if (cell) cell.classList.add('last');
        document.getElementById('lastNumber').textContent = state.lastNumber;
    }
    renderHouseCalls();
}

// ===== MODE TOGGLE =====
function setMode(mode) {
    state.mode = mode;
    document.getElementById('modeManual').classList.toggle('active', mode === 'manual');
    document.getElementById('modeAuto').classList.toggle('active', mode === 'auto');
    document.getElementById('speedGroup').style.display = mode === 'auto' ? 'flex' : 'none';
    document.getElementById('nextBtn').style.display = mode === 'manual' ? 'inline-flex' : 'none';
    document.getElementById('autoBtn').style.display = mode === 'auto' ? 'inline-flex' : 'none';
    const cd = document.getElementById('autoCountdown');
    if (cd) cd.style.display = mode === 'auto' ? 'block' : 'none';

    if (mode === 'manual' && state.isAutoRunning) {
        stopAuto();
    }
    updateStatus();
    saveGame();
}

// ===== SPEED =====
function updateSpeed() {
    state.speed = parseInt(document.getElementById('speedSelect').value);
    if (state.isAutoRunning) {
        stopAuto();
        startAuto();
    }
    saveGame();
}

// ===== LANGUAGE =====
function changeLanguage() {
    state.language = document.getElementById('langSelect').value;
    populateVoices();
    const rateGroup = document.getElementById('voiceGroup');
    if (rateGroup) rateGroup.style.display = needsTTS(state.language) ? 'flex' : 'none';
    saveGame();
}

function needsTTS(lang) {
    return lang !== 'hi-IN' && lang !== 'te-IN';
}

// ===== VOICE & RATE =====
function changeVoice() {
    state.voiceURI = document.getElementById('voiceSelect').value;
    saveGame();
}

function updateRate() {
    state.rate = parseFloat(document.getElementById('rateRange').value);
    const label = document.getElementById('rateValue');
    if (label) label.textContent = state.rate.toFixed(2) + 'x';
    saveGame();
}

// ===== LUCKY 7 / HOUSE CALLS =====
function toggleLucky() {
    state.luckyOn = document.getElementById('luckyToggle').checked;
    document.querySelectorAll('.board-cell.lucky').forEach(cell => {
        cell.classList.toggle('lucky-off', !state.luckyOn);
    });
    saveGame();
    showToast(state.luckyOn ? '🍀 Lucky 7 highlights ON' : 'Lucky 7 highlights OFF');
}

function houseCall() {
    const num = 1 + Math.floor(Math.random() * 90);
    state.houseCalls.push(num);
    renderHouseCalls();
    saveGame();
    showToast('🎲 House call: ' + num);
    playDing();
    const cell = document.getElementById('cell-' + num);
    if (cell) {
        cell.classList.add('house');
        setTimeout(() => cell.classList.remove('house'), 1500);
    }
}

function renderHouseCalls() {
    const el = document.getElementById('houseCallList');
    if (!el) return;
    el.innerHTML = '';
    state.houseCalls.forEach((num, i) => {
        const chip = document.createElement('span');
        chip.className = 'history-chip house-chip';
        chip.textContent = num;
        el.appendChild(chip);
    });
    const parent = document.getElementById('houseCallsCard');
    if (parent) parent.style.display = state.houseCalls.length ? '' : 'none';
}

// ===== ANIMATE LAST NUMBER =====
function flashLastNumber(num) {
    const el = document.getElementById('lastNumber');
    el.textContent = num;
    el.classList.remove('anim');
    void el.offsetWidth;
    el.classList.add('anim');
}

// ===== CALL NEXT =====
function callNext() {
    if (state.remainingNumbers.length === 0) {
        updateStatus('Game Over!');
        stopAuto();
        return;
    }

    const randomIndex = Math.floor(Math.random() * state.remainingNumbers.length);
    const num = state.remainingNumbers.splice(randomIndex, 1)[0];
    state.calledNumbers.push(num);

    if (state.lastNumber) {
        const prevCell = document.getElementById('cell-' + state.lastNumber);
        if (prevCell) prevCell.classList.remove('last');
    }

    const cell = document.getElementById('cell-' + num);
    if (cell) cell.classList.add('called', isLuckyNumber(num) ? 'lucky-called' : '', 'last');

    state.lastNumber = num;
    flashLastNumber(num);

    if (isLuckyNumber(num)) showToast('🍀 Lucky ' + num + '!');

    updateStats();
    renderHistory();
    speakNumber(num);
    checkWins();
    renderPatterns();
    updateStatus();
    saveGame();
}

// ===== REPEAT LAST =====
function repeatLast() {
    if (state.lastNumber) {
        speakNumber(state.lastNumber);
    } else {
        showToast('No number called yet');
    }
}

// ===== COPY CALLED NUMBERS =====
function copyCalled() {
    if (state.calledNumbers.length === 0) {
        showToast('No numbers called yet');
        return;
    }
    const text = state.calledNumbers.join(', ');
    navigator.clipboard.writeText(text).then(
        () => showToast('Copied ' + state.calledNumbers.length + ' numbers'),
        () => showToast('Copy failed — select manually')
    );
}

// ===== SHARE RESULTS =====
function shareResults() {
    const lines = ['🎯 *Tambola Game Results*', ''];
    lines.push('Numbers called: ' + state.calledNumbers.length + '/90');
    if (state.winners.length) {
        lines.push('');
        lines.push('🏆 *Winners:*');
        state.winners.forEach(w => lines.push('• ' + w.name + ' — ' + w.pattern));
    } else {
        lines.push('Last number: ' + (state.lastNumber || '—'));
    }
    lines.push('');
    lines.push('Called: ' + state.calledNumbers.join(', '));

    const text = lines.join('\n');
    if (navigator.share) {
        navigator.share({ title: 'Tambola Game Results', text }).catch(() => {});
        return;
    }
    const wa = 'https://wa.me/?text=' + encodeURIComponent(text);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
            () => showToast('Results copied — paste anywhere!'),
            () => window.open(wa, '_blank')
        );
    } else {
        window.open(wa, '_blank');
    }
}

// ===== DOWNLOAD REPORT (txt) =====
const LANG_NAMES = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'te-IN': 'Telugu', 'ta-IN': 'Tamil', 'kn-IN': 'Kannada', 'mr-IN': 'Marathi' };

function downloadReport() {
    if (state.calledNumbers.length === 0) {
        showToast('No numbers called yet');
        return;
    }

    const lines = [];
    lines.push('=======================================');
    lines.push('          TAMBOLA GAME REPORT');
    lines.push('=======================================');
    lines.push('');
    lines.push('Generated: ' + new Date().toLocaleString());
    lines.push('Mode: ' + (state.mode === 'auto' ? 'Auto' : 'Manual'));
    lines.push('Audio Language: ' + (LANG_NAMES[state.language] || state.language));
    lines.push('Status: ' + (state.remainingNumbers.length === 0 ? 'Game Over' : 'In Progress'));
    lines.push('');
    lines.push('Numbers Called: ' + state.calledNumbers.length + ' / 90');
    lines.push('Remaining: ' + state.remainingNumbers.length);
    lines.push('Last Number: ' + (state.lastNumber || '—'));
    lines.push('');
    if (state.winners.length) {
        lines.push('Winners:');
        state.winners.forEach(w => lines.push('  • ' + w.name + ' — ' + w.pattern));
        lines.push('');
    }
    lines.push('Called Numbers (in order):');
    lines.push(state.calledNumbers.join(', '));
    lines.push('');
    lines.push('=======================================');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tambola-report-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Report downloaded');
}

// ===== DOWNLOAD PDF REPORT =====
function buildReportText() {
    return {
        meta: [
            'Mode: ' + (state.mode === 'auto' ? 'Auto' : 'Manual'),
            'Audio Language: ' + (LANG_NAMES[state.language] || state.language),
            'Status: ' + (state.remainingNumbers.length === 0 ? 'Game Over' : 'In Progress')
        ],
        stats: [
            'Numbers Called: ' + state.calledNumbers.length + ' / 90',
            'Remaining: ' + state.remainingNumbers.length,
            'Last Number: ' + (state.lastNumber || '—')
        ],
        winners: state.winners.map(w => '• ' + w.name + ' — ' + w.pattern),
        numbers: state.calledNumbers.join(', ')
    };
}

function downloadReportPDF() {
    if (state.calledNumbers.length === 0) {
        showToast('No numbers called yet');
        return;
    }

    if (window.jspdf && window.jspdf.jsPDF) {
        buildPDFReport();
        return;
    }

    showToast('Loading PDF engine…');
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) {
            buildPDFReport();
        } else {
            showToast('PDF engine unavailable — opening print view');
            printReportFallback();
        }
    };
    s.onerror = () => {
        showToast('PDF engine unavailable — opening print view');
        printReportFallback();
    };
    document.head.appendChild(s);
}

function buildPDFReport() {
    const doc = new window.jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    doc.setFillColor(108, 43, 217);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('TAMBOLA GAME REPORT', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleString(), pageWidth / 2, 25, { align: 'center' });

    const { meta, stats, winners, numbers } = buildReportText();

    let y = 46;
    doc.setTextColor(30, 27, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Game Details', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    meta.forEach(line => {
        doc.text(line, margin, y);
        y += 6;
    });

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Statistics', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    stats.forEach(line => {
        doc.text(line, margin, y);
        y += 6;
    });

    if (winners.length) {
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Winners', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        winners.forEach(line => {
            doc.text(line, margin, y);
            y += 6;
        });
    }

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Called Numbers (in order)', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(numbers, contentWidth);
    lines.forEach(line => {
        if (y > 285) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
    });

    doc.save('tambola-report-' + new Date().toISOString().slice(0, 10) + '.pdf');
    showToast('PDF report downloaded');
}

function printReportFallback() {
    const { meta, stats, winners, numbers } = buildReportText();
    const w = window.open('', '_blank');
    if (!w) {
        showToast('Popup blocked — use Download Report (txt) instead');
        return;
    }
    w.document.write('<!DOCTYPE html><html><head><title>Tambola Game Report</title>' +
        '<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#1E1B2E;}' +
        'h1{color:#6C2BD9;border-bottom:3px solid #6C2BD9;padding-bottom:8px;}' +
        'h2{color:#6C2BD9;margin-top:20px;}li{margin:4px 0;}.nums{max-width:700px;}</style>' +
        '</head><body><h1>Tambola Game Report</h1>' +
        '<p><strong>' + new Date().toLocaleString() + '</strong></p>' +
        '<h2>Game Details</h2><ul>' + meta.map(l => '<li>' + l + '</li>').join('') + '</ul>' +
        '<h2>Statistics</h2><ul>' + stats.map(l => '<li>' + l + '</li>').join('') + '</ul>' +
        (winners.length ? '<h2>Winners</h2><ul>' + winners.map(l => '<li>' + l + '</li>').join('') + '</ul>' : '') +
        '<h2>Called Numbers (in order)</h2><p class="nums">' + numbers + '</p>' +
        '<script>window.onload=function(){window.print();}<\/script>' +
        '</body></html>');
    w.document.close();
}

// ===== AUTO MODE WITH COUNTDOWN =====
function toggleAuto() {
    if (state.isAutoRunning) {
        stopAuto();
    } else {
        startAuto();
    }
}

function startAuto() {
    if (state.remainingNumbers.length === 0) {
        updateStatus('Game Over!');
        return;
    }
    state.isAutoRunning = true;
    document.getElementById('autoBtn').textContent = '⏸ Pause Auto';
    callNext();
    state.countdown = Math.ceil(state.speed / 1000);
    renderCountdown();
    state.autoTimer = setInterval(() => {
        state.countdown--;
        renderCountdown();
        if (state.countdown <= 0) {
            if (state.remainingNumbers.length === 0) {
                stopAuto();
                updateStatus('Game Over!');
                showToast('🏆 Game Over! Full house called!');
                return;
            }
            callNext();
            state.countdown = Math.ceil(state.speed / 1000);
            renderCountdown();
        }
    }, 1000);
    updateStatus('Auto Running');
}

function renderCountdown() {
    const el = document.getElementById('autoCountdown');
    if (!el) return;
    el.textContent = '⏳ Next number in ' + Math.max(0, state.countdown) + 's';
}

function stopAuto() {
    state.isAutoRunning = false;
    if (state.autoTimer) {
        clearInterval(state.autoTimer);
        state.autoTimer = null;
    }
    document.getElementById('autoBtn').textContent = '⏵ Start Auto';
    const cd = document.getElementById('autoCountdown');
    if (cd) cd.textContent = '';
    updateStatus();
    saveGame();
}

// ===== RESET =====
function confirmReset() {
    document.getElementById('resetModal').classList.add('show');
}
function closeResetModal() {
    document.getElementById('resetModal').classList.remove('show');
}
function resetGame() {
    closeResetModal();
    stopAuto();
    state.calledNumbers = [];
    state.remainingNumbers = [];
    state.lastNumber = null;
    state.houseCalls = [];
    state.announced = new Set();
    state.winners = [];
    for (let i = 1; i <= 90; i++) state.remainingNumbers.push(i);

    document.querySelectorAll('.board-cell').forEach(cell => {
        cell.classList.remove('called', 'last', 'lucky-called', 'house');
    });

    document.getElementById('lastNumber').textContent = '–';
    const banner = document.getElementById('winBanner');
    if (banner) banner.classList.remove('show');
    const houseCard = document.getElementById('houseCallsCard');
    if (houseCard) houseCard.style.display = 'none';
    updateStats();
    renderHistory();
    renderPatterns();
    updateStatus();
    saveGame();
    showToast('Game reset');
}

// ===== STATS =====
function updateStats() {
    const called = state.calledNumbers.length;
    document.getElementById('calledCount').textContent = called + ' / 90';
    document.getElementById('remainingCount').textContent = state.remainingNumbers.length;
}

function updateStatus(forceText) {
    const el = document.getElementById('gameStatus');
    if (forceText) {
        el.textContent = forceText;
        return;
    }
    if (state.remainingNumbers.length === 0) {
        el.textContent = 'Game Over';
    } else if (state.isAutoRunning) {
        el.textContent = 'Auto Running';
    } else if (state.calledNumbers.length > 0) {
        el.textContent = 'In Progress';
    } else {
        el.textContent = 'Ready';
    }
}

// ===== HISTORY =====
function renderHistory() {
    const list = document.getElementById('historyList');
    const recent = state.calledNumbers.slice(-12).reverse();
    if (recent.length === 0) {
        list.innerHTML = '<span class="history-empty">No numbers called yet. Press Next Number to start!</span>';
        return;
    }
    list.innerHTML = '';
    recent.forEach((num, i) => {
        const chip = document.createElement('span');
        chip.className = 'history-chip' + (i === 0 ? ' latest' : '') + (isLuckyNumber(num) ? ' lucky-chip' : '');
        chip.textContent = num;
        list.appendChild(chip);
    });
}

// ===== PRESETS =====
function loadPresets() {
    try {
        const raw = localStorage.getItem(PRESETS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}
function savePresets(list) {
    try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
    } catch (e) { /* ignore */ }
    renderPresets();
}
function renderPresets() {
    const select = document.getElementById('presetSelect');
    if (!select) return;
    const presets = loadPresets();
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = presets.length ? 'Load a preset…' : 'No presets saved';
    select.appendChild(placeholder);
    presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}
function saveCurrentPreset() {
    const name = document.getElementById('presetName').value.trim();
    if (!name) {
        showToast('Give the preset a name first');
        return;
    }
    const presets = loadPresets();
    presets.push({
        name,
        mode: state.mode,
        speed: state.speed,
        language: state.language,
        rate: state.rate,
        voiceURI: state.voiceURI,
        luckyOn: state.luckyOn
    });
    savePresets(presets);
    document.getElementById('presetName').value = '';
    showToast('Preset "' + name + '" saved');
}
function loadPreset() {
    const select = document.getElementById('presetSelect');
    if (!select || select.value === '') return;
    const presets = loadPresets();
    const p = presets[parseInt(select.value)];
    if (!p) return;
    state.mode = p.mode || 'manual';
    state.speed = p.speed || 4000;
    state.language = p.language || 'en-IN';
    state.rate = p.rate != null ? p.rate : 0.85;
    state.voiceURI = p.voiceURI || '';
    state.luckyOn = p.luckyOn != null ? p.luckyOn : true;
    document.getElementById('langSelect').value = state.language;
    document.getElementById('speedSelect').value = String(state.speed);
    document.getElementById('rateRange').value = String(state.rate);
    document.getElementById('rateValue').textContent = state.rate.toFixed(2) + 'x';
    document.getElementById('luckyToggle').checked = state.luckyOn;
    document.getElementById('voiceSelect').value = state.voiceURI;
    changeLanguage();
    setMode(state.mode);
    saveGame();
    showToast('Preset "' + p.name + '" applied');
}
function deletePreset() {
    const select = document.getElementById('presetSelect');
    if (!select || select.value === '') {
        showToast('Pick a preset to delete');
        return;
    }
    const presets = loadPresets();
    presets.splice(parseInt(select.value), 1);
    savePresets(presets);
    showToast('Preset deleted');
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA' && !e.target.classList.contains('btn')) {
            e.preventDefault();
            if (state.mode === 'auto') {
                toggleAuto();
            } else {
                callNext();
            }
        }
    }
    if (e.code === 'KeyR' && e.target.tagName !== 'INPUT') {
        confirmReset();
    }
});

// ===== INIT =====
function init() {
    loadActiveTickets();
    loadGame();
    rebuildRemaining();

    document.getElementById('langSelect').value = state.language;
    document.getElementById('speedSelect').value = String(state.speed);
    document.getElementById('rateRange').value = String(state.rate);
    document.getElementById('rateValue').textContent = state.rate.toFixed(2) + 'x';
    document.getElementById('luckyToggle').checked = state.luckyOn;

    initBoard();
    renderPresets();

    if (window.speechSynthesis) {
        populateVoices();
        if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
            speechSynthesis.onvoiceschanged = populateVoices;
        }
    }
    const voiceGroup = document.getElementById('voiceGroup');
    if (voiceGroup) voiceGroup.style.display = needsTTS(state.language) ? 'flex' : 'none';

    const resumed = state.calledNumbers.length > 0;
    if (resumed) {
        restoreBoard();
        updateStatus('In Progress');
    }

    setMode(state.mode);
    updateStats();
    renderHistory();
    renderPatterns();
    saveGame();

    const modal = document.getElementById('resetModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeResetModal();
        });
    }
    if (state.activeTickets && state.activeTickets.length) {
        const note = document.getElementById('activeTicketsNote');
        if (note) note.style.display = '';
    }
}

document.addEventListener('DOMContentLoaded', init);
