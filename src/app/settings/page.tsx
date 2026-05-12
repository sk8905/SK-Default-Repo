import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { FEEDS } from "@/lib/sources";
import { RefreshButton } from "./RefreshButton";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function SettingsPage() {
  const lastRun = await db.select().from(schema.ingestRuns).orderBy(desc(schema.ingestRuns.startedAt)).limit(1);
  const run = lastRun[0];
  return (
    <main className="min-h-screen bottom-nav-pad top-bar-pad">
      <TopBar title="Settings" />
      <div className="px-4 py-5 font-sans text-sm text-slate-800 space-y-6">
        <section>
          <h2 className="font-serif text-lg text-ink mb-2">Last ingest</h2>
          {run ? (
            <ul className="text-slate-700 space-y-1">
              <li>Started: {fmtDateTime(new Date(run.startedAt))}</li>
              <li>Finished: {run.finishedAt ? fmtDateTime(new Date(run.finishedAt)) : "—"}</li>
              <li>Feeds checked: {run.feedsChecked}</li>
              <li>Items fetched: {run.itemsFetched}</li>
              <li>Items added: {run.itemsAdded}</li>
              <li>Items skipped (duplicate or irrelevant): {run.itemsSkipped}</li>
              {run.errors ? (
                <li className="text-rose-700 whitespace-pre-wrap break-words">{"Errors:\n" + run.errors}</li>
              ) : null}
            </ul>
          ) : (
            <p className="text-slate-600">No ingest has run yet.</p>
          )}
        </section>

        <section>
          <h2 className="font-serif text-lg text-ink mb-2">Force refresh</h2>
          <p className="text-slate-600 mb-2">Runs the ingestion immediately (same as the daily cron).</p>
          <RefreshButton />
        </section>

        <section>
          <h2 className="font-serif text-lg text-ink mb-2">Configured sources ({FEEDS.length})</h2>
          <ul className="text-slate-700 space-y-1 text-xs">
            {FEEDS.map((f) => (
              <li key={f.firmName} className="break-all"><span className="font-semibold">{f.firmName}</span> — {f.feedUrl}</li>
            ))}
          </ul>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
