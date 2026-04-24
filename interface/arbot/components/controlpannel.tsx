// interface/arbot/components/controlpannel.tsx

"use client";

import { useState, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const EXCHANGES = ["Binance", "Bybit", "Kraken", "Coinbase", "OKX"];
const STRATEGIES = [
  { id: "simple_spread", label: "Simple Spread" },
  { id: "momentum", label: "Momentum" },
  { id: "mean_rev", label: "Mean Reversion" },
  { id: "triangular", label: "Triangular Arb" },
];

// ─── Styling helpers (inline) ─────────────────────────────────────────────────
const styles = {
  container: {
    background: "#07090c",
    color: "#c8d4e0",
    fontFamily: '"Courier New", Courier, monospace',
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    userSelect: "none" as const,
    borderTop: "1px solid rgba(255,255,255,0.055)",
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.012)",
    flexShrink: 0,
  },
  tab: (active: boolean) => ({
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: active ? "bold" as const : "normal" as const,
    color: active ? "#00e676" : "rgba(150,165,185,0.7)",
    borderBottom: active ? "2px solid #00e676" : "2px solid transparent",
    cursor: "pointer",
    background: active ? "rgba(0,230,118,0.05)" : "transparent",
    transition: "all 0.2s",
  }),
  content: {
    flex: 1,
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  sectionTitle: {
    color: "rgba(120,140,165,0.6)",
    fontSize: 9.5,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    color: "rgba(150,165,185,0.8)",
    fontSize: 10,
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e0e6f0",
    padding: "5px 8px",
    fontSize: 10.5,
    fontFamily: "inherit",
    borderRadius: 3,
    width: 80,
    outline: "none",
  },
  button: (bgColor: string, textColor: string = "#000") => ({
    background: bgColor,
    color: textColor,
    border: "none",
    padding: "6px 14px",
    fontSize: 10.5,
    fontWeight: "bold" as const,
    fontFamily: "inherit",
    borderRadius: 3,
    cursor: "pointer",
    letterSpacing: 0.5,
    transition: "opacity 0.2s",
  }),
  toggleBase: {
    position: "relative" as const,
    width: 36,
    height: 18,
    borderRadius: 9,
    background: "rgba(255,255,255,0.15)",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  toggleKnob: (on: boolean) => ({
    position: "absolute" as const,
    top: 2,
    left: on ? 19 : 2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: on ? "#00e676" : "#ff4d6a",
    transition: "left 0.2s",
  }),
  killButton: {
    marginTop: "auto",
    alignSelf: "center",
    background: "rgba(255,0,43,0.15)",
    border: "1px solid #ff002b",
    color: "#ff4d6a",
    padding: "10px 30px",
    fontSize: 12,
    fontWeight: "bold" as const,
    fontFamily: "inherit",
    borderRadius: 4,
    cursor: "pointer",
    letterSpacing: 1.2,
    transition: "background 0.15s",
  },
  log: {
    background: "rgba(0,0,0,0.3)",
    padding: "4px 8px",
    borderRadius: 3,
    fontSize: 9,
    color: "rgba(150,165,185,0.7)",
    maxHeight: 80,
    overflowY: "auto" as const,
  },
};

// ─── Exchange Toggle Component ─────────────────────────────────────────────────
function ExchangeToggle({ name, enabled, onToggle }: { name: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{name}</span>
      <div style={styles.toggleBase} onClick={onToggle}>
        <div style={styles.toggleKnob(enabled)} />
      </div>
    </div>
  );
}

// ─── Main ControlPannel ────────────────────────────────────────────────────────
export function ControlPannelView() {
  const [activeTab, setActiveTab] = useState("strategy");
  const [exchanges, setExchanges] = useState(EXCHANGES.map((name) => ({ name, enabled: true })));
  const [strategy, setStrategy] = useState("simple_spread");
  const [params, setParams] = useState({ minSpread: 0.5, maxPosition: 100, feeRate: 0.1 });
  const [order, setOrder] = useState({ symbol: "BTC/USDT", qty: 0.01, side: "buy" as "buy" | "sell", type: "market" });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
  }, []);

  // ── Exchange toggle handler ─────────────────────────────────────────────────
  const toggleExchange = useCallback(
    (index: number) => {
      setExchanges((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], enabled: !updated[index].enabled };
        addLog(`${updated[index].name} ${updated[index].enabled ? "ENABLED" : "DISABLED"}`);
        return updated;
      });
    },
    [addLog]
  );

  // ── Strategy handlers ────────────────────────────────────────────────────────
  const applyStrategy = () => {
    addLog(`Strategy: ${STRATEGIES.find((s) => s.id === strategy)?.label} | minSpread: ${params.minSpread}% | maxPos: ${params.maxPosition}`);
  };

  // ── Manual trade handler ────────────────────────────────────────────────────
  const placeOrder = () => {
    addLog(`ORDER PLACED: ${order.side.toUpperCase()} ${order.qty} ${order.symbol} @ ${order.type.toUpperCase()}`);
  };

  // ── Emergency stop ───────────────────────────────────────────────────────────
  const emergencyStop = () => {
    addLog("🚨 EMERGENCY STOP ACTIVATED – ALL TRADING HALTED");
    // In production: trigger system shutdown via global state / API
  };

  // ── Render tab content ──────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case "strategy":
        return (
          <>
            <div style={styles.sectionTitle}>Active Strategy</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  style={{
                    ...styles.button(strategy === s.id ? "#00e676" : "rgba(255,255,255,0.08)", strategy === s.id ? "#000" : "#a0b5cc"),
                    fontSize: 9.5,
                  }}
                  onClick={() => { setStrategy(s.id); addLog(`Strategy selected: ${s.label}`); }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div style={styles.sectionTitle}>Parameters</div>
            <div style={styles.row}>
              <span style={styles.label}>Min Spread (%)</span>
              <input
                type="number"
                step="0.01"
                value={params.minSpread}
                onChange={(e) => setParams({ ...params, minSpread: +e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Max Position (units)</span>
              <input
                type="number"
                value={params.maxPosition}
                onChange={(e) => setParams({ ...params, maxPosition: +e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Fee Rate (%)</span>
              <input
                type="number"
                step="0.001"
                value={params.feeRate}
                onChange={(e) => setParams({ ...params, feeRate: +e.target.value })}
                style={styles.input}
              />
            </div>

            <button style={styles.button("#00e676", "#000")} onClick={applyStrategy}>
              APPLY STRATEGY
            </button>
          </>
        );

      case "trading":
        return (
          <>
            <div style={styles.sectionTitle}>Manual Order</div>
            <div style={styles.row}>
              <span style={styles.label}>Symbol</span>
              <input
                type="text"
                value={order.symbol}
                onChange={(e) => setOrder({ ...order, symbol: e.target.value.toUpperCase() })}
                style={styles.input}
              />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Quantity</span>
              <input
                type="number"
                step="0.001"
                value={order.qty}
                onChange={(e) => setOrder({ ...order, qty: +e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                style={{
                  ...styles.button(order.side === "buy" ? "#00e676" : "rgba(255,255,255,0.08)", order.side === "buy" ? "#000" : "#a0b5cc"),
                  flex: 1,
                }}
                onClick={() => setOrder({ ...order, side: "buy" })}
              >
                BUY
              </button>
              <button
                style={{
                  ...styles.button(order.side === "sell" ? "#ff002b" : "rgba(255,255,255,0.08)", order.side === "sell" ? "#fff" : "#a0b5cc"),
                  flex: 1,
                }}
                onClick={() => setOrder({ ...order, side: "sell" })}
              >
                SELL
              </button>
            </div>
            <div style={{ ...styles.row, marginTop: 8 }}>
              <span style={styles.label}>Type</span>
              <select
                value={order.type}
                onChange={(e) => setOrder({ ...order, type: e.target.value })}
                style={{
                  ...styles.input,
                  width: 90,
                  cursor: "pointer",
                }}
              >
                <option value="market">MARKET</option>
                <option value="limit">LIMIT</option>
              </select>
            </div>

            <button style={styles.button("#00e676", "#000")} onClick={placeOrder}>
              PLACE ORDER
            </button>
          </>
        );

      case "exchanges":
        return (
          <>
            <div style={styles.sectionTitle}>Exchange Connections</div>
            {exchanges.map((ex, i) => (
              <ExchangeToggle key={ex.name} name={ex.name} enabled={ex.enabled} onToggle={() => toggleExchange(i)} />
            ))}
            <div style={{ ...styles.sectionTitle, marginTop: 16 }}>Network Status</div>
            <div style={styles.row}>
              <span style={styles.label}>Latency</span>
              <span style={{ color: "#00e676", fontSize: 10, fontFamily: "monospace" }}>23ms</span>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Uptime</span>
              <span style={{ color: "rgba(150,165,185,0.8)", fontSize: 10, fontFamily: "monospace" }}>4h 12m</span>
            </div>
          </>
        );

      case "risk":
        return (
          <>
            <div style={styles.sectionTitle}>Risk Management</div>
            <div style={styles.row}>
              <span style={styles.label}>Max Drawdown (%)</span>
              <input type="number" defaultValue={15} style={styles.input} />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Position Limit</span>
              <input type="number" defaultValue={5} style={styles.input} />
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Auto-Stop Loss</span>
              <div style={styles.toggleBase} onClick={() => addLog("Auto-Stop Loss toggled")}>
                <div style={styles.toggleKnob(true)} />
              </div>
            </div>
            <div style={styles.row}>
              <span style={styles.label}>Cooldown (s)</span>
              <input type="number" defaultValue={30} style={styles.input} />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        {["strategy", "trading", "exchanges", "risk"].map((tab) => (
          <div
            key={tab}
            style={styles.tab(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </div>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div style={styles.content}>
        {renderTab()}

        {/* ── Emergency stop always visible ───────────────────────────────────── */}
        <button style={styles.killButton} onClick={emergencyStop}>
          ⏻ EMERGENCY STOP
        </button>

        {/* ── Event log ───────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 8 }}>
          <div style={styles.sectionTitle}>System Log</div>
          <div style={styles.log}>
            {logs.length === 0 ? (
              <span style={{ opacity: 0.5 }}>Awaiting actions...</span>
            ) : (
              logs.map((entry, idx) => <div key={idx}>{entry}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}










export default function ControlPannel() {
    return(
        <>
        <div className="h-[35%] w-full text-sm"><ControlPannelView/></div>
        </>
    )
}