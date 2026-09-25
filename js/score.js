// Bashball scorekeeper UI. Everything is stored on this phone (see scoreState.js); there is no
// login and nothing is sent to a server.
import {
    TEAM_COLORS, STORAGE_KEY, makeStore, migrateLegacy, currentGame, createGame, derive, addScore,
    canDeduct, switchHalf, setTotal, undo, deleteGame, gamesNewestFirst, halfLabel
} from './scoreState.js';

const $ = id => document.getElementById(id);

const store = makeStore(() => window.localStorage);
let state = store.load();
if (store.ok && migrateLegacy(state, store.storage)) store.save(state);
else if (store.ok && !state.migrated) { state.migrated = true; store.save(state); }

let screen = 'scoring';
let detailGameId = null;
let newGameField = state.prefs.field;

function setStorageWarning(on) {
    $('storageWarning').hidden = !on;
    document.body.classList.toggle('storage-warn', on);
}

function persist() {
    setStorageWarning(!store.save(state));
}

// ---- Helpers ------------------------------------------------------------------------------

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function formatTime(ts) {
    const t = new Date(ts);
    const time = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    return t.toDateString() === new Date().toDateString()
        ? time
        : `${time} ${t.getMonth() + 1}/${t.getDate()}/${t.getFullYear() % 100}`;
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric', year: '2-digit' });
}

function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of [].concat(children)) node.append(c);
    return node;
}

