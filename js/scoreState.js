// Bashball scorekeeper state: everything lives on this device (localStorage).
// Pure functions over a plain-object state so the rules are testable without a browser.
//
// A game is an ordered list of events. Scores, the inning, and whose half it is are all
// derived by replaying the events, so a refresh restores the game exactly and Undo is just
// "drop the last event".
//   { type: 'score',  team, points, ts }   points actually applied (after the clamp)
//   { type: 'switch', ts }                 current half-inning ends, other team bats
//   { type: 'set',    team, value, ts }    manual correction of a team's total

export const STORAGE_KEY = 'bashball.scorer.v1';

export const TEAM_COLORS = {
    "Mambas": "#C0C0C0",
    "Snappers": "#4CAF50",
    "Honey Badgers": "#FFD700",
    "Hyenas": "#FF9800",
    "Scorpions": "#ff0072",
    "Hammerheads": "#40E0D0",
    "Dartfrogs": "#1E90FF",
    "Crawdads": "#FF4500"
};

export const FIELDS = ['DVC', 'Las Lomas'];

export function teamColor(team) {
    return TEAM_COLORS[team] || '#FFFFFF';
}

const isTeamName = t => typeof t === 'string' && t.trim() !== '' && t.length <= 60;

export function emptyState() {
    return { version: 1, currentGameId: null, games: {}, prefs: { field: null, historyVisible: false }, migrated: false };
}

