// interface/arbot/components/symbol.tsx
"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { List } from "react-window";

// ─── Constants ────────────────────────────────────────────────────────────────
const EXCHANGES = [
  { id: 0, name: "Binance", short: "BIN", color: "#f0b90b" },
  { id: 1, name: "Coinbase", short: "CBP", color: "#0052ff" },
  { id: 2, name: "Bybit", short: "BYB", color: "#f7a600" },
  { id: 3, name: "Kraken", short: "KRK", color: "#5741d9" },
  { id: 4, name: "OKX", short: "OKX", color: "#ffffff" },
];

// Common trading pairs across exchanges
const COMMON_PAIRS = [
  { base: "BTC", quote: "USDT", category: "Major" },
  { base: "ETH", quote: "USDT", category: "Major" },
  { base: "SOL", quote: "USDT", category: "Major" },
  { base: "BNB", quote: "USDT", category: "Major" },
  { base: "XRP", quote: "USDT", category: "Major" },
  { base: "ADA", quote: "USDT", category: "Major" },
  { base: "DOGE", quote: "USDT", category: "Major" },
  { base: "AVAX", quote: "USDT", category: "Major" },
  { base: "DOT", quote: "USDT", category: "Major" },
  { base: "LINK", quote: "USDT", category: "Major" },
  { base: "MATIC", quote: "USDT", category: "Major" },
  { base: "UNI", quote: "USDT", category: "Major" },
  { base: "ATOM", quote: "USDT", category: "Major" },
  { base: "LTC", quote: "USDT", category: "Major" },
  { base: "ETC", quote: "USDT", category: "Major" },
  { base: "FIL", quote: "USDT", category: "Major" },
  { base: "APT", quote: "USDT", category: "Major" },
  { base: "ARB", quote: "USDT", category: "Major" },
  { base: "OP", quote: "USDT", category: "Major" },
  { base: "NEAR", quote: "USDT", category: "Major" },
  { base: "INJ", quote: "USDT", category: "Major" },
  { base: "TIA", quote: "USDT", category: "Major" },
  { base: "SEI", quote: "USDT", category: "Major" },
  { base: "SUI", quote: "USDT", category: "Major" },
  { base: "RUNE", quote: "USDT", category: "Major" },
  { base: "FTM", quote: "USDT", category: "Major" },
  { base: "ALGO", quote: "USDT", category: "Major" },
  { base: "SAND", quote: "USDT", category: "Major" },
  { base: "MANA", quote: "USDT", category: "Major" },
  { base: "AXS", quote: "USDT", category: "Major" },
  { base: "GALA", quote: "USDT", category: "Major" },
  { base: "ENS", quote: "USDT", category: "Major" },
  { base: "LDO", quote: "USDT", category: "Major" },
  { base: "GRT", quote: "USDT", category: "Major" },
  { base: "SNX", quote: "USDT", category: "Major" },
  { base: "COMP", quote: "USDT", category: "Major" },
  { base: "AAVE", quote: "USDT", category: "Major" },
  { base: "MKR", quote: "USDT", category: "Major" },
  { base: "CRV", quote: "USDT", category: "Major" },
  { base: "1INCH", quote: "USDT", category: "Major" },
  { base: "ZRX", quote: "USDT", category: "Major" },
  { base: "BAT", quote: "USDT", category: "Major" },
  { base: "ENJ", quote: "USDT", category: "Major" },
  { base: "CHZ", quote: "USDT", category: "Major" },
  { base: "HOT", quote: "USDT", category: "Major" },
  { base: "ZIL", quote: "USDT", category: "Major" },
  { base: "KSM", quote: "USDT", category: "Major" },
  { base: "XTZ", quote: "USDT", category: "Major" },
  { base: "EGLD", quote: "USDT", category: "Major" },
  { base: "FLOW", quote: "USDT", category: "Major" },
  { base: "ICP", quote: "USDT", category: "Major" },
  { base: "QNT", quote: "USDT", category: "Major" },
  { base: "ROSE", quote: "USDT", category: "Major" },
  { base: "IMX", quote: "USDT", category: "Major" },
  { base: "MINA", quote: "USDT", category: "Major" },
  { base: "APE", quote: "USDT", category: "Major" },
  { base: "BLUR", quote: "USDT", category: "Major" },
  { base: "PYTH", quote: "USDT", category: "Major" },
  { base: "JTO", quote: "USDT", category: "Major" },
  { base: "JUP", quote: "USDT", category: "Major" },
  { base: "WIF", quote: "USDT", category: "Major" },
  { base: "BONK", quote: "USDT", category: "Major" },
  { base: "ORDI", quote: "USDT", category: "Major" },
  { base: "SATS", quote: "USDT", category: "Major" },
  { base: "RNDR", quote: "USDT", category: "Major" },
  { base: "FET", quote: "USDT", category: "Major" },
  { base: "AGIX", quote: "USDT", category: "Major" },
  { base: "OCEAN", quote: "USDT", category: "Major" },
  { base: "WLD", quote: "USDT", category: "Major" },
  { base: "STRK", quote: "USDT", category: "Major" },
  { base: "ENA", quote: "USDT", category: "Major" },
  { base: "ETHFI", quote: "USDT", category: "Major" },
  { base: "REZ", quote: "USDT", category: "Major" },
  { base: "SAFE", quote: "USDT", category: "Major" },
  { base: "ZK", quote: "USDT", category: "Major" },
  { base: "ZRO", quote: "USDT", category: "Major" },
  { base: "IO", quote: "USDT", category: "Major" },
  { base: "NOT", quote: "USDT", category: "Major" },
  { base: "BB", quote: "USDT", category: "Major" },
  { base: "LISTA", quote: "USDT", category: "Major" },
];

