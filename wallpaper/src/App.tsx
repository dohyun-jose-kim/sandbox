import { useEffect, useRef, useState } from "react";
import { scenes, sceneOrder, setCtx, type Env } from "./engine";

const ICON: Record<string, string> = { gravity: "🪐", nebula: "✨", nightsky: "🌌" };
const LABEL: Record<string, string> = { gravity: "Gravity Well", nebula: "Stardust Nebula", nightsky: "Night Sky" };
const SUITE_VERSION = "v0.1.0";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const env = useRef<Env>({ W: 0, H: 0, ts: 0, dt: 0, h: 1 / 60, steps: 1, px: -1e5, py: -1e5, pact: false, reduce: false });
  const ptr = useRef({ x: -1e5, y: -1e5, active: false });
  const lastMove = useRef(-1e9);
  const raf = useRef(0);
  const prevTs = useRef(0);
  const activeId = useRef("gravity");

  const [sceneId, setSceneId] = useState("gravity");
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const active = scenes[sceneId];

  // ---- mount: canvas + loop + pointer ----
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    setCtx(ctx);
    env.current.reduce = reduce;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      env.current.W = W; env.current.H = H;
      scenes[activeId.current].build(env.current);
      if (reduce) drawStatic(); else kick();
    };
    const drawStatic = () => scenes[activeId.current].frame(env.current, true);
    const loop = (ts: number) => {
      raf.current = 0;
      let dt = prevTs.current ? (ts - prevTs.current) / 1000 : 1 / 60; prevTs.current = ts; if (dt > 0.05) dt = 0.05;
      const e = env.current;
      e.ts = ts; e.dt = dt; e.steps = Math.max(1, Math.min(4, Math.ceil(dt / (1 / 120)))); e.h = dt / e.steps;
      let act = ptr.current.active, px = ptr.current.x, py = ptr.current.y;
      if (ts - lastMove.current > 1400) { px = e.W * (0.5 + 0.32 * Math.cos(ts / 1000 * 0.45)); py = e.H * (0.46 + 0.24 * Math.sin(ts / 1000 * 0.66)); act = true; }
      e.px = px; e.py = py; e.pact = act;
      scenes[activeId.current].frame(e, false);
      if (!reduce) raf.current = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf.current && !reduce) raf.current = requestAnimationFrame(loop); };

    const onMove = (ev: PointerEvent) => {
      const t = ev.target as HTMLElement;
      if (t && t.closest && t.closest(".cfg,.gear,.switch")) return;
      ptr.current.x = ev.clientX; ptr.current.y = ev.clientY; ptr.current.active = true; lastMove.current = ev.timeStamp; kick();
    };
    const onLeave = () => { ptr.current.active = false; };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    resize();
    if (reduce) drawStatic(); else kick();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [reduce]);

  // ---- scene switch ----
  useEffect(() => {
    activeId.current = sceneId;
    document.documentElement.style.setProperty("--accent", active.accent);
    if (env.current.W) { active.build(env.current); prevTs.current = 0; if (reduce) active.frame(env.current, true); }
  }, [sceneId]);

  const changed = () => { if (reduce) active.frame(env.current, true); refresh(); };
  const setVal = (k: string, v: number, rebuild?: boolean) => { active.cfg[k] = v; if (rebuild) active.build(env.current); changed(); };

  const randomize = () => {
    const rr = (a: number, b: number, st: number) => Math.round((a + Math.random() * (b - a)) / st) * st;
    for (const c of active.controls as any[]) {
      if (c.k) active.cfg[c.k] = rr(c.min, c.max, c.step);
      else if (c.toggle) active.cfg[c.toggle] = Math.random() < 0.7;
      else if (c.seg) active.cfg[c.seg] = c.opts[Math.floor(Math.random() * c.opts.length)][0];
    }
    active.build(env.current); changed();
  };
  const reset = () => { Object.assign(active.cfg, active.D); active.build(env.current); changed(); };

  return (
    <>
      <canvas id="stage" ref={canvasRef} />

      <header className="hud">
        <div className="eyebrow">wallpaper · astronomy · {active.id} · suite {SUITE_VERSION}</div>
        <h1 className="title">{active.name} <em style={{ color: active.emColor }}>{active.em}</em></h1>
        <p className="sub" dangerouslySetInnerHTML={{ __html: active.sub }} />
      </header>

      <nav className="switch" role="group" aria-label="scene">
        {sceneOrder.map((id) => (
          <button key={id} aria-pressed={sceneId === id} onClick={() => setSceneId(id)}>{ICON[id]} {LABEL[id]}</button>
        ))}
      </nav>

      <div className="hint">move your cursor ✦ switch scenes above ✦ ⚙ to configure</div>

      <button className="gear" aria-label="Open configurator" aria-expanded={open} onClick={() => setOpen((o) => !o)}>⚙</button>

      <div className={"cfg" + (open ? " open" : "")} role="dialog" aria-modal="false" aria-label="Configurator">
        <div className="cfg-head">
          <h2>{active.cfgTitle}</h2>
          <button className="cfg-close" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="cfg-grid">
          {(active.controls as any[]).map((c, i) => {
            if (c.g) return <div className="group-label" key={i}>{c.g}</div>;
            if (c.k) return (
              <div className="ctl" key={i}>
                <div className="ctl-top"><label htmlFor={"x" + c.k}>{c.l}</label><span className="val">{c.f(active.cfg[c.k])}</span></div>
                <input id={"x" + c.k} type="range" min={c.min} max={c.max} step={c.step} value={active.cfg[c.k]} onChange={(e) => setVal(c.k, +e.target.value, c.rebuild)} />
              </div>
            );
            if (c.toggle) return (
              <div className="seg-toggle" key={i}>
                <button aria-pressed={!!active.cfg[c.toggle]} onClick={() => { active.cfg[c.toggle] = !active.cfg[c.toggle]; changed(); }}>{c.l} {active.cfg[c.toggle] ? "◯" : "✕"}</button>
              </div>
            );
            if (c.seg) return (
              <div className={"seg-toggle" + (c.full ? " full" : "")} key={i}>
                {c.opts.map(([v, label]: [string, string]) => (
                  <button key={v} aria-pressed={active.cfg[c.seg] === v} onClick={() => { active.cfg[c.seg] = v; if (c.rebuild) active.build(env.current); changed(); }}>{label}</button>
                ))}
              </div>
            );
            if (c.presets) return (
              <div className="preset-row full" key={i}>
                {Object.entries(c.presets).map(([name, arr]: [string, any]) => (
                  <button key={name} onClick={() => { for (let j = 0; j < arr.length; j += 2) active.cfg[arr[j]] = arr[j + 1]; changed(); }}>{name}</button>
                ))}
              </div>
            );
            return null;
          })}
        </div>
        <div className="cfg-foot">
          <p className="cfg-note">클라이언트 전용 · 서버 없음. ({active.info})</p>
          <div className="cfg-actions">
            <button onClick={randomize}>RANDOM</button>
            <button className="danger" onClick={reset}>RESET</button>
          </div>
        </div>
      </div>
    </>
  );
}