let toastTimer = null;
function toast(message, kind = '') {
    const t = $('toast');
    t.textContent = message;
    t.className = `toast ${kind}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, kind === 'warn' ? 4500 : 2500);
}

function askConfirm(text, yesLabel) {
    return new Promise(resolve => {
        $('confirmText').textContent = text;
        $('confirmYes').textContent = yesLabel;
        $('confirmModal').hidden = false;
        const done = answer => {
            $('confirmModal').hidden = true;
            $('confirmYes').onclick = $('confirmNo').onclick = null;
            resolve(answer);
        };
        $('confirmYes').onclick = () => done(true);
        $('confirmNo').onclick = () => done(false);
    });
}

// ---- Rendering ----------------------------------------------------------------------------

function show(name) {
    screen = name;
    $('scoringScreen').hidden = name !== 'scoring';
    $('newGameScreen').hidden = name !== 'new';
    $('gamesScreen').hidden = name !== 'games';
    $('gameDetailScreen').hidden = name !== 'detail';
    const scoring = name === 'scoring';
    for (const id of ['undoButton', 'historyButton', 'switchTeamsButton']) $(id).disabled = !scoring;
    $('gamesButton').classList.toggle('active', name === 'games' || name === 'detail');
    $('historyButton').classList.toggle('active', scoring && state.prefs.historyVisible);
    render();
    window.scrollTo(0, 0);
}

function render() {
    const game = currentGame(state);
    $('fieldChip').hidden = !(game && game.field && screen === 'scoring');
    if (game && game.field) {
        $('fieldChip').textContent = game.field;
        $('fieldChip').style.backgroundColor = game.field === 'DVC' ? '#ff008c' : '#008cff';
    }
    if (screen === 'scoring') renderScoring(game);
    else if (screen === 'new') renderNewGame(game);
    else if (screen === 'games') renderGames();
    else if (screen === 'detail') renderDetail();
}

function renderScoring(game) {
    if (!game) { show('new'); return; }
    const d = derive(game);
    const team = d.batting;
    const color = TEAM_COLORS[team];
    document.documentElement.style.setProperty('--team-color', color);

    game.teams.forEach((t, i) => {
        const box = $(i === 0 ? 'sbTeamA' : 'sbTeamB');
        box.querySelector('.sb-name').textContent = t;
        box.querySelector('.sb-score').textContent = d.totals[t];
        box.style.color = TEAM_COLORS[t];
        box.classList.toggle('batting', t === team);
    });
    $('sbHalf').textContent = d.halfLabel;

    $('teamName').textContent = team;
    $('teamName').style.color = color;
    $('currentScore').textContent = d.totals[team];
    $('halfNet').textContent = `${d.halfLabel}: ${d.halfNet > 0 ? '+' : ''}${d.halfNet} this half-inning`;

    const rgb = hexToRgb(color);
    ['btnPlus4', 'btnPlus3', 'btnPlus2', 'btnPlus1'].forEach((id, i) => {
        $(id).style.backgroundColor = `rgba(${rgb}, ${[1.0, 0.85, 0.7, 0.55][i]})`;
    });
    const minus = $('btnMinus1');
    minus.style.color = color;
    minus.style.borderColor = color;
    minus.classList.toggle('is-blocked', !canDeduct(game));

    $('historySection').hidden = !state.prefs.historyVisible;
    if (state.prefs.historyVisible) {
        const rows = d.log.filter(r => r.team === team).reverse().map(r => el('tr', {}, [
            el('td', { textContent: typeof r.points === 'number' && r.points > 0 ? `+${r.points}` : r.points }),
            el('td', { textContent: r.score }),
            el('td', { textContent: halfLabel(r.halfIndex) }),
            el('td', { textContent: formatTime(r.ts) })
        ]));
        $('historyTable').replaceChildren(...rows);
    }
}

function renderNewGame(game) {
    $('cancelNewGameButton').hidden = !game;
    for (const b of document.querySelectorAll('.field-opt')) b.classList.toggle('selected', b.dataset.field === newGameField);
}

function renderGames() {
    const games = gamesNewestFirst(state);
    $('gamesEmpty').hidden = games.length > 0;
    $('gamesList').replaceChildren(...games.map(g => {
        const d = derive(g);
        const [a, b] = g.teams;
        const lead = d.totals[a] === d.totals[b] ? null : (d.totals[a] > d.totals[b] ? a : b);
        const side = t => el('span', { className: `gl-team${t === lead ? ' lead' : ''}` }, [
            el('span', { className: 'gl-name', textContent: t, style: `color:${TEAM_COLORS[t]}` }),
            el('span', { className: 'gl-score', textContent: d.totals[t] })
        ]);
        const meta = [g.field, formatDate(g.startedAt), d.halfLabel].filter(Boolean).join(' · ');
        const btn = el('button', { className: 'game-item' }, [
            el('span', { className: 'gl-row' }, [side(a), el('span', { className: 'gl-dash', textContent: '–' }), side(b)]),
            el('span', { className: 'gl-meta', textContent: meta }),
        ]);
        if (g.id === state.currentGameId) btn.append(el('span', { className: 'gl-badge', textContent: 'Current' }));
        btn.addEventListener('click', () => { detailGameId = g.id; show('detail'); });
        return el('li', {}, btn);
    }));
}

function renderDetail() {
    const g = state.games[detailGameId];
    if (!g) { show('games'); return; }
    const d = derive(g);
    const [a, b] = g.teams;
    $('detailTitle').replaceChildren(
        el('span', { textContent: a, style: `color:${TEAM_COLORS[a]}` }),
        ` ${d.totals[a]} – ${d.totals[b]} `,
        el('span', { textContent: b, style: `color:${TEAM_COLORS[b]}` }));
    $('detailMeta').textContent = [g.field, `${formatDate(g.startedAt)} ${formatTime(g.startedAt).split(' ').slice(0, 2).join(' ')}`,
        `Last half: ${d.halfLabel}`].filter(Boolean).join(' · ');

    const innings = Math.max(1, Math.ceil(d.halves.length / 2));
    const head = el('tr', {}, [el('th', { textContent: '' }),
        ...Array.from({ length: innings }, (_, i) => el('th', { textContent: i + 1 })), el('th', { textContent: 'R' })]);
    const row = (t, offset) => el('tr', {}, [
        el('th', { textContent: t, style: `color:${TEAM_COLORS[t]}` }),
        ...Array.from({ length: innings }, (_, i) => {
            const h = i * 2 + offset;
            return el('td', { textContent: h < d.halves.length ? d.halves[h] : '', className: h === d.halfIndex ? 'now' : '' });
        }),
        el('td', { className: 'total', textContent: d.totals[t] })]);
    $('lineScore').replaceChildren(el('thead', {}, head), el('tbody', {}, [row(a, 0), row(b, 1)]));

    const notes = [];
    if (g.imported) notes.push('Brought over from the old scorekeeper, which only kept the totals.');
    else if (d.corrected) notes.push('The score was corrected by hand, so the innings may not add up to R.');
    $('detailNote').hidden = notes.length === 0;
    $('detailNote').textContent = notes.join(' ');
    $('resumeGameButton').textContent = g.id === state.currentGameId ? 'Back to scoring' : 'Score this game';
}

// ---- Scoring actions ----------------------------------------------------------------------

function score(points) {
    const game = currentGame(state);
    if (!game) return;
    const r = addScore(game, points);
    if (r.blocked) {
        toast(`${r.team} are at 0 for this half-inning (${r.halfLabel}). A team can't go below zero in a half-inning, so the ${points} wasn't counted.`, 'warn');
        return;
    }
    if (r.clamped) toast(`Only ${r.applied} counted: ${r.team} can't go below zero this half-inning.`, 'warn');
    else $('toast').hidden = true; // don't leave an old "wasn't counted" message up after a good tap
    persist();
    render();
}