// Generate all symbols across all exchanges
function generateAllSymbols() {
  const symbols: SymbolData[] = [];
  let id = 0;
  
  COMMON_PAIRS.forEach((pair) => {
    EXCHANGES.forEach((exchange) => {
      symbols.push({
        id: id++,
        symbol: `${pair.base}/${pair.quote}`,
        base: pair.base,
        quote: pair.quote,
        exchangeId: exchange.id,
        exchangeName: exchange.name,
        exchangeShort: exchange.short,
        category: pair.category,
        // Simulated data
        price: 0,
        change24h: 0,
        volume24h: 0,
        spread: 0,
        high24h: 0,
        low24h: 0,
      });
    });
  });
  
  return symbols;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SymbolData {
  id: number;
  symbol: string;
  base: string;
  quote: string;
  exchangeId: number;
  exchangeName: string;
  exchangeShort: string;
  category: string;
  price: number;
  change24h: number;
  volume24h: number;
  spread: number;
  high24h: number;
  low24h: number;
}

interface SymbolStats {
  totalSymbols: number;
  positiveGainers: number;
  negativeGainers: number;
  highestVolume: { symbol: string; volume: number };
  bestPerformer: { symbol: string; change: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt2 = (n: number) => n.toFixed(2);
const fmt4 = (n: number) => n.toFixed(4);
const fmtK = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n));

// Price simulation
function simulatePrice(base: string): number {
  const hash = base.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = (hash % 10000) + 10;
  const noise = (Math.random() - 0.5) * basePrice * 0.02;
  return basePrice + noise;
}

// ─── Sub-component: Symbol Row ────────────────────────────────────────────────
const SymbolRow = ({ symbols, selectedSymbol, onSelect, index, style }: any) => {
  const sym = symbols[index];
  const isSelected = selectedSymbol?.id === sym.id;
  const isPositive = sym.change24h >= 0;
  const exchangeColor = EXCHANGES.find(e => e.id === sym.exchangeId)?.color || "#fff";

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 6px",
        borderBottom: "1px solid rgba(255,255,255,0.02)",
        fontSize: 9,
        background: isSelected ? "rgba(0,230,118,0.08)" : "transparent",
        cursor: "pointer",
        boxSizing: "border-box",
        transition: "background 0.1s",
      }}
      onClick={() => onSelect(sym)}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Exchange badge */}
      <span
        style={{
          width: 28,
          fontSize: 7,
          fontWeight: "bold",
          color: exchangeColor,
          opacity: 0.8,
          textAlign: "center",
          background: `${exchangeColor}15`,
          borderRadius: 2,
          padding: "1px 3px",
          flexShrink: 0,
        }}
      >
        {sym.exchangeShort}
      </span>

      {/* Symbol name */}
      <span
        style={{
          color: "#e8ecf0",
          fontWeight: isSelected ? "bold" : "normal",
          width: 70,
          flexShrink: 0,
          fontFamily: "monospace",
          fontSize: 9.5,
        }}
      >
        {sym.symbol}
      </span>

      {/* Price */}
      <span
        style={{
          color: "rgba(200,210,225,0.9)",
          width: 65,
          textAlign: "right",
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        ${fmt2(sym.price)}
      </span>

      {/* 24h Change */}
      <span
        style={{
          color: isPositive ? "#00e676" : "#ff3a5c",
          width: 55,
          textAlign: "right",
          fontFamily: "monospace",
          fontWeight: "bold",
          flexShrink: 0,
        }}
      >
        {isPositive ? "+" : ""}{fmt2(sym.change24h)}%
      </span>

      {/* Volume */}
      <span
        style={{
          color: "rgba(150,165,185,0.7)",
          width: 60,
          textAlign: "right",
          fontSize: 8.5,
          flexShrink: 0,
        }}
      >
        {fmtK(sym.volume24h)}
      </span>

      {/* Spread */}
      <span
        style={{
          color: "rgba(150,165,185,0.6)",
          width: 45,
          textAlign: "right",
          fontSize: 8,
          flexShrink: 0,
        }}
      >
        {sym.spread.toFixed(3)}%
      </span>
    </div>
  );
};;

