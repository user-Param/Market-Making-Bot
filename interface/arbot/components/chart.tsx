import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const MAX_TICKS   = 300;
const TICK_MS     = 100;
const OB_LEVELS   = 16;
const DOT_R       = 2.2;
const BUY_COLOR   = "#00ff84";
const SELL_COLOR  = "#ff002b";
const BG_COLOR    = "#000000";
const GRID_COLOR = "rgba(0,0,0,0.06)";
const LINE_COLOR = "rgba(0,0,0,0.25)";
const AXIS_COLOR = "rgba(0,0,0,0.6)";
const PRICE_COLOR = "#000000";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt2 = (n) => n.toFixed(2);
const fmt0 = (n) => Math.round(n).toLocaleString();
const padTime = (n) => String(n).padStart(2, "0");
const timeLabel = (d) =>
  `${padTime(d.getHours())}:${padTime(d.getMinutes())}:${padTime(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0").slice(0, 2)}`;

// ─── Simulator (demo only) ─────────────────────────────────────────────────────
function makeTick(mid) {
  const spread = 0.25;
  const buyP   = mid - spread;
  const sellP  = mid + spread;
  const isBuy  = Math.random() > 0.48;
  const bids   = Array.from({ length: OB_LEVELS }, (_, j) => ({
    price: +(mid - (j + 1) * 0.5).toFixed(2),
    qty:   Math.floor(Math.random() * 900 + 80),
  }));
  const asks   = Array.from({ length: OB_LEVELS }, (_, j) => ({
    price: +(mid + (j + 1) * 0.5).toFixed(2),
    qty:   Math.floor(Math.random() * 900 + 80),
  }));
  return { buyP, sellP, isBuy, price: isBuy ? buyP : sellP, bids, asks };
}

// ─── Canvas renderer ───────────────────────────────────────────────────────────
function drawChart(canvas, ticks) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  if (ticks.length < 2) return;

  const PL = 68, PR = 6, PT = 14, PB = 26;
  const CW = W - PL - PR;
  const CH = H - PT - PB;

  const prices = ticks.map((t) => t.price);
  const lo     = Math.min(...prices) - 4;
  const hi     = Math.max(...prices) + 4;
  const range  = hi - lo || 1;

  const py = (p) => PT + CH - ((p - lo) / range) * CH;
  const px = (i) => PL + (i / (MAX_TICKS - 1)) * CW;

  // ── Grid lines ──────────────────────────────────────────────────────────────
  const ROWS = 8, COLS = 10;
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth   = 0.5;
  for (let i = 0; i <= ROWS; i++) {
    const y = PT + (i / ROWS) * CH;
    ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y); ctx.stroke();
  }
  for (let i = 0; i <= COLS; i++) {
    const x = PL + (i / COLS) * CW;
    ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + CH); ctx.stroke();
  }

  // ── Price axis labels ────────────────────────────────────────────────────────
  ctx.fillStyle  = AXIS_COLOR;
  ctx.font       = '9.5px "Courier New", monospace';
  ctx.textAlign  = "right";
  for (let i = 0; i <= ROWS; i++) {
    const p = lo + ((ROWS - i) / ROWS) * range;
    const y = PT + (i / ROWS) * CH;
    ctx.fillText(fmt2(p), PL - 4, y + 3.5);
  }

  // ── Thin connecting line ─────────────────────────────────────────────────────
  const startI = MAX_TICKS - ticks.length;
  ctx.beginPath();
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth   = 0.7;
  ticks.forEach((t, i) => {
    const x = px(startI + i), y = py(t.price);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // ── Dots ─────────────────────────────────────────────────────────────────────
  ticks.forEach((t, i) => {
    const x = px(startI + i), y = py(t.price);
    ctx.beginPath();
    ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
    ctx.fillStyle = t.isBuy ? BUY_COLOR : SELL_COLOR;
    ctx.fill();
  });

  // ── Latest price dashed line ──────────────────────────────────────────────────
  const last = ticks[ticks.length - 1];
  if (last) {
    const y = py(last.price);
    ctx.strokeStyle = "rgba(245,197,24,0.38)";
    ctx.lineWidth   = 0.6;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y); ctx.stroke();
    ctx.setLineDash([]);

    // Right edge price tag
    ctx.fillStyle  = PRICE_COLOR;
    ctx.font       = 'bold 9px "Courier New", monospace';
    ctx.textAlign  = "left";
    ctx.fillText(fmt2(last.price), W - PR + 2, y + 3.5);
  }

  // ── X-axis time labels ───────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(90,110,135,0.5)";
  ctx.font      = '8.5px "Courier New", monospace';
  ctx.textAlign = "center";
  const now = Date.now();
  for (let i = 0; i <= 4; i++) {
    const x     = PL + (i / 4) * CW;
    const msAgo = ((4 - i) / 4) * ticks.length * TICK_MS;
    ctx.fillText(timeLabel(new Date(now - msAgo)), x, PT + CH + 16);
  }
}

