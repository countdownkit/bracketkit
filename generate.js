/*
 * Static generator for the printable tournament-bracket site.
 * Run: node generate.js   ->   writes everything into ./public
 *
 * Page families:
 *   /<slug>/   one bracket page per entry in data/brackets.json
 *   /          homepage, grouped By size / Formats / Blank
 *
 * The artifact IS the page: each page server-renders a real single-elimination
 * bracket (columns of matchups halving each round to a champion slot). Every
 * name slot is contenteditable. assets/tool.js re-renders it when the team count
 * or format changes and calls window.print(). Print CSS strips everything with
 * .no-print; "save as PDF" is just the print dialog.
 */
const fs = require("fs");
const path = require("path");
const BRACKET = require("./assets/bracket.js");

// ---- config -------------------------------------------------------------
const DOMAIN = process.env.DOMAIN || "https://brackets.elevatedprogress.com";
const BASE = process.env.BASE || "";
const SITE = "Bracket Maker";
const OUT = path.join(__dirname, "public");
const ASSETS = path.join(__dirname, "assets");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "brackets.json"), "utf8"));
const PAGES = DATA.pages;

// team-count options offered on every page (always includes the page's own size)
function sizesFor(teams) {
  const base = [4, 6, 8, 16, 32];
  return Array.from(new Set(base.concat([teams]))).sort((a, b) => a - b);
}

