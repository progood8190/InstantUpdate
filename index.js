(() => {
  try { if (window.__deflyGrab) window.__deflyGrab.stop(); } catch (e) {}
  clearInterval(window.__deflyTeamRefresh);
  if (window.__deflyRaf) cancelAnimationFrame(window.__deflyRaf);
  document.getElementById("defly-grab-overlay")?.remove();

  const TEAM_BASE = 2;
  const JOIN_DEBOUNCE_MS = 120;
  const cfg = {
    refreshMs: 1,
    gate: true,
    cooldown: 25
  };

  let target = null;
  let lastFire = 0;
  let wasOpen = false;
  let hiddenSince = 0;
  let refreshTimer = null;
  let rafId = null;
  let container = null;
  const cells = [];

  const $popup   = () => document.getElementById("choose-team-popup");
  const $loading = () => document.getElementById("team-choice-loading");
  const $row     = () => document.getElementById("team-choice-buttons");

  function shown(el) {
    if (!el) return false;
    if (typeof el.checkVisibility === "function")
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
    if (el.getClientRects().length === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && parseFloat(s.opacity || "1") !== 0;
  }

  const panelOpen = () => shown($popup());
  const loading   = () => shown($loading());

  const btnAt = (i) => { const r = $row(); if (!r) return null; const td = r.children[i]; return td ? td.querySelector("button") : null; };
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

  function stopAll(reason) {
    clearInterval(refreshTimer);
    if (window.__deflyTeamRefresh === refreshTimer) window.__deflyTeamRefresh = null;
    cancelAnimationFrame(rafId);
    container?.remove();
    target = null;
    console.log("%cDefly auto-grab OFF" + (reason ? " (" + reason + ")" : ""), "color:#f55;font-weight:bold");
  }

  refreshTimer = setInterval(() => {
    if (!panelOpen() || loading()) return;
    const s = window._deflySocket;
    if (s && s.readyState === WebSocket.OPEN) s.send(new Uint8Array([9]));

    if (target != null) {
      const idx = target - TEAM_BASE;
      if (!cfg.gate || available(idx)) fire(target);
    }
  }, cfg.refreshMs);
  window.__deflyTeamRefresh = refreshTimer;

  container = document.createElement("div");
  container.id = "defly-grab-overlay";
  container.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(container);

  for (let i = 0; i < 8; i++) {
    const cell = document.createElement("div");
    cell.style.cssText =
      "position:fixed;pointer-events:auto;box-sizing:border-box;cursor:pointer;" +
      "border:2px solid transparent;border-radius:6px;";
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

  function paint() {
    cells.forEach((c, i) => {
      const on = (i + TEAM_BASE) === target;
      c.style.background  = on ? "rgba(0,255,80,.18)" : "transparent";
      c.style.borderColor = on ? "rgba(0,255,80,.95)" : "transparent";
    });
  }

  function tick() {
    window.__deflyRaf = rafId = requestAnimationFrame(tick);

    if (!panelOpen()) {
      if (!wasOpen) { container.style.display = "none"; target = null; return; }
      if (hiddenSince === 0) hiddenSince = performance.now();
      container.style.display = "none";
      if (performance.now() - hiddenSince >= JOIN_DEBOUNCE_MS) stopAll("joined a team");
      return;
    }

    wasOpen = true;
    hiddenSince = 0;
    container.style.display = "";
    for (let i = 0; i < 8; i++) {
      const b = btnAt(i);
      const c = cells[i];
      if (!b) { c.style.display = "none"; continue; }
      const r = b.getBoundingClientRect();
      if (r.width === 0) { c.style.display = "none"; continue; }
      c.style.display = "";
      c.style.left   = r.left + "px";
      c.style.top    = r.top + "px";
      c.style.width  = r.width + "px";
      c.style.height = r.height + "px";
    }
    paint();
  }
  window.__deflyRaf = rafId = requestAnimationFrame(tick);

  window.deflyStop = function () {
    clearInterval(window.__deflyTeamRefresh);
    window.__deflyTeamRefresh = null;
    if (window.__deflyRaf) cancelAnimationFrame(window.__deflyRaf);
    document.getElementById("defly-grab-overlay")?.remove();
    console.log("%cDefly auto-grab OFF (killed)", "color:#f55;font-weight:bold");
  };

  window.__deflyGrab = {
    cfg,
    get target() { return target; },
    set target(v) { target = v; paint(); },
    stop() { stopAll(); }
  };

  console.log("%cDefly auto-grab ON", "color:#0f0;font-weight:bold;font-size:13px");
  console.log("Click the box over a team to LOCK onto it - it grabs the moment that slot opens.");
  console.log("Click again / pick another to cancel or switch.");
  console.log("KILL IT ANYTIME - paste:   deflyStop()");
  console.log("Stops automatically once you join a team.    Aggressive mode:  __deflyGrab.cfg.gate = false");
})();