// ─── Orderbook Row ─────────────────────────────────────────────────────────────
function OBRow({ price, qty, maxQty, side }) {
  const pct   = Math.min((qty / maxQty) * 100, 100);
  const color = side === "ask" ? SELL_COLOR : BUY_COLOR;
  const bg    = side === "ask" ? "rgba(255,58,92,0.09)" : "rgba(0,230,118,0.09)";
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "1.5px 8px", lineHeight: 1.4 }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, background: bg, width: `${pct}%`, pointerEvents: "none" }} />
      <span style={{ color, fontSize: 10.5, fontVariantNumeric: "tabular-nums", zIndex: 1 }}>{fmt2(price)}</span>
      <span style={{ color: "rgba(150,165,185,0.7)", fontSize: 10, zIndex: 1 }}>{fmt0(qty)}</span>
    </div>
  );
}

// ─── Header Stats ──────────────────────────────────────────────────────────────
function Header({ price, change, pct, buys, sells, symbol }) {
  const up = change >= 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20, padding: "6px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.055)",
      background: "rgba(255,255,255,0.012)", flexShrink: 0,
    }}>
      <span style={{ color: "#e8ecf0", fontWeight: "bold", fontSize: 13, letterSpacing: 0.5 }}>{symbol}</span>
      <span style={{ color: up ? BUY_COLOR : SELL_COLOR, fontSize: 17, fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
        {fmt2(price)}
      </span>
      <span style={{ color: up ? BUY_COLOR : SELL_COLOR, fontSize: 11 }}>
        {up ? "+" : ""}{fmt2(change)} ({up ? "+" : ""}{pct.toFixed(3)}%)
      </span>

      <div style={{ marginLeft: "auto", display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: BUY_COLOR, display: "inline-block" }} />
          <span style={{ color: BUY_COLOR, fontSize: 11 }}>{buys} buys</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: SELL_COLOR, display: "inline-block" }} />
          <span style={{ color: SELL_COLOR, fontSize: 11 }}>{sells} sells</span>
        </div>
        <span style={{ color: "rgba(120,140,165,0.6)", fontSize: 10, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 14 }}>
          100ms · LIVE
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
/**
 * HFTChart — High-Frequency Trading Chart
 *
 * Usage (controlled / real data):
 *   const ref = useRef();
 *   ref.current.addTick(buyPrice, sellPrice, bids, asks);
 *   // bids / asks = [{ price: number, qty: number }, ...]
 *
 * <HFTChart ref={ref} symbol="BTC/USDT" demo={false} />
 *
 * Leave demo={true} (default) for the built-in simulator.
 */
