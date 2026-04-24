// interface/arbot/components/navbar.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const EXCHANGES = [
  { id: 0, name: "Binance", short: "BIN", color: "#f0b90b" },
  { id: 1, name: "Coinbase", short: "CBP", color: "#0052ff" },
  { id: 2, name: "Bybit", short: "BYB", color: "#f7a600" },
  { id: 3, name: "Kraken", short: "KRK", color: "#5741d9" },
  { id: 4, name: "OKX", short: "OKX", color: "#ffffff" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtK = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n));
const fmt2 = (n: number) => n.toFixed(2);

// ─── System time hook ────────────────────────────────────────────────────────
function useSystemTime() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 100);
    return () => clearInterval(timer);
  }, []);
  
  return time;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Navbar() {
  const systemTime = useSystemTime();
  const [stats, setStats] = useState({
    tps: 0,
    totalTrades: 0,
    latency: 0,
    uptime: 0,
    memory: 0,
    cpu: 0,
    pnl: 0,
    positions: 0,
    activeStrategies: 2,
  });
  
  const [exchangeStatus, setExchangeStatus] = useState(
    EXCHANGES.map(ex => ({
      ...ex,
      connected: true,
      latency: Math.floor(Math.random() * 50) + 5,
    }))
  );
  
  const [systemStatus, setSystemStatus] = useState<"running" | "paused" | "error">("running");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, type: "trade", message: "BTC/USDT spread detected: 0.12%", time: Date.now() - 5000 },
    { id: 2, type: "system", message: "Data pipeline latency optimized to 23µs", time: Date.now() - 12000 },
    { id: 3, type: "warning", message: "Binance rate limit: 80% utilized", time: Date.now() - 30000 },
    { id: 4, type: "trade", message: "Arbitrage opportunity: ETH/USDT 0.08%", time: Date.now() - 45000 },
  ]);
  
  const navRef = useRef<HTMLDivElement>(null);

  // ── Stats simulation ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        tps: Math.floor(Math.random() * 5000) + 8000,
        totalTrades: prev.totalTrades + Math.floor(Math.random() * 100),
        latency: Math.random() * 100 + 15,
        uptime: prev.uptime + 0.1,
        memory: Math.random() * 2 + 2.5,
        cpu: Math.random() * 20 + 10,
        pnl: prev.pnl + (Math.random() - 0.48) * 100,
        positions: Math.floor(Math.random() * 3) + 1,
        activeStrategies: 2,
      }));
      
      setExchangeStatus(prev =>
        prev.map(ex => ({
          ...ex,
          latency: Math.max(1, ex.latency + Math.floor(Math.random() * 10) - 5),
          connected: Math.random() > 0.02, // 98% uptime
        }))
      );
    }, 200);
    
    return () => clearInterval(interval);
  }, []);

  // ── Format uptime ───────────────────────────────────────────────────────────
  const formatUptime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  };

  // ── Format time ─────────────────────────────────────────────────────────────
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 1 
    });
  };

  // ── System status color ─────────────────────────────────────────────────────
  const statusColor = systemStatus === "running" ? "#00e676" : 
                      systemStatus === "paused" ? "#f5c518" : "#ff3a5c";

  return (
    <div
      ref={navRef}
      style={{
        background: "linear-gradient(180deg, #0a0d14 0%, #07090c 100%)",
        color: "#c8d4e0",
        fontFamily: '"Courier New", Courier, monospace',
        height: "4vh",
        minHeight: "28px",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        userSelect: "none",
        padding: "0 8px",
        gap: 0,
        fontSize: "clamp(8px, 0.7vw, 10px)",
        overflow: "hidden",
      }}
    >
      {/* ── Logo & Brand ────────────────────────────────────────────────────── */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 6, 
        marginRight: 12,
        flexShrink: 0,
      }}>
        <span style={{
          color: "#00e676",
          fontWeight: "bold",
          fontSize: "clamp(10px, 0.9vw, 13px)",
          letterSpacing: 1.5,
          textShadow: "0 0 10px rgba(0,230,118,0.3)",
        }}>
          ARB
        </span>
        <span style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: "clamp(7px, 0.6vw, 9px)",
          letterSpacing: 0.5,
        }}>
          TERMINAL
        </span>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div style={{ 
        width: 1, 
        height: "60%", 
        background: "rgba(255,255,255,0.06)", 
        marginRight: 10,
        flexShrink: 0,
      }} />

      {/* ── System Status Indicator ──────────────────────────────────────────── */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 5, 
        marginRight: 10,
        flexShrink: 0,
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: statusColor,
          boxShadow: `0 0 6px ${statusColor}`,
          animation: "pulse 2s infinite",
        }} />
        <span style={{ 
          color: statusColor, 
          fontSize: "clamp(7px, 0.55vw, 8px)",
          fontWeight: "bold",
          letterSpacing: 0.5,
        }}>
          {systemStatus.toUpperCase()}
        </span>
        <span style={{
          color: "rgba(255,255,255,0.2)",
          fontSize: "clamp(6px, 0.5vw, 7px)",
        }}>
          v2.4.1
        </span>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div style={{ 
        width: 1, 
        height: "60%", 
        background: "rgba(255,255,255,0.06)", 
        marginRight: 10,
        flexShrink: 0,
      }} />

      {/* ── Performance Metrics ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        flex: 1,
        overflow: "hidden",
        flexWrap: "nowrap",
      }}>
        {/* TPS */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>TPS</span>
          <span style={metricValueStyle("#00e676")}>{fmtK(stats.tps)}</span>
        </div>

        {/* Latency */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>LAT</span>
          <span style={metricValueStyle(stats.latency < 30 ? "#00e676" : "#f5c518")}>
            {stats.latency.toFixed(1)}µs
          </span>
        </div>

        {/* P&L */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>P&L</span>
          <span style={metricValueStyle(stats.pnl >= 0 ? "#00e676" : "#ff3a5c")}>
            ${fmtK(Math.abs(stats.pnl))}
          </span>
        </div>

        {/* Total Trades */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>TRD</span>
          <span style={metricValueStyle("rgba(200,210,225,0.9)")}>{fmtK(stats.totalTrades)}</span>
        </div>

        {/* Positions */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>POS</span>
          <span style={metricValueStyle("#f5c518")}>{stats.positions}</span>
        </div>

        {/* CPU */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>CPU</span>
          <span style={metricValueStyle(stats.cpu < 30 ? "#00e676" : "#f5c518")}>
            {stats.cpu.toFixed(1)}%
          </span>
        </div>

        {/* Memory */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>MEM</span>
          <span style={metricValueStyle("rgba(200,210,225,0.9)")}>{stats.memory.toFixed(1)}GB</span>
        </div>

        {/* Uptime */}
        <div style={metricStyle}>
          <span style={metricLabelStyle}>UP</span>
          <span style={metricValueStyle("rgba(180,195,215,0.8)")}>{formatUptime(stats.uptime)}</span>
        </div>
      </div>

      {/* ── Exchange Status Pills ────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginLeft: "auto",
        flexShrink: 0,
      }}>
        {exchangeStatus.map((ex) => (
          <div
            key={ex.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 6px",
              borderRadius: 2,
              background: ex.connected ? `${ex.color}10` : "rgba(255,58,92,0.1)",
              border: `1px solid ${ex.connected ? `${ex.color}30` : "rgba(255,58,92,0.3)"}`,
              fontSize: "clamp(6px, 0.5vw, 7px)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title={`${ex.name}: ${ex.connected ? `Connected (${ex.latency}ms)` : "Disconnected"}`}
          >
            <span style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: ex.connected ? ex.color : "#ff3a5c",
              flexShrink: 0,
            }} />
            <span style={{ 
              color: ex.connected ? ex.color : "#ff3a5c",
              fontWeight: "bold",
              fontSize: "inherit",
            }}>
              {ex.short}
            </span>
            <span style={{ 
              color: "rgba(255,255,255,0.3)",
              fontSize: "inherit",
            }}>
              {ex.connected ? `${ex.latency}ms` : "OFF"}
            </span>
          </div>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div style={{ 
        width: 1, 
        height: "60%", 
        background: "rgba(255,255,255,0.06)", 
        marginLeft: 8,
        marginRight: 8,
        flexShrink: 0,
      }} />

      {/* ── Right Section: Time & Controls ───────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        {/* System Time */}
        <span style={{
          color: "rgba(180,195,215,0.7)",
          fontSize: "clamp(7px, 0.6vw, 9px)",
          fontFamily: "monospace",
          letterSpacing: 0.5,
        }}>
          {formatTime(systemTime)}
        </span>

        {/* UTC Time */}
        <span style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: "clamp(6px, 0.5vw, 7px)",
        }}>
          UTC
        </span>

        {/* Notifications Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(180,195,215,0.6)",
            cursor: "pointer",
            fontSize: "clamp(10px, 0.8vw, 12px)",
            padding: "0 4px",
            position: "relative",
            fontFamily: "inherit",
          }}
          title="Notifications"
        >
          🔔
          {notifications.length > 0 && (
            <span style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ff3a5c",
              fontSize: 6,
            }} />
          )}
        </button>

        {/* Control Buttons */}
        <button
          onClick={() => setSystemStatus(prev => prev === "running" ? "paused" : "running")}
          style={{
            background: systemStatus === "running" ? "rgba(255,197,24,0.1)" : "rgba(0,230,118,0.1)",
            border: `1px solid ${systemStatus === "running" ? "rgba(245,197,24,0.3)" : "rgba(0,230,118,0.3)"}`,
            color: systemStatus === "running" ? "#f5c518" : "#00e676",
            fontSize: "clamp(7px, 0.55vw, 8px)",
            fontWeight: "bold",
            padding: "3px 8px",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.5,
            transition: "all 0.15s",
          }}
        >
          {systemStatus === "running" ? "⏸ PAUSE" : "▶ START"}
        </button>

        <button
          style={{
            background: "rgba(255,0,43,0.1)",
            border: "1px solid rgba(255,0,43,0.3)",
            color: "#ff3a5c",
            fontSize: "clamp(7px, 0.55vw, 8px)",
            fontWeight: "bold",
            padding: "3px 8px",
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.5,
            transition: "all 0.15s",
          }}
          title="Emergency Stop"
        >
          ⏹ STOP
        </button>
      </div>

      {/* ── Notifications Dropdown ───────────────────────────────────────────── */}
      {showNotifications && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 8,
          width: 300,
          background: "rgba(10,13,20,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          padding: 8,
          zIndex: 1000,
          backdropFilter: "blur(10px)",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
            fontSize: 9,
          }}>
            <span style={{ color: "#e8ecf0", fontWeight: "bold" }}>NOTIFICATIONS</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>{notifications.length}</span>
          </div>
          {notifications.map(n => (
            <div key={n.id} style={{
              padding: "4px 6px",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              fontSize: 8,
              display: "flex",
              gap: 6,
            }}>
              <span style={{ 
                color: n.type === "trade" ? "#00e676" : n.type === "warning" ? "#f5c518" : "#0052ff",
                flexShrink: 0,
              }}>
                {n.type === "trade" ? "●" : n.type === "warning" ? "▲" : "◆"}
              </span>
              <span style={{ color: "rgba(200,210,225,0.8)" }}>{n.message}</span>
              <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto", flexShrink: 0 }}>
                {Math.floor((Date.now() - n.time) / 1000)}s ago
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline Styles ────────────────────────────────────────────────────────────
const metricStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 3,
  padding: "0 6px",
  borderRight: "1px solid rgba(255,255,255,0.03)",
  flexShrink: 0,
};

const metricLabelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.25)",
  fontSize: "clamp(6px, 0.5vw, 7px)",
  letterSpacing: 0.5,
  fontWeight: "bold",
};

const metricValueStyle = (color: string): React.CSSProperties => ({
  color,
  fontSize: "clamp(7px, 0.6vw, 9px)",
  fontWeight: "bold",
  fontFamily: "monospace",
});