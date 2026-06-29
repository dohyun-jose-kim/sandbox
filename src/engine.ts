// Astronomy engine — 3 canvas scenes (Gravity Well · Stardust Nebula · Night Sky).
// Framework-agnostic. React owns the canvas lifecycle + UI; scenes draw imperatively.
// Each scene owns a mutable `cfg`; the rAF loop reads it directly (no stale closures).

let ctx: CanvasRenderingContext2D = null as any;
export const setCtx = (c: CanvasRenderingContext2D) => { ctx = c; };

export type Env = {
  W: number; H: number; ts: number; dt: number; h: number; steps: number;
  px: number; py: number; pact: boolean; reduce: boolean;
};

export type Control =
  | { g: string }
  | { k: string; l: string; min: number; max: number; step: number; f: (v: number) => string | number; rebuild?: boolean }
  | { toggle: string; l: string }
  | { seg: string; full?: boolean; opts: [string, string][]; rebuild?: boolean }
  | { presets: Record<string, (string | number)[]> };

export type Scene = {
  id: string; accent: string; name: string; em: string; emColor: string; sub: string; cfgTitle: string;
  cfg: Record<string, any>; D: Record<string, any>; controls: Control[];
  build: (e: Env) => void; frame: (e: Env, stat: boolean) => void; info: string;
};

const TWO_PI = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * v); };

