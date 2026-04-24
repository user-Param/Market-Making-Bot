import {
  useState, useEffect, useRef, useCallback,
  forwardRef, useImperativeHandle,
} from "react";

// ─── Config ────────────────────────────────────────────────────────────────────
const EXCHANGES  = ["Binance", "Bybit", "Kraken", "Coinbase", "OKX"];
const EX_SHORT   = ["BIN",     "BYB",   "KRK",    "CBP",      "OKX"];
const N          = EXCHANGES.length;
const MAX_HIST   = 120;          // items kept in history ring buffer
const HIST_SHOW  = 22;          // items rendered in DOM
const TICK_MS    = 100;
const DEMO_TPT   = 28;          // demo trades per tick  (~280 tps visible)
const DECAY      = 0.87;        // heat decay per RAF frame (~60 fps)
const HEAT_BOOST = 0.55;        // heat added per trade hit
const STATE_HZ   = 100;         // React state refresh interval (ms)

const SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];

// ─── Colour helpers ────────────────────────────────────────────────────────────
// heat 0→1  :  dark  →  amber  →  bright green/white
function heatColor(h) {
  if (h <= 0) return "#0c0e12";
  if (h < 0.45) {
    const t  = h / 0.45;
    const r  = Math.round(12  + (255 - 12)  * t);
    const g  = Math.round(14  + (130 - 14)  * t);
    const b  = Math.round(18  + (0   - 18)  * t);
    return `rgb(${r},${g},${b})`;
  }
  const t  = (h - 0.45) / 0.55;
  const r  = Math.round(220 + (0   - 255) * t);
  const g  = Math.round(130 + (240 - 130) * t);
  const b  = Math.round(0   + (140 - 0)   * t);
  return `rgb(${r},${g},${b})`;
}
function heatTextColor(h) {
  return h > 0.45 ? "rgba(0,0,0,0.85)" : h > 0.12 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.22)";
}
function heatBorderAlpha(h) {
  return h > 0.2 ? 0.35 : 0.06;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt2  = (n) => n.toFixed(2);
const fmt4  = (n) => n.toFixed(4);
const fmtK  = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}k` : String(n);
const pad2  = (n) => String(n).padStart(2, "0");
const tsLabel = (d) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,"0").slice(0,2)}`;

// ─── Demo trade factory ────────────────────────────────────────────────────────
function makeDemoTrade(mid) {
  let bi = Math.floor(Math.random() * N);
  let si = Math.floor(Math.random() * N);
  while (si === bi) si = Math.floor(Math.random() * N);
  const sym    = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const qty    = +(Math.random() * 2.5 + 0.05).toFixed(3);
  const buyP   = mid + (Math.random() - 0.5) * 80;
  const edge   = Math.random() * 4 + 0.05;
  const sellP  = buyP + edge;
  const profit = +((sellP - buyP) * qty).toFixed(5);
  return {
    buyIdx:   bi,
    sellIdx:  si,
    symbol:   sym,
    qty,
    buyPrice:  +buyP.toFixed(2),
    sellPrice: +sellP.toFixed(2),
    profit,
  };
}

