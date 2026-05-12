import Link from "next/link";

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-ink text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="h-14 px-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg tracking-tight">{title}</Link>
        <div className="font-sans text-xs">{right}</div>
      </div>
    </header>
  );
}
