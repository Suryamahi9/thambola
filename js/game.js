// ===== TAMBOLA GAME ENGINE =====
const SAVE_KEY = 'tambola-game-v1';

const state = {
    mode: 'manual',
    language: 'en-IN',
    speed: 4000,
    calledNumbers: [],
    remainingNumbers: [],
    lastNumber: null,
    autoTimer: null,
    isAutoRunning: false
};

// ===== PERSISTENCE =====
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            calledNumbers: state.calledNumbers,
            lastNumber: state.lastNumber,
            mode: state.mode,
            language: state.language,
            speed: state.speed
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

// ===== INIT BOARD =====
function initBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let i = 1; i <= 90; i++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.id = 'cell-' + i;
        cell.textContent = i;
        board.appendChild(cell);
    }
    // Board is display-only — numbers are drawn randomly via Next/Auto mode
    // so no one can tamper with the game by pressing numbers.
    board.onclick = null;
}

function restoreBoard() {
    state.calledNumbers.forEach(num => {
        const cell = document.getElementById('cell-' + num);
        if (cell) cell.classList.add('called');
    });
    if (state.lastNumber) {
        const cell = document.getElementById('cell-' + state.lastNumber);
        if (cell) cell.classList.add('last');
        document.getElementById('lastNumber').textContent = state.lastNumber;
    }
}

// ===== MODE TOGGLE =====
function setMode(mode) {
    state.mode = mode;
    document.getElementById('modeManual').classList.toggle('active', mode === 'manual');
    document.getElementById('modeAuto').classList.toggle('active', mode === 'auto');
    document.getElementById('speedGroup').style.display = mode === 'auto' ? 'flex' : 'none';
    document.getElementById('nextBtn').style.display = mode === 'manual' ? 'inline-flex' : 'none';
    document.getElementById('autoBtn').style.display = mode === 'auto' ? 'inline-flex' : 'none';

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
    saveGame();
}

// ===== SPEAK =====
let currentAudio = null;

// Plays a pre-generated number recording from the site's own audio folder.
// Same-origin files work on every device (including TV browsers) with no internet needed.
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

    // Hindi / Telugu → pre-recorded audio
    if (lang === 'hi-IN' || lang === 'te-IN') {
        playLocalNumber(num, lang === 'hi-IN' ? 'hi' : 'te');
        return;
    }

    // English → browser text-to-speech
    if (!('speechSynthesis' in window)) {
        document.getElementById('audioWarning').classList.add('show');
        return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(num));
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
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
    if (cell) cell.classList.add('called', 'last');

    state.lastNumber = num;
    flashLastNumber(num);

    updateStats();
    renderHistory();
    speakNumber(num);
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

// ===== DOWNLOAD GAME REPORT =====
function downloadReport() {
    if (state.calledNumbers.length === 0) {
        showToast('No numbers called yet');
        return;
    }

    const langNames = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'te-IN': 'Telugu' };
    const lines = [];
    lines.push('=======================================');
    lines.push('          TAMBOLA GAME REPORT');
    lines.push('=======================================');
    lines.push('');
    lines.push('Generated: ' + new Date().toLocaleString());
    lines.push('Mode: ' + (state.mode === 'auto' ? 'Auto' : 'Manual'));
    lines.push('Audio Language: ' + (langNames[state.language] || state.language));
    lines.push('Status: ' + (state.remainingNumbers.length === 0 ? 'Game Over' : 'In Progress'));
    lines.push('');
    lines.push('Numbers Called: ' + state.calledNumbers.length + ' / 90');
    lines.push('Remaining: ' + state.remainingNumbers.length);
    lines.push('Last Number: ' + (state.lastNumber || '—'));
    lines.push('');
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
    const langNames = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'te-IN': 'Telugu' };
    return {
        meta: [
            'Mode: ' + (state.mode === 'auto' ? 'Auto' : 'Manual'),
            'Audio Language: ' + (langNames[state.language] || state.language),
            'Status: ' + (state.remainingNumbers.length === 0 ? 'Game Over' : 'In Progress')
        ],
        stats: [
            'Numbers Called: ' + state.calledNumbers.length + ' / 90',
            'Remaining: ' + state.remainingNumbers.length,
            'Last Number: ' + (state.lastNumber || '—')
        ],
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

    const { meta, stats, numbers } = buildReportText();

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
    const { meta, stats, numbers } = buildReportText();
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
        '<h2>Called Numbers (in order)</h2><p class="nums">' + numbers + '</p>' +
        '<script>window.onload=function(){window.print();}<\/script>' +
        '</body></html>');
    w.document.close();
}

// ===== AUTO MODE =====
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
    state.autoTimer = setInterval(() => {
        if (state.remainingNumbers.length === 0) {
            stopAuto();
            updateStatus('Game Over!');
            showToast('🏆 Game Over! Full house called!');
            return;
        }
        callNext();
    }, state.speed);
    updateStatus('Auto Running');
}

function stopAuto() {
    state.isAutoRunning = false;
    if (state.autoTimer) {
        clearInterval(state.autoTimer);
        state.autoTimer = null;
    }
    document.getElementById('autoBtn').textContent = '⏵ Start Auto';
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
    for (let i = 1; i <= 90; i++) state.remainingNumbers.push(i);

    document.querySelectorAll('.board-cell').forEach(cell => {
        cell.classList.remove('called', 'last');
    });

    document.getElementById('lastNumber').textContent = '–';
    updateStats();
    renderHistory();
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
        chip.className = 'history-chip' + (i === 0 ? ' latest' : '');
        chip.textContent = num;
        list.appendChild(chip);
    });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
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
    document.getElementById('langSelect').value = state.language;
    document.getElementById('speedSelect').value = String(state.speed);

    const resumed = loadGame();
    rebuildRemaining();
    initBoard();

    if (resumed && state.calledNumbers.length > 0) {
        restoreBoard();
        updateStatus('In Progress');
    }

    setMode(state.mode);
    updateStats();
    renderHistory();
    saveGame();

    const modal = document.getElementById('resetModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeResetModal();
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
