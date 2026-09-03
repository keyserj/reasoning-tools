/* Shared prototype-bar chrome: version switcher + info popover. Not part of any
 * wireframe's design - it's the review chrome every topic-landing-v<N>.html sits
 * under, so it lives here once instead of being hand-copied into each file.
 *
 * A wireframe sets window.CURRENT_VERSION and window.WHATS_NEW_HTML (the two
 * genuinely per-version facts), then loads this and versions.js with a plain
 * <script src> - the only include the browser offers that works over file:// as
 * well as over a server, which is why the markup and CSS below are strings.
 */
(function initProtoBar() {
  const CSS = `
  .proto-bar {
    position: relative; z-index: 70; flex: 0 0 auto;
    display: flex; align-items: center; gap: 5px;
    padding: 4px 12px;
    background: #e9ebef; border-bottom: 1px solid var(--line-strong);
    color: var(--muted); font-size: 11.5px;
  }
  .proto-bar .proto-spacer { flex: 1; }
  .proto-bar .proto-sep { opacity: .5; }
  .proto-ver-group { display: flex; align-items: center; gap: 1px; }
  .proto-ver {
    border: 1px solid transparent; background: none; cursor: pointer;
    color: var(--muted); font: inherit; padding: 2px 7px; border-radius: 6px;
  }
  .proto-ver:hover, .proto-ver.active {
    border-color: var(--line-strong); background: var(--panel); color: var(--text);
  }
  .proto-ver .caret { font-size: 9px; margin-left: 3px; }
  /* hidden (not just disabled) at either end of the version list, since there's nothing to navigate to */
  .proto-navarrow {
    border: 1px solid transparent; background: none; cursor: pointer;
    color: var(--muted); font: inherit; font-size: 13px; line-height: 1; padding: 2px 4px; border-radius: 6px;
  }
  .proto-navarrow:hover { border-color: var(--line-strong); background: var(--panel); color: var(--text); }
  .proto-navarrow[hidden] { display: none; }

  .ver-pop {
    position: absolute; top: calc(100% + 5px); left: 10px; width: 330px; z-index: 80;
    background: var(--panel); border: 1px solid var(--line-strong); border-radius: 10px;
    box-shadow: 0 12px 34px rgba(0,0,0,.18); padding: 5px; display: none;
    max-height: 62vh; overflow-y: auto;
  }
  .ver-pop.show { display: block; }
  .proto-ver:disabled { cursor: default; opacity: .7; }
  .ver-link { display: block; padding: 7px 9px; border-radius: 7px; text-decoration: none; color: var(--text); }
  .ver-link:hover { background: var(--bg); }
  .ver-link.current { background: #eef1fc; }
  .ver-link b { font-size: 12.5px; font-weight: 600; }
  .ver-link span { display: block; color: var(--muted); font-size: 11.5px; }

  .info-btn {
    width: 21px; height: 21px; border-radius: 50%; flex: 0 0 auto;
    border: 1px solid var(--line-strong); background: var(--panel);
    color: var(--muted); cursor: pointer;
    font-family: Georgia, "Times New Roman", serif; font-style: italic; font-weight: 700; font-size: 12px;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .info-btn:hover { border-color: var(--accent); color: var(--accent); }
  .info-btn.active { background: #23262b; color: #fff; border-color: #23262b; }
  .info-pop {
    position: absolute; top: calc(100% + 5px); right: 10px; width: 430px; z-index: 80;
    background: var(--panel); border: 1px solid var(--line-strong); border-radius: 12px;
    box-shadow: 0 12px 34px rgba(0,0,0,.18); display: none;
    color: var(--text); line-height: 1.45;
  }
  .info-pop.show { display: block; }
  .info-tabs { display: flex; gap: 2px; padding: 6px 6px 0; border-bottom: 1px solid var(--line); }
  .info-tab {
    border: none; background: none; cursor: pointer; font: inherit; font-size: 12.5px;
    color: var(--muted); padding: 7px 10px; border-radius: 7px 7px 0 0;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .info-tab:hover { color: var(--text); background: var(--bg); }
  .info-tab.active { color: var(--text); font-weight: 600; border-bottom-color: var(--accent); }
  .info-body { padding: 12px 16px 14px; max-height: 64vh; overflow-y: auto; }
  .info-body[hidden] { display: none; }
  .info-body p { margin: 0 0 9px; font-size: 12.5px; color: #3d4149; }
  .info-body ol, .info-body ul { margin: 0 0 9px; padding-left: 18px; }
  .info-body li { margin: 0 0 8px; font-size: 12.5px; color: #3d4149; }
  .info-body > :last-child { margin-bottom: 0; }
  .info-body li:last-child { margin-bottom: 0; }
  .info-body b { color: var(--text); }
  .info-body a { color: var(--accent); }
  .info-body .ver { color: var(--muted); font-size: 11.5px; margin-bottom: 10px; }
`;

  const MARKUP = `
<div class="proto-bar">
  <span>ameliorate-v2 prototype</span>
  <span class="proto-sep">/</span>
  <div class="proto-ver-group">
    <button class="proto-navarrow" id="verPrevBtn" title="Previous version">&#8249;</button>
    <button class="proto-ver" id="verBtn" title="Switch version"><span id="verLabel"></span> <span class="caret">&#9662;</span></button>
    <button class="proto-navarrow" id="verNextBtn" title="Next version">&#8250;</button>
  </div>
  <span class="proto-spacer"></span>
  <button class="info-btn" id="infoBtn" title="About this prototype">i</button>

  <div class="ver-pop" id="verPop"><!-- built from versions.js --></div>

  <div class="info-pop" id="infoPop">
    <div class="info-tabs">
      <button class="info-tab active" data-tab="what">What is this?</button>
      <button class="info-tab" data-tab="new">What&rsquo;s new in this version</button>
    </div>
    <div class="info-body" data-tab="what">
      <p>This is a prototype of an app for integrating disputed knowledge about uncertain problems.</p>
      <p>It&rsquo;s entirely based on <a href="https://github.com/keyserj/reasoning-tools/blob/main/ameliorate-v2/ontology.md" target="_blank">this ontology.md</a>, using that as the data structure and visualizing some features that are enabled by the structure. <a href="https://github.com/keyserj/reasoning-tools/blob/main/ameliorate-v2/UX-design.md" target="_blank">This UX-design.md</a> describes some of the prototype&rsquo;s design in text.</p>
      <p>Nothing here is functional. It&rsquo;s hard-coded to the ontology&rsquo;s &ldquo;Build a wall&rdquo; example, viewed as <b>danny</b> &mdash; new to the topic, hasn&rsquo;t scored anything yet; the scores shown are alice&rsquo;s, bob&rsquo;s and casey&rsquo;s.</p>
    </div>
    <div class="info-body" data-tab="new" id="whatsNewBody" hidden></div>
  </div>
</div>
`;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);
  document.getElementById("protoBarSlot").outerHTML = MARKUP;

  const CURRENT_VERSION = window.CURRENT_VERSION;
  const INTRO_SEEN_KEY = "ameliorate-v2-wireframe-intro-seen";

  document.getElementById("verLabel").textContent = "version " + CURRENT_VERSION;
  document.getElementById("whatsNewBody").innerHTML = window.WHATS_NEW_HTML || "";

  const verBtn = document.getElementById("verBtn");
  const verPop = document.getElementById("verPop");
  const verPrevBtn = document.getElementById("verPrevBtn");
  const verNextBtn = document.getElementById("verNextBtn");
  const infoBtn = document.getElementById("infoBtn");
  const infoPop = document.getElementById("infoPop");

  const setVer = (show) => {
    verPop.classList.toggle("show", show);
    verBtn.classList.toggle("active", show);
    if (show) verPop.querySelector(".ver-link.current")?.scrollIntoView({ block: "nearest" });
  };
  const setInfo = (show) => {
    infoPop.classList.toggle("show", show);
    infoBtn.classList.toggle("active", show);
  };

  const versions = window.WIREFRAME_VERSIONS;
  if (Array.isArray(versions)) {
    verPop.innerHTML = versions.map(({ v, desc }) =>
      `<a class="ver-link${v === CURRENT_VERSION ? " current" : ""}" href="topic-landing-v${v}.html">` +
      `<b>version ${v}</b><span>${desc}</span></a>`
    ).join("");
    verBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const show = !verPop.classList.contains("show");
      setInfo(false); setVer(show);
    });

    // Hidden rather than disabled at either end, since there's nothing to navigate to.
    const idx = versions.findIndex(({ v }) => v === CURRENT_VERSION);
    const prev = versions[idx - 1];
    const next = versions[idx + 1];
    if (prev) verPrevBtn.addEventListener("click", () => { window.location.href = `topic-landing-v${prev.v}.html`; });
    else verPrevBtn.hidden = true;
    if (next) verNextBtn.addEventListener("click", () => { window.location.href = `topic-landing-v${next.v}.html`; });
    else verNextBtn.hidden = true;
  } else {
    verBtn.disabled = true;
    verBtn.title = "The version list needs versions.js loaded before this file";
    verBtn.querySelector(".caret").remove();
    verPrevBtn.hidden = true;
    verNextBtn.hidden = true;
  }

  infoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const show = !infoPop.classList.contains("show");
    setVer(false); setInfo(show);
  });

  document.querySelectorAll(".info-tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".info-tab").forEach(t => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".info-body").forEach(b => { b.hidden = b.dataset.tab !== tab.dataset.tab; });
    });
  });

  // Close on outside click. Capture phase so it still fires for targets (nodes,
  // pills, edges) whose own handlers call stopPropagation().
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".proto-bar")) { setVer(false); setInfo(false); }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { setVer(false); setInfo(false); }
  });

  // First visit: open the intro instead of hoping the small "i" gets noticed.
  // The flag is shared across versions (one origin), so this shows once
  // overall, not once per wireframe. If storage is blocked, just show it.
  let seen = false;
  try { seen = localStorage.getItem(INTRO_SEEN_KEY) === "1"; } catch (e) { /* blocked */ }
  if (!seen) {
    setInfo(true);
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch (e) { /* blocked */ }
  }
})();