['btnPlus4', 'btnPlus3', 'btnPlus2', 'btnPlus1'].forEach((id, i) => $(id).addEventListener('click', () => score(4 - i)));
$('btnMinus1').addEventListener('click', () => score(-1));

$('switchTeamsButton').addEventListener('click', () => {
    const game = currentGame(state);
    if (!game) return;
    const d = switchHalf(game);
    persist();
    render();
    toast(`${d.halfLabel}: ${d.batting} batting`);
});

$('undoButton').addEventListener('click', () => {
    const game = currentGame(state);
    if (!game) return;
    const ev = undo(game);
    if (!ev) { toast('Nothing to undo'); return; }
    persist();
    render();
    if (ev.type === 'score') toast(`Undid ${ev.points > 0 ? '+' : ''}${ev.points} for ${ev.team}`);
    else if (ev.type === 'switch') toast(`Undid switch: back to ${derive(game).halfLabel}, ${derive(game).batting} batting`);
    else toast(`Undid correction for ${ev.team}`);
});

$('historyButton').addEventListener('click', () => {
    state.prefs.historyVisible = !state.prefs.historyVisible;
    $('historyButton').classList.toggle('active', state.prefs.historyVisible);
    persist();
    render();
});

// Tap the big score to correct it by hand
$('currentScore').addEventListener('click', () => {
    const game = currentGame(state);
    if (!game) return;
    $('scoreEdit').hidden = false;
    $('manualScoreInput').value = derive(game).totals[derive(game).batting];
    $('manualScoreInput').focus();
});
function closeScoreEdit() { $('scoreEdit').hidden = true; }
$('cancelScoreButton').addEventListener('click', closeScoreEdit);
$('saveScoreButton').addEventListener('click', () => {
    const game = currentGame(state);
    const value = parseInt($('manualScoreInput').value, 10);
    if (!game || isNaN(value)) return;
    const d = derive(game);
    if (value !== d.totals[d.batting]) {
        const v = setTotal(game, value);
        persist();
        toast(`${d.batting} corrected to ${v}`);
    }
    closeScoreEdit();
    render();
});
$('manualScoreInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('saveScoreButton').click(); });

// ---- New game -----------------------------------------------------------------------------

function resetNewGameForm() {
    $('team1Select').value = '';
    $('team2Select').value = '';
    $('team2Select').disabled = true;
    $('startGameButton').disabled = true;
    $('errorMessage').hidden = true;
    newGameField = state.prefs.field;
}

function validateNewGame() {
    const t1 = $('team1Select').value, t2 = $('team2Select').value;
    const ok = !!(t1 && t2 && t1 !== t2);
    $('startGameButton').disabled = !ok;
    $('errorMessage').hidden = !(t1 && t2 && t1 === t2);
}

$('newGameButton').addEventListener('click', () => { resetNewGameForm(); show('new'); });
$('team1Select').addEventListener('change', () => { $('team2Select').disabled = false; validateNewGame(); });
$('team2Select').addEventListener('change', validateNewGame);
for (const b of document.querySelectorAll('.field-opt')) {
    b.addEventListener('click', () => {
        newGameField = newGameField === b.dataset.field ? null : b.dataset.field;
        renderNewGame(currentGame(state));
    });
}
$('startGameButton').addEventListener('click', () => {
    createGame(state, [$('team1Select').value, $('team2Select').value], newGameField);
    persist();
    closeScoreEdit();
    show('scoring');
});
$('cancelNewGameButton').addEventListener('click', () => show('scoring'));

// ---- Previous games -----------------------------------------------------------------------

$('gamesButton').addEventListener('click', () => {
    if (screen === 'games' || screen === 'detail') show(currentGame(state) ? 'scoring' : 'new');
    else show('games');
});
$('backToGames').addEventListener('click', () => show('games'));
$('resumeGameButton').addEventListener('click', () => {
    state.currentGameId = detailGameId;
    persist();
    closeScoreEdit();
    show('scoring');
});
$('deleteGameButton').addEventListener('click', async () => {
    const g = state.games[detailGameId];
    if (!g) return;
    const d = derive(g);
    const ok = await askConfirm(`Delete ${g.teams[0]} ${d.totals[g.teams[0]]} – ${d.totals[g.teams[1]]} ${g.teams[1]}? This can't be undone.`, 'Delete');
    if (!ok) return;
    deleteGame(state, g.id);
    persist();
    toast('Game deleted');
    show('games');
});

// Another tab on this phone changed the scores: pick them up.
window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY) return;
    state = store.load();
    render();
});

// ---- Start --------------------------------------------------------------------------------

setStorageWarning(!store.ok);
resetNewGameForm();
show(currentGame(state) ? 'scoring' : 'new');