/* ===== SCENE 1 — GRAVITY WELL ===== */
function makeGravity(): Scene {
  const PAL: any = {
    deep:   { mh: 212, body: ["#ffe6b0", "#ff9a3c"], star: "220 90% 92%", top: "#0f1638", bot: "#04060f", neb: ["rgba(60,96,210,.18)", "rgba(120,70,190,.13)"] },
    nebula: { mh: 288, body: ["#ffd0f4", "#c14bd6"], star: "286 80% 92%", top: "#1a0f30", bot: "#070410", neb: ["rgba(150,60,205,.20)", "rgba(220,80,165,.14)"] },
    aurora: { mh: 160, body: ["#c6ffe6", "#36d39a"], star: "165 70% 90%", top: "#062722", bot: "#03100c", neb: ["rgba(40,205,150,.18)", "rgba(60,150,205,.12)"] },
  };
  const D = { radius: 250, pull: 38, tension: 280, friction: 12, density: 60, stars: 220, palette: "deep", mesh: true, starsOn: true, orbits: true };
  const cfg: any = { ...D, mass: 1 };
  let mesh: any[] = [], stars: any[] = [], planets: any[] = [], cols = 0, rows = 0, cx = 0, cy = 0, info = "";
  const self: any = { id: "gravity", accent: "#8db4ff", name: "Gravity", em: "Well", emColor: "#ffd9a0", cfgTitle: "Cosmos Configurator",
    sub: '커서가 <b>중력원</b>이 되어 시공간 격자를 휘게 하고, 별을 끌어당기고(중력 렌즈), 행성의 공전을 흔듭니다.',
    cfg, D };
  function build(e: Env) {
    const W = e.W, H = e.H; cx = W / 2; cy = H * 0.47; mesh = [];
    const sp = 78 - (cfg.density / 100) * 44; cols = Math.ceil(W / sp) + 1; rows = Math.ceil(H / sp) + 1;
    const ox = (W - (cols - 1) * sp) / 2, oy = (H - (rows - 1) * sp) / 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const bx = ox + c * sp, by = oy + r * sp; mesh.push({ bx, by, x: bx, y: by, vx: 0, vy: 0, g: 0 }); }
    stars = [];
    for (let i = 0; i < cfg.stars; i++) { const bx = Math.random() * W, by = Math.random() * H; stars.push({ bx, by, x: bx, y: by, vx: 0, vy: 0, r: rnd(0.5, 1.9), tw: rnd(0.6, 2.2), ph: rnd(0, TWO_PI) }); }
    planets = []; const base = Math.min(W, H);
    [{ rad: 0.14, sp: 0.34, sz: 5, hue: 30, ring: false, ecc: 0.92 }, { rad: 0.24, sp: -0.22, sz: 8, hue: 200, ring: true, ecc: 0.86 }, { rad: 0.36, sp: 0.15, sz: 6, hue: 280, ring: false, ecc: 0.95 }].forEach((d: any) => planets.push({ ...d, orbit: base * d.rad, ph: rnd(0, TWO_PI), ox: 0, oy: 0, vx: 0, vy: 0 }));
    info = mesh.length + " nodes · " + stars.length + " stars"; self.info = info;
  }
  function bg(e: Env, s: any) { const g = ctx.createLinearGradient(0, 0, 0, e.H); g.addColorStop(0, s.top); g.addColorStop(1, s.bot); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, e.W, e.H); const blob = (bx: number, by: number, rr: number, col: string) => { const rg = ctx.createRadialGradient(bx, by, 0, bx, by, rr); rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.fillRect(0, 0, e.W, e.H); }; blob(e.W * 0.26, e.H * 0.28, Math.max(e.W, e.H) * 0.5, s.neb[0]); blob(e.W * 0.78, e.H * 0.66, Math.max(e.W, e.H) * 0.45, s.neb[1]); }
  function link(a: any, b: any, hue: number) { const g = Math.max(a.g, b.g); ctx.globalAlpha = 0.08 + g * 0.5; ctx.strokeStyle = "hsl(" + hue + " 78% " + (52 + g * 28) + "%)"; ctx.lineWidth = 1 + g * 1.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  function body(x: number, y: number, rr: number, c2: string[]) { ctx.globalCompositeOperation = "lighter"; const rg = ctx.createRadialGradient(x, y, 0, x, y, rr * 2.4); rg.addColorStop(0, c2[0]); rg.addColorStop(0.28, c2[1]); rg.addColorStop(0.6, "hsl(30 80% 40% / .25)"); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = 1; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, rr * 2.4, 0, TWO_PI); ctx.fill(); ctx.fillStyle = c2[0]; ctx.beginPath(); ctx.arc(x, y, rr * 0.5, 0, TWO_PI); ctx.fill(); }
  function frame(e: Env, stat: boolean) {
    const s = PAL[cfg.palette], K = cfg.tension, F = cfg.friction, M = cfg.mass, R = cfg.radius, h = e.h, steps = e.steps;
    const act = stat ? false : e.pact, px = e.px, py = e.py; bg(e, s);
    if (cfg.mesh) {
      for (const p of mesh) {
        let tx = p.bx, ty = p.by; p.g = 0;
        if (act) { const dx = px - p.bx, dy = py - p.by, d = Math.hypot(dx, dy); if (d < R) { const f = 1 - d / R; p.g = f; const k = (cfg.pull * f) / (d || 1); tx = p.bx + dx * k; ty = p.by + dy * k; } }
        if (stat) { p.x = p.bx; p.y = p.by; } else for (let i = 0; i < steps; i++) { const ax = (-K * (p.x - tx) - F * p.vx) / M, ay = (-K * (p.y - ty) - F * p.vy) / M; p.vx += ax * h; p.vy += ay * h; p.x += p.vx * h; p.y += p.vy * h; }
      }
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; const idx = (r: number, c: number) => r * cols + c;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = mesh[idx(r, c)]; if (c < cols - 1) link(a, mesh[idx(r, c + 1)], s.mh); if (r < rows - 1) link(a, mesh[idx(r + 1, c)], s.mh); }
    }
    if (cfg.starsOn) {
      ctx.globalCompositeOperation = "lighter"; const spd = cfg.pull * 0.45;
      for (const st of stars) {
        let tx = st.bx, ty = st.by;
        if (act) { const dx = px - st.bx, dy = py - st.by, d = Math.hypot(dx, dy); if (d < R * 1.2) { const f = 1 - d / (R * 1.2); const k = (spd * f) / (d || 1); tx = st.bx + dx * k; ty = st.by + dy * k; } }
        if (stat) { st.x = st.bx; st.y = st.by; } else for (let i = 0; i < steps; i++) { const ax = (-K * 0.7 * (st.x - tx) - F * st.vx) / M, ay = (-K * 0.7 * (st.y - ty) - F * st.vy) / M; st.vx += ax * h; st.vy += ay * h; st.x += st.vx * h; st.y += st.vy * h; }
        const tw = stat ? 0.8 : 0.55 + 0.45 * Math.sin(e.ts / 1000 * st.tw + st.ph);
        ctx.globalAlpha = 0.35 + 0.6 * tw; ctx.fillStyle = "hsl(" + s.star + ")"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (1 + tw * 0.4), 0, TWO_PI); ctx.fill();
      }
    }
    if (cfg.orbits) {
      const t = e.ts / 1000;
      for (const pl of planets) { const a = pl.ph + t * pl.sp; const wx = cx + Math.cos(a) * pl.orbit, wy = cy + Math.sin(a) * pl.orbit * pl.ecc; let tox = 0, toy = 0; if (act) { const dx = px - wx, dy = py - wy, d = Math.hypot(dx, dy); if (d < R) { const f = 1 - d / R; const k = (cfg.pull * 1.4 * f) / (d || 1); tox = dx * k; toy = dy * k; } } if (stat) { pl.ox = 0; pl.oy = 0; } else for (let i = 0; i < steps; i++) { const ax = (-K * (pl.ox - tox) - F * pl.vx) / M, ay = (-K * (pl.oy - toy) - F * pl.vy) / M; pl.vx += ax * h; pl.vy += ay * h; pl.ox += pl.vx * h; pl.oy += pl.vy * h; } pl.wx = wx + pl.ox; pl.wy = wy + pl.oy; }
      ctx.globalCompositeOperation = "source-over";
      for (const pl of planets) { ctx.strokeStyle = "rgba(150,175,235,.10)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, pl.orbit, pl.orbit * pl.ecc, 0, 0, TWO_PI); ctx.stroke(); }
      body(cx, cy, Math.min(e.W, e.H) * 0.07, s.body);
      ctx.globalCompositeOperation = "lighter";
      for (const pl of planets) { const rg = ctx.createRadialGradient(pl.wx, pl.wy, 0, pl.wx, pl.wy, pl.sz * 3.2); rg.addColorStop(0, "hsl(" + pl.hue + " 90% 75%)"); rg.addColorStop(0.5, "hsl(" + pl.hue + " 85% 55% / .5)"); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pl.wx, pl.wy, pl.sz * 3.2, 0, TWO_PI); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = "hsl(" + pl.hue + " 80% 82%)"; ctx.beginPath(); ctx.arc(pl.wx, pl.wy, pl.sz, 0, TWO_PI); ctx.fill(); if (pl.ring) { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = "hsl(" + pl.hue + " 70% 78% / .6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(pl.wx, pl.wy, pl.sz * 2.1, pl.sz * 0.7, -0.5, 0, TWO_PI); ctx.stroke(); ctx.globalCompositeOperation = "lighter"; } }
    }
    if (act) { ctx.globalCompositeOperation = "lighter"; const rg = ctx.createRadialGradient(px, py, 0, px, py, R * 0.5); rg.addColorStop(0, "hsl(" + s.mh + " 90% 70% / .14)"); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, R * 0.5, 0, TWO_PI); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  self.build = build; self.frame = frame; Object.defineProperty(self, "info", { get: () => info, set: (v) => { info = v; } });
  self.controls = [
    { g: "gravity · 중력 (커서)" }, { k: "radius", l: "reach · 반경", min: 100, max: 520, step: 10, f: (v: number) => v + "px" }, { k: "pull", l: "pull · 끌림", min: 0, max: 90, step: 2, f: (v: number) => v },
    { g: "spring · 스프링 물리" }, { k: "tension", l: "tension · 탄성", min: 60, max: 500, step: 10, f: (v: number) => v }, { k: "friction", l: "friction · 감쇠", min: 4, max: 44, step: 1, f: (v: number) => v },
    { presets: { "JOSH 300/10": ["tension", 300, "friction", 10], "ELASTIC": ["tension", 420, "friction", 8], "CALM": ["tension", 150, "friction", 22] } },
    { g: "field · 격자 & 별" }, { k: "density", l: "mesh · 격자밀도", min: 35, max: 150, step: 5, f: (v: number) => (v / 100).toFixed(2) + "×", rebuild: true }, { k: "stars", l: "stars · 별", min: 0, max: 480, step: 20, f: (v: number) => v, rebuild: true },
    { g: "layers · 레이어" }, { toggle: "mesh", l: "mesh" }, { toggle: "starsOn", l: "stars" }, { toggle: "orbits", l: "orbits" },
    { g: "scene · 팔레트" }, { seg: "palette", full: true, opts: [["deep", "deep"], ["nebula", "nebula"], ["aurora", "aurora"]] },
  ];
  return self as Scene;
}

/* ===== SCENE 2 — STARDUST NEBULA ===== */
function makeNebula(): Scene {
  const PAL: any = {
    nebula: { hue: 288, sat: 80, top: "#180b2e", bot: "#070410", neb: ["rgba(150,60,205,.20)", "rgba(220,80,165,.15)"], star: "286 80% 92%" },
    deep:   { hue: 212, sat: 78, top: "#0f1638", bot: "#04060f", neb: ["rgba(60,96,210,.18)", "rgba(120,70,190,.13)"], star: "220 90% 92%" },
    aurora: { hue: 160, sat: 72, top: "#062722", bot: "#03100c", neb: ["rgba(40,205,150,.18)", "rgba(60,150,205,.12)"], star: "165 70% 90%" },
  };
  const D = { radius: 280, pull: 50, swirl: 46, tension: 90, friction: 9, count: 800, spread: 100, drift: 45, palette: "nebula" };
  const cfg: any = { ...D };
  let parts: any[] = [], bgStars: any[] = [], info = "";
  const self: any = { id: "nebula", accent: "#c9a0ff", name: "Stardust", em: "Nebula", emColor: "#ff9ad6", cfgTitle: "Nebula Configurator",
    sub: '발광하는 성운 가스가 커서로 <b>끌려오며 소용돌이</b>치고, 스프링으로 제자리로 가라앉습니다.', cfg, D };
  function build(e: Env) {
    const W = e.W, H = e.H, s = PAL[cfg.palette]; parts = [];
    const clusters = [{ x: 0.5, y: 0.48, w: 0.5 }, { x: 0.36, y: 0.4, w: 0.28 }, { x: 0.66, y: 0.58, w: 0.32 }];
    const sig = (cfg.spread / 100) * Math.min(W, H) * 0.26; let ws = 0; for (const c of clusters) ws += c.w;
    for (let i = 0; i < cfg.count; i++) { let pk = Math.random() * ws, cl = clusters[0]; for (const c of clusters) { pk -= c.w; if (pk <= 0) { cl = c; break; } } const hx = cl.x * W + gauss() * sig, hy = cl.y * H + gauss() * sig * 0.8; parts.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, hue: s.hue + rnd(-38, 58), size: rnd(0.7, 2.6), a: rnd(0.25, 0.8), ph: rnd(0, TWO_PI), ds: rnd(0.3, 1.1) }); }
    bgStars = []; for (let i = 0; i < 120; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.4, 1.4), tw: rnd(0.6, 2), ph: rnd(0, TWO_PI) });
    info = parts.length + " particles"; self.info = info;
  }
  function bg(e: Env, s: any) { const g = ctx.createLinearGradient(0, 0, 0, e.H); g.addColorStop(0, s.top); g.addColorStop(1, s.bot); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, e.W, e.H); const blob = (bx: number, by: number, rr: number, col: string) => { const rg = ctx.createRadialGradient(bx, by, 0, bx, by, rr); rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.fillRect(0, 0, e.W, e.H); }; blob(e.W * 0.4, e.H * 0.42, Math.max(e.W, e.H) * 0.5, s.neb[0]); blob(e.W * 0.66, e.H * 0.6, Math.max(e.W, e.H) * 0.42, s.neb[1]); }
  function frame(e: Env, stat: boolean) {
    const s = PAL[cfg.palette], K = cfg.tension, F = cfg.friction, R = cfg.radius, h = e.h, steps = e.steps;
    const PULL = cfg.pull * 60, SWIRL = cfg.swirl * 55, DRIFT = cfg.drift / 100, t = e.ts / 1000;
    const act = stat ? false : e.pact, px = e.px, py = e.py; bg(e, s);
    ctx.globalCompositeOperation = "lighter";
    for (const st of bgStars) { const tw = stat ? 0.8 : 0.5 + 0.5 * Math.sin(t * st.tw + st.ph); ctx.globalAlpha = 0.3 + 0.5 * tw; ctx.fillStyle = "hsl(" + s.star + ")"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TWO_PI); ctx.fill(); }
    for (const p of parts) {
      const hx = p.hx + (DRIFT && !stat ? Math.cos(t * p.ds + p.ph) * 14 * DRIFT : 0), hy = p.hy + (DRIFT && !stat ? Math.sin(t * p.ds * 0.9 + p.ph) * 14 * DRIFT : 0);
      let glow = 0;
      if (stat) { p.x = p.hx; p.y = p.hy; } else for (let i = 0; i < steps; i++) { let ax = -K * (p.x - hx) - F * p.vx, ay = -K * (p.y - hy) - F * p.vy; if (act) { const dx = px - p.x, dy = py - p.y, d = Math.hypot(dx, dy); if (d < R) { const f = 1 - d / R, inv = 1 / (d || 1); glow = Math.max(glow, f); ax += dx * inv * PULL * f; ay += dy * inv * PULL * f; ax += -dy * inv * SWIRL * f; ay += dx * inv * SWIRL * f; } } p.vx += ax * h; p.vy += ay * h; p.x += p.vx * h; p.y += p.vy * h; }
      ctx.globalAlpha = Math.min(1, p.a * (0.7 + glow * 0.9)); ctx.fillStyle = "hsl(" + p.hue + " " + s.sat + "% " + (60 + glow * 22) + "%)"; const sz = p.size * (1 + glow * 1.1); ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, TWO_PI); ctx.fill();
    }
    if (act) { const rg = ctx.createRadialGradient(px, py, 0, px, py, R * 0.5); rg.addColorStop(0, "hsl(" + s.hue + " 90% 72% / .12)"); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, R * 0.5, 0, TWO_PI); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  self.build = build; self.frame = frame; Object.defineProperty(self, "info", { get: () => info, set: (v) => { info = v; } });
  self.controls = [
    { g: "gravity · 중력 (커서)" }, { k: "radius", l: "reach · 반경", min: 100, max: 560, step: 10, f: (v: number) => v + "px" }, { k: "pull", l: "pull · 끌림", min: 0, max: 100, step: 2, f: (v: number) => v }, { k: "swirl", l: "swirl · 소용돌이", min: 0, max: 100, step: 2, f: (v: number) => v },
    { g: "spring · 복원" }, { k: "tension", l: "tension · 복원", min: 20, max: 300, step: 10, f: (v: number) => v }, { k: "friction", l: "friction · 감쇠", min: 2, max: 30, step: 1, f: (v: number) => v },
    { presets: { "CALM": ["tension", 120, "friction", 14], "SWIRL": ["tension", 70, "friction", 6], "SNAP": ["tension", 240, "friction", 16] } },
    { g: "field · 입자" }, { k: "count", l: "particles · 입자", min: 200, max: 1600, step: 50, f: (v: number) => v, rebuild: true }, { k: "spread", l: "spread · 퍼짐", min: 40, max: 160, step: 5, f: (v: number) => (v / 100).toFixed(2) + "×", rebuild: true }, { k: "drift", l: "drift · 표류", min: 0, max: 100, step: 5, f: (v: number) => v + "%" },
    { g: "scene · 팔레트" }, { seg: "palette", full: true, opts: [["nebula", "nebula"], ["deep", "deep"], ["aurora", "aurora"]], rebuild: true },
  ];
  return self as Scene;
}

