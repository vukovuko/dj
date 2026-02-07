import { execSync, spawn } from "child_process";

const run = (cmd: string) =>
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });

async function waitForPostgres(maxRetries = 30) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      execSync("docker exec dj-postgres-dev pg_isready -U djuser -d djcafe", {
        stdio: "pipe",
      });
      console.log("✅ PostgreSQL is ready");
      return;
    } catch {
      if (i === maxRetries) throw new Error("❌ PostgreSQL failed to start");
      process.stdout.write(
        `⏳ Waiting for PostgreSQL... (${i}/${maxRetries})\r`,
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function main() {
  console.log("🐳 Starting database...");
  run("docker-compose -f docker-compose.dev.yml up -d");

  await waitForPostgres();

  console.log("📦 Running migrations...");
  run("npx drizzle-kit migrate");

  console.log("🌱 Seeding database...");
  run("node --experimental-strip-types src/db/seed.ts");

  console.log("\n🚀 Starting dev server + worker...\n");
  const dev = spawn("npx", ["vite", "dev"], {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  });
  const worker = spawn("node", ["--experimental-strip-types", "worker.ts"], {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  });

  dev.on("close", (code) => {
    worker.kill();
    process.exit(code ?? 0);
  });
  worker.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Worker exited with code ${code}`);
    }
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
