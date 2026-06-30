(() => {
  try { if (window.__deflyGrab) window.__deflyGrab.stop(); } catch (e) {}
  clearInterval(window.__deflyTeamRefresh);

  const TEAM_BASE = 2;
  const cfg = {
    refreshMs: 1,
    gate: true,
    cooldown: 25
  };

  let target = null;
  let lastFire = 0;
  let refreshTimer = null;
  let rafId = null;
  let container = null;
  const cells = [];

  const $popup   = () => document.getElementById("choose-team-popup");
  const $loading = () => document.getElementById("team-choice-loading");
  const $row     = () => document.getElementById("team-choice-buttons");

  const popupOpen = () => { const p = $popup();   return !!p && getComputedStyle(p).display !== "none"; };
  const loading   = () => { const l = $loading(); return !!l && getComputedStyle(l).display !== "none"; };

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

  refreshTimer = setInterval(() => {
    if (!popupOpen() || loading()) return;
    const s = window._deflySocket;
    if (s && s.readyState === WebSocket.OPEN) s.send(new Uint8Array([9]));

    if (target != null) {
      const idx = target - TEAM_BASE;
      if (!cfg.gate || available(idx)) fire(target);
    }
  }, cfg.refreshMs);
  window.__deflyTeamRefresh = refreshTimer;

  container = document.createElement("div");
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
    rafId = requestAnimationFrame(tick);
    if (!popupOpen()) { container.style.display = "none"; target = null; return; }
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
  rafId = requestAnimationFrame(tick);

  window.__deflyGrab = {
    cfg,
    get target() { return target; },
    set target(v) { target = v; paint(); },
    stop() {
      clearInterval(refreshTimer);
      if (window.__deflyTeamRefresh === refreshTimer) window.__deflyTeamRefresh = null;
      cancelAnimationFrame(rafId);
      container?.remove();
      target = null;
      console.log("%cDefly auto-grab OFF", "color:#f55");
    }
  };

  console.log("%cDefly auto-grab ON", "color:#0f0;font-weight:bold;font-size:13px");
  console.log("Click the box over a team to LOCK onto it - it grabs the moment that slot opens.");
  console.log("Click again / pick another to cancel or switch.    Stop all:  __deflyGrab.stop()");
  console.log("Aggressive mode (spam the join until you're in):  __deflyGrab.cfg.gate = false");
})();