function newId(now) {
    return `g${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createGame(state, teams, field, now = Date.now()) {
    const current = currentGame(state);
    // A game nobody scored in isn't worth keeping in the history.
    if (current && current.events.length === 0) delete state.games[current.id];
    const game = { id: newId(now), teams: [teams[0], teams[1]], field: field || null, startedAt: now, updatedAt: now, events: [] };
    state.games[game.id] = game;
    state.currentGameId = game.id;
    if (field) state.prefs.field = field;
    return game;
}

export function currentGame(state) {
    return (state.currentGameId && state.games[state.currentGameId]) || null;
}

export function halfLabel(halfIndex) {
    const inning = Math.floor(halfIndex / 2) + 1;
    return `${halfIndex % 2 === 0 ? 'Top' : 'Bottom'} ${ordinal(inning)}`;
}

export function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Replay a game's events into its current state.
export function derive(game) {
    const [a, b] = game.teams;
    const totals = { [a]: 0, [b]: 0 };
    // halves[i] = net points from score taps in half-inning i (corrections are tracked apart)
    const halves = [0];
    let corrected = false;
    const log = []; // per-event rows for the history table
    for (const ev of game.events) {
        const halfIndex = halves.length - 1;
        if (ev.type === 'score') {
            totals[ev.team] += ev.points;
            halves[halfIndex] += ev.points;
            log.push({ team: ev.team, points: ev.points, score: totals[ev.team], halfIndex, ts: ev.ts });
        } else if (ev.type === 'switch') {
            halves.push(0);
        } else if (ev.type === 'set') {
            totals[ev.team] = ev.value;
            corrected = true;
            log.push({ team: ev.team, points: 'Correction', score: ev.value, halfIndex, ts: ev.ts });
        }
    }
    const halfIndex = halves.length - 1;
    return {
        totals,
        halves,
        halfIndex,
        halfLabel: halfLabel(halfIndex),
        batting: game.teams[halfIndex % 2],
        fielding: game.teams[(halfIndex + 1) % 2],
        halfNet: halves[halfIndex],
        corrected,
        log
    };
}

// Rule: a team can't finish a half-inning below where it started it. A deduction is clamped
// to what the batting team has scored this half (and never takes a total below zero).
// Returns { applied, requested, blocked, team } and records the event only if something applied.
export function addScore(game, points, now = Date.now()) {
    const d = derive(game);
    let applied = points;
    if (points < 0) applied = Math.max(points, -d.halfNet, -d.totals[d.batting]);
    if (applied === 0) return { applied: 0, requested: points, blocked: true, team: d.batting, halfLabel: d.halfLabel };
    game.events.push({ type: 'score', team: d.batting, points: applied, ts: now });
    game.updatedAt = now;
    return { applied, requested: points, blocked: false, clamped: applied !== points, team: d.batting, halfLabel: d.halfLabel };
}

export function canDeduct(game) {
    const d = derive(game);
    return d.halfNet > 0 && d.totals[d.batting] > 0;
}

export function switchHalf(game, now = Date.now()) {
    game.events.push({ type: 'switch', ts: now });
    game.updatedAt = now;
    return derive(game);
}

// Manual correction of the batting team's total. Kept outside the half-inning rule (it fixes
// scorekeeping mistakes from any half), but a total can never be negative.
export function setTotal(game, value, now = Date.now()) {
    const v = Math.max(0, Math.trunc(value));
    const team = derive(game).batting;
    game.events.push({ type: 'set', team, value: v, ts: now });
    game.updatedAt = now;
    return v;
}

export function undo(game, now = Date.now()) {
    const ev = game.events.pop();
    if (ev) game.updatedAt = now;
    return ev || null;
}

export function deleteGame(state, id) {
    delete state.games[id];
    if (state.currentGameId === id) state.currentGameId = null;
}

export function gamesNewestFirst(state) {
    return Object.values(state.games).sort((x, y) => y.startedAt - x.startedAt);
}

// ---- Persistence -------------------------------------------------------------------------

// Validate what came out of storage; anything malformed is dropped rather than crashing the page.
export function parseState(raw) {
    const state = emptyState();
    if (!raw) return state;
    let data;
    try { data = JSON.parse(raw); } catch { return state; }
    if (!data || typeof data !== 'object') return state;
    if (data.prefs && typeof data.prefs === 'object') {
        state.prefs.field = FIELDS.includes(data.prefs.field) ? data.prefs.field : null;
        state.prefs.historyVisible = !!data.prefs.historyVisible;
    }
    state.migrated = !!data.migrated;
    for (const g of Object.values(data.games || {})) {
        if (!g || typeof g.id !== 'string' || !Array.isArray(g.teams) || g.teams.length !== 2 || !Array.isArray(g.events)) continue;
        // Any team name is kept (not just today's list), so a renamed or added team never loses games.
        if (!isTeamName(g.teams[0]) || !isTeamName(g.teams[1]) || g.teams[0] === g.teams[1]) continue;
        const events = g.events.filter(ev => ev && (
            (ev.type === 'score' && g.teams.includes(ev.team) && Number.isFinite(ev.points)) ||
            ev.type === 'switch' ||
            (ev.type === 'set' && g.teams.includes(ev.team) && Number.isFinite(ev.value))));
        state.games[g.id] = {
            id: g.id, teams: [g.teams[0], g.teams[1]], field: FIELDS.includes(g.field) ? g.field : null,
            startedAt: Number(g.startedAt) || 0, updatedAt: Number(g.updatedAt) || 0, events
        };
        if (g.imported) state.games[g.id].imported = true;
    }
    if (state.games[data.currentGameId]) state.currentGameId = data.currentGameId;
    return state;
}

// The previous version kept one game per field in these keys (and mirrored it to Firebase).
// Bring any such game in once, so a phone that was mid-game when this shipped keeps its score.
export function migrateLegacy(state, storage, now = Date.now()) {
    if (state.migrated) return false;
    state.migrated = true;
    const legacyField = storage.getItem('scorekeeperField');
    let imported = false;
    for (const [fieldKey, field] of [['DVC', 'DVC'], ['LasLomas', 'Las Lomas'], ['', null]]) {
        const t1 = storage.getItem(`currentTeam_${fieldKey}`);
        const t2 = storage.getItem(`otherTeam_${fieldKey}`);
        if (!TEAM_COLORS[t1] || !TEAM_COLORS[t2] || t1 === t2) continue;
        let scores = {};
        try { scores = JSON.parse(storage.getItem(`scores_${fieldKey}`)) || {}; } catch { scores = {}; }
        const events = [];
        for (const team of [t1, t2]) {
            const v = Number(scores[team]);
            if (Number.isFinite(v) && v !== 0) events.push({ type: 'set', team, value: Math.max(0, Math.trunc(v)), ts: now });
        }
        if (events.length === 0) continue;
        const game = { id: newId(now) + fieldKey, teams: [t1, t2], field, startedAt: now, updatedAt: now, events, imported: true };
        state.games[game.id] = game;
        if (!state.currentGameId || field === legacyField) state.currentGameId = game.id;
        imported = true;
    }
    return imported;
}

function readCleanly(raw, state) {
    try {
        const data = JSON.parse(raw);
        const games = Object.values((data && data.games) || {});
        if (games.length !== Object.keys(state.games).length) return false;
        return games.every(g => state.games[g.id] && state.games[g.id].events.length === (g.events || []).length);
    } catch {
        return false;
    }
}

// Storage that never throws. `ok` is false when the browser won't let us save (private mode,
// blocked site data, quota); the page keeps working in memory and tells the user.
export function makeStore(getStorage) {
    let storage = null;
    try {
        storage = getStorage();
        const probe = '__bashball_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
    } catch {
        storage = null;
    }
    return {
        get ok() { return storage !== null; },
        storage,
        load() {
            if (!storage) return emptyState();
            let raw = null;
            try { raw = storage.getItem(STORAGE_KEY); } catch { return emptyState(); }
            const state = parseState(raw);
            // If some of what's saved couldn't be read, keep a copy of the original before the
            // next save overwrites it, so nothing is lost for good.
            if (raw && !readCleanly(raw, state)) {
                try {
                    const backupKey = `${STORAGE_KEY}.unreadable`;
                    if (storage.getItem(backupKey) !== raw) storage.setItem(backupKey, raw);
                } catch { /* best effort */ }
            }
            return state;
        },
        save(state) {
            if (!storage) return false;
            try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
        }
    };
}
