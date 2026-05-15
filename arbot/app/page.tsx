"use client";
import Image from "next/image";
import React, { useState } from "react";
import { SymbolWatchlist, MOCK_SYMBOLS } from "./component/symbol";

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");

  return (
    <main className="h-screen bg-[#0B0E11] text-white overflow-hidden flex flex-col">
      <nav className="bg-[#1A1D21] p-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="font-bold">MM-BOT</h1>
        <h1 className="text-gray-400">Balance: $1,000.00</h1>
      </nav>
      <div className="h-[50%] border border-white flex">
        <div className="h-full w-[20%] border border-white">
          <SymbolWatchlist
            symbols={MOCK_SYMBOLS}
            selectedSymbol={selectedSymbol}
            onSymbolSelect={setSelectedSymbol}
          />
        </div>
        <div className="h-full w-[60%] border border-white flex items-center justify-center text-2xl">
          Chart for {selectedSymbol}
        </div>
        <div className="h-full w-[20%] border border-white"></div>
      </div>
      <div className="h-[50%] border border-white">
        <div className="h-full w-[20%] border border-white"></div>
        <div className="h-full w-[80%] border border-white"></div>
      </div>
    </main>
  );
}
