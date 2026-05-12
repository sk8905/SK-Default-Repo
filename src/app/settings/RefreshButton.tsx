"use client";
import { useState } from "react";

export function RefreshButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  async function run() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/ingest/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setState("done");
      setMsg(`Added ${data.itemsAdded}, skipped ${data.itemsSkipped}, errors ${data.errors?.length ?? 0}.`);
    } catch (e) {
      setState("error");
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={run} disabled={state === "loading"} className="bg-accent text-white rounded-md px-4 py-2 text-sm disabled:opacity-50">
        {state === "loading" ? "Running…" : "Run ingest now"}
      </button>
      {msg && <div className={`text-xs ${state === "error" ? "text-rose-700" : "text-slate-700"}`}>{msg}</div>}
    </div>
  );
}
