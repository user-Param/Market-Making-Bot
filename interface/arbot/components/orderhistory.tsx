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
import { useWebSocket } from "../hooks/useWebSocket";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "filled", label: "FILLED" },
  { id: "open", label: "OPEN" },
  { id: "rejected", label: "REJECTED" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BUFFER_CAPACITY = 2000;        // keep last N orders in the ring buffer
const BATCH_FLUSH_MS = 16;          // ~60 FPS state updates
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

// ─── Sub-component: Single Order Row (memoised) ───────────────────────────────
const OrderRow = ({ orders, index, style }: any) => {
  const order: Order = orders[index];
  if (!order) return null;
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
const OrderHistoryView = forwardRef(function OrderHistoryView(
  { demo = false }: { demo?: boolean },
  ref
) {
  const bufferRef = useRef<Order[]>([]);        
  const startIdxRef = useRef(0);                
  const countRef = useRef(0);                   
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("filled");
  const { data: wsData } = useWebSocket("ws://localhost:9001");

  const [statsDisplay, setStatsDisplay] = useState({
    totalTrades: 0,
    totalPnl: 0,
    tps: 0,
  });

  const addOrder = useCallback((order: Order) => {
    const o = { ...order, timestamp: order.timestamp || Date.now() };
    const buf = bufferRef.current;
    const start = startIdxRef.current;
    const count = countRef.current;
    if (count === BUFFER_CAPACITY) {
      buf[(start + count) % BUFFER_CAPACITY] = o;
      startIdxRef.current = (start + 1) % BUFFER_CAPACITY;
    } else {
      buf[(start + count) % BUFFER_CAPACITY] = o;
      countRef.current = count + 1;
    }
    setStatsDisplay(prev => ({
      ...prev,
      totalTrades: prev.totalTrades + 1,
      totalPnl: prev.totalPnl + (o.pnl || 0)
    }));
  }, []);

  useEffect(() => {
    if (wsData && wsData.type === "SIGNAL") {
      addOrder({
        id: `ORD${String(Date.now()).slice(-5)}`,
        symbol: wsData.symbol,
        side: wsData.side.toLowerCase() as OrderSide,
        type: "market",
        price: wsData.price,
        status: "filled",
        timestamp: wsData.timestamp,
        qty: 1.0,
        pnl: (Math.random() - 0.4) * 0.1 // simulated PnL for now
      });
    }
  }, [wsData, addOrder]);

  useEffect(() => {
    const flush = () => {
      const buf = bufferRef.current;
      const count = countRef.current;
      const start = startIdxRef.current;
      const snapshot: Order[] = [];
      for (let i = 0; i < count; i++) {
        snapshot.push(buf[(start + i) % BUFFER_CAPACITY]);
      }
      snapshot.reverse(); 
      setVisibleOrders(snapshot);
    };

    const interval = setInterval(flush, BATCH_FLUSH_MS);
    return () => clearInterval(interval);
  }, []);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.01)",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#e8ecf0", fontWeight: "bold", fontSize: 12 }}>ORDERS</span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ color: "rgba(120,140,165,0.6)", fontSize: 9 }}>TOTAL {fmtK(statsDisplay.totalTrades)}</span>
          <span style={{ color: statsDisplay.totalPnl >= 0 ? "#00e676" : "#ff3a5c", fontSize: 9 }}>P&L ${fmt2(statsDisplay.totalPnl)}</span>
        </div>
      </div>

      <div style={{ display: "flex", padding: "2px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: 2 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? "rgba(0,230,118,0.1)" : "transparent",
              border: activeTab === tab.id ? "1px solid rgba(0,230,118,0.3)" : "1px solid transparent",
              color: activeTab === tab.id ? "#00e676" : "rgba(150,165,185,0.7)",
              fontSize: 9, padding: "3px 10px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, padding: "2px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(90,110,140,0.45)", fontSize: 8 }}>
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
          <div style={{ padding: 16, color: "rgba(120,140,165,0.3)", fontSize: 10, textAlign: "center" }}>No {activeTab} orders</div>
        )}
      </div>
    </div>
  );
});

export default function OrderHistory() {
  return (
    <div className="h-full w-[40%] text-sm">
      <OrderHistoryView demo={false} />
    </div>
  );
}





