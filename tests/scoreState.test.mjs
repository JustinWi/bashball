// Run: node --test tests/scoreState.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    emptyState, createGame, currentGame, derive, addScore, canDeduct, switchHalf, setTotal, undo,
    deleteGame, gamesNewestFirst, parseState, migrateLegacy, makeStore, halfLabel, STORAGE_KEY
} from '../js/scoreState.js';

function memStorage(init = {}) {
    const m = new Map(Object.entries(init));
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}

function newGame() {
    const s = emptyState();
    const g = createGame(s, ['Mambas', 'Snappers'], 'DVC', 1000);
    return { s, g };
}

test('first team bats in the top of the 1st; switching alternates halves and innings', () => {
    const { g } = newGame();
    assert.equal(derive(g).batting, 'Mambas');
    assert.equal(derive(g).halfLabel, 'Top 1st');
    switchHalf(g);
    assert.equal(derive(g).batting, 'Snappers');
    assert.equal(derive(g).halfLabel, 'Bottom 1st');
    switchHalf(g);
    assert.equal(derive(g).batting, 'Mambas');
    assert.equal(derive(g).halfLabel, 'Top 2nd');
    assert.equal(halfLabel(21), 'Bottom 11th');
});

test('scores accrue to the batting team only', () => {
    const { g } = newGame();
    addScore(g, 4); addScore(g, 2);
    switchHalf(g);
    addScore(g, 3);
    assert.deepEqual(derive(g).totals, { Mambas: 6, Snappers: 3 });
    assert.deepEqual(derive(g).halves, [6, 3]);
});

test('a -1 with nothing scored this half is blocked and not recorded', () => {
    const { g } = newGame();
    const r = addScore(g, -1);
    assert.equal(r.blocked, true);
    assert.equal(g.events.length, 0);
    assert.equal(derive(g).totals.Mambas, 0);
    assert.equal(canDeduct(g), false);
});

test('deductions stop at the half-inning floor, not at zero overall', () => {
    const { g } = newGame();
    addScore(g, 4);                       // Mambas 4 in top 1st
    switchHalf(g); switchHalf(g);         // top 2nd, Mambas bat again at 4
    addScore(g, 1);                       // 5, half net +1
    assert.equal(addScore(g, -1).applied, -1); // 4, half net 0
    const r = addScore(g, -1);            // would take the half negative
    assert.equal(r.blocked, true);
    assert.equal(derive(g).totals.Mambas, 4);
    assert.equal(derive(g).halfNet, 0);
    assert.equal(canDeduct(g), false);
});

test('the other team cannot be pushed below its own half floor either', () => {
    const { g } = newGame();
    addScore(g, 3);
    switchHalf(g);                        // Snappers bat with 0 this half
    assert.equal(addScore(g, -1).blocked, true);
    assert.equal(derive(g).totals.Mambas, 3, 'the -1 must not touch the fielding team');
});

test('generic clamp: a larger deduction is trimmed to the half net', () => {
    const { g } = newGame();
    addScore(g, 2);
    const r = addScore(g, -5);
    assert.equal(r.applied, -2);
    assert.equal(r.clamped, true);
    assert.equal(derive(g).halfNet, 0);
});

test('undo removes the last event, including a switch', () => {
    const { g } = newGame();
    addScore(g, 3);
    switchHalf(g);
    assert.equal(undo(g).type, 'switch');
    assert.equal(derive(g).halfLabel, 'Top 1st');
    assert.equal(undo(g).type, 'score');
    assert.equal(derive(g).totals.Mambas, 0);
    assert.equal(undo(g), null);
});

test('manual correction sets the batting team total, never below zero, and never goes below 0 after', () => {
    const { g } = newGame();
    addScore(g, 4);
    setTotal(g, 1);
    assert.equal(derive(g).totals.Mambas, 1);
    assert.equal(derive(g).corrected, true);
    // half net from taps is still +4, but the total is 1: a deduction must stop at 0 total
    assert.equal(addScore(g, -1).applied, -1);
    assert.equal(addScore(g, -1).blocked, true);
    assert.equal(setTotal(g, -7), 0);
});

test('state survives a JSON round trip exactly (refresh restores the game)', () => {
    const { s, g } = newGame();
    addScore(g, 4); switchHalf(g); addScore(g, 2); addScore(g, -1);
    s.prefs.historyVisible = true;
    const back = parseState(JSON.stringify(s));
    assert.deepEqual(back, s);
    assert.deepEqual(derive(currentGame(back)), derive(g));
});

test('malformed storage is survived, bad games and events are dropped', () => {
    assert.deepEqual(parseState('{nope'), emptyState());
    assert.deepEqual(parseState('null'), emptyState());
    const s = parseState(JSON.stringify({
        currentGameId: 'x',
        games: {
            x: { id: 'x', teams: ['Mambas', 'Hyenas'], events: [{ type: 'score', team: 'Mambas', points: 2 }, { type: 'score', team: 'Nobody', points: 9 }, { type: 'weird' }] },
            y: { id: 'y', teams: ['Mambas', 'Mambas'], events: [] },
            z: { id: 'z', teams: ['Mambas'], events: [] }
        }
    }));
    assert.deepEqual(Object.keys(s.games), ['x']);
    assert.equal(s.games.x.events.length, 1);
    assert.equal(s.currentGameId, 'x');
});

test('starting a new game keeps the old one in history but drops an unscored one', () => {
    const { s, g } = newGame();
    addScore(g, 1);
    const g2 = createGame(s, ['Hyenas', 'Crawdads'], null, 2000);
    assert.equal(Object.keys(s.games).length, 2);
    createGame(s, ['Scorpions', 'Dartfrogs'], 'Las Lomas', 3000);
    assert.equal(s.games[g2.id], undefined, 'empty game discarded');
    assert.deepEqual(gamesNewestFirst(s).map(x => x.teams[0]), ['Scorpions', 'Mambas']);
    assert.equal(s.prefs.field, 'Las Lomas');
    deleteGame(s, s.currentGameId);
    assert.equal(s.currentGameId, null);
});

test('legacy per-field keys are imported once as a game', () => {
    const storage = memStorage({
        scorekeeperField: 'Las Lomas',
        currentTeam_DVC: 'Mambas', otherTeam_DVC: 'Hyenas', scores_DVC: JSON.stringify({ Mambas: 5, Hyenas: 2 }),
        currentTeam_LasLomas: 'Crawdads', otherTeam_LasLomas: 'Snappers', scores_LasLomas: JSON.stringify({ Crawdads: 7 })
    });
    const s = emptyState();
    assert.equal(migrateLegacy(s, storage, 5000), true);
    assert.equal(Object.keys(s.games).length, 2);
    const cur = currentGame(s);
    assert.equal(cur.field, 'Las Lomas');
    assert.deepEqual(derive(cur).totals, { Crawdads: 7, Snappers: 0 });
    assert.equal(migrateLegacy(s, storage), false, 'only once');
});

test('store: works when storage throws, and reports it', () => {
    const blocked = makeStore(() => { throw new Error('SecurityError'); });
    assert.equal(blocked.ok, false);
    assert.deepEqual(blocked.load(), emptyState());
    assert.equal(blocked.save(emptyState()), false);

    const full = memStorage();
    full.setItem = () => { throw new Error('QuotaExceeded'); };
    assert.equal(makeStore(() => full).ok, false);

    const mem = memStorage();
    const store = makeStore(() => mem);
    const { s, g } = newGame();
    addScore(g, 3);
    assert.equal(store.save(s), true);
    assert.ok(mem.getItem(STORAGE_KEY));
    assert.deepEqual(store.load(), s);
});