/* ===== SCENE 3 — NIGHT SKY ===== */
function makeNightSky(): Scene {
  const PAL: any = {
    midnight: { top: "#0a1430", bot: "#02030a", glow: "rgba(70,110,200,.18)", line: 205, star: "210 60% 96%" },
    twilight: { top: "#241640", bot: "#0a0816", glow: "rgba(190,90,150,.26)", line: 290, star: "300 50% 96%" },
    dawn:     { top: "#0c2436", bot: "#04101a", glow: "rgba(90,190,180,.24)", line: 165, star: "170 50% 96%" },
  };
  const D = { reach: 220, link: 110, pull: 18, tension: 120, friction: 11, stars: 260, clouds: 60, palette: "midnight" };
  const cfg: any = { ...D };
  let stars: any[] = [], clouds: any[] = [], info = "";
  const self: any = { id: "nightsky", accent: "#9fe8ff", name: "Night", em: "Sky", emColor: "#fff0b0", cfgTitle: "Night Sky Configurator",
    sub: '밤하늘의 별이 커서로 끌려와 <b>실시간 별자리(연결선)</b>를 그리고, 구름은 커서를 피해 갈라집니다.', cfg, D };
  function build(e: Env) {
    const W = e.W, H = e.H; stars = [];
    for (let i = 0; i < cfg.stars; i++) { const bx = Math.random() * W, by = Math.random() * (H * 0.92); stars.push({ bx, by, x: bx, y: by, vx: 0, vy: 0, r: rnd(0.5, 2), tw: rnd(0.5, 2), ph: rnd(0, TWO_PI), br: rnd(0.5, 1), _tw: 0.8 }); }
    clouds = [];
    for (let i = 0; i < 5; i++) { const w = rnd(0.26, 0.5) * W; clouds.push({ bx: rnd(0, W), by: rnd(0.45, 0.92) * H, w, hh: w * rnd(0.26, 0.4), dx: rnd(6, 16) * (Math.random() < 0.5 ? 1 : -1), ph: rnd(0, TWO_PI), ox: 0, oy: 0, vx: 0, vy: 0, a: rnd(0.05, 0.12) }); }
    info = stars.length + " stars · " + clouds.length + " clouds"; self.info = info;
  }
  function bg(e: Env, s: any) { const g = ctx.createLinearGradient(0, 0, 0, e.H); g.addColorStop(0, s.top); g.addColorStop(1, s.bot); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, e.W, e.H); const rg = ctx.createRadialGradient(e.W * 0.5, e.H * 1.02, 0, e.W * 0.5, e.H * 1.02, e.H * 0.7); rg.addColorStop(0, s.glow); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.fillRect(0, 0, e.W, e.H); }
  function frame(e: Env, stat: boolean) {
    const s = PAL[cfg.palette], K = cfg.tension, F = cfg.friction, R = cfg.reach, h = e.h, steps = e.steps, t = e.ts / 1000;
    const act = stat ? false : e.pact, px = e.px, py = e.py; bg(e, s);
    for (const cl of clouds) {
      const baseX = stat ? cl.bx : (((cl.bx + cl.dx * t) % (e.W + cl.w)) + (e.W + cl.w)) % (e.W + cl.w);
      let tox = 0, toy = 0;
      if (act) { const dx = baseX - px, dy = cl.by - py, d = Math.hypot(dx, dy); if (d < R * 1.4) { const f = 1 - d / (R * 1.4); const k = (40 * f) / (d || 1); tox = dx * k; toy = dy * k; } }
      if (stat) { cl.ox = 0; cl.oy = 0; } else for (let i = 0; i < steps; i++) { const ax = (-K * 0.4 * (cl.ox - tox) - F * cl.vx), ay = (-K * 0.4 * (cl.oy - toy) - F * cl.vy); cl.vx += ax * h; cl.vy += ay * h; cl.ox += cl.vx * h; cl.oy += cl.vy * h; }
      const x = baseX + cl.ox, y = cl.by + cl.oy, ca = cl.a * cfg.clouds / 100; if (ca <= 0.001) continue;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1; ctx.save(); ctx.translate(x, y); ctx.scale(1, cl.hh / cl.w);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, cl.w); rg.addColorStop(0, "hsl(" + s.line + " 40% 80% / " + ca + ")"); rg.addColorStop(0.6, "hsl(" + s.line + " 40% 70% / " + (ca * 0.4) + ")"); rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, cl.w, 0, TWO_PI); ctx.fill(); ctx.restore();
    }
    const near: any[] = []; ctx.globalCompositeOperation = "lighter";
    for (const st of stars) {
      let tx = st.bx, ty = st.by, inR = false;
      if (act) { const dx = px - st.bx, dy = py - st.by, d = Math.hypot(dx, dy); if (d < R) { inR = true; const f = 1 - d / R; const k = (cfg.pull * f) / (d || 1); tx = st.bx + dx * k; ty = st.by + dy * k; } }
      if (stat) { st.x = st.bx; st.y = st.by; } else for (let i = 0; i < steps; i++) { const ax = (-K * (st.x - tx) - F * st.vx), ay = (-K * (st.y - ty) - F * st.vy); st.vx += ax * h; st.vy += ay * h; st.x += st.vx * h; st.y += st.vy * h; }
      st._tw = stat ? 0.85 : 0.5 + 0.5 * Math.sin(t * st.tw + st.ph);
      if (inR) near.push(st);
    }
    if (act && near.length) {
      near.sort((a, b) => ((a.x - px) ** 2 + (a.y - py) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2));
      const k = near.slice(0, 16); ctx.lineCap = "round";
      for (let i = 0; i < Math.min(6, k.length); i++) { const st = k[i]; const d = Math.hypot(st.x - px, st.y - py); ctx.globalAlpha = (1 - d / R) * 0.7; ctx.strokeStyle = "hsl(" + s.line + " 80% 78%)"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(st.x, st.y); ctx.stroke(); }
      const LD = cfg.link;
      for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const a = k[i], b = k[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < LD) { ctx.globalAlpha = (1 - d / LD) * 0.5; ctx.strokeStyle = "hsl(" + s.line + " 75% 72%)"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
    }
    const nearSet = new Set(near);
    for (const st of stars) { const tw = st._tw, big = nearSet.has(st); ctx.globalAlpha = (0.3 + 0.6 * tw) * (0.5 + st.br * 0.5); ctx.fillStyle = "hsl(" + s.star + ")"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (1 + tw * 0.4) * (big ? 1.7 : 1), 0, TWO_PI); ctx.fill(); if (big) { ctx.globalAlpha = 0.5 * tw; ctx.beginPath(); ctx.arc(st.x, st.y, st.r * 3.5, 0, TWO_PI); ctx.fillStyle = "hsl(" + s.line + " 80% 75% / .5)"; ctx.fill(); } }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }
  self.build = build; self.frame = frame; Object.defineProperty(self, "info", { get: () => info, set: (v) => { info = v; } });
  self.controls = [
    { g: "constellation · 별자리 (커서)" }, { k: "reach", l: "reach · 반경", min: 100, max: 480, step: 10, f: (v: number) => v + "px" }, { k: "link", l: "link · 연결거리", min: 50, max: 220, step: 5, f: (v: number) => v + "px" }, { k: "pull", l: "pull · 끌림", min: 0, max: 60, step: 2, f: (v: number) => v },
    { g: "spring · 복원" }, { k: "tension", l: "tension · 복원", min: 40, max: 300, step: 10, f: (v: number) => v }, { k: "friction", l: "friction · 감쇠", min: 4, max: 30, step: 1, f: (v: number) => v },
    { presets: { "CALM": ["tension", 90, "friction", 16], "TIGHT": ["tension", 220, "friction", 14], "FLOATY": ["tension", 60, "friction", 8] } },
    { g: "sky · 하늘" }, { k: "stars", l: "stars · 별", min: 80, max: 600, step: 20, f: (v: number) => v, rebuild: true }, { k: "clouds", l: "clouds · 구름", min: 0, max: 100, step: 5, f: (v: number) => v + "%" },
    { g: "scene · 팔레트" }, { seg: "palette", full: true, opts: [["midnight", "midnight"], ["twilight", "twilight"], ["dawn", "dawn"]] },
  ];
  return self as Scene;
}

export const scenes: Record<string, Scene> = { gravity: makeGravity(), nebula: makeNebula(), nightsky: makeNightSky() };
export const sceneOrder = ["gravity", "nebula", "nightsky"];
