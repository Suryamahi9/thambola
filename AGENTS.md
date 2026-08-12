# Tambola (thambola) — static site

Pure static Tambola/Housie caller site — **no build step, no framework, no npm/package.json, no tests, no lint**. Vanilla HTML + CSS + classic `<script>` globals (no ES modules / `import` / `export`). Repo: `Suryamahi9/thambola` (origin `github.com/Suryamahi9/thambola.git`), deployed to Vercel static at `https://thambola.vercel.app`.

Note: the sibling repo `tambola-next` is a separate Next.js rewrite of this app — don't edit that codebase's files here, and don't port patterns across.

## Pages & shared chrome

- Pages: `index.html` (landing), `game.html` (caller), `tickets.html` (generator), `rules.html`. `tambola.html.txt` is a leftover single-file archive of an older version — not referenced by anything; don't edit or wire it in.
- Nav + footer + theme toggle are **injected at runtime by `js/common.js`** into `.navbar .container` and `footer`. Every page must ship `<nav class="navbar"><div class="container"></div></nav>` and `<footer></footer>`, and load `js/common.js` last.
- Script order per page: page script first, then `js/common.js` (e.g. `game.html` loads `js/game.js` then `js/common.js`).
- Theme: `data-theme` attribute on `<html>`, localStorage key `tambola-theme`, **default light**; toggled by the 🌙/☀️ button. Dark styling is a `[data-theme="dark"]` variable swap in `css/style.css:24`, not separate files.

## Verifying changes

No automated checks. Open the page in a browser (or `npx serve`) and exercise the feature manually. The game auto-resumes from localStorage, so clear storage (`localStorage.removeItem('tambola-game-v1')`) when testing reset/first-run paths. Ticket uniqueness/full-set logic is worth a few generations before assuming it's correct.

## `js/game.js` (caller)

- State persists to localStorage `tambola-game-v1`; `resetGame()` also clears remaining numbers. Presets persist to `tambola-presets-v1`. The latest generated ticket batch is read from `tambola-active-batch-v1` for per-ticket win checks.
- The board is deliberately **display-only** (`board.onclick = null` in `initBoard`) so numbers can't be tampered with — keep it that way.
- Audio: `hi-IN` and `te-IN` play pre-recorded MP3s from `audio/hi/1..90.mp3` and `audio/te/1..90.mp3`; all other languages (`en-IN`, `ta-IN`, `kn-IN`, `mr-IN`, …) use `speechSynthesis` via `speakNumber()` with the chosen `voiceURI` and `rate`. The voice picker (`voiceSelect`) + rate slider (`rateRange`/`rateValue`) only show for TTS languages (`.voiceGroup` visibility driven by `needsTTS()`). Playback failure shows `.audio-warning`. Adding a TTS language = one `<option>` in `game.html` + an entry in `LANG_NAMES` for reports; pre-recorded languages = 90 mp3s + wiring in `speakNumber()`.
- Win patterns: board-level patterns (`Early Five`, `Corners`, Top/Middle/Bottom Line, `Full House`) when no tickets are synced; per-ticket patterns (Top/Middle/Bottom Line, Corners, Full House) when a batch is active. Results render in `patternsPanel` and announce via `.win-banner` + `showToast` + synthesized ding/cheer (WebAudio, no audio files). Full House ends auto mode.
- Extra actions: `houseCall()` (random 1–90 chip + flash, history in `houseCallsCard`), `shareResults()` (navigator.share → clipboard → WhatsApp), `copyCalled()`, and the txt/PDF reports.
- PDF report (`downloadReportPDF`) lazy-loads `jspdf` from a CDN at runtime and falls back to a print window (`printReportFallback`). It is the only external dependency.
- Keyboard shortcuts: Space/Enter calls next (or toggles auto), `R` confirms reset.
- `game.html` must ship the exact element IDs game.js reads: `modeManual/modeAuto`, `speedGroup/speedSelect`, `langSelect`, `voiceGroup/voiceSelect`, `rateGroup/rateRange/rateValue`, `luckyToggle`, `presetSelect/presetName`, `nextBtn/autoBtn`, `autoCountdown`, `audioWarning`, `winBanner`, `lastNumber`, `calledCount/remainingCount/gameStatus`, `board`, `activeTicketsNote`, `patternsPanel`, `houseCallsCard/houseCallList`, `historyList`, `resetModal`.

## `js/tickets.js` (generator)

- Pure logic lives in **`js/tickets-core.js`** (no DOM: `generateTicket`, `tryGenerateTicket`, `isValidTicket`, `gridKey`, `generateUniqueGrids`, `generateStrip`); `tickets.html` loads it **before** `js/tickets.js`. `tickets.js` is only the UI layer (batch persistence, rendering, modes).
- `isValidTicket(grid, maxRun=3)` is the canonical rule check: 3×9 grid, exactly 15 numbers, 5 per row, 1–3 per column, column ranges `col1=1–9 … col9=80–90`, ascending within a column, no repeats, no 3-in-a-row runs.
- Full-set mode uses `generateStrip()`: a 6-ticket book covering all 90 numbers exactly once; validated with the relaxed `maxRun=4`.
- Batch history persists to localStorage `tambola-batches-v2` (last 5). Bump the key if the ticket format/serialization changes. The newest batch is also mirrored to `tambola-active-batch-v1` (raw grids) so `game.html` can do per-ticket win checks — bump that too if the serialization changes.
- `ticketCount` caps: random mode 30, fullset mode 5 sets (6 tickets each). Multi-player name list splits on whitespace and labels tickets `Name-Number`.

## CSS conventions

- Design tokens are CSS variables in `:root` (`css/style.css:3`): `--primary: #6C2BD9` purple, `--accent: #00C896` green, `--called`/`--last` blue/green, `--surface`/`--border`/`--text-muted` swapped by dark theme.
- JS-injected DOM (tickets batch rows) also references these vars (`var(--border)` etc.) — keep inline styles on tokens, not raw hex.
- `.container` is 1100px; cards use `.card`, `.glass` class does not exist here.
