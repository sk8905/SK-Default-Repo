// One-off historical seed: pulls the last 30 days from every configured feed.
// Usage (locally, after setting env vars): npm run seed
// Or run /api/ingest/seed?secret=... once after deploying.

import { runIngest } from "../src/lib/ingest";

async function main() {
  const days = Number(process.env.SEED_DAYS || 30);
  // eslint-disable-next-line no-console
  console.log(`Seeding last ${days} days...`);
  const result = await runIngest({ sinceDays: days, perFeedLimit: 50 });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
