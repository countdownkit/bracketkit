// Bracket controls: title, team count, format (single/double), orientation, print.
// The bracket is server-rendered for SEO; this re-renders it (via the shared
// BRACKET module) whenever a control changes, so client output matches the server.
(function () {
  const wrap = document.querySelector(".bracket-wrap");
  if (!wrap || !window.BRACKET) return;
  const gridEl = wrap.querySelector("[data-grid]");
  const titleEl = wrap.querySelector(".bk-title");
  const ctl = name => document.querySelector(`[data-ctl=${name}]`);

  let teams = +wrap.dataset.teams;
  let double = wrap.dataset.double === "1";
  const defCaption = titleEl.dataset.caption;
  let titleTouched = false;

  // Orientation as a real @page rule so the print dialog defaults correctly.
  const pageStyle = document.createElement("style");
  document.head.appendChild(pageStyle);
  function setOrient(o) {
    pageStyle.textContent = `@page { size: letter ${o}; margin: 0.35in; }`;
    wrap.classList.toggle("landscape", o === "landscape");
  }

  function syncSizeClass() {
    wrap.className = wrap.className.replace(/\bsz-\d+\b/g, "").replace(/\s+/g, " ").trim();
    wrap.classList.add("sz-" + BRACKET.nextPow2(teams));
  }
  function render() {
    syncSizeClass();
    gridEl.innerHTML = BRACKET.renderBracket(teams, { double });
  }

  // custom title typed into the input overrides the auto caption
  const titleInput = ctl("title");
  if (titleInput) titleInput.addEventListener("input", e => {
    const v = e.target.value.trim();
    titleTouched = v.length > 0;
    titleEl.textContent = v || defCaption;
  });
  // typing directly on the printed heading counts as a custom title too
  titleEl.addEventListener("input", () => {
    titleTouched = titleEl.textContent.trim() !== defCaption;
  });

  ctl("teams").addEventListener("change", e => {
    teams = +e.target.value;
    if (double && !BRACKET.isPow2(teams)) {
      double = false;
      const f = ctl("format"); if (f) f.value = "single";
    }
    render();
  });
  const fmt = ctl("format");
  if (fmt) fmt.addEventListener("change", e => {
    double = e.target.value === "double";
    if (double && !BRACKET.isPow2(teams)) {
      // double elimination needs a full bracket — bump up to the nearest power of 2
      teams = BRACKET.nextPow2(teams);
      const n = ctl("teams");
      if (n && [...n.options].some(o => +o.value === teams)) n.value = String(teams);
    }
    render();
  });
  ctl("orient").addEventListener("change", e => setOrient(e.target.value));
  ctl("print").addEventListener("click", () => window.print());

  // sync selects to the page's starting state
  ctl("teams").value = String(teams);
  setOrient(ctl("orient").value);
})();
