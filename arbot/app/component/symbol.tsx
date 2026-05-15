"use client";

import React, { use } from 'react';
import client from 'undici-types/client';

export interface SymbolData {
  symbol: string;
  exchange: string;
  price: string;
}

interface SymbolWatchlistProps {
  symbols: SymbolData[];
  onSymbolSelect: (symbol: string) => void;
  selectedSymbol?: string;
}

export const SymbolWatchlist: React.FC<SymbolWatchlistProps> = ({
  symbols,
  onSymbolSelect,
  selectedSymbol
}) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#1A1D21]">
      <div className="p-2 text-xs font-bold text-gray-400 uppercase border-b border-gray-700">
        Watchlist
      </div>
      <div className="flex flex-col">
        {symbols.map((s) => (
          <div
            key={`${s.symbol}-${s.exchange}`}
            onClick={() => onSymbolSelect(s.symbol)}
            className={`p-3 cursor-pointer border-b border-gray-800 transition-colors ${
              selectedSymbol === s.symbol ? 'bg-blue-900/30' : 'hover:bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-white">{s.symbol}</span>
              <span className="text-xs text-gray-400">{s.exchange}</span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              ${s.price}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mock data simulating the datapipeline response
export const MOCK_SYMBOLS: SymbolData[] = [
  { symbol: 'BTC/USDT', exchange: 'Binance', price: '64210.50' },
  { symbol: 'ETH/USDT', exchange: 'Binance', price: '3450.12' },
  { symbol: 'SOL/USDT', exchange: 'Bybit', price: '145.67' },
  { symbol: 'ARB/USDT', exchange: 'OKX', price: '1.12' },
];