// ─── Main Component ───────────────────────────────────────────────────────────
const SymbolView = forwardRef(function SymbolView(
  { demo = true }: { demo?: boolean },
  ref
) {
  const allSymbols = useMemo(() => generateAllSymbols(), []);
  const [symbols, setSymbols] = useState<SymbolData[]>(allSymbols);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExchange, setFilterExchange] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("symbol");
  const [sortAsc, setSortAsc] = useState(true);
  const [view, setView] = useState<"all" | "watchlist">("all");
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());
  const listRef = useRef<any>(null);

  // ── Price simulation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!demo) return;
    const interval = setInterval(() => {
      setSymbols((prev) =>
        prev.map((sym) => ({
          ...sym,
          price: simulatePrice(sym.base),
          change24h: (Math.random() - 0.48) * 10,
          volume24h: Math.random() * 1000000000,
          spread: Math.random() * 0.5,
          high24h: sym.high24h || sym.price * 1.05,
          low24h: sym.low24h || sym.price * 0.95,
        }))
      );
    }, 100);
    return () => clearInterval(interval);
  }, [demo]);

  // ── Filter and sort symbols ─────────────────────────────────────────────────
  const filteredSymbols = useMemo(() => {
    let result = view === "watchlist" 
      ? symbols.filter(s => watchlist.has(s.id))
      : [...symbols];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query) ||
          s.base.toLowerCase().includes(query) ||
          s.exchangeName.toLowerCase().includes(query)
      );
    }

    // Exchange filter
    if (filterExchange !== null) {
      result = result.filter((s) => s.exchangeId === filterExchange);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "change":
          comparison = a.change24h - b.change24h;
          break;
        case "volume":
          comparison = a.volume24h - b.volume24h;
          break;
        case "exchange":
          comparison = a.exchangeName.localeCompare(b.exchangeName);
          break;
        default:
          comparison = 0;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [symbols, searchQuery, filterExchange, sortBy, sortAsc, view, watchlist]);

  // ── Stats calculation ──────────────────────────────────────────────────────
  const stats: SymbolStats = useMemo(() => {
    const positive = filteredSymbols.filter((s) => s.change24h > 0).length;
    const highestVol = filteredSymbols.reduce(
      (max, s) => (s.volume24h > max.volume ? { symbol: s.symbol, volume: s.volume24h } : max),
      { symbol: "", volume: 0 }
    );
    const bestPerf = filteredSymbols.reduce(
      (max, s) => (s.change24h > max.change ? { symbol: s.symbol, change: s.change24h } : max),
      { symbol: "", change: -Infinity }
    );
    return {
      totalSymbols: filteredSymbols.length,
      positiveGainers: positive,
      negativeGainers: filteredSymbols.length - positive,
      highestVolume: highestVol,
      bestPerformer: bestPerf,
    };
  }, [filteredSymbols]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((sym: SymbolData) => {
    setSelectedSymbol(sym);
  }, []);

  const toggleWatchlist = useCallback((symbolId: number) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(symbolId)) {
        next.delete(symbolId);
      } else {
        next.add(symbolId);
      }
      return next;
    });
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  // ── Expose API ─────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getSelectedSymbol: () => selectedSymbol,
    getWatchlist: () => watchlist,
    getAllSymbols: () => symbols,
  }));

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
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 10px 4px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.01)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#e8ecf0", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5 }}>
            SYMBOLS
          </span>
          <span style={{ color: "rgba(120,140,165,0.6)", fontSize: 9 }}>
            {stats.totalSymbols} pairs
          </span>
        </div>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search symbol, base, exchange..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e0e6f0",
            padding: "5px 8px",
            fontSize: 9.5,
            fontFamily: "inherit",
            borderRadius: 3,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 4,
          }}
        />
      </div>

      {/* ── Exchange filters ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 3,
          padding: "4px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setFilterExchange(null)}
          style={{
            background: filterExchange === null ? "rgba(0,230,118,0.1)" : "transparent",
            border: filterExchange === null ? "1px solid rgba(0,230,118,0.3)" : "1px solid transparent",
            color: filterExchange === null ? "#00e676" : "rgba(150,165,185,0.6)",
            fontSize: 8,
            padding: "2px 6px",
            borderRadius: 2,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ALL
        </button>
        {EXCHANGES.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setFilterExchange(ex.id)}
            style={{
              background: filterExchange === ex.id ? `${ex.color}15` : "transparent",
              border: filterExchange === ex.id ? `1px solid ${ex.color}40` : "1px solid transparent",
              color: filterExchange === ex.id ? ex.color : "rgba(150,165,185,0.6)",
              fontSize: 8,
              padding: "2px 6px",
              borderRadius: 2,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {ex.short}
          </button>
        ))}
        <button
          onClick={() => setView(view === "all" ? "watchlist" : "all")}
          style={{
            marginLeft: "auto",
            background: view === "watchlist" ? "rgba(245,197,24,0.1)" : "transparent",
            border: view === "watchlist" ? "1px solid rgba(245,197,24,0.3)" : "1px solid transparent",
            color: view === "watchlist" ? "#f5c518" : "rgba(150,165,185,0.6)",
            fontSize: 8,
            padding: "2px 6px",
            borderRadius: 2,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ★ {watchlist.size}
        </button>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "4px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
          fontSize: 8,
          color: "rgba(120,140,165,0.5)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        
      </div>

      {/* ── Column headers ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 6px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          color: "rgba(90,110,140,0.5)",
          fontSize: 8,
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <span style={{ width: 28, flexShrink: 0 }}>EX</span>
        <span
          style={{ width: 70, flexShrink: 0 }}
          onClick={() => handleSort("symbol")}
        >
          PAIR {sortBy === "symbol" ? (sortAsc ? "↑" : "↓") : ""}
        </span>
        <span
          style={{ width: 65, textAlign: "right", flexShrink: 0 }}
          onClick={() => handleSort("price")}
        >
          PRICE {sortBy === "price" ? (sortAsc ? "↑" : "↓") : ""}
        </span>
        <span
          style={{ width: 55, textAlign: "right", flexShrink: 0 }}
          onClick={() => handleSort("change")}
        >
          24H% {sortBy === "change" ? (sortAsc ? "↑" : "↓") : ""}
        </span>
        <span
          style={{ width: 60, textAlign: "right", flexShrink: 0 }}
          onClick={() => handleSort("volume")}
        >
          VOL {sortBy === "volume" ? (sortAsc ? "↑" : "↓") : ""}
        </span>
        <span style={{ width: 45, textAlign: "right", flexShrink: 0 }}>SPREAD</span>
      </div>

      {/* ── Symbol list (virtualized) ───────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {filteredSymbols.length > 0 ? (
          <List
            rowCount={filteredSymbols.length}
            rowHeight={24}
            rowComponent={SymbolRow}
            rowProps={{
              symbols: filteredSymbols,
              selectedSymbol,
              onSelect: handleSelect,
            }}
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
            No symbols found
          </div>
        )}
      </div>

      {/* ── Selected symbol detail ──────────────────────────────────────────── */}
      {selectedSymbol && (
        <div
          style={{
            padding: "6px 10px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(0,230,118,0.05)",
            flexShrink: 0,
            fontSize: 9,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#e8ecf0", fontWeight: "bold" }}>
              {selectedSymbol.symbol}
              <span style={{ color: "rgba(150,165,185,0.5)", marginLeft: 6, fontWeight: "normal" }}>
                {selectedSymbol.exchangeName}
              </span>
            </span>
            <button
              onClick={() => toggleWatchlist(selectedSymbol.id)}
              style={{
                background: "transparent",
                border: "none",
                color: watchlist.has(selectedSymbol.id) ? "#f5c518" : "rgba(150,165,185,0.5)",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
            >
              {watchlist.has(selectedSymbol.id) ? "★" : "☆"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, color: "rgba(150,165,185,0.7)" }}>
            <span>Price: <span style={{ color: "#e0e6f0" }}>${fmt2(selectedSymbol.price)}</span></span>
            <span>24h: <span style={{ color: selectedSymbol.change24h >= 0 ? "#00e676" : "#ff3a5c" }}>{fmt2(selectedSymbol.change24h)}%</span></span>
            <span>Vol: <span style={{ color: "#e0e6f0" }}>{fmtK(selectedSymbol.volume24h)}</span></span>
            <span>Spread: <span style={{ color: "#e0e6f0" }}>{selectedSymbol.spread.toFixed(3)}%</span></span>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "3px 10px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          justifyContent: "space-between",
          color: "rgba(100,120,145,0.55)",
          fontSize: 8,
          flexShrink: 0,
        }}
      >
        <span>{filteredSymbols.length} symbols</span>
        <span>{EXCHANGES.length} exchanges</span>
        <span>LIVE</span>
      </div>
    </div>
  );
});

// ─── Wrapper for page ────────────────────────────────────────────────────────
export default function Symbol() {
  return (
    <div className="h-full text-sm w-[15%] border-r border-black">
      <SymbolView demo={true} />
    </div>
  );
}