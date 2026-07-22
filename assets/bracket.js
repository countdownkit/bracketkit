/*
 * Shared bracket logic — used by BOTH generate.js (Node, server render) and
 * tool.js (browser, re-render on control change) so server + client output match.
 * UMD-ish: attaches to module.exports under Node, window.BRACKET in the browser.
 *
 * renderBracket(teams, {double}) -> HTML string for a single-elimination bracket
 * (columns of matchups, each round halving the field, ending at a champion slot).
 * Non-power-of-2 team counts are supported by seeding byes into round 1.
 * {double:true} on a power-of-2 size adds a losers bracket + grand final.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BRACKET = factory();
})(typeof self !== "undefined" ? self : this, function () {

  function isPow2(n) { return n >= 1 && (n & (n - 1)) === 0; }
  function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

  // Standard single-elimination seed order for a bracket of `size` positions.
  // e.g. size 8 -> [1,8,5,4,3,6,7,2] so 1 meets 8, top seeds spread apart.
  function seedOrder(size) {
    let seeds = [1, 2];
    while (seeds.length < size) {
      const sum = seeds.length * 2 + 1;
      const next = [];
      for (const s of seeds) { next.push(s); next.push(sum - s); }
      seeds = next;
    }
    return seeds;
  }

  // Name a round from how many matches it holds (2 entrants per match).
  function roundName(matches) {
    if (matches === 1) return "Final";
    if (matches === 2) return "Semifinals";
    if (matches === 4) return "Quarterfinals";
    return "Round of " + (matches * 2);
  }

  // ---- slot / matchup builders ------------------------------------------
  function editLine(ph) {
    return `<div class="line" contenteditable="true" spellcheck="false" data-ph="${ph}"></div>`;
  }
  function seededSlot(seed, teams) {
    if (seed > teams) return `<div class="slot bye"><div class="line bye-line">Bye</div></div>`;
    return `<div class="slot"><span class="seed">${seed}</span>${editLine("Team " + seed)}</div>`;
  }
  function winnerSlot() {
    return `<div class="slot">${editLine("Winner")}</div>`;
  }
  function matchup(a, b) {
    return `<div class="match"><div class="matchup">${a}${b}</div></div>`;
  }
  function round(title, r, inner) {
    return `<div class="round" data-round="${r}"><div class="round-title">${title}</div><div class="matches">${inner}</div></div>`;
  }
  function champColumn() {
    return `<div class="round champ" data-round="champ"><div class="round-title">Champion</div><div class="matches"><div class="match"><div class="matchup champ-box"><div class="slot champ-slot">${editLine("Champion")}</div></div></div></div></div>`;
  }

  // ---- single-elimination winners bracket -------------------------------
  function renderSingle(teams) {
    const size = nextPow2(Math.max(2, teams));
    const rounds = Math.round(Math.log2(size));
    const order = seedOrder(size);

    let cols = "";
    // round 1: seeded, byes where seed > teams
    let r1 = "";
    for (let i = 0; i < size / 2; i++) {
      r1 += matchup(seededSlot(order[2 * i], teams), seededSlot(order[2 * i + 1], teams));
    }
    cols += round(roundName(size / 2), 1, r1);

    // later rounds: blank write-on lines
    for (let r = 2; r <= rounds; r++) {
      const n = size / Math.pow(2, r);
      let inner = "";
      for (let i = 0; i < n; i++) inner += matchup(winnerSlot(), winnerSlot());
      cols += round(roundName(n), r, inner);
    }
    cols += champColumn();
    return `<div class="bracket single" data-size="${size}">${cols}</div>`;
  }

  // ---- losers bracket (double elimination, power-of-2 only) -------------
  // Match counts follow the standard structure: for r = log2(size) winners
  // rounds, the losers bracket has 2(r-1) rounds sized [N/4,N/4,N/8,N/8,...,1,1].
  function loserRoundSizes(size) {
    const r = Math.round(Math.log2(size));
    const sizes = [];
    let m = size / 4;
    for (let i = 0; i < r - 1; i++) { sizes.push(m); sizes.push(m); m = m / 2; }
    return sizes;
  }
  function renderLosers(size) {
    const sizes = loserRoundSizes(size);
    let cols = "";
    sizes.forEach((n, idx) => {
      let inner = "";
      for (let i = 0; i < n; i++) inner += matchup(winnerSlot(), winnerSlot());
      cols += round("Losers R" + (idx + 1), idx + 1, inner);
    });
    return `<div class="bracket plain losers">${cols}</div>`;
  }
  function renderGrandFinal() {
    return `<div class="bracket single gf">` +
      round("Grand Final", 1, matchup(winnerSlot(), winnerSlot())) +
      champColumn() +
      `</div>`;
  }

  // ---- public entry -----------------------------------------------------
  function renderBracket(teams, opts) {
    opts = opts || {};
    teams = Math.max(2, +teams || 2);
    const double = !!opts.double && isPow2(teams);
    if (!double) return renderSingle(teams);
    const size = teams;
    return `<div class="bracket-set">` +
      `<div class="bset-label">Winners Bracket</div>${renderSingle(size)}` +
      `<div class="bset-label">Losers Bracket</div>${renderLosers(size)}` +
      `<div class="bset-label">Grand Final</div>${renderGrandFinal()}` +
      `</div>`;
  }

  return { isPow2, nextPow2, seedOrder, roundName, loserRoundSizes, renderBracket };
});
