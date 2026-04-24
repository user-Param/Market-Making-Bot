// interface/arbot/components/orderhistory.tsx
"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { List } from "react-window";

// ─── Constants ────────────────────────────────────────────────────────────────
const SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];
const TABS = [
  { id: "open", label: "OPEN" },
  { id: "filled", label: "FILLED" },
  { id: "rejected", label: "REJECTED" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BUFFER_CAPACITY = 2000;        // keep last N orders in the ring buffer
const BATCH_FLUSH_MS = 16;          // ~60 FPS state updates
const DEMO_ORDERS_PER_TICK = 500;   // how many orders to inject per demo interval
const DEMO_INTERVAL_MS = 50;        // demo tick interval (20 ticks/sec → 10k orders/sec)
const ROW_HEIGHT = 22;              // pixel height of each order row

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = "open" | "filled" | "rejected";
type OrderSide = "buy" | "sell";

interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: string;           // "market" | "limit"
  qty: number;
  price: number;
  filledPrice?: number;
  status: OrderStatus;
  timestamp: number;
  pnl?: number;           // only for filled
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt2 = (n: number) => n.toFixed(2);
const fmt4 = (n: number) => n.toFixed(4);
const fmtK = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);

const pad = (n: number) => String(n).padStart(2, "0");
const timeStr = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

let orderCounter = 1;

// ─── Demo order factory (simple, fast) ────────────────────────────────────────
function makeDemoOrder(): Order {
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const side = Math.random() > 0.5 ? "buy" : "sell";
  const type = Math.random() > 0.3 ? "market" : "limit";
  const price = 65000 + Math.random() * 10000;
  const qty = +(Math.random() * 2 + 0.01).toFixed(4);
  const status: OrderStatus =
    Math.random() > 0.15 ? "filled" : Math.random() > 0.5 ? "open" : "rejected";
  const filledPrice =
    status === "filled" ? price + (Math.random() - 0.5) * 20 : undefined;
  const pnl =
    status === "filled" && filledPrice
      ? side === "buy"
        ? (filledPrice - price) * qty
        : (price - filledPrice) * qty
      : undefined;
  return {
    id: `ORD${String(orderCounter++).padStart(5, "0")}`,
    symbol,
    side,
    type,
    qty,
    price,
    filledPrice,
    status,
    timestamp: Date.now() - Math.floor(Math.random() * 120000),
    pnl,
  };
}

// ─── Sub-component: Single Order Row (memoised) ───────────────────────────────
const OrderRow = ({ orders, index, style }: any) => {
  const order: Order = orders[index];
  const posPnl = (order.pnl ?? 0) >= 0;
  const sideColor = order.side === "buy" ? "#00e676" : "#ff3a5c";
  const statusColor =
    order.status === "filled"
      ? "#00e676"
      : order.status === "rejected"
      ? "#ff3a5c"
      : "rgba(245,197,24,0.8)";

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        fontSize: 10,
        background: order.pnl
          ? posPnl
            ? "rgba(0,230,118,0.04)"
            : "rgba(255,58,92,0.04)"
          : "transparent",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          color: "rgba(120,140,165,0.5)",
          width: 50,
          fontFamily: "monospace",
        }}
      >
        {timeStr(order.timestamp)}
      </span>
      <span
        style={{
          color: sideColor,
          width: 70,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        {order.id}
      </span>
      <span style={{ color: "rgba(200,210,225,0.8)", width: 70 }}>
        {order.symbol}
      </span>
      <span
        style={{
          color: sideColor,
          width: 32,
          textTransform: "uppercase",
          fontWeight: "bold",
        }}
      >
        {order.side}
      </span>
      <span
        style={{
          color: "rgba(150,165,185,0.7)",
          width: 24,
          textTransform: "uppercase",
        }}
      >
        {order.type === "market" ? "MKT" : "LMT"}
      </span>
      <span
        style={{
          color: "rgba(200,210,225,0.7)",
          width: 60,
          fontFamily: "monospace",
        }}
      >
        {fmt2(order.qty)}
      </span>
      <span
        style={{
          color: "rgba(200,210,225,0.7)",
          width: 72,
          fontFamily: "monospace",
        }}
      >
        ${fmt2(order.price)}
      </span>
      <span
        style={{
          color: statusColor,
          width: 62,
          fontFamily: "monospace",
          fontSize: 9,
          textAlign: "center",
          background: `rgba(${
            order.status === "filled"
              ? "0,230,118"
              : order.status === "rejected"
              ? "255,58,92"
              : "245,197,24"
          },0.1)`,
          padding: "1px 4px",
          borderRadius: 2,
        }}
      >
        {order.status.toUpperCase()}
      </span>
      {order.pnl != null && (
        <span
          style={{
            color: posPnl ? "#00e676" : "#ff3a5c",
            fontFamily: "monospace",
            fontWeight: "bold",
            marginLeft: "auto",
          }}
        >
          {posPnl ? "+" : ""}
          ${fmt4(order.pnl)}
        </span>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * OrderHistory – ultra-high‑throughput order table
 *
 * Ref API:
 *   orderHistoryRef.current.addOrder({
 *     symbol, side, type, qty, price, filledPrice?,
 *     status, pnl?, timestamp?
 *   })
 *
 * Props:
 *   demo   {bool}  – run built‑in high‑speed simulator (default true)
 */
const OrderHistoryView = forwardRef(function OrderHistoryView(
  { demo = true }: { demo?: boolean },
  ref
) {
  // ── Ring buffer & mutable state (avoids React re-render on every order) ───
  const bufferRef = useRef<Order[]>([]);        // ring buffer, max BUFFER_CAPACITY
  const startIdxRef = useRef(0);                // index of oldest order in ring
  const countRef = useRef(0);                   // total orders currently in ring
  const pendingOrders = useRef<Order[]>([]);    // orders queued since last flush

  // React‑visible data snapshot (flushed at 60 FPS)
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("open");

  // Aggregate stats (updated atomically in the fast path)
  const statsRef = useRef({
    totalTrades: 0,
    totalPnl: 0,
    lastFlushTime: Date.now(),
    flushCount: 0,
  });
  const [statsDisplay, setStatsDisplay] = useState({
    totalTrades: 0,
    totalPnl: 0,
    tps: 0,
    avgLatency: 0,
  });

  // ── Add order (ultra‑fast path, no React state update) ──────────────────────
  const addOrder = useCallback((order: Order) => {
    const o = { ...order, timestamp: order.timestamp || Date.now() };
    // Push into ring buffer
    const buf = bufferRef.current;
    const start = startIdxRef.current;
    const count = countRef.current;
    if (count === BUFFER_CAPACITY) {
      // overwrite oldest
      buf[(start + count) % BUFFER_CAPACITY] = o;
      startIdxRef.current = (start + 1) % BUFFER_CAPACITY;
    } else {
      buf[(start + count) % BUFFER_CAPACITY] = o;
      countRef.current = count + 1;
    }
    // Accumulate for batch flush
    pendingOrders.current.push(o);
    // Update global stats
    statsRef.current.totalTrades++;
    if (o.pnl !== undefined) {
      statsRef.current.totalPnl += o.pnl;
    }
  }, []);

  // Expose addOrder via ref
  useImperativeHandle(ref, () => ({ addOrder }), [addOrder]);

  // ── Batch flush: move pending orders into React state at 60 FPS ─────────────
  useEffect(() => {
    const flush = () => {
      const buf = bufferRef.current;
      const count = countRef.current;
      const start = startIdxRef.current;
      // Build a fresh array from the ring buffer (only once per frame)
      const snapshot: Order[] = [];
      for (let i = 0; i < count; i++) {
        snapshot.push(buf[(start + i) % BUFFER_CAPACITY]);
      }
      snapshot.reverse(); // newest first
      setVisibleOrders(snapshot);

      // Update stats display
      const now = Date.now();
      const elapsed = now - statsRef.current.lastFlushTime;
      if (elapsed >= 1000) {
        const tps = Math.round(
          (statsRef.current.totalTrades - statsRef.current.flushCount) * 1000 / elapsed
        );
        statsRef.current.flushCount = statsRef.current.totalTrades;
        statsRef.current.lastFlushTime = now;
        setStatsDisplay({
          totalTrades: statsRef.current.totalTrades,
          totalPnl: statsRef.current.totalPnl,
          tps,
          avgLatency: 0, // placeholder
        });
      }
      pendingOrders.current = [];
    };

    const interval = setInterval(flush, BATCH_FLUSH_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Demo simulator: inject massive order flow ──────────────────────────────
  useEffect(() => {
    if (!demo) return;
    // Pre‑populate with a few thousand orders
    for (let i = 0; i < 1000; i++) addOrder(makeDemoOrder());

    const id = setInterval(() => {
      // Inject a batch of orders
      for (let i = 0; i < DEMO_ORDERS_PER_TICK; i++) {
        addOrder(makeDemoOrder());
      }
    }, DEMO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [demo, addOrder]);

  // ── Filter orders visible on screen ─────────────────────────────────────────
  const filteredOrders = visibleOrders.filter((o) => o.status === activeTab);

  return (
    <div
      style={{
        background: "#07090c",
        color: "#c8d4e0",
        fontFamily: '"Courier New", Courier, monospace',
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Header Bar with stats ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.01)",
          flexShrink: 0,
          rowGap: 4,
        }}
      >
        <span
          style={{
            color: "#e8ecf0",
            fontWeight: "bold",
            fontSize: 12,
            letterSpacing: 0.5,
          }}
        >
          ORDERS
        </span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ color: "rgba(120,140,165,0.6)", fontSize: 9 }}>
            TOTAL {fmtK(statsDisplay.totalTrades)}
          </span>
          <span style={{ color: "#00e676", fontSize: 9 }}>
            TPS {fmtK(statsDisplay.tps)}
          </span>
          <span
            style={{
              color: statsDisplay.totalPnl >= 0 ? "#00e676" : "#ff3a5c",
              fontSize: 9,
            }}
          >
            P&L ${fmt2(statsDisplay.totalPnl)}
          </span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          padding: "2px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          flexShrink: 0,
          gap: 2,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background:
                activeTab === tab.id ? "rgba(0,230,118,0.1)" : "transparent",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(0,230,118,0.3)"
                  : "1px solid transparent",
              color:
                activeTab === tab.id ? "#00e676" : "rgba(150,165,185,0.7)",
              fontSize: 9,
              fontWeight: activeTab === tab.id ? "bold" : "normal",
              padding: "3px 10px",
              borderRadius: 3,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Column labels (sticky) ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "2px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          color: "rgba(90,110,140,0.45)",
          fontSize: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ width: 50 }}>TIME</span>
        <span style={{ width: 70 }}>ORDER ID</span>
        <span style={{ width: 70 }}>SYMBOL</span>
        <span style={{ width: 32 }}>SIDE</span>
        <span style={{ width: 24 }}>TYPE</span>
        <span style={{ width: 60 }}>QTY</span>
        <span style={{ width: 72 }}>PRICE</span>
        <span style={{ width: 62, textAlign: "center" }}>STATUS</span>
        <span style={{ marginLeft: "auto" }}>P&L</span>
      </div>

      {/* ── Virtualized order list (ultra‑fast rendering) ──────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {filteredOrders.length > 0 ? (
          <List
            rowCount={filteredOrders.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={OrderRow}
            rowProps={{ orders: filteredOrders }}
            style={{ height: "100%", width: "100%", overflow: "auto" }}
          />
        ) : (
          <div
            style={{
              padding: 16,
              color: "rgba(120,140,165,0.3)",
              fontSize: 10,
              textAlign: "center",
            }}
          >
            No {activeTab} orders
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "3px 10px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          justifyContent: "space-between",
          color: "rgba(100,120,145,0.55)",
          fontSize: 9,
          flexShrink: 0,
        }}
      >
        <span>
          {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}{" "}
          shown
        </span>
        <span>LIVE</span>
      </div>
    </div>
  );
});

// ─── Wrapper for page ────────────────────────────────────────────────────────
export default function OrderHistory() {
  return (
    <div className="h-full w-[40%] text-sm border-r border-black">
      <OrderHistoryView demo={true} />
    </div>
  );
}