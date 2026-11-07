// Start `next dev` on the first free port at or above PORT (default 3000).
import net from "node:net";
import { spawn, execSync } from "node:child_process";
import { createWriteStream } from "node:fs";

const start = Number(process.env.PORT) || 3000;
const maxTries = 50;

// Default host binds dual-stack (:: + 0.0.0.0), catching IPv4 and IPv6 users.
const isFree = (port) =>
  new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port);
  });

// Kill stale dev servers started from THIS project (matched by process cwd),
// or old copies of it, so old instances don't hog ports. Other apps on these ports are left alone.
const sh = (cmd) => { try { return execSync(cmd, { encoding: "utf8" }); } catch { return ""; } };
const root = process.cwd();
const pids = new Set(
  sh(`lsof -nP -t -iTCP:${start}-${start + maxTries - 1} -sTCP:LISTEN`)
    .split("\n").map(Number).filter((p) => p && p !== process.pid),
);
const killed = [];
for (const pid of pids) {
  const cwd = sh(`lsof -a -p ${pid} -d cwd -Fn`).split("\n").find((l) => l.startsWith("n"))?.slice(1);
  // Match this repo, or an old copy of it (e.g. moved to Trash while running).
  const name = root.split("/").pop();
  const isOurs = cwd === root || (cwd && cwd.split("/").pop().startsWith(name));
  if (isOurs) {
    killed.push(pid);
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
for (let i = 0; i < 20 && killed.some(alive); i++) await new Promise((r) => setTimeout(r, 100));
for (const pid of killed) {
  if (alive(pid)) try { process.kill(pid, "SIGKILL"); } catch {}
  console.log(`Killed old dev server (pid ${pid})`);
}
if (killed.length) await new Promise((r) => setTimeout(r, 300));

let port = start;
while (!(await isFree(port))) {
  if (++port >= start + maxTries) {
    console.error(`No free port in ${start}-${start + maxTries - 1}`);
    process.exit(1);
  }
}
if (port !== start) console.log(`Port ${start} busy, using ${port}`);

const log = createWriteStream("dev.log");
const child = spawn("npx", ["next", "dev", "-p", String(port), ...process.argv.slice(2)], {
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port) },
});
for (const s of [child.stdout, child.stderr]) {
  s.on("data", (d) => { process.stdout.write(d); log.write(d); });
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
