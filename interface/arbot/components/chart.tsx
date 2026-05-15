// interface/arbot/components/chart.tsx
"use client"
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

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
  const lo     = Math.min(...prices) - 0.5;
  const hi     = Math.max(...prices) + 0.5;
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
           LIVE
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const HFTChart = forwardRef(function HFTChart({ symbol = "SOL-PERP", demo = false }, ref) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef({ ticks: [], bids: [], asks: [], mid: 0, rafId: null });
  const [ob, setOb] = useState({ bids: [], asks: [] });
  const [hdr, setHdr] = useState({ price: 0, change: 0, pct: 0, buys: 0, sells: 0 });
  const { data: wsData } = useWebSocket("ws://localhost:9001");

  useEffect(() => {
    if (wsData && wsData.type === "MARKET_DATA" && wsData.symbol === symbol) {
      const s = stateRef.current;
      const price = wsData.price;
      const isBuy = wsData.bid_qty > wsData.ask_qty;
      
      s.ticks.push({ price, isBuy, ts: Date.now() });
      if (s.ticks.length > MAX_TICKS) s.ticks.shift();
      
      // Mock some orderbook levels around the price
      s.bids = Array.from({ length: 10 }, (_, i) => ({ price: price - (i + 1) * 0.01, qty: Math.random() * 100 }));
      s.asks = Array.from({ length: 10 }, (_, i) => ({ price: price + (i + 1) * 0.01, qty: Math.random() * 100 }));

      const first = s.ticks[0]?.price || price;
      setOb({ bids: s.bids, asks: s.asks });
      setHdr({
        price,
        change: +(price - first).toFixed(2),
        pct:    +((price / first - 1) * 100).toFixed(4),
        buys:   s.ticks.filter((t) => t.isBuy).length,
        sells:  s.ticks.filter((t) => !t.isBuy).length,
      });
    }
  }, [wsData, symbol]);

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
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            style={{ display: "block", width: "100%", height: "100%" }}
          />
        </div>

        <div style={{
          width: 188,
          borderLeft: "1px solid rgba(255,255,255,0.055)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden"
          }}>
            {asksDisplay.map((a, i) => (
              <OBRow key={i} price={a.price} qty={a.qty} maxQty={maxQty} side="ask" />
            ))}
          </div>
          <div style={{ padding: "4px 8px", background: "rgba(245,197,24,0.05)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#f5c518", fontSize: 11, fontWeight: "bold" }}>{fmt2(hdr.price)}</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {bidsDisplay.map((b, i) => (
              <OBRow key={i} price={b.price} qty={b.qty} maxQty={maxQty} side="bid" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Chart() {
    return(
        <div className="h-[40%] border-b text-sm">
            <HFTChart demo={false} symbol="SOL-PERP" />
        </div>
    )
}