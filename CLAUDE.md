# CLAUDE.md — bracketkit

Project instructions for Claude Code working in this repo. Inherits the ElevatedProgress
venture playbook from the parent folder's CLAUDE.md.

## What this is

A zero-dependency static-site generator for **free printable tournament brackets** (single-
and double-elimination). `generate.js` reads `data/brackets.json` + `assets/` and writes one
page per bracket into `public/`. Target: https://brackets.elevatedprogress.com/.

## The product rule

**The artifact IS the page.** Each page server-renders a real single-elimination bracket —
columns of matchups where each round halves the field, connected by CSS border lines, ending
at a champion slot. `assets/tool.js` only re-renders it (team count, single/double format,
orientation) and calls `window.print()`. Every name slot is contenteditable. Print CSS strips
everything with `.no-print`; "save as PDF" is just the print dialog. Never turn this into a
download/builder flow — instant-print is the differentiator vs the template mills.

Bracket geometry + rendering live in `assets/bracket.js`, a UMD module required by BOTH
`generate.js` (server) and `tool.js` (browser) so their output matches exactly. Rounds =
log2(size); non-power-of-2 team counts get **first-round byes seeded in** (standard seed
order via `seedOrder`), so 3, 6, 12, etc. lay out cleanly. `{double:true}` on a power-of-two
size adds a losers bracket (`loserRoundSizes`) and a grand final.

## Keep it generic

**No league names, team names, logos, or trademarked event names anywhere** — generic
tournament brackets only, usable for any sport, game, or contest.

## Deploy — just push

`git push` to `main` is the deploy — GitHub Actions (`.github/workflows/deploy.yml`).

- **Never manually build and commit output.** `public/` is git-ignored build output.
- **Never hand-edit anything in `public/`.**
- Commit as the neutral identity:
  `git -c user.name="bracketkit" -c user.email="bracketkit@users.noreply.github.com" commit …`

## Local build / preview

```
node generate.js     # writes ./public
node server.js       # preview at http://localhost:5076 (5060/5061 are Chrome-blocked SIP ports)
```

## Pages

All pages come from `data/brackets.json`, grouped for the homepage into `formats`
(tournament-bracket, double-elimination-bracket), `sizes` (3/4/6/8/16/32-team), and `blank`
(blank-bracket). Each entry sets its default `teams`, whether the single/double `formats`
select shows, and its copy. The team-count select always offers 4/6/8/16/32 plus the page's
own size, so any page can be resized in the browser.

## Don't break these (generated, must keep serving)

- `ads.txt` + AdSense loader in `<head>` — publisher `ca-pub-5580575158570188`.
- GA4 `G-TJY4TRRKD6` (shared across all EP sites; hostname splits them).
- `sitemap.xml`, `robots.txt`, `.nojekyll`, `CNAME` (brackets.elevatedprogress.com).
- GSC verification file once the property is verified.

## Config knobs

`DOMAIN` and `BASE`, same semantics as the other tools. Production values in the workflow.