// ─── Canvas grid draw ──────────────────────────────────────────────────────────
function drawGrid(canvas, heat, counts) {
  if (!canvas || !canvas.width || !canvas.height) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#080a0d";
  ctx.fillRect(0, 0, W, H);

  const CW = W / N, CH = H / N;
  const PAD = 2.5;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = c * CW + PAD, y = r * CH + PAD;
      const w = CW - PAD * 2, h = CH - PAD * 2;

      if (r === c) {
        // diagonal — same exchange, not tradeable
        ctx.fillStyle = "rgba(255,255,255,0.018)";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.font = `${Math.min(w, h) * 0.28}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("×", c * CW + CW / 2, r * CH + CH / 2);
        continue;
      }

      const hv = heat[r][c];

      // Cell fill
      ctx.fillStyle = heatColor(hv);
      ctx.fillRect(x, y, w, h);

      // Border
      ctx.strokeStyle = `rgba(255,255,255,${heatBorderAlpha(hv)})`;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(x, y, w, h);

      // Count label
      const cnt = counts[r][c];
      if (cnt > 0) {
        const label = fmtK(cnt);
        const fs = Math.max(8, Math.min(CW, CH) * 0.22);
        ctx.fillStyle = heatTextColor(hv);
        ctx.font = `bold ${fs}px "Courier New", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, c * CW + CW / 2, r * CH + CH / 2);
      }
    }
  }

  // Row/col separator lines (subtle)
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(i * CW, 0); ctx.lineTo(i * CW, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CH); ctx.lineTo(W, i * CH); ctx.stroke();
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ExLabel({ label, sub, color, subColor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color, fontSize: 9, fontWeight: "bold", letterSpacing: 0.8, lineHeight: 1.2 }}>{label}</span>
      <span style={{ color: subColor, fontSize: 7, letterSpacing: 0.3 }}>{sub}</span>
    </div>
  );
}

function HistRow({ trade }) {
  const pos = trade.profit >= 0;
  return (
    <div style={{
      padding: "4px 10px 4px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      background: pos ? "rgba(0,220,110,0.025)" : "rgba(255,50,60,0.025)",
    }}>
      {/* Row 1: time + pnl */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
        <span style={{ color: "rgba(110,130,160,0.65)", fontSize: 8.5, fontFamily: "monospace" }}>
          {tsLabel(new Date(trade.ts))}
        </span>
        <span style={{
          color: pos ? "#00e676" : "#ff3a5c",
          fontSize: 9.5, fontWeight: "bold", fontFamily: "monospace",
        }}>
          {pos ? "+" : ""}${fmt4(trade.profit)}
        </span>
      </div>
      {/* Row 2: route + symbol */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ background: "rgba(0,230,118,0.12)", color: "#00e676", fontSize: 8, padding: "0 4px", borderRadius: 2, fontFamily: "monospace", fontWeight: "bold" }}>
          {EX_SHORT[trade.buyIdx]}
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 9 }}>→</span>
        <span style={{ background: "rgba(255,58,92,0.12)", color: "#ff3a5c", fontSize: 8, padding: "0 4px", borderRadius: 2, fontFamily: "monospace", fontWeight: "bold" }}>
          {EX_SHORT[trade.sellIdx]}
        </span>
        <span style={{ color: "rgba(160,180,210,0.5)", fontSize: 8, marginLeft: "auto", fontFamily: "monospace" }}>
          {trade.symbol}
        </span>
      </div>
      {/* Row 3: qty / prices */}
      <div style={{ color: "rgba(110,130,160,0.45)", fontSize: 8, fontFamily: "monospace", marginTop: 1 }}>
        {trade.qty} @ {fmt2(trade.buyPrice)} → {fmt2(trade.sellPrice)}
      </div>
    </div>
  );
}

function StatPill({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "rgba(110,130,160,0.5)", fontSize: 9.5 }}>{label}</span>
      <span style={{ color: valueColor || "#f51818", fontSize: 10, fontWeight: "bold", fontFamily: "monospace" }}>
        {value}
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
/**
 * PulseMap — HFT Arbitrage Heatmap
 *
 * Ref API:
 *   pulsemapRef.current.addTrade({
 *     buyIdx:   0,          // 0-4 → BIN BYB KRK CBP OKX
 *     sellIdx:  4,
 *     symbol:   "BTC/USDT",
 *     qty:      0.5,
 *     buyPrice: 74250.10,
 *     sellPrice:74252.60,
 *     profit:   1.25,
 *   })
 *
 * Props:
 *   demo   {bool}   — run built-in simulator (default true)
 *   theme  {"dark"|"light"} — colour theme (default "dark")
 */