const HFTChart = forwardRef(function HFTChart({ symbol = "BTC/USDT", demo = true }, ref) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef({ ticks: [], bids: [], asks: [], mid: 74250, rafId: null });
  const [ob, setOb] = useState({ bids: [], asks: [] });
  const [hdr, setHdr] = useState({ price: 74250, change: 0, pct: 0, buys: 0, sells: 0 });

  // ── Public API ────────────────────────────────────────────────────────────────
  const addTick = useCallback((buyP, sellP, bids, asks) => {
    const s = stateRef.current;
    const isBuy = Math.random() > 0.48;
    const price  = isBuy ? buyP : sellP;

    s.ticks.push({ price, isBuy, ts: Date.now() });
    if (s.ticks.length > MAX_TICKS) s.ticks.shift();
    s.bids = bids || [];
    s.asks = asks || [];

    const first = s.ticks[0]?.price || price;
    setOb({ bids: s.bids, asks: s.asks });
    setHdr({
      price,
      change: +(price - first).toFixed(2),
      pct:    +((price / first - 1) * 100).toFixed(4),
      buys:   s.ticks.filter((t) => t.isBuy).length,
      sells:  s.ticks.filter((t) => !t.isBuy).length,
    });
  }, []);

  useImperativeHandle(ref, () => ({ addTick }), [addTick]);

  // ── Demo simulator ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo) return;
    const s = stateRef.current;

    // pre-fill history
    for (let i = 0; i < 90; i++) {
      s.mid += (Math.random() - 0.499) * 1.8;
      const { buyP, sellP, bids, asks } = makeTick(s.mid);
      addTick(buyP, sellP, bids, asks);
    }

    const id = setInterval(() => {
      s.mid += (Math.random() - 0.499) * 2.5;
      const { buyP, sellP, bids, asks } = makeTick(s.mid);
      addTick(buyP, sellP, bids, asks);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [demo, addTick]);

  // ── Render loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    const frame = () => {
      drawChart(canvasRef.current, s.ticks);
      s.rafId = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(s.rafId);
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

  // ── Orderbook derived data ────────────────────────────────────────────────────
  const maxQty = Math.max(...ob.bids.map((b) => b.qty), ...ob.asks.map((a) => a.qty), 1);
  const asksDisplay = [...ob.asks].slice(0, OB_LEVELS).reverse();
  const bidsDisplay = ob.bids.slice(0, OB_LEVELS);

  return (
    <div style={{
      background: BG_COLOR,
      color: "#c8d4e0",
      fontFamily: '"Courier New", Courier, monospace',
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      userSelect: "none",
    }}>
      <Header {...hdr} symbol={symbol} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── Chart canvas ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            style={{ display: "block", width: "100%", height: "100%" }}
          />
          {/* Legend */}
          <div style={{
            position: "absolute", top: 10, left: 76, display: "flex", gap: 12,
            fontSize: 10, color: "rgba(160,175,195,0.7)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: BUY_COLOR, display: "inline-block" }} />
              BUY
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: SELL_COLOR, display: "inline-block" }} />
              SELL
            </span>
          </div>
        </div>

        {/* ── Orderbook panel ────────────────────────────────────────────────── */}
        <div style={{
          width: 188,
          borderLeft: "1px solid rgba(255,255,255,0.055)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* Column header */}
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "3px 8px 3px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            color: "rgba(120,140,165,0.55)", fontSize: 9.5, flexShrink: 0,
          }}>
            <span>PRICE (USDT)</span><span>QTY</span>
          </div>

          {/* Asks */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
            {asksDisplay.map((a, i) => (
              <OBRow key={i} price={a.price} qty={a.qty} maxQty={maxQty} side="ask" />
            ))}
          </div>

          {/* Mid price separator */}
          <div style={{
            padding: "4px 8px", flexShrink: 0,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(245,197,24,0.05)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ color: PRICE_COLOR, fontSize: 11, fontWeight: "bold" }}>{fmt2(hdr.price)}</span>
            <span style={{ color: hdr.change >= 0 ? BUY_COLOR : SELL_COLOR, fontSize: 9 }}>
              {hdr.change >= 0 ? "▲" : "▼"} {Math.abs(hdr.change).toFixed(2)}
            </span>
          </div>

          {/* Bids */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {bidsDisplay.map((b, i) => (
              <OBRow key={i} price={b.price} qty={b.qty} maxQty={maxQty} side="bid" />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: "3px 8px", flexShrink: 0,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex", justifyContent: "space-between",
            color: "rgba(100,120,145,0.55)", fontSize: 9,
          }}>
            <span>ORDERBOOK</span>
            <span>LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
});











export default function Chart() {
    return(
        <>
        <div className="h-[40%] border-b text-sm">
            <HFTChart demo={true} symbol="BTC/USDT" />
        </div>
        </>
    )
}