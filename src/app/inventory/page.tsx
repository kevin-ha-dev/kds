"use client";

import { useState } from "react";
import { BurgersSoldChart, InventoryLevelsChart, Navbar } from "@/components";

const timeframeOptions = ["Today", "Week", "Month", "Year"] as const;
type Timeframe = (typeof timeframeOptions)[number];

export default function InventoryPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("Today");

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-zinc-900 lg:px-10">
      <div className="mx-auto flex w-full max-w-384 flex-col gap-8">
        <Navbar />
        <section className="grid grid-cols-1 gap-3 border-b border-dotted border-zinc-300 pb-4 md:grid-cols-[1fr_auto] md:items-end">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Inventory</h1>
          <div className="justify-self-start md:justify-self-end">
            <label htmlFor="inventory-timeframe" className="sr-only">
              Select inventory timeframe
            </label>
            <select
              id="inventory-timeframe"
              value={selectedTimeframe}
              onChange={(event) =>
                setSelectedTimeframe(event.target.value as (typeof timeframeOptions)[number])
              }
              className="h-10 min-w-36 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              {timeframeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </section>
        <section className="grid grid-cols-1 gap-5">
          <InventoryLevelsChart selectedTimeframe={selectedTimeframe} />
          <BurgersSoldChart selectedTimeframe={selectedTimeframe} />
        </section>
      </div>
    </main>
  );
}
