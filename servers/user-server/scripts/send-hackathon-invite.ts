/**
 * send-hackathon-invite.ts
 *
 * Sends the DIT National Hackathon invitation email to every address in a CSV.
 *
 * Usage:
 *   cd servers/user-server
 *   npx ts-node --project tsconfig.scripts.json scripts/send-hackathon-invite.ts --csv ./scripts/test.csv
 *
 * CSV format expected (tab or comma separated, first row = headers):
 *   Email    Username    Verified At
 *
 * Set DRY_RUN = true to preview without actually enqueuing anything.
 */

import "dotenv/config";
import ejs from "ejs";
import fs from "fs";
import path from "path";
import readline from "readline";
import { redis } from "../src/config/redis";
import { emailQueue } from "../src/lib/queues";

// ─── CAMPAIGN CONFIG ──────────────────────────────────────────────────────────

const SUBJECT = "🚀 You're Selected – National Level Hackathon | DIT × Tixin";

const REGISTRATION_LINK =
  "https://www.tixin.in/event/b700a5c8-f81d-42c5-ab76-2254f79d106f"; // ← update to the actual event page

const DRY_RUN = false; // set true to preview without enqueuing
const BATCH_SIZE = 500; // jobs per addBulk call

// ─── CSV READER ───────────────────────────────────────────────────────────────

async function readEmails(csvPath: string): Promise<{ email: string }[]> {
  const abs = path.isAbsolute(csvPath)
    ? csvPath
    : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(abs)) {
    console.error(`❌ File not found: ${abs}`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(abs),
    crlfDelay: Infinity,
  });
  const rows: { email: string }[] = [];
  let headers: string[] = [];
  let emailIdx = -1;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = line.split(/\t|,/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (headers.length === 0) {
      headers = cols.map((h) => h.toLowerCase());
      emailIdx = headers.indexOf("email");
      if (emailIdx === -1) {
        console.error(
          '❌ CSV must have an "Email" column. Found:',
          headers.join(", "),
        );
        process.exit(1);
      }
      continue;
    }
    const email = cols[emailIdx];
    if (!email || !email.includes("@")) continue;
    rows.push({ email });
  }

  return rows;
}

// ─── TEMPLATE RENDER ─────────────────────────────────────────────────────────

async function renderHtml(): Promise<string> {
  const tplPath = path.join(
    __dirname,
    "..",
    "src",
    "templates",
    "hackathon-invite.ejs",
  );
  return ejs.renderFile(tplPath, { registrationLink: REGISTRATION_LINK });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const idx = process.argv.indexOf("--csv");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error(
      "Usage: npx ts-node scripts/send-hackathon-invite.ts --csv /path/to/file.csv",
    );
    process.exit(1);
  }
  const csvPath = process.argv[idx + 1];

  console.log(`\n📋 Reading: ${csvPath}`);
  const rows = await readEmails(csvPath);
  console.log(`✅ ${rows.length} valid email addresses found`);

  if (rows.length === 0) {
    await redis.quit();
    return;
  }

  console.log(`🎨 Rendering hackathon invite template...`);
  const html = await renderHtml();
  console.log(`✅ Template ready (${(html.length / 1024).toFixed(1)} KB)`);

  if (DRY_RUN) {
    console.log("\n🔍 DRY RUN – first 5 recipients:");
    rows.slice(0, 5).forEach((r) => console.log(`   → ${r.email}`));
    if (rows.length > 5) console.log(`   ... and ${rows.length - 5} more`);
    console.log("\nSet DRY_RUN = false to send for real.\n");
    await redis.quit();
    return;
  }

  console.log(`\n📨 Enqueuing ${rows.length} jobs...`);
  let enqueued = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await emailQueue.addBulk(
      batch.map((r) => ({
        name: "sendEmail",
        data: {
          to: r.email,
          subject: SUBJECT,
          html,
          attachments: [],
        },
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );
    enqueued += batch.length;
    process.stdout.write(`\r   Progress: ${enqueued}/${rows.length}`);
  }

  const mins = Math.ceil(enqueued / 12 / 60);
  console.log(`\n\n✅ Done! ${enqueued} jobs queued.`);
  console.log(`⏱  Worker sends at 12/sec → ~${mins} min to complete.\n`);

  await redis.quit();
}

main().catch((err) => {
  console.error("Fatal:", err);
  redis.quit().catch(() => {});
  process.exit(1);
});
