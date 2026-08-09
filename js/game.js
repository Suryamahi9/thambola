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
    isAutoRunning: false,
    voicesReady: false
};

// ===== HINDI NUMBER WORDS =====
const hindiNumbers = {
    1:'एक',2:'दो',3:'तीन',4:'चार',5:'पांच',6:'छह',7:'सात',8:'आठ',9:'नौ',10:'दस',
    11:'ग्यारह',12:'बारह',13:'तेरह',14:'चौदह',15:'पंद्रह',16:'सोलह',17:'सत्रह',
    18:'अठारह',19:'उन्नीस',20:'बीस',21:'इक्कीस',22:'बाईस',23:'तेईस',24:'चौबीस',
    25:'पच्चीस',26:'छब्बीस',27:'सत्ताईस',28:'अट्ठाईस',29:'उनतीस',30:'तीस',
    31:'इकतीस',32:'बत्तीस',33:'तैंतीस',34:'चौंतीस',35:'पैंतीस',36:'छत्तीस',
    37:'सैंतीस',38:'अड़तीस',39:'उनतालीस',40:'चालीस',41:'इकतालीस',42:'बयालीस',
    43:'तैंतालीस',44:'चवालीस',45:'पैंतालीस',46:'छियालीस',47:'सैंतालीस',
    48:'अड़तालीस',49:'उनचास',50:'पचास',51:'इक्यावन',52:'बावन',53:'तिरपन',
    54:'चौवन',55:'पचपन',56:'छप्पन',57:'सत्तावन',58:'अट्ठावन',59:'उनसठ',
    60:'साठ',61:'इकसठ',62:'बासठ',63:'तिरसठ',64:'चौंसठ',65:'पैंसठ',66:'छियासठ',
    67:'सड़सठ',68:'अड़सठ',69:'उनहत्तर',70:'सत्तर',71:'इकहत्तर',72:'बहत्तर',
    73:'तिहत्तर',74:'चौहत्तर',75:'पचहत्तर',76:'छिहत्तर',77:'सतहत्तर',
    78:'अठहत्तर',79:'उन्यासी',80:'अस्सी',81:'इक्यासी',82:'बयासी',83:'तिरासी',
    84:'चौरासी',85:'पचासी',86:'छियासी',87:'सत्तासी',88:'अट्ठासी',89:'नवासी',90:'नब्बे'
};

// ===== TELUGU NUMBER WORDS =====
const teluguNumbers = {
    1:'ఒకటి',2:'రెండు',3:'మూడు',4:'నాలుగు',5:'ఐదు',6:'ఆరు',7:'ఏడు',8:'ఎనిమిది',
    9:'తొమ్మిది',10:'పది',11:'పదకొండు',12:'పన్నెండు',13:'పదమూడు',14:'పద్నాలుగు',
    15:'పదిహేను',16:'పదహారు',17:'పదిహేడు',18:'పద్దెనిమిది',19:'పందొమ్మిది',
    20:'ఇరవై',21:'ఇరవై ఒకటి',22:'ఇరవై రెండు',23:'ఇరవై మూడు',24:'ఇరవై నాలుగు',
    25:'ఇరవై ఐదు',26:'ఇరవై ఆరు',27:'ఇరవై ఏడు',28:'ఇరవై ఎనిమిది',29:'ఇరవై తొమ్మిది',
    30:'ముప్పై',31:'ముప్పై ఒకటి',32:'ముప్పై రెండు',33:'ముప్పై మూడు',34:'ముప్పై నాలుగు',
    35:'ముప్పై ఐదు',36:'ముప్పై ఆరు',37:'ముప్పై ఏడు',38:'ముప్పై ఎనిమిది',39:'ముప్పై తొమ్మిది',
    40:'నలభై',41:'నలభై ఒకటి',42:'నలభై రెండు',43:'నలభై మూడు',44:'నలభై నాలుగు',
    45:'నలభై ఐదు',46:'నలభై ఆరు',47:'నలభై ఏడు',48:'నలభై ఎనిమిది',49:'నలభై తొమ్మిది',
    50:'యాభై',51:'యాభై ఒకటి',52:'యాభై రెండు',53:'యాభై మూడు',54:'యాభై నాలుగు',
    55:'యాభై ఐదు',56:'యాభై ఆరు',57:'యాభై ఏడు',58:'యాభై ఎనిమిది',59:'యాభై తొమ్మిది',
    60:'అరవై',61:'అరవై ఒకటి',62:'అరవై రెండు',63:'అరవై మూడు',64:'అరవై నాలుగు',
    65:'అరవై ఐదు',66:'అరవై ఆరు',67:'అరవై ఏడు',68:'అరవై ఎనిమిది',69:'అరవై తొమ్మిది',
    70:'డెబ్భై',71:'డెబ్భై ఒకటి',72:'డెబ్భై రెండు',73:'డెబ్భై మూడు',74:'డెబ్భై నాలుగు',
    75:'డెబ్భై ఐదు',76:'డెబ్భై ఆరు',77:'డెబ్భై ఏడు',78:'డెబ్భై ఎనిమిది',79:'డెబ్భై తొమ్మిది',
    80:'ఎనభై',81:'ఎనభై ఒకటి',82:'ఎనభై రెండు',83:'ఎనభై మూడు',84:'ఎనభై నాలుగు',
    85:'ఎనభై ఐదు',86:'ఎనభై ఆరు',87:'ఎనభై ఏడు',88:'ఎనభై ఎనిమిది',89:'ఎనభై తొమ్మిది',
    90:'తొంభై'
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
        cell.onclick = () => manualMark(i);
        board.appendChild(cell);
    }
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

// ===== VOICE INIT =====
let availableVoices = [];
function loadVoices() {
    if ('speechSynthesis' in window) {
        availableVoices = speechSynthesis.getVoices();
        state.voicesReady = availableVoices.length > 0;
    }
}
if ('speechSynthesis' in window) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
}

// ===== SPEAK =====
function speakNumber(num) {
    if (!('speechSynthesis' in window)) {
        document.getElementById('audioWarning').classList.add('show');
        return;
    }

    let text;
    const lang = state.language;
    if (lang === 'hi-IN') {
        text = hindiNumbers[num] || String(num);
    } else if (lang === 'te-IN') {
        text = teluguNumbers[num] || String(num);
    } else {
        text = String(num);
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const matchingVoice = availableVoices.find(v => v.lang === lang);
    if (matchingVoice) {
        utterance.voice = matchingVoice;
    } else {
        const langCode = lang.split('-')[0];
        const partialMatch = availableVoices.find(v => v.lang.startsWith(langCode));
        if (partialMatch) utterance.voice = partialMatch;
    }

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

// ===== MANUAL MARK =====
function manualMark(num) {
    if (state.calledNumbers.includes(num)) {
        speakNumber(num);
        return;
    }
    const idx = state.remainingNumbers.indexOf(num);
    if (idx === -1) return;

    state.remainingNumbers.splice(idx, 1);
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
}

document.addEventListener('DOMContentLoaded', init);
