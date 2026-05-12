"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Feed" },
  { href: "/area/banking", label: "B&F" },
  { href: "/area/restructuring", label: "R&I" },
  { href: "/area/corporate", label: "Corp" },
  { href: "/area/fundsreg", label: "Funds" },
  { href: "/area/fundstax", label: "Tax" },
  { href: "/saved", label: "Saved" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="flex justify-around items-center h-[72px] font-sans text-[11px]">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded ${active ? "text-accent font-semibold" : "text-slate-600"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
