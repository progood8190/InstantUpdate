(() => {
  if (window.__deflyCtrlRaf) cancelAnimationFrame(window.__deflyCtrlRaf);
  if (window.__deflyRaf) cancelAnimationFrame(window.__deflyRaf);
  clearInterval(window.__deflyTeamRefresh);
  document.getElementById("defly-grab-overlay")?.remove();
  window.__deflyKilled = false;

  const TEAM_BASE = 2;
  const cfg = { refreshMs: 1, gate: true, cooldown: 25 };

  let target = null, lastFire = 0;
  let built = false, container = null;
  const cells = [];
  let refreshTimer = null;
  let ctrlRaf = null;

  const $ = (id) => document.getElementById(id);
  const popupEl   = () => $("choose-team-popup");
  const loadingEl = () => $("team-choice-loading");
  const rowEl     = () => $("team-choice-buttons");

  function shown(el) {
    if (!el) return false;
    if (typeof el.checkVisibility === "function")
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
    if (el.getClientRects().length === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && parseFloat(s.opacity || "1") !== 0;
  }

  const hasJoined    = () => window.__deflyJoined === true || typeof window.PIXIAPP !== "undefined";
  const onTeamScreen = () => shown(popupEl());

  const btnAt = (i) => { const r = rowEl(); if (!r) return null; const td = r.children[i]; return td ? td.querySelector("button") : null; };
  const available = (i) => { const b = btnAt(i); return !!b && !b.classList.contains("disabled"); };

  function fire(teamId) {
    const now = performance.now();
    if (now - lastFire < cfg.cooldown) return;
    lastFire = now;
    try {
      if (window.defly && typeof defly.selectTeam === "function") defly.selectTeam(teamId);
      else { const b = btnAt(teamId - TEAM_BASE); if (b) b.click(); }
    } catch (e) {}
  }

  function paint() {
    cells.forEach((c, i) => {
      const on = (i + TEAM_BASE) === target;
      c.style.background  = on ? "rgba(0,255,80,.18)" : "transparent";
      c.style.borderColor = on ? "rgba(0,255,80,.95)" : "transparent";
    });
  }

  function startRefresh() {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
      if (window.__deflyKilled) { stopRefresh(); return; }
      if (hasJoined() || !onTeamScreen()) return;
      if (shown(loadingEl())) return;
      const s = window._deflySocket;
      if (s && s.readyState === WebSocket.OPEN) s.send(new Uint8Array([9]));
      if (target != null) {
        const idx = target - TEAM_BASE;
        if (!cfg.gate || available(idx)) fire(target);
      }
    }, cfg.refreshMs);
    window.__deflyTeamRefresh = refreshTimer;
  }

  function stopRefresh() {
    clearInterval(refreshTimer);
    if (window.__deflyTeamRefresh === refreshTimer) window.__deflyTeamRefresh = null;
    refreshTimer = null;
  }

  function build() {
    container = document.createElement("div");
    container.id = "defly-grab-overlay";
    container.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    document.body.appendChild(container);
    for (let i = 0; i < 8; i++) {
      const cell = document.createElement("div");
      cell.style.cssText = "position:fixed;pointer-events:auto;box-sizing:border-box;cursor:pointer;border:2px solid transparent;border-radius:6px;";
      cell.title = "Click to lock onto this team";
      cell.addEventListener("mouseenter", () => { if (target !== i + TEAM_BASE) cell.style.borderColor = "rgba(255,255,255,.7)"; });
      cell.addEventListener("mouseleave", () => { if (target !== i + TEAM_BASE) cell.style.borderColor = "transparent"; });
      cell.addEventListener("mousedown", (e) => {
        e.preventDefault(); e.stopPropagation();
        const id = i + TEAM_BASE;
        target = (target === id) ? null : id;
        if (target != null) { lastFire = 0; fire(target); }
        paint();
      });
      container.appendChild(cell);
      cells.push(cell);
    }
    built = true;
    startRefresh();
  }

  function teardown() {
    stopRefresh();
    container?.remove();
    container = null;
    cells.length = 0;
    target = null;
    built = false;
  }

  function position() {
    for (let i = 0; i < 8; i++) {
      const b = btnAt(i), c = cells[i];
      if (!c) continue;
      if (!b) { c.style.display = "none"; continue; }
      const r = b.getBoundingClientRect();
      if (r.width === 0) { c.style.display = "none"; continue; }
      c.style.display = "";
      c.style.left = r.left + "px"; c.style.top = r.top + "px";
      c.style.width = r.width + "px"; c.style.height = r.height + "px";
    }
    paint();
  }

  function controller() {
    if (window.__deflyKilled) { teardown(); return; }
    ctrlRaf = requestAnimationFrame(controller);
    window.__deflyCtrlRaf = ctrlRaf;
    if (hasJoined()) { window.__deflyJoined = true; if (built) teardown(); return; }
    if (onTeamScreen()) { if (!built) build(); position(); }
    else if (built) teardown();
  }
  ctrlRaf = requestAnimationFrame(controller);
  window.__deflyCtrlRaf = ctrlRaf;

  window.deflyStop = function () {
    window.__deflyKilled = true;
    if (window.__deflyCtrlRaf) cancelAnimationFrame(window.__deflyCtrlRaf);
    if (window.__deflyRaf) cancelAnimationFrame(window.__deflyRaf);
    window.__deflyCtrlRaf = null;
    clearInterval(window.__deflyTeamRefresh);
    window.__deflyTeamRefresh = null;
    document.getElementById("defly-grab-overlay")?.remove();
    console.log("%cDefly auto-grab KILLED (refresh the page to fully reset everything)", "color:#f55;font-weight:bold");
  };

  window.__deflyGrab = {
    cfg,
    get target() { return target; },
    set target(v) { target = v; paint(); },
    stop() { window.deflyStop(); }
  };

  console.log("%cDefly auto-grab ARMED", "color:#0f0;font-weight:bold;font-size:13px");
  console.log("Shows ONLY on the team-choice screen before you've entered a game. Once you join, it's gone until you refresh.");
  console.log("On that screen: click a box over a team to LOCK on - it grabs the instant that slot opens.");
  console.log("KILL IT NOW - paste:   deflyStop()");
  console.log("Aggressive join spam:  __deflyGrab.cfg.gate = false");
})();
