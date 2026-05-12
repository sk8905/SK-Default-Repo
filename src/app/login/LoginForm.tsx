"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setErr("Incorrect password.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 font-sans">
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        autoFocus
        autoComplete="current-password"
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-base"
        placeholder="Password"
      />
      {err && <div className="text-sm text-rose-700">{err}</div>}
      <button disabled={busy} className="w-full bg-accent text-white rounded-md py-2 text-sm disabled:opacity-50">
        {busy ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
