# Bashball Scorekeeper

A phone scorekeeper for Bashball. Everything is stored on the phone (localStorage): no login,
no server. Open the site, pick two teams, score. Refreshing keeps the game; the Games button
lists every game on that phone.

- `index.html` — the scorekeeper (`score.html` redirects here for old links)
- `js/scoreState.js` — scoring rules and storage (no DOM; unit-tested)
- `js/score.js` — the page
- `leaderboard.html`, `coaches.html`, `users.html` — older Firebase pages, not used by the scorekeeper

## Rules the scorekeeper enforces

- **Switch Teams** hands the bats to the other team and starts the next half-inning.
- A team can't go below zero in a half-inning: −1 is refused once the batting team is back to
  where it started the half, and the page says why.
- The pencil next to the score corrects a total by hand (never below 0).

## Tests

```
node --test tests/scoreState.test.mjs
```

Layout at phone sizes: serve the folder (`python -m http.server 8765`) and open
`http://localhost:8765/tests/layout-check.html`. It walks every screen at nine phone viewports
and lists anything off-screen, overlapping, or out of reach.

## Hosting

Served by GitHub Pages from `main` (root). All links are relative, so it works at a subdomain
root or under a `/bashball/` path.

Scores live in the browser storage of the address the page was opened from, so a phone that
switches addresses (for example from jagdads.com/bashball to bashball.jagdads.com) starts with
an empty game list on the new one. Pick the final address before people start scoring.
