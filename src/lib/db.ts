import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { simulationEnabled } from "./auth/mode";

let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  // Never share simulated identities or memories with the real deployment's database.
  const path = simulationEnabled()
    ? (process.env.SIMULATION_DATABASE_PATH || join(process.cwd(), "data", "sovereign-memory-demo.sqlite"))
    : (process.env.DATABASE_PATH || join(process.cwd(), "data", "sovereign-memory.sqlite"));
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, tidecloak_subject TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, identity_subject TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('study-agent','finance-agent'))
    );
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      content TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('Study','Finance','General')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS memory_permissions (
      id TEXT PRIMARY KEY, memory_id TEXT NOT NULL REFERENCES memories(id), agent_id TEXT NOT NULL REFERENCES agents(id),
      permission TEXT NOT NULL DEFAULT 'read' CHECK(permission = 'read'), revoked_at TEXT,
      UNIQUE(memory_id, agent_id)
    );
    CREATE TABLE IF NOT EXISTS access_logs (
      id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, memory_id TEXT,
      action TEXT NOT NULL, result TEXT NOT NULL, reason TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS logs_memory ON access_logs(memory_id, timestamp);
    CREATE INDEX IF NOT EXISTS logs_actor ON access_logs(actor_id, timestamp);
    CREATE TABLE IF NOT EXISTS proof_replays (jti TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
  `);
  return database;
}

// SQLite makes check-and-claim atomic across local Next.js workers/restarts.
export const proofStore = {
  async claim(jti: string, expiresAtMs: number) {
    const connection = db();
    connection.prepare("DELETE FROM proof_replays WHERE expires_at < ?").run(Date.now());
    const result = connection.prepare("INSERT OR IGNORE INTO proof_replays(jti, expires_at) VALUES (?,?)").run(jti, expiresAtMs);
    return result.changes === 1;
  },
};