// ---- html layout --------------------------------------------------------
function layout({ title, desc, urlPath, h1, body }) {
  const canonical = DOMAIN + BASE + urlPath;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${BASE}/styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5580575158570188" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TJY4TRRKD6"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TJY4TRRKD6');</script>
</head>
<body>
<header class="site-head no-print"><div class="wrap">
  <a class="brand" href="${BASE}/">🥊 ${SITE}</a>
  <nav class="nav"><a href="${BASE}/#sizes">By size</a><a href="${BASE}/#formats">Formats</a><a href="${BASE}/#blank">Blank</a></nav>
</div></header>
<main class="wrap">
  <div class="crumbs no-print"><a href="${BASE}/">Home</a> ›&nbsp;${h1}</div>
  <h1 class="no-print">${h1}</h1>
  ${body}
</main>
<footer class="site-foot no-print"><div class="wrap">
  <a href="${BASE}/">Home</a><a href="${BASE}/#sizes">Bracket sizes</a><a href="${BASE}/#formats">Formats</a>
  <span>· ${SITE} — free printable tournament brackets. No downloads, no signups: fill in the names and print. Part of <a href="https://elevatedprogress.com/">Elevated Progress</a>. · <a href="https://elevatedprogress.com/about/">About</a> · <a href="https://elevatedprogress.com/contact/">Contact</a> · <a href="https://elevatedprogress.com/privacy/">Privacy Policy</a></span>
</div></footer>
<script src="${BASE}/bracket.js"></script>
<script src="${BASE}/tool.js" defer></script>
</body>
</html>`;
}
function grid(links) {
  return `<div class="grid">` + links.map(l =>
    `<a href="${BASE}${l.href}">${l.emoji ? `<span class="chip-emoji">${l.emoji}</span>` : ""}${l.label}</a>`).join("") + `</div>`;
}
const pageLink = p => ({ href: `/${p.slug}/`, emoji: p.emoji, label: p.card });

// ---- controls -----------------------------------------------------------
function controls(entry) {
  const teams = entry.teams;
  const sizeOpts = sizesFor(teams).map(s =>
    `<option value="${s}"${s === teams ? " selected" : ""}>${s} teams</option>`).join("");
  const fmt = entry.formats !== false
    ? `<div><label for="f">Format</label><select id="f" data-ctl="format"><option value="single"${entry.double ? "" : " selected"}>Single elimination</option><option value="double"${entry.double ? " selected" : ""}>Double elimination</option></select></div>`
    : "";
  return `<div class="controls no-print">
    <div class="row">
      <div class="titlecell"><label for="t">Bracket title (prints at the top)</label><input type="text" id="t" data-ctl="title" placeholder="e.g. Summer Cup"></div>
      <div><label for="n">Teams / players</label><select id="n" data-ctl="teams">${sizeOpts}</select></div>
      ${fmt}
      <div><label for="o">Paper</label><select id="o" data-ctl="orient"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></div>
    </div>
    <div class="ctl-foot">
      <button type="button" class="print-btn" data-ctl="print">🖨️ Print this bracket</button>
      <span class="hint">Tip: click any name line to type a team or player. "Save as PDF" is a destination in the print dialog.</span>
    </div>
  </div>`;
}

// ---- write helpers ------------------------------------------------------
const urls = [];
function writePage(urlPath, html) {
  const dir = path.join(OUT, urlPath.replace(/^\/+|\/+$/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push(urlPath);
}

// ---- page builder -------------------------------------------------------
function bracketPage(entry) {
  const teams = entry.teams;
  const double = !!entry.double;
  const cap = entry.caption || entry.h1;
  const sizeClass = `sz-${BRACKET.nextPow2(teams)}`;
  const artifact = `<div class="bracket-wrap ${sizeClass}" data-teams="${teams}" data-double="${double ? 1 : 0}">
    <div class="paper" data-paper>
      <h2 class="bk-title" contenteditable="true" spellcheck="false" data-caption="${cap}">${cap}</h2>
      <div class="bracket-scroll" data-grid>${BRACKET.renderBracket(teams, { double })}</div>
    </div>
  </div>`;
  const related = PAGES.filter(p => p.slug !== entry.slug).map(pageLink);
  const body = `${controls(entry)}
  ${artifact}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose no-print">
    <p>${entry.blurb}</p>
    <p>${entry.tip}</p>
    <p><b>To print:</b> set the number of teams and the format above, type the names into the slots, then hit Print. <b>To save a PDF instead:</b> pick "Save as PDF" as the printer in the print dialog — same result, nothing to install. Everything except the bracket is stripped from the printout.</p>
  </div>
  <h2 class="no-print">More brackets</h2>
  <div class="no-print">${grid(related)}</div>
  <div class="ad-slot no-print">Advertisement</div>`;
  writePage(`/${entry.slug}/`, layout({ title: entry.title, desc: entry.desc, urlPath: `/${entry.slug}/`, h1: entry.h1, body }));
}

// ---- build --------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT)) {
  if (entry === ".git" || entry === "CNAME") continue;
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
}
for (const f of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, f));

for (const entry of PAGES) bracketPage(entry);

// -- homepage --
{
  const title = `Free Printable Tournament Brackets — Fill In and Print (PDF)`;
  const desc = `Free printable single- and double-elimination tournament brackets. Pick 4, 8, 16, or 32 teams, type player or team names into each slot, then print or save as a PDF. No signup.`;
  const inGroup = g => PAGES.filter(p => p.group === g).map(pageLink);
  const body = `<p class="lead">Pick a bracket, set how many teams or players are entered, and type straight into each slot before you print. Every bracket also saves as a PDF from the print dialog — no downloads, no account, nothing to install.</p>
  <h2 id="formats">Bracket formats</h2>
  ${grid(inGroup("formats"))}
  <h2 id="sizes">By number of teams</h2>
  ${grid(inGroup("sizes"))}
  <h2 id="blank">Blank brackets</h2>
  ${grid(inGroup("blank"))}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose"><p>These are working brackets, not template downloads: the bracket you see on each page is the one that prints. Change the field size and the rounds redraw instantly, non-power-of-two sizes get first-round byes placed for you, and the print stylesheet strips everything else off the page automatically. Generic tournament brackets for any sport, game, or contest — no team names or logos baked in.</p></div>
  <h2>How to set up a tournament bracket</h2>
  <div class="prose">
    <p>Decide how many teams or players are entered, then pick the matching size — 4, 8, 16, or 32 for a full field, or another number for a bracket with byes. Seeding means ranking your entrants from strongest to weakest before the draw. The slots follow standard seed order, which spreads the top seeds apart: the number-one and number-two seeds sit at opposite ends and can only meet in the final. For a casual event, skip seeding and drop names in at random.</p>
    <p>In single elimination, one loss knocks a team out, so the field runs down to a champion in log2 rounds — three for 8 teams, four for 16, five for 32. Double elimination gives everyone a second chance: a team has to lose twice to be eliminated. The winners bracket runs as usual, anyone who loses drops into a separate losers bracket, and the two survivors meet in a grand final. That means more matches, but nobody is out after one bad game.</p>
    <p>When your entry count isn't a power of two — 6 teams, 12 teams, or an odd number — the bracket adds first-round byes for you. A bye lets a top seed skip round one, which is why a 6-team bracket sends its two best seeds directly to the semifinals. The byes are placed in seed order automatically.</p>
    <p>Every name line is editable: click a slot and type the name. Add a title across the top, choose landscape for the roomiest layout, and print — or pick "Save as PDF" in the same dialog. Only the bracket prints; the controls and everything else are stripped away.</p>
  </div>
  <h2>Frequently asked questions</h2>
  <div class="prose">
    <p><strong>What if I don't have exactly 8 or 16 teams?</strong> Pick the next size up and the leftover slots become first-round byes, or choose an exact size such as 3 or 6 that builds the byes in for you.</p>
    <p><strong>What's the difference between single and double elimination?</strong> Single elimination removes a team after one loss. Double elimination requires two losses and adds a losers bracket plus a grand final — more forgiving, but roughly twice as many games.</p>
    <p><strong>How do I fill it in?</strong> Click any name line and type. Fill it on screen before printing, or print it blank and pencil the names in by hand.</p>
    <p><strong>How many rounds will my bracket have?</strong> For a full power-of-two field it is log2 of the team count: 4 teams is 2 rounds, 8 is 3, 16 is 4, and 32 is 5. Byes don't add rounds.</p>
    <p><strong>Can I use these for any sport or game?</strong> Yes — every bracket is generic, with no team names or logos, so it works for any sport, video game, card game, or office contest.</p>
  </div>`;
  writePage(`/`, layout({ title, desc, urlPath: `/`, h1: `Free Printable Tournament Brackets`, body }));
}

// -- sitemap + robots + meta files --
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${DOMAIN}${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "CNAME"), "brackets.elevatedprogress.com\n");
fs.writeFileSync(path.join(OUT, "ads.txt"), "google.com, pub-5580575158570188, DIRECT, f08c47fec0942fa0\n");

console.log(`Generated ${urls.length} pages into ./public`);
