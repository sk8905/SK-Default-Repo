"use client";
import { useState, useTransition } from "react";

export function BookmarkButton({ id, initial }: { id: number; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const toggle = () => {
    const next = !on;
    setOn(next);
    start(async () => {
      await fetch(`/api/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, bookmarked: next }),
      });
    });
  };
  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`w-full text-center rounded-md py-3 font-sans text-sm border ${on ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-white border-slate-300 text-slate-700"}`}
    >
      {on ? "★ Saved" : "☆ Save for later"}
    </button>
  );
}