const PulseMap = forwardRef(function PulseMap({ demo = true }, ref) {
  const canvasRef = useRef(null);

  // All hot data lives here — never triggers re-renders
  const S = useRef({
    heat:   Array.from({ length: N }, () => new Float32Array(N)),
    counts: Array.from({ length: N }, () => new Uint32Array(N)),
    ring:   [],           // history ring buffer (MAX_HIST items)
    rafId:  null,
    total:  0,
    totalProfit: 0,
    tpsCount:    0,
    tpsWindow:   Date.now(),
    tpsCurrent:  0,
  });

  // React state — only refreshed at STATE_HZ
  const [uiHistory, setUiHistory] = useState([]);
  const [uiStats,   setUiStats]   = useState({ total: 0, tps: 0, profit: 0 });

  // ── Core ingestion (zero React overhead) ────────────────────────────────────
  const addTrade = useCallback((trade) => {
    const s  = S.current;
    const { buyIdx, sellIdx, profit } = trade;
    if (buyIdx === sellIdx || buyIdx < 0 || sellIdx < 0 || buyIdx >= N || sellIdx >= N) return;

    // Heat & count
    s.heat[buyIdx][sellIdx] = Math.min(1, s.heat[buyIdx][sellIdx] + HEAT_BOOST);
    s.counts[buyIdx][sellIdx]++;

    // Stats
    s.total++;
    s.totalProfit += profit || 0;
    s.tpsCount++;

    // History ring
    const entry = { ...trade, ts: Date.now() };
    s.ring.unshift(entry);
    if (s.ring.length > MAX_HIST) s.ring.length = MAX_HIST;
  }, []);

  useImperativeHandle(ref, () => ({ addTrade }), [addTrade]);

  // ── Demo simulator ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo) return;
    const mid = { v: 74250 };
    const id = setInterval(() => {
      mid.v += (Math.random() - 0.499) * 3;
      for (let i = 0; i < DEMO_TPT; i++) addTrade(makeDemoTrade(mid.v));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [demo, addTrade]);

  // ── RAF render loop — heat decay + canvas draw ───────────────────────────────
  useEffect(() => {
    const s = S.current;
    const frame = () => {
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (s.heat[r][c] > 0.002) s.heat[r][c] *= DECAY; else s.heat[r][c] = 0;

      drawGrid(canvasRef.current, s.heat, s.counts);
      s.rafId = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(s.rafId);
  }, []);

  // ── Throttled React state sync ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const s = S.current;
      const now = Date.now();
      const elapsed = now - s.tpsWindow;
      if (elapsed >= 900) {
        s.tpsCurrent = Math.round(s.tpsCount * 1000 / elapsed);
        s.tpsCount   = 0;
        s.tpsWindow  = now;
      }
      setUiHistory(s.ring.slice(0, HIST_SHOW));
      setUiStats({ total: s.total, tps: s.tpsCurrent, profit: +s.totalProfit.toFixed(2) });
    }, STATE_HZ);
    return () => clearInterval(id);
  }, []);

  // ── Resize observer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  const posProfit = uiStats.profit >= 0;

  return (
    <div style={{
      background: "#07090c",
      color: "#c8d4e0",
      fontFamily: '"Courier New", Courier, monospace',
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
    }}>

      {/* ── Top header bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.01)", flexShrink: 0, flexWrap: "wrap", rowGap: 4,
      }}>
        <span style={{ color: "#e8ecf0", fontWeight: "bold", fontSize: 12, letterSpacing: 1 }}>PULSEMAP</span>
        <span style={{ color: "rgba(140,160,190,0.45)", fontSize: 9.5, marginRight: 8 }}>ARB HEATMAP</span>

        <div style={{ display: "flex", gap: 18, marginLeft: "auto", alignItems: "center", flexWrap: "wrap", rowGap: 4 }}>
          <StatPill label="TRADES"  value={fmtK(uiStats.total)} />
          <StatPill label="TPS"     value={fmtK(uiStats.tps)} valueColor="#00e676" />
          <StatPill label="TOT P&L" value={`${posProfit ? "+" : ""}$${fmt2(uiStats.profit)}`} valueColor={posProfit ? "#00e676" : "#ff3a5c"} />
          <span style={{ color: "rgba(120,140,165,0.5)", fontSize: 9, borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: 14 }}>
            100ms · LIVE
          </span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── Left: grid area ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 0 8px 10px", overflow: "hidden", minWidth: 0 }}>

          {/* Column (SELL) headers */}
          <div style={{ display: "flex", marginLeft: 48, marginBottom: 2, flexShrink: 0 }}>
            {EXCHANGES.map((_, i) => (
              <div key={i} style={{ flex: 1 }}>
                <ExLabel label={EX_SHORT[i]} sub="SELL" color="#ff3a5c" subColor="rgba(255,58,92,0.35)" />
              </div>
            ))}
          </div>

          {/* Row labels + canvas */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

            {/* BUY row labels */}
            <div style={{ width: 48, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              {EXCHANGES.map((_, i) => (
                <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
                  <ExLabel label={EX_SHORT[i]} sub="BUY" color="#00ff40" subColor="rgba(0,230,118,0.3)" />
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
              <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100%", height: "100%" }}
              />
            </div>
          </div>

          {/* Legend row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: 48, marginTop: 6, flexShrink: 0 }}>
            {[
              { label: "COLD", c: "#0c0e12", b: "rgba(255,255,255,0.1)" },
              { label: "WARM", c: "rgb(220, 0, 0)", b: "transparent" },
              { label: "HOT",  c: "rgb(1, 255, 5)", b: "transparent" },
            ].map(({ label, c, b }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, border: `0.5px solid ${b}`, display: "inline-block" }} />
                <span style={{ fontSize: 8, color: "rgba(130,150,175,0.5)" }}>{label}</span>
              </div>
            ))}
            <span style={{ fontSize: 8, color: "rgba(110,130,160,0.35)", marginLeft: 6 }}>
              cell value = trade count · row = BUY exchange · col = SELL exchange
            </span>
          </div>
        </div>

        {/* ── Right: order history ────────────────────────────────────────────── */}
        <div style={{
          width: 228,
          borderLeft: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* Panel header */}
          <div style={{
            padding: "4px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: "rgba(120,140,165,0.6)", fontSize: 9.5 }}>ORDER HISTORY</span>
            <span style={{
              background: "rgba(0,230,118,0.1)", color: "#00e676",
              fontSize: 8, padding: "1px 6px", borderRadius: 2,
            }}>LIVE</span>
          </div>

          {/* Column labels */}
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "2px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            color: "rgba(90,110,140,0.45)", fontSize: 8, flexShrink: 0,
          }}>
            <span>TIME · ROUTE · PAIR</span><span>P&L</span>
          </div>

          {/* Scrollable history */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {uiHistory.map((t, i) => <HistRow key={i} trade={t} />)}
            {uiHistory.length === 0 && (
              <div style={{ padding: 16, color: "rgba(120,140,165,0.3)", fontSize: 10, textAlign: "center" }}>
                Waiting for trades…
              </div>
            )}
          </div>

          {/* Exchange legend */}
          <div style={{
            padding: "5px 10px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex", flexWrap: "wrap", gap: "3px 8px", flexShrink: 0,
          }}>
            {EXCHANGES.map((ex, i) => (
              <span key={i} style={{ color: "rgba(120,140,165,0.4)", fontSize: 7.5, fontFamily: "monospace" }}>
                <span style={{ color: "rgba(180,195,215,0.55)" }}>{EX_SHORT[i]}</span>={ex}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});







export default function PulseMapView() {
    return(
        <>
        <div className="h-[25%] text-sm w-full border-b border-black"><PulseMap demo={true} /></div>
        </>
    )
}